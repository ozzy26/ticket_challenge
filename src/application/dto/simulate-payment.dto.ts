import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SimulatePaymentDto {
    @ApiProperty({ example: '9b4f3a8e-6c1d-4a77-9f2e-8c6b2a3e5d41' })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({ example: 'event_payment_user123' })
    @IsString()
    @IsNotEmpty()
    eventId: string;

    @ApiProperty({ example: 'paypal' })
    @IsString()
    @IsNotEmpty()
    paymentId: string;
}