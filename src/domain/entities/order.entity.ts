import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Reservation } from './reservation.entity';

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reservationId: string;

  @OneToOne(() => Reservation, (reservation) => reservation.order)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ nullable: true, length: 255 })
  paymentId: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Index()
  @Column({ unique: true, nullable: true, length: 100 })
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}