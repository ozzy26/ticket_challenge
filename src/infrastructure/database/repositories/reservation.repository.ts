import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Reservation, ReservationStatus } from '../../../domain/entities/reservation.entity';

@Injectable()
export class ReservationRepository {
    constructor(
        @InjectRepository(Reservation)
        private readonly repository: Repository<Reservation>,
    ) { }

    async create(reservationData: Partial<Reservation>): Promise<Reservation> {
        const reservation = this.repository.create(reservationData);
        return await this.repository.save(reservation);
    }

    async findById(id: string): Promise<Reservation | null> {
        return await this.repository.findOne({
            where: { id },
            relations: ['tickets', 'tickets.ticketType', 'order'],
        });
    }

    async findByUserId(userId: string): Promise<Reservation[]> {
        return await this.repository.find({
            where: { userId },
            relations: ['tickets', 'tickets.ticketType'],
            order: { createdAt: 'DESC' },
        });
    }

    async update(id: string, data: Partial<Reservation>): Promise<Reservation> {
        await this.repository.update(id, data);
        return await this.findById(id);
    }

    async findExpiredReservations(): Promise<Reservation[]> {
        const now = new Date();
        return await this.repository.find({
            where: {
                status: ReservationStatus.PENDING,
                expiresAt: LessThan(now),
            },
            relations: ['tickets', 'tickets.ticketType'],
        });
    }

    async updateStatus(id: string, status: ReservationStatus): Promise<void> {
        await this.repository.update(id, { status });
    }

    async findByIds(ids: string[]): Promise<Reservation[]> {
        return await this.repository.find({
            where: { id: In(ids) },
            relations: ['tickets', 'tickets.ticketType'],
        });
    }
}