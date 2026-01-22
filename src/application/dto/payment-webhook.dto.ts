import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentWebhookDto {
    @ApiProperty({ example: 'evt_1234567890' })
    @IsString()
    @IsNotEmpty()
    eventId: string;

    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({ example: 'pay_abc123xyz' })
    @IsString()
    @IsNotEmpty()
    paymentId: string;

    @ApiProperty({ example: 'approved' })
    @IsString()
    @IsNotEmpty()
    status: string;

    @ApiProperty({ example: 300.00 })
    @IsNumber()
    amount: number;

    @ApiProperty({ example: '2026-01-19T10:00:00Z' })
    @IsString()
    timestamp: string;
}