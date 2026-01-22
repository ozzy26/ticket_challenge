import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketType } from '../../../domain/entities/ticket-type.entity';

@Injectable()
export class TicketTypeRepository {
    constructor(
        @InjectRepository(TicketType)
        private readonly repository: Repository<TicketType>,
    ) { }

    async create(ticketTypeData: Partial<TicketType>): Promise<TicketType> {
        const ticketType = this.repository.create(ticketTypeData);
        return await this.repository.save(ticketType);
    }

    async findById(id: string): Promise<TicketType | null> {
        return await this.repository.findOne({
            where: { id },
            relations: ['event'],
        });
    }

    async findByEventId(eventId: string): Promise<TicketType[]> {
        return await this.repository.find({
            where: { eventId },
            order: { price: 'ASC' },
        });
    }

    async update(id: string, data: Partial<TicketType>): Promise<TicketType> {
        await this.repository.update(id, data);
        return await this.findById(id);
    }

    async incrementReservedCount(id: string, quantity: number): Promise<void> {
        await this.repository.increment({ id }, 'reservedCount', quantity);
    }

    async decrementReservedCount(id: string, quantity: number): Promise<void> {
        await this.repository.decrement({ id }, 'reservedCount', quantity);
    }

    async incrementSoldCount(id: string, quantity: number): Promise<void> {
        await this.repository.increment({ id }, 'soldCount', quantity);
    }

    async getAvailability(id: string): Promise<number> {
        const ticketType = await this.findById(id);
        if (!ticketType) return 0;

        return ticketType.totalCapacity - ticketType.reservedCount - ticketType.soldCount;
    }
}