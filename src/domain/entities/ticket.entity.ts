import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { TicketType } from './ticket-type.entity';
import { Reservation } from './reservation.entity';

export enum TicketStatus {
    AVAILABLE = 'available',
    RESERVED = 'reserved',
    SOLD = 'sold',
    RELEASED = 'released',
}

@Entity('tickets')
export class Ticket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    ticketTypeId: string;

    @ManyToOne(() => TicketType, (ticketType) => ticketType.tickets, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'ticketTypeId' })
    ticketType: TicketType;

    @Column({ nullable: true })
    reservationId: string;

    @ManyToOne(() => Reservation, (reservation) => reservation.tickets, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'reservationId' })
    reservation: Reservation;

    @Column({ length: 50, nullable: true })
    seatNumber: string;

    @Column({
        type: 'enum',
        enum: TicketStatus,
        default: TicketStatus.AVAILABLE,
    })
    status: TicketStatus;

    @Column({ type: 'timestamp', nullable: true })
    reservedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    reservedUntil: Date;

    @Index()
    @Column({ unique: true, nullable: true, length: 100 })
    ticketCode: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}