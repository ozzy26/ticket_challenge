import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderRepository } from '../../infrastructure/database/repositories/order.repository';
import { ReservationRepository } from '../../infrastructure/database/repositories/reservation.repository';
import { TicketRepository } from '../../infrastructure/database/repositories/ticket.repository';
import { TicketTypeRepository } from '../../infrastructure/database/repositories/ticket-type.repository';
import { Order, OrderStatus } from '../../domain/entities/order.entity';
import { Reservation, ReservationStatus } from '../../domain/entities/reservation.entity';
import { Ticket, TicketStatus } from '../../domain/entities/ticket.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { v4 as uuidv4 } from 'uuid';
import { TicketType } from '../../domain/entities/ticket-type.entity';

@Injectable()
export class OrderService {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly reservationRepository: ReservationRepository,
        private readonly ticketRepository: TicketRepository,
        private readonly ticketTypeRepository: TicketTypeRepository,
        private readonly dataSource: DataSource,
    ) { }

    async createOrder(dto: CreateOrderDto): Promise<Order> {
        // 1. Verificar idempotencia
        if (dto.idempotencyKey) {
            const existingOrder = await this.orderRepository.findByIdempotencyKey(dto.idempotencyKey);
            if (existingOrder) {
                console.log(`⚠️ Orden duplicada detectada: ${existingOrder.id}`);
                return existingOrder;
            }
        }

        // 2. Verificar que la reserva existe y está válida
        const reservation = await this.reservationRepository.findById(dto.reservationId);
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }

        if (reservation.userId !== dto.userId) {
            throw new BadRequestException('Esta reserva no te pertenece');
        }

        if (reservation.status !== ReservationStatus.PENDING) {
            throw new BadRequestException('La reserva no está en estado pendiente');
        }

        // 3. Verificar que la reserva no ha expirado
        if (new Date() > reservation.expiresAt) {
            throw new ConflictException('La reserva ha expirado');
        }

        // 4. Calcular el monto total
        const tickets = reservation.tickets;
        let totalAmount = 0;

        for (const ticket of tickets) {
            totalAmount += parseFloat(ticket.ticketType.price.toString());
        }

        // 5. Crear la orden
        const order = await this.orderRepository.create({
            reservationId: reservation.id,
            userId: dto.userId,
            totalAmount,
            status: OrderStatus.PENDING,
            idempotencyKey: dto.idempotencyKey || uuidv4(),
        });

        console.log(`💳 Orden creada: ${order.id}, Total: ${totalAmount}`);
        return order;
    }

    async findOrderById(id: string): Promise<Order> {
        const order = await this.orderRepository.findById(id);
        if (!order) {
            throw new NotFoundException(`Orden con ID ${id} no encontrada`);
        }
        return order;
    }

    async findUserOrders(userId: string): Promise<Order[]> {
        return await this.orderRepository.findByUserId(userId);
    }

    /**
     * Confirma el pago de una orden
     * Este método es llamado por el webhook de pago
     */
    async confirmPayment(orderId: string, paymentId: string): Promise<Order> {
        return await this.dataSource.transaction(async (manager) => {
            // 1. Obtener la orden
            const order = await manager.findOne(Order, {
                where: { id: orderId },
                relations: ['reservation', 'reservation.tickets', 'reservation.tickets.ticketType'],
            });

            if (!order) {
                throw new NotFoundException('Orden no encontrada');
            }

            if (order.status === OrderStatus.COMPLETED) {
                console.log(`⚠️ Orden ya completada: ${orderId}`);
                return order;
            }

            // 2. Actualizar la orden
            order.status = OrderStatus.COMPLETED;
            order.paymentId = paymentId;
            order.paidAt = new Date();
            await manager.save(Order, order);

            // 3. Actualizar la reserva
            await manager.update(Reservation, order.reservationId, {
                status: ReservationStatus.CONFIRMED,
            });

            // 4. Actualizar los tickets y generar códigos
            const tickets = order.reservation.tickets;
            for (const ticket of tickets) {
                const ticketCode = this.generateTicketCode();
                await manager.update(Ticket, ticket.id, {
                    status: TicketStatus.SOLD,
                    ticketCode,
                });
            }

            // 5. Actualizar contadores del tipo de ticket
            const ticketTypeId = tickets[0].ticketTypeId;
            const quantity = tickets.length;

            await manager.decrement(
                TicketType,
                { id: ticketTypeId },
                'reservedCount',
                quantity,
            );

            await manager.increment(
                TicketType,
                { id: ticketTypeId },
                'soldCount',
                quantity,
            );

            console.log(`✅ Pago confirmado: Orden ${orderId}, ${quantity} tickets vendidos`);
            return order;
        });
    }

    async failPayment(orderId: string, reason: string): Promise<Order> {
        return await this.dataSource.transaction(async (manager) => {
            const order = await manager.findOne(Order, {
                where: { id: orderId },
                relations: ['reservation', 'reservation.tickets'],
            });

            if (!order) {
                throw new NotFoundException('Orden no encontrada');
            }

            // 1. Actualizar orden
            order.status = OrderStatus.FAILED;
            await manager.save(Order, order);

            // 2. Liberar la reserva (igual que cuando expira)
            const reservation = order.reservation;
            await manager.update(Reservation, reservation.id, {
                status: ReservationStatus.EXPIRED,
            });

            const tickets = reservation.tickets;
            const ticketIds = tickets.map((t) => t.id);

            await manager.update(
                Ticket,
                { id: ticketIds as any },
                {
                    status: TicketStatus.RELEASED,
                    reservationId: null,
                    reservedAt: null,
                    reservedUntil: null,
                },
            );

            // 3. Decrementar contador
            const ticketTypeId = tickets[0].ticketTypeId;
            await manager.decrement(
                TicketType,
                { id: ticketTypeId },
                'reservedCount',
                tickets.length,
            );

            console.log(`❌ Pago fallido: Orden ${orderId}, Razón: ${reason}`);
            return order;
        });
    }

    private generateTicketCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 10; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}