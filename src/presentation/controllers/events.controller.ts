import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EventService } from '../../application/services/event.service';
import { CreateEventDto } from '../../application/dto/create-event.dto';
import { UpdateEventDto } from '../../application/dto/update-event.dto';
import { EventStatus } from '../../domain/entities/event.entity';

@ApiTags('Events')
@Controller('api/v1/events')
export class EventsController {
    constructor(private readonly eventService: EventService) { }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo evento' })
    @ApiResponse({ status: 201, description: 'Evento creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    async createEvent(@Body() dto: CreateEventDto) {
        return await this.eventService.createEvent(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los eventos' })
    @ApiQuery({ name: 'status', enum: EventStatus, required: false })
    @ApiResponse({ status: 200, description: 'Lista de eventos' })
    async findAllEvents(@Query('status') status?: EventStatus) {
        return await this.eventService.findAllEvents(status);
    }

    @Get('active')
    @ApiOperation({ summary: 'Obtener eventos activos en venta' })
    @ApiResponse({ status: 200, description: 'Lista de eventos activos' })
    async findActiveEvents() {
        return await this.eventService.findActiveEvents();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un evento por ID' })
    @ApiResponse({ status: 200, description: 'Evento encontrado' })
    @ApiResponse({ status: 404, description: 'Evento no encontrado' })
    async findEventById(@Param('id') id: string) {
        return await this.eventService.findEventById(id);
    }

    @Get(':id/availability')
    @ApiOperation({ summary: 'Consultar disponibilidad de tickets de un evento' })
    @ApiResponse({ status: 200, description: 'Disponibilidad de tickets' })
    async getEventAvailability(@Param('id') id: string) {
        return await this.eventService.getEventAvailability(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un evento' })
    @ApiResponse({ status: 200, description: 'Evento actualizado' })
    @ApiResponse({ status: 404, description: 'Evento no encontrado' })
    async updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
        return await this.eventService.updateEvent(id, dto);
    }

    @Put(':id/activate')
    @ApiOperation({ summary: 'Activar un evento para venta' })
    @ApiResponse({ status: 200, description: 'Evento activado' })
    @ApiResponse({ status: 400, description: 'El evento no cumple requisitos' })
    async activateEvent(@Param('id') id: string) {
        return await this.eventService.activateEvent(id);
    }

    @Put(':id/cancel')
    @ApiOperation({ summary: 'Cancelar un evento' })
    @ApiResponse({ status: 200, description: 'Evento cancelado' })
    async cancelEvent(@Param('id') id: string) {
        return await this.eventService.cancelEvent(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un evento' })
    @ApiResponse({ status: 204, description: 'Evento eliminado' })
    @ApiResponse({ status: 404, description: 'Evento no encontrado' })
    async deleteEvent(@Param('id') id: string) {
        await this.eventService.deleteEvent(id);
    }
}