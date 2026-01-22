import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../domain/entities/event.entity';
import { TicketType } from '../domain/entities/ticket-type.entity';
import { EventRepository } from '../infrastructure/database/repositories/event.repository';
import { TicketTypeRepository } from '../infrastructure/database/repositories/ticket-type.repository';
import { EventService } from '../application/services/event.service';
import { EventsController } from '../presentation/controllers/events.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Event, TicketType])],
    controllers: [EventsController],
    providers: [EventService, EventRepository, TicketTypeRepository],
    exports: [EventService, EventRepository, TicketTypeRepository],
})
export class EventsModule { }