import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReservationRepository } from '../../infrastructure/database/repositories/reservation.repository';
import { TicketTypeRepository } from '../../infrastructure/database/repositories/ticket-type.repository';
import { TicketRepository } from '../../infrastructure/database/repositories/ticket.repository';
import { Reservation, ReservationStatus } from '../../domain/entities/reservation.entity';
import { TicketType } from '../../domain/entities/ticket-type.entity';
import { Ticket, TicketStatus } from '../../domain/entities/ticket.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReservationService {
    private readonly RESERVATION_TTL_MINUTES = 10;
    private readonly MAX_TICKETS_PER_RESERVATION = 10;

    constructor(
        private readonly reservationRepository: ReservationRepository,
        private readonly ticketTypeRepository: TicketTypeRepository,
        private readonly ticketRepository: TicketRepository,
        private readonly dataSource: DataSource,
    ) { }

    async createReservation(dto: CreateReservationDto): Promise<Reservation> {
        if (dto.quantity <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
        }

        if (dto.quantity > this.MAX_TICKETS_PER_RESERVATION) {
            throw new BadRequestException(
                `No puedes reservar más de ${this.MAX_TICKETS_PER_RESERVATION} tickets a la vez`,
            );
        }

        // Verificar que el tipo de ticket existe
        const ticketType = await this.ticketTypeRepository.findById(dto.ticketTypeId);
        if (!ticketType) {
            throw new NotFoundException('Tipo de ticket no encontrado');
        }

        // ESTRATEGIA PRINCIPAL: Optimistic Locking
        return await this.reserveTicketsOptimistic(ticketType, dto.quantity, dto.userId);
    }

    /**
     * OPCIÓN A: OPTIMISTIC LOCKING
     * Mejor para baja-media concurrencia
     */
    private async reserveTicketsOptimistic(
        ticketType: TicketType,
        quantity: number,
        userId: string,
        maxRetries: number = 3,
    ): Promise<Reservation> {
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                return await this.dataSource.transaction(async (manager) => {
                    // 1. Leer el TicketType con su versión
                    const currentTicketType = await manager.findOne(TicketType, {
                        where: { id: ticketType.id },
                    });

                    if (!currentTicketType) {
                        throw new NotFoundException('Tipo de ticket no encontrado');
                    }

                    // 2. Calcular disponibilidad
                    const available =
                        currentTicketType.totalCapacity -
                        currentTicketType.reservedCount -
                        currentTicketType.soldCount;

                    if (available < quantity) {
                        throw new ConflictException(
                            `Solo hay ${available} tickets disponibles, solicitaste ${quantity}`,
                        );
                    }

                    // 3. Incrementar contador de reservados (aquí TypeORM usa el @Version)
                    currentTicketType.reservedCount += quantity;
                    await manager.save(TicketType, currentTicketType);

                    // 4. Calcular fecha de expiración
                    const expiresAt = new Date();
                    expiresAt.setMinutes(expiresAt.getMinutes() + this.RESERVATION_TTL_MINUTES);

                    // 5. Crear la reserva
                    const reservation = manager.create(Reservation, {
                        userId,
                        eventId: currentTicketType.eventId,
                        expiresAt,
                        status: ReservationStatus.PENDING,
                    });
                    await manager.save(Reservation, reservation);

                    // 6. Buscar tickets disponibles y asignarlos a la reserva
                    const availableTickets = await manager.find(Ticket, {
                        where: {
                            ticketTypeId: ticketType.id,
                            status: TicketStatus.AVAILABLE,
                        },
                        take: quantity,
                    });

                    // Si no hay suficientes tickets individuales, crearlos
                    const ticketsToCreate = quantity - availableTickets.length;
                    if (ticketsToCreate > 0) {
                        const newTickets: Partial<Ticket>[] = [];
                        for (let i = 0; i < ticketsToCreate; i++) {
                            newTickets.push({
                                ticketTypeId: ticketType.id,
                                reservationId: reservation.id,
                                status: TicketStatus.RESERVED,
                                reservedAt: new Date(),
                                reservedUntil: expiresAt,
                            });
                        }
                        await manager.save(Ticket, newTickets);
                    }

                    // Actualizar tickets existentes
                    if (availableTickets.length > 0) {
                        const ticketIds = availableTickets.map((t) => t.id);
                        await manager.update(
                            Ticket,
                            { id: ticketIds as any },
                            {
                                reservationId: reservation.id,
                                status: TicketStatus.RESERVED,
                                reservedAt: new Date(),
                                reservedUntil: expiresAt,
                            },
                        );
                    }

                    console.log(`✅ Reserva creada: ${quantity} tickets, expira en ${this.RESERVATION_TTL_MINUTES} min`);
                    return reservation;
                });
            } catch (error) {
                // Si es un error de versión optimista, reintentamos
                if (
                    error.name === 'OptimisticLockVersionMismatchError' ||
                    error.message?.includes('version')
                ) {
                    attempt++;
                    console.log(`⚠️ Conflicto de versión, reintento ${attempt}/${maxRetries}`);

                    if (attempt >= maxRetries) {
                        throw new ConflictException(
                            'Sistema saturado, por favor intenta nuevamente',
                        );
                    }

                    // Espera exponencial
                    await this.sleep(100 * Math.pow(2, attempt));
                    continue;
                }

                throw error;
            }
        }
    }

    async findReservationById(id: string): Promise<Reservation> {
        const reservation = await this.reservationRepository.findById(id);
        if (!reservation) {
            throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
        }
        return reservation;
    }

    async findUserReservations(userId: string): Promise<Reservation[]> {
        return await this.reservationRepository.findByUserId(userId);
    }

    async cancelReservation(id: string, userId: string): Promise<void> {
        const reservation = await this.findReservationById(id);

        if (reservation.userId !== userId) {
            throw new BadRequestException('No tienes permiso para cancelar esta reserva');
        }

        if (reservation.status !== ReservationStatus.PENDING) {
            throw new BadRequestException('Solo se pueden cancelar reservas pendientes');
        }

        await this.releaseReservation(reservation);
    }

    private async releaseReservation(reservation: Reservation): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            // 1. Actualizar estado de la reserva
            await manager.update(Reservation, reservation.id, {
                status: ReservationStatus.EXPIRED,
            });

            // 2. Obtener los tickets de la reserva
            const tickets = await manager.find(Ticket, {
                where: { reservationId: reservation.id },
            });

            if (tickets.length === 0) return;

            // 3. Liberar los tickets
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

            // 4. Decrementar el contador de reservados por tipo de ticket
            const ticketTypeId = tickets[0].ticketTypeId;
            await manager.decrement(
                TicketType,
                { id: ticketTypeId },
                'reservedCount',
                tickets.length,
            );

            console.log(`🔓 Reserva ${reservation.id} liberada: ${tickets.length} tickets`);
        });
    }

    /**
     * CRON JOB: Libera reservas expiradas cada 1 minuto
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async releaseExpiredReservations(): Promise<void> {
        console.log('⏰ Ejecutando liberación de reservas expiradas...');

        const expiredReservations = await this.reservationRepository.findExpiredReservations();

        if (expiredReservations.length === 0) {
            console.log('✅ No hay reservas expiradas');
            return;
        }

        console.log(`📋 Encontradas ${expiredReservations.length} reservas expiradas`);

        for (const reservation of expiredReservations) {
            try {
                await this.releaseReservation(reservation);
            } catch (error) {
                console.error(`❌ Error liberando reserva ${reservation.id}:`, error.message);
            }
        }

        console.log(`✅ Proceso completado: ${expiredReservations.length} reservas liberadas`);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}