import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, VersionColumn, JoinColumn } from 'typeorm';
import { Event } from './event.entity';
import { Ticket } from './ticket.entity';

export enum TicketKind {
    NUMBERED = 'numbered',
    GENERAL = 'general',
}

@Entity('ticket_types')
export class TicketType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    eventId: string;

    @ManyToOne(() => Event, (event) => event.ticketTypes, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'eventId' })
    event: Event;

    @Column({ length: 100 })
    name: string;

    @Column({
        type: 'enum',
        enum: TicketKind,
        default: TicketKind.GENERAL,
    })
    type: TicketKind;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'int' })
    totalCapacity: number;

    @Column({ type: 'int', default: 0 })
    reservedCount: number;

    @Column({ type: 'int', default: 0 })
    soldCount: number;

    @OneToMany(() => Ticket, (ticket) => ticket.ticketType)
    tickets: Ticket[];

    @VersionColumn()
    version: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    // Virtual property
    get availableCount(): number {
        return this.totalCapacity - this.reservedCount - this.soldCount;
    }
}