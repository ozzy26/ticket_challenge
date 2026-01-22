import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS
  app.enableCors();

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Sistema de Venta de Tickets')
    .setDescription('API para gestión de eventos y venta de tickets con prevención de sobreventa')
    .setVersion('1.0')
    .addTag('Events', 'Gestión de eventos')
    .addTag('Reservations', 'Reservas temporales de tickets')
    .addTag('Orders', 'Órdenes de compra')
    .addTag('Webhooks', 'Webhooks de pago')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
  🚀 Servidor iniciado en http://localhost:${port}
  📚 Documentación Swagger: http://localhost:${port}/api/docs
  `);
}

bootstrap();