import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventRepository } from '../../infrastructure/database/repositories/event.repository';
import { TicketTypeRepository } from '../../infrastructure/database/repositories/ticket-type.repository';
import { Event, EventStatus } from '../../domain/entities/event.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';

@Injectable()
export class EventService {
    constructor(
        private readonly eventRepository: EventRepository,
        private readonly ticketTypeRepository: TicketTypeRepository,
    ) { }

    async createEvent(dto: CreateEventDto): Promise<Event> {
        // Validaciones
        if (new Date(dto.salesStartDate) >= new Date(dto.salesEndDate)) {
            throw new BadRequestException('La fecha de inicio de ventas debe ser anterior a la fecha de fin');
        }

        if (new Date(dto.salesEndDate) > new Date(dto.eventDate)) {
            throw new BadRequestException('Las ventas deben terminar antes del evento');
        }

        const event = await this.eventRepository.create({
            name: dto.name,
            description: dto.description,
            venue: dto.venue,
            eventDate: new Date(dto.eventDate),
            salesStartDate: new Date(dto.salesStartDate),
            salesEndDate: new Date(dto.salesEndDate),
            status: EventStatus.DRAFT,
        });

        // Crear tipos de tickets si se proporcionaron
        if (dto.ticketTypes && dto.ticketTypes.length > 0) {
            for (const ticketTypeDto of dto.ticketTypes) {
                await this.ticketTypeRepository.create({
                    eventId: event.id,
                    name: ticketTypeDto.name,
                    type: ticketTypeDto.type,
                    price: ticketTypeDto.price,
                    totalCapacity: ticketTypeDto.totalCapacity,
                });
            }
        }

        return await this.eventRepository.findById(event.id);
    }

    async findEventById(id: string): Promise<Event> {
        const event = await this.eventRepository.findById(id);
        if (!event) {
            throw new NotFoundException(`Evento con ID ${id} no encontrado`);
        }
        return event;
    }

    async findAllEvents(status?: EventStatus): Promise<Event[]> {
        return await this.eventRepository.findAll({ status });
    }

    async findActiveEvents(): Promise<Event[]> {
        return await this.eventRepository.findActiveEvents();
    }

    async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
        const event = await this.findEventById(id);

        if (dto.salesStartDate && dto.salesEndDate) {
            if (new Date(dto.salesStartDate) >= new Date(dto.salesEndDate)) {
                throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
            }
        }

        const { ticketTypes, ...eventData } = dto;

        const updateData: Partial<Event> = {
            ...eventData,
            eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined, 
            salesStartDate: dto.salesStartDate ? new Date(dto.salesStartDate) : undefined,
            salesEndDate: dto.salesEndDate ? new Date(dto.salesEndDate) : undefined,
        };

        return await this.eventRepository.update(id, updateData);
    }

    async activateEvent(id: string): Promise<Event> {
        const event = await this.findEventById(id);

        if (!event.ticketTypes || event.ticketTypes.length === 0) {
            throw new BadRequestException('El evento debe tener al menos un tipo de ticket');
        }

        return await this.eventRepository.update(id, { status: EventStatus.ACTIVE });
    }

    async cancelEvent(id: string): Promise<Event> {
        await this.findEventById(id);
        return await this.eventRepository.update(id, { status: EventStatus.CANCELLED });
    }

    async deleteEvent(id: string): Promise<void> {
        await this.findEventById(id);
        await this.eventRepository.delete(id);
    }

    async getEventAvailability(id: string): Promise<any> {
        const event = await this.findEventById(id);

        const availability = await Promise.all(
            event.ticketTypes.map(async (ticketType) => {
                const available = await this.ticketTypeRepository.getAvailability(ticketType.id);
                return {
                    ticketTypeId: ticketType.id,
                    name: ticketType.name,
                    price: ticketType.price,
                    totalCapacity: ticketType.totalCapacity,
                    available,
                    reservedCount: ticketType.reservedCount,
                    soldCount: ticketType.soldCount,
                };
            }),
        );

        return {
            eventId: event.id,
            eventName: event.name,
            ticketTypes: availability,
        };
    }
}