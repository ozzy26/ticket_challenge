import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventService } from './event.service';
import { EventRepository } from '../../infrastructure/database/repositories/event.repository';
import { TicketTypeRepository } from '../../infrastructure/database/repositories/ticket-type.repository';
import { Event, EventStatus } from '../../domain/entities/event.entity';
import { TicketType, TicketKind } from '../../domain/entities/ticket-type.entity';

describe('EventService', () => {
    let service: EventService;
    let eventRepository: EventRepository;
    let ticketTypeRepository: TicketTypeRepository;

    const mockEvent: Partial<Event> = {
        id: 'event-123',
        name: 'Concierto de Rock 2026',
        description: 'El mejor concierto',
        venue: 'Estadio Nacional',
        eventDate: new Date('2026-06-15T20:00:00Z'),
        salesStartDate: new Date('2026-05-01T00:00:00Z'),
        salesEndDate: new Date('2026-06-15T18:00:00Z'),
        status: EventStatus.DRAFT,
        ticketTypes: [],
    };

    const mockTicketType: Partial<TicketType> = {
        id: 'tt-123',
        eventId: 'event-123',
        name: 'VIP',
        type: TicketKind.GENERAL,
        price: 150,
        totalCapacity: 1000,
        reservedCount: 0,
        soldCount: 0,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventService,
                {
                    provide: EventRepository,
                    useValue: {
                        create: jest.fn(),
                        findById: jest.fn(),
                        findAll: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        findActiveEvents: jest.fn(),
                    },
                },
                {
                    provide: TicketTypeRepository,
                    useValue: {
                        create: jest.fn(),
                        findByEventId: jest.fn(),
                        getAvailability: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<EventService>(EventService);
        eventRepository = module.get<EventRepository>(EventRepository);
        ticketTypeRepository = module.get<TicketTypeRepository>(TicketTypeRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createEvent', () => {
        it('should create an event successfully', async () => {
            const dto = {
                name: 'Concierto de Rock 2026',
                description: 'El mejor concierto',
                venue: 'Estadio Nacional',
                eventDate: '2026-06-15T20:00:00Z',
                salesStartDate: '2026-05-01T00:00:00Z',
                salesEndDate: '2026-06-15T18:00:00Z',
                ticketTypes: [
                    {
                        name: 'VIP',
                        type: TicketKind.GENERAL,
                        price: 150,
                        totalCapacity: 1000,
                    },
                ],
            };

            jest.spyOn(eventRepository, 'create').mockResolvedValue(mockEvent as Event);
            jest.spyOn(ticketTypeRepository, 'create').mockResolvedValue(mockTicketType as TicketType);
            jest.spyOn(eventRepository, 'findById').mockResolvedValue({
                ...mockEvent,
                ticketTypes: [mockTicketType],
            } as Event);

            const result = await service.createEvent(dto);

            expect(result).toBeDefined();
            expect(result.name).toBe(dto.name);
            expect(eventRepository.create).toHaveBeenCalled();
            expect(ticketTypeRepository.create).toHaveBeenCalled();
        });

        it('should throw BadRequestException when salesStartDate >= salesEndDate', async () => {
            const dto = {
                name: 'Test Event',
                eventDate: '2026-06-15T20:00:00Z',
                salesStartDate: '2026-06-15T00:00:00Z',
                salesEndDate: '2026-05-01T00:00:00Z', // Antes del inicio
            };

            await expect(service.createEvent(dto as any)).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when salesEndDate > eventDate', async () => {
            const dto = {
                name: 'Test Event',
                eventDate: '2026-06-15T20:00:00Z',
                salesStartDate: '2026-05-01T00:00:00Z',
                salesEndDate: '2026-06-16T00:00:00Z', // Después del evento
            };

            await expect(service.createEvent(dto as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('findEventById', () => {
        it('should return an event by id', async () => {
            jest.spyOn(eventRepository, 'findById').mockResolvedValue(mockEvent as Event);

            const result = await service.findEventById('event-123');

            expect(result).toEqual(mockEvent);
        });

        it('should throw NotFoundException when event does not exist', async () => {
            jest.spyOn(eventRepository, 'findById').mockResolvedValue(null);

            await expect(service.findEventById('invalid-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findAllEvents', () => {
        it('should return all events', async () => {
            const mockEvents = [mockEvent, { ...mockEvent, id: 'event-456' }] as Event[];
            jest.spyOn(eventRepository, 'findAll').mockResolvedValue(mockEvents);

            const result = await service.findAllEvents();

            expect(result).toEqual(mockEvents);
            expect(result.length).toBe(2);
        });

        it('should filter events by status', async () => {
            const activeEvents = [{ ...mockEvent, status: EventStatus.ACTIVE }] as Event[];
            jest.spyOn(eventRepository, 'findAll').mockResolvedValue(activeEvents);

            const result = await service.findAllEvents(EventStatus.ACTIVE);

            expect(result).toEqual(activeEvents);
            expect(eventRepository.findAll).toHaveBeenCalledWith({ status: EventStatus.ACTIVE });
        });
    });

    describe('activateEvent', () => {
        it('should activate an event successfully', async () => {
            const eventWithTickets = {
                ...mockEvent,
                ticketTypes: [mockTicketType],
            } as Event;

            jest.spyOn(eventRepository, 'findById').mockResolvedValue(eventWithTickets);
            jest.spyOn(eventRepository, 'update').mockResolvedValue({
                ...eventWithTickets,
                status: EventStatus.ACTIVE,
            });

            const result = await service.activateEvent('event-123');

            expect(result.status).toBe(EventStatus.ACTIVE);
        });

        it('should throw BadRequestException when event has no ticket types', async () => {
            const eventWithoutTickets = {
                ...mockEvent,
                ticketTypes: [],
            } as Event;

            jest.spyOn(eventRepository, 'findById').mockResolvedValue(eventWithoutTickets);

            await expect(service.activateEvent('event-123')).rejects.toThrow(BadRequestException);
        });
    });

    describe('getEventAvailability', () => {
        it('should return availability for all ticket types', async () => {
            const eventWithTickets = {
                ...mockEvent,
                ticketTypes: [mockTicketType, { ...mockTicketType, id: 'tt-456', name: 'General' }],
            } as Event;

            jest.spyOn(eventRepository, 'findById').mockResolvedValue(eventWithTickets);
            jest.spyOn(ticketTypeRepository, 'getAvailability').mockResolvedValue(850);

            const result = await service.getEventAvailability('event-123');

            expect(result.eventId).toBe('event-123');
            expect(result.ticketTypes).toHaveLength(2);
            expect(result.ticketTypes[0]).toHaveProperty('available');
        });
    });

    describe('cancelEvent', () => {
        it('should cancel an event', async () => {
            jest.spyOn(eventRepository, 'findById').mockResolvedValue(mockEvent as Event);
            jest.spyOn(eventRepository, 'update').mockResolvedValue({
                ...mockEvent,
                status: EventStatus.CANCELLED,
            } as Event);

            const result = await service.cancelEvent('event-123');

            expect(result.status).toBe(EventStatus.CANCELLED);
        });
    });

    describe('deleteEvent', () => {
        it('should delete an event', async () => {
            jest.spyOn(eventRepository, 'findById').mockResolvedValue(mockEvent as Event);
            jest.spyOn(eventRepository, 'delete').mockResolvedValue(undefined);

            await service.deleteEvent('event-123');

            expect(eventRepository.delete).toHaveBeenCalledWith('event-123');
        });
    });
});