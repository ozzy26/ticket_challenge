import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderService } from '../../application/services/order.service';
import { CreateOrderDto } from '../../application/dto/create-order.dto';

@ApiTags('Orders')
@Controller('api/v1/orders')
export class OrdersController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    @ApiOperation({ summary: 'Crear una orden de pago' })
    @ApiResponse({ status: 201, description: 'Orden creada exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos o reserva expirada' })
    async createOrder(@Body() dto: CreateOrderDto) {
        const order = await this.orderService.createOrder(dto);

        return {
            success: true,
            data: order,
            message: 'Orden creada. Procede con el pago',
            paymentUrl: `https://payment-gateway.com/pay/${order.id}`, // URL simulada
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalles de una orden' })
    @ApiResponse({ status: 200, description: 'Orden encontrada' })
    @ApiResponse({ status: 404, description: 'Orden no encontrada' })
    async getOrder(@Param('id') id: string) {
        return await this.orderService.findOrderById(id);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Obtener todas las órdenes de un usuario' })
    @ApiResponse({ status: 200, description: 'Lista de órdenes' })
    async getUserOrders(@Param('userId') userId: string) {
        return await this.orderService.findUserOrders(userId);
    }
}