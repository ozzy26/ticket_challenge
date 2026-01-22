import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsModule } from './modules/events.module';
import { ReservationsModule } from './modules/reservations.module';
import { OrdersModule } from './modules/orders.module';
import { WebhooksModule } from './modules/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'tickets_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // synchronize: configService.get('NODE_ENV') !== 'production', // Solo en desarrollo
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    ScheduleModule.forRoot(),
    EventsModule,
    ReservationsModule,
    OrdersModule,
    WebhooksModule,
  ],
})
export class AppModule { }