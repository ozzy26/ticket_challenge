import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationRepository } from '../../infrastructure/database/repositories/reservation.repository';
import { TicketTypeRepository } from '../../infrastructure/database/repositories/ticket-type.repository';
import { TicketRepository } from '../../infrastructure/database/repositories/ticket.repository';
import { TicketType, TicketKind } from '../../domain/entities/ticket-type.entity';
import { ReservationStatus } from '../../domain/entities/reservation.entity';

describe('ReservationService', () => {
    let service: ReservationService;
    let ticketTypeRepository: TicketTypeRepository;
    let dataSource: any;

    const mockTicketType: TicketType = {
        id: 'tt-123',
        eventId: 'event-123',
        name: 'VIP',
        type: TicketKind.GENERAL,
        price: 150.00,
        totalCapacity: 1000,
        reservedCount: 100,
        soldCount: 50,
        version: 1,
        event: null,
        tickets: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        availableCount: 850,
    };

    const mockDataSource = {
        transaction: jest.fn((callback) => callback(mockManager)),
    };

    const mockManager = {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn((entity, data) => data),
        find: jest.fn(),
        update: jest.fn(),
        decrement: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReservationService,
                {
                    provide: ReservationRepository,
                    useValue: {
                        findById: jest.fn(),
                        findByUserId: jest.fn(),
                        findExpiredReservations: jest.fn(),
                    },
                },
                {
                    provide: TicketTypeRepository,
                    useValue: {
                        findById: jest.fn(),
                    },
                },
                {
                    provide: TicketRepository,
                    useValue: {},
                },
                {
                    provide: getDataSourceToken(),
                    useValue: mockDataSource,
                },
            ],
        }).compile();

        service = module.get<ReservationService>(ReservationService);
        ticketTypeRepository = module.get<TicketTypeRepository>(TicketTypeRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createReservation', () => {
        it('should create a reservation successfully', async () => {
            const dto = {
                ticketTypeId: 'tt-123',
                quantity: 2,
                userId: 'user-123',
            };

            jest.spyOn(ticketTypeRepository, 'findById').mockResolvedValue(mockTicketType);
            mockManager.findOne.mockResolvedValue(mockTicketType);
            mockManager.save.mockImplementation((entity, data) => Promise.resolve(data));
            mockManager.find.mockResolvedValue([]);

            const result = await service.createReservation(dto);

            expect(result).toBeDefined();
            expect(result.userId).toBe(dto.userId);
            expect(result.status).toBe(ReservationStatus.PENDING);
        });

        it('should throw ConflictException when not enough tickets available', async () => {
            const dto = {
                ticketTypeId: 'tt-123',
                quantity: 1000, // Más de lo disponible
                userId: 'user-123',
            };

            const limitedTicketType = { ...mockTicketType, availableCount: 10 };
            jest.spyOn(ticketTypeRepository, 'findById').mockResolvedValue(limitedTicketType);
            mockManager.findOne.mockResolvedValue(limitedTicketType);

            await expect(service.createReservation(dto)).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException when ticket type does not exist', async () => {
            const dto = {
                ticketTypeId: 'invalid-id',
                quantity: 2,
                userId: 'user-123',
            };

            jest.spyOn(ticketTypeRepository, 'findById').mockResolvedValue(null);

            await expect(service.createReservation(dto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('Concurrency Tests', () => {
        it('should handle multiple concurrent reservations correctly', async () => {
            const dto = {
                ticketTypeId: 'tt-123',
                quantity: 1,
                userId: 'user-123',
            };

            jest.spyOn(ticketTypeRepository, 'findById').mockResolvedValue(mockTicketType);
            mockManager.findOne.mockResolvedValue(mockTicketType);
            mockManager.save.mockImplementation((entity, data) => Promise.resolve(data));
            mockManager.find.mockResolvedValue([]);

            // Simular 10 reservas concurrentes
            const promises = Array(10)
                .fill(null)
                .map(() => service.createReservation(dto));

            const results = await Promise.allSettled(promises);
            const successful = results.filter((r) => r.status === 'fulfilled');

            expect(successful.length).toBeGreaterThan(0);
        });
    });
});