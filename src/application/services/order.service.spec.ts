import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderRepository } from '../../infrastructure/database/repositories/order.repository';
import { ReservationRepository } from '../../infrastructure/database/repositories/reservation.repository';
import { TicketRepository } from '../../infrastructure/database/repositories/ticket.repository';
import { TicketTypeRepository } from '../../infrastructure/database/repositories/ticket-type.repository';
import { Reservation, ReservationStatus } from '../../domain/entities/reservation.entity';
import { Order, OrderStatus } from '../../domain/entities/order.entity';

describe('OrderService', () => {
    let service: OrderService;
    let orderRepository: OrderRepository;
    let reservationRepository: ReservationRepository;

    const mockReservation: Partial<Reservation> = {
        id: 'res-123',
        userId: 'user-123',
        eventId: 'event-123',
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos en el futuro
        tickets: [
            { id: 'ticket-1', ticketType: { price: 100 } } as any,
            { id: 'ticket-2', ticketType: { price: 100 } } as any,
        ],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                {
                    provide: OrderRepository,
                    useValue: {
                        create: jest.fn(),
                        findById: jest.fn(),
                        findByIdempotencyKey: jest.fn(),
                    },
                },
                {
                    provide: ReservationRepository,
                    useValue: {
                        findById: jest.fn(),
                    },
                },
                {
                    provide: TicketRepository,
                    useValue: {},
                },
                {
                    provide: TicketTypeRepository,
                    useValue: {},
                },
                {
                    provide: getDataSourceToken(),
                    useValue: {
                        transaction: jest.fn((callback) => callback({})),
                    },
                },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
        orderRepository = module.get<OrderRepository>(OrderRepository);
        reservationRepository = module.get<ReservationRepository>(ReservationRepository);
    });

    it('should create an order successfully', async () => {
        const dto = {
            reservationId: 'res-123',
            userId: 'user-123',
            idempotencyKey: 'idempotency-123',
        };

        jest.spyOn(orderRepository, 'findByIdempotencyKey').mockResolvedValue(null);
        jest.spyOn(reservationRepository, 'findById').mockResolvedValue(mockReservation as Reservation);
        jest.spyOn(orderRepository, 'create').mockResolvedValue({
            id: 'order-123',
            totalAmount: 200,
            status: OrderStatus.PENDING,
            ...dto,
        } as Order);

        const result = await service.createOrder(dto);

        expect(result).toBeDefined();
        expect(result.totalAmount).toBe(200);
        expect(result.status).toBe(OrderStatus.PENDING);
    });

    it('should return existing order when idempotency key is duplicated', async () => {
        const dto = {
            reservationId: 'res-123',
            userId: 'user-123',
            idempotencyKey: 'idempotency-123',
        };

        const existingOrder = {
            id: 'order-existing',
            ...dto,
            status: OrderStatus.PENDING,
        } as Order;

        jest.spyOn(orderRepository, 'findByIdempotencyKey').mockResolvedValue(existingOrder);

        const result = await service.createOrder(dto);

        expect(result).toBe(existingOrder);
        expect(orderRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when reservation is expired', async () => {
        const dto = {
            reservationId: 'res-123',
            userId: 'user-123',
        };

        const expiredReservation = {
            ...mockReservation,
            expiresAt: new Date(Date.now() - 1000), // Expirada
        };

        jest.spyOn(orderRepository, 'findByIdempotencyKey').mockResolvedValue(null);
        jest.spyOn(reservationRepository, 'findById').mockResolvedValue(expiredReservation as Reservation);

        await expect(service.createOrder(dto)).rejects.toThrow(ConflictException);
    });
});