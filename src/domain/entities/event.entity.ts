import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TicketType } from './ticket-type.entity';


export enum EventStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
}

@Entity('events')
export class Event {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ length: 500, nullable: true })
    venue: string;

    @Column({ type: 'timestamp' })
    eventDate: Date;

    @Column({ type: 'timestamp' })
    salesStartDate: Date;

    @Column({ type: 'timestamp' })
    salesEndDate: Date;

    @Column({
        type: 'enum',
        enum: EventStatus,
        default: EventStatus.DRAFT,
    })
    status: EventStatus;

    @OneToMany(() => TicketType, (ticketType) => ticketType.event, {
        cascade: true,
    })
    ticketTypes: TicketType[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
