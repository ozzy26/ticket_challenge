import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TicketKind } from '../../domain/entities/ticket-type.entity';

export class CreateTicketTypeDto {
    @ApiProperty({ example: 'VIP' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ enum: TicketKind, example: TicketKind.GENERAL })
    @IsEnum(TicketKind)
    type: TicketKind;

    @ApiProperty({ example: 150.00 })
    @IsNotEmpty()
    price: number;

    @ApiProperty({ example: 1000 })
    @IsNotEmpty()
    totalCapacity: number;
}

export class CreateEventDto {
    @ApiProperty({ example: 'Concierto de Rock 2026' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'El mejor concierto del año', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'Estadio Nacional', required: false })
    @IsString()
    @IsOptional()
    venue?: string;

    @ApiProperty({ example: '2026-06-15T20:00:00Z' })
    @IsDateString()
    eventDate: string;

    @ApiProperty({ example: '2026-05-01T00:00:00Z' })
    @IsDateString()
    salesStartDate: string;

    @ApiProperty({ example: '2026-06-15T18:00:00Z' })
    @IsDateString()
    salesEndDate: string;

    @ApiProperty({ type: [CreateTicketTypeDto], required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTicketTypeDto)
    @IsOptional()
    ticketTypes?: CreateTicketTypeDto[];
}