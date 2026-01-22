import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Event, EventStatus } from '../../../domain/entities/event.entity';

@Injectable()
export class EventRepository {
    constructor(
        @InjectRepository(Event)
        private readonly repository: Repository<Event>,
    ) { }

    async create(eventData: Partial<Event>): Promise<Event> {
        const event = this.repository.create(eventData);
        return await this.repository.save(event);
    }

    async findById(id: string): Promise<Event | null> {
        return await this.repository.findOne({
            where: { id },
            relations: ['ticketTypes'],
        });
    }

    async findAll(filters?: { status?: EventStatus }): Promise<Event[]> {
        const where: FindOptionsWhere<Event> = {};

        if (filters?.status) {
            where.status = filters.status;
        }

        return await this.repository.find({
            where,
            relations: ['ticketTypes'],
            order: { eventDate: 'DESC' },
        });
    }

    async update(id: string, data: Partial<Event>): Promise<Event> {
        await this.repository.update(id, data);
        return await this.findById(id);
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }

    async findActiveEvents(): Promise<Event[]> {
        const now = new Date();
        return await this.repository
            .createQueryBuilder('event')
            .where('event.status = :status', { status: EventStatus.ACTIVE })
            .andWhere('event.salesStartDate <= :now', { now })
            .andWhere('event.salesEndDate >= :now', { now })
            .leftJoinAndSelect('event.ticketTypes', 'ticketTypes')
            .orderBy('event.eventDate', 'ASC')
            .getMany();
    }
}