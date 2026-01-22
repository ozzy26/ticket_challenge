import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsString()
    @IsNotEmpty()
    reservationId: string;

    @ApiProperty({ example: 'user_123' })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ example: 'idempotency_abc123', required: false })
    @IsString()
    @IsOptional()
    idempotencyKey?: string;
}