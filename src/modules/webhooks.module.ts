import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEvent } from '../domain/entities/payment-event.entity';
import { PaymentEventRepository } from '../infrastructure/database/repositories/payment-event.repository';
import { PaymentService } from '../application/services/payment.service';
import { WebhooksController } from '../presentation/controllers/webhooks.controller';
import { OrdersModule } from './orders.module';

@Module({
    imports: [TypeOrmModule.forFeature([PaymentEvent]), OrdersModule],
    controllers: [WebhooksController],
    providers: [PaymentService, PaymentEventRepository],
})
export class WebhooksModule { }