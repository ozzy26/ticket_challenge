import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, CreateDateColumn } from 'typeorm';
import { Ticket } from './ticket.entity';
import { Order } from './order.entity';

export enum ReservationStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
}

@Entity('reservations')
export class Reservation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    eventId: string;

    @OneToMany(() => Ticket, (ticket) => ticket.reservation)
    tickets: Ticket[];

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({
        type: 'enum',
        enum: ReservationStatus,
        default: ReservationStatus.PENDING,
    })
    status: ReservationStatus;

    @OneToOne(() => Order, (order) => order.reservation)
    order: Order;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}