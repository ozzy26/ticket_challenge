import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEvent } from '../../../domain/entities/payment-event.entity';

@Injectable()
export class PaymentEventRepository {
    constructor(
        @InjectRepository(PaymentEvent)
        private readonly repository: Repository<PaymentEvent>,
    ) { }

    async create(eventData: Partial<PaymentEvent>): Promise<PaymentEvent> {
        const paymentEvent = this.repository.create(eventData);
        return await this.repository.save(paymentEvent);
    }

    async findByEventId(eventId: string): Promise<PaymentEvent | null> {
        return await this.repository.findOne({
            where: { eventId },
        });
    }

    async exists(eventId: string): Promise<boolean> {
        const count = await this.repository.count({
            where: { eventId },
        });
        return count > 0;
    }
}