import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PaymentService } from '../../application/services/payment.service';
import { PaymentWebhookDto } from '../../application/dto/payment-webhook.dto';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhooksController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('payment/simulate')
    @ApiOperation({ summary: '[DEV] Simular un pago exitoso' })
    @ApiResponse({ status: 200, description: 'Pago simulado' })
    async simulatePayment(@Body() body: { orderId: string }) {
        await this.paymentService.simulatePayment(body.orderId);

        return {
            success: true,
            message: 'Pago simulado exitosamente',
        };
    }
}