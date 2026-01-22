import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../../domain/entities/order.entity';

@Injectable()
export class OrderRepository {
    constructor(
        @InjectRepository(Order)
        private readonly repository: Repository<Order>,
    ) { }

    async create(orderData: Partial<Order>): Promise<Order> {
        const order = this.repository.create(orderData);
        return await this.repository.save(order);
    }

    async findById(id: string): Promise<Order | null> {
        return await this.repository.findOne({
            where: { id },
            relations: ['reservation', 'reservation.tickets', 'reservation.tickets.ticketType'],
        });
    }

    async findByIdempotencyKey(idempotencyKey: string): Promise<Order | null> {
        return await this.repository.findOne({
            where: { idempotencyKey },
        });
    }

    async findByUserId(userId: string): Promise<Order[]> {
        return await this.repository.find({
            where: { userId },
            relations: ['reservation', 'reservation.tickets'],
            order: { createdAt: 'DESC' },
        });
    }

    async update(id: string, data: Partial<Order>): Promise<Order> {
        await this.repository.update(id, data);
        return await this.findById(id);
    }

    async updateStatus(id: string, status: OrderStatus, paidAt?: Date): Promise<void> {
        const updateData: any = { status };
        if (paidAt) {
            updateData.paidAt = paidAt;
        }
        await this.repository.update(id, updateData);
    }
}