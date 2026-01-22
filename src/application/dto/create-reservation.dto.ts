import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsString()
    @IsNotEmpty()
    ticketTypeId: string;

    @ApiProperty({ example: 2, minimum: 1, maximum: 10 })
    @IsNumber()
    @Min(1)
    @Max(10)
    quantity: number;

    @ApiProperty({ example: 'user_123' })
    @IsString()
    @IsNotEmpty()
    userId: string;
}