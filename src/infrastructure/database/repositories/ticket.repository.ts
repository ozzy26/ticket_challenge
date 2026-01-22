import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Ticket, TicketStatus } from '../../../domain/entities/ticket.entity';

@Injectable()
export class TicketRepository {
    constructor(
        @InjectRepository(Ticket)
        private readonly repository: Repository<Ticket>,
    ) { }

    async create(ticketData: Partial<Ticket>): Promise<Ticket> {
        const ticket = this.repository.create(ticketData);
        return await this.repository.save(ticket);
    }

    async createMany(ticketsData: Partial<Ticket>[]): Promise<Ticket[]> {
        const tickets = this.repository.create(ticketsData);
        return await this.repository.save(tickets);
    }

    async findById(id: string): Promise<Ticket | null> {
        return await this.repository.findOne({
            where: { id },
            relations: ['ticketType', 'reservation'],
        });
    }

    async findByReservationId(reservationId: string): Promise<Ticket[]> {
        return await this.repository.find({
            where: { reservationId },
            relations: ['ticketType'],
        });
    }

    async updateStatus(ids: string[], status: TicketStatus): Promise<void> {
        await this.repository.update({ id: In(ids) }, { status });
    }

    async updateTicketCode(id: string, ticketCode: string): Promise<void> {
        await this.repository.update(id, { ticketCode });
    }

    async releaseTickets(ticketIds: string[]): Promise<void> {
        await this.repository.update(
            { id: In(ticketIds) },
            {
                status: TicketStatus.RELEASED,
                reservationId: null,
                reservedAt: null,
                reservedUntil: null,
            },
        );
    }

    async findAvailableTickets(ticketTypeId: string, limit: number): Promise<Ticket[]> {
        return await this.repository.find({
            where: {
                ticketTypeId,
                status: TicketStatus.AVAILABLE,
            },
            take: limit,
        });
    }
}