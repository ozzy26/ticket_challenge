import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('payment_events')
export class PaymentEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    orderId: string;

    @Column({ length: 255 })
    paymentId: string;

    @Column({ length: 50 })
    status: string;

    @Index()
    @Column({ unique: true, length: 255 })
    eventId: string;

    @Column({ type: 'json', nullable: true })
    payload: any;

    @CreateDateColumn()
    processedAt: Date;
}