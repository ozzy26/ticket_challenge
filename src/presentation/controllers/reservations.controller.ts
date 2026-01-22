import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ReservationService } from '../../application/services/reservation.service';
import { CreateReservationDto } from '../../application/dto/create-reservation.dto';

@ApiTags('Reservations')
@Controller('api/v1/reservations')
export class ReservationsController {
    constructor(private readonly reservationService: ReservationService) { }

    @Post()
    @ApiOperation({ summary: 'Crear una reserva temporal de tickets' })
    @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 409, description: 'No hay suficientes tickets disponibles' })
    async createReservation(@Body() dto: CreateReservationDto) {
        const reservation = await this.reservationService.createReservation(dto);

        return {
            success: true,
            data: reservation,
            message: `Reserva creada. Tienes 10 minutos para completar el pago`,
            expiresAt: reservation.expiresAt,
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalles de una reserva' })
    @ApiResponse({ status: 200, description: 'Reserva encontrada' })
    @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
    async getReservation(@Param('id') id: string) {
        return await this.reservationService.findReservationById(id);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Obtener todas las reservas de un usuario' })
    @ApiResponse({ status: 200, description: 'Lista de reservas' })
    async getUserReservations(@Param('userId') userId: string) {
        return await this.reservationService.findUserReservations(userId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Cancelar una reserva manualmente' })
    @ApiHeader({ name: 'X-User-Id', required: true })
    @ApiResponse({ status: 204, description: 'Reserva cancelada' })
    @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
    async cancelReservation(
        @Param('id') id: string,
        @Headers('x-user-id') userId: string,
    ) {
        await this.reservationService.cancelReservation(id, userId);
    }
}