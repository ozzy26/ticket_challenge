import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentEventRepository } from '../../infrastructure/database/repositories/payment-event.repository';
import { OrderService } from './order.service';
import { PaymentWebhookDto } from '../dto/payment-webhook.dto';
import { SimulatePaymentDto } from '../dto/simulate-payment.dto';

@Injectable()
export class PaymentService {
    constructor(
        private readonly paymentEventRepository: PaymentEventRepository,
        private readonly orderService: OrderService,
    ) { }

    /**
     * Procesa el webhook de pago con idempotencia
     */
    async processPaymentWebhook(dto: PaymentWebhookDto): Promise<void> {
        // 1. Verificar idempotencia usando el eventId del webhook
        const exists = await this.paymentEventRepository.exists(dto.eventId);
        if (exists) {
            console.log(`⚠️ Webhook duplicado ignorado: ${dto.eventId}`);
            return;
        }

        // 2. Registrar el evento para prevenir procesamiento duplicado
        await this.paymentEventRepository.create({
            orderId: dto.orderId,
            paymentId: dto.paymentId,
            status: dto.status,
            eventId: dto.eventId,
            payload: dto,
        });

        // 3. Procesar según el estado del pago
        if (dto.status === 'approved' || dto.status === 'completed') {
            await this.orderService.confirmPayment(dto.orderId, dto.paymentId);
        } else if (dto.status === 'rejected' || dto.status === 'failed') {
            await this.orderService.failPayment(dto.orderId, dto.status);
        } else {
            console.log(`⚠️ Estado de pago no manejado: ${dto.status}`);
        }
    }

    /**
     * Simula un pago exitoso (solo para desarrollo/testing)
     */
    async simulatePayment(body: SimulatePaymentDto): Promise<void> {
        await this.processPaymentWebhook({
            eventId: body.eventId,
            orderId: body.orderId,
            paymentId: body.paymentId,
            status: 'approved',
            amount: 0,
            timestamp: new Date().toISOString(),
        });
    }
}