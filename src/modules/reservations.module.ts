import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../domain/entities/reservation.entity';
import { Ticket } from '../domain/entities/ticket.entity';
import { TicketType } from '../domain/entities/ticket-type.entity';
import { ReservationRepository } from '../infrastructure/database/repositories/reservation.repository';
import { TicketRepository } from '../infrastructure/database/repositories/ticket.repository';
import { TicketTypeRepository } from '../infrastructure/database/repositories/ticket-type.repository';
import { ReservationService } from '../application/services/reservation.service';
import { ReservationsController } from '../presentation/controllers/reservations.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Reservation, Ticket, TicketType])],
    controllers: [ReservationsController],
    providers: [
        ReservationService,
        ReservationRepository,
        TicketRepository,
        TicketTypeRepository,
    ],
    exports: [ReservationService, ReservationRepository],
})
export class ReservationsModule { }