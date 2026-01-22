import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../domain/entities/order.entity';
import { Reservation } from '../domain/entities/reservation.entity';
import { Ticket } from '../domain/entities/ticket.entity';
import { TicketType } from '../domain/entities/ticket-type.entity';
import { OrderRepository } from '../infrastructure/database/repositories/order.repository';
import { ReservationRepository } from '../infrastructure/database/repositories/reservation.repository';
import { TicketRepository } from '../infrastructure/database/repositories/ticket.repository';
import { TicketTypeRepository } from '../infrastructure/database/repositories/ticket-type.repository';
import { OrderService } from '../application/services/order.service';
import { OrdersController } from '../presentation/controllers/orders.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Order, Reservation, Ticket, TicketType])],
    controllers: [OrdersController],
    providers: [
        OrderService,
        OrderRepository,
        ReservationRepository,
        TicketRepository,
        TicketTypeRepository,
    ],
    exports: [OrderService],
})
export class OrdersModule { }