# 🎟️ Sistema de Venta de Tickets

Sistema de venta de entradas para eventos con prevención de sobreventa, gestión de reservas temporales y manejo de alta concurrencia.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación Local](#instalación-local)
- [Instalación con Docker](#instalación-con-docker)
- [Configuración](#configuración)
- [Ejecutar Tests](#ejecutar-tests)
- [Documentación API](#documentación-api)

---

## ✨ Características

### Funcionalidades Principales

- ✅ **Prevención de Sobreventa**: Implementación de Optimistic Locking con TypeORM
- ✅ **Reservas Temporales**: TTL de 10 minutos con liberación automática
- ✅ **Idempotencia**: Manejo de pagos duplicados y reintentos
- ✅ **Alta Concurrencia**: Soporte para miles de usuarios simultáneos
- ✅ **Gestión de Eventos**: Creación, actualización y consulta de disponibilidad
- ✅ **Webhooks de Pago**: Procesamiento asíncrono de notificaciones

### Características Técnicas

- 🏗️ **Arquitectura DDD** (Domain-Driven Design)
- 🔒 **Estrategias de Locking**: Optimistic
- 📦 **SOLID Principles**
- 🧪 **Tests Unitarios** con Jest
- 📚 **Documentación Swagger** automática
- 🐳 **Docker** ready
- ⏰ **CRON Jobs** para limpieza automática

---

## 🏗️ Arquitectura

```
src/
├── domain/                    # Capa de Dominio
│   └── entities/             # Entidades TypeORM
│       ├── event.entity.ts
│       ├── ticket-type.entity.ts
│       ├── ticket.entity.ts
│       ├── reservation.entity.ts
│       ├── order.entity.ts
│       └── payment-event.entity.ts
│
├── application/              # Capa de Aplicación
│   ├── services/            # Lógica de negocio
│   │   ├── event.service.ts
│   │   ├── reservation.service.ts
│   │   ├── order.service.ts
│   │   └── payment.service.ts
│   └── dto/                 # Data Transfer Objects
│
├── infrastructure/          # Capa de Infraestructura
│   └── database/
│       └── repositories/    # Repositorios TypeORM
│
├── presentation/            # Capa de Presentación
│   └── controllers/         # Controladores REST
│
└── modules/                 # Módulos NestJS
```

### Modelo de Dominio

```
Event (Evento)
├── TicketType (Tipo de Entrada)
│   ├── totalCapacity: number
│   ├── reservedCount: number
│   ├── soldCount: number
│   └── Ticket[] (Entradas Individuales)
│
Reservation (Reserva Temporal)
├── expiresAt: Date
├── status: pending|confirmed|expired
└── Ticket[]

Order (Orden de Compra)
├── Reservation
├── status: pending|completed|failed
├── idempotencyKey: string
└── PaymentEvent[]
```

---

## 📦 Requisitos

### Software Necesario

- **Node.js**: v18 o superior
- **PostgreSQL**: v13 o superior
- **npm** o **yarn**
- **Docker** (opcional, recomendado)

---

## 🚀 Instalación Local

### 1. Clonar el Repositorio

```bash
git clone https://github.com/ozzy26/ticket_challenge.git
cd ticket-events
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=tickets_db

# Webhook
WEBHOOK_SECRET=your-webhook-secret-key
```

### 4. Para crear la base de datos

```bash
# Ejecutar comando Docker
docker-compose up -d
```

### 5. Ejecutar Migraciones (Automático)

TypeORM está configurado con `synchronize: true` en desarrollo, creará las tablas automáticamente.

### 6. Iniciar el Servidor

```bash
# Modo desarrollo (con hot-reload)
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

El servidor estará disponible en: `http://localhost:3000`

---

## 🐳 Instalación con Docker

### Opción 1: Docker Compose (Recomendado)

```bash
# Construir e iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Detener servicios
docker-compose down
```

Esto levantará:
- PostgreSQL en puerto `5432`
- App NestJS en puerto `3000`

### Opción 2: Docker Manual

```bash
# Construir imagen
docker build -t ticket-system .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  ticket-system
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USERNAME` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `DB_DATABASE` | Nombre de la base de datos | `tickets_db` |
| `WEBHOOK_SECRET` | Clave secreta para webhooks | - |

---

## 🧪 Ejecutar Tests

### Tests Unitarios

```bash
# Con cobertura
npm run test:cov
```

### Test de Concurrencia Manual

```bash
# En una terminal, iniciar el servidor
npm run start:dev
```

---

## 📚 Documentación API

### Swagger UI

Acceder a: `http://localhost:3000/api/docs`

### Endpoints Principales

#### **Events**

```http
POST   /api/v1/events                  # Crear evento
GET    /api/v1/events                  # Listar eventos
GET    /api/v1/events/:id              # Obtener evento
GET    /api/v1/events/:id/availability # Ver disponibilidad
PUT    /api/v1/events/:id/activate     # Activar evento
```

#### **Reservations**

```http
POST   /api/v1/reservations            # Crear reserva
GET    /api/v1/reservations/:id        # Obtener reserva
DELETE /api/v1/reservations/:id        # Cancelar reserva
```

#### **Orders**

```http
POST   /api/v1/orders                  # Crear orden de pago
GET    /api/v1/orders/:id              # Obtener orden
```

#### **Webhooks**

```http
POST   /api/v1/webhooks/payment        # Webhook de pago
```

### Ejemplos de Uso

#### 1. Crear Evento

```bash
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Concierto de Rock 2026",
    "description": "El mejor concierto del año",
    "venue": "Estadio Nacional",
    "eventDate": "2026-06-15T20:00:00Z",
    "salesStartDate": "2026-05-01T00:00:00Z",
    "salesEndDate": "2026-06-15T18:00:00Z",
    "ticketTypes": [
      {
        "name": "VIP",
        "type": "general",
        "price": 150.00,
        "totalCapacity": 500
      },
      {
        "name": "General",
        "type": "general",
        "price": 50.00,
        "totalCapacity": 5000
      }
    ]
  }'
```

#### 2. Activar Evento

```bash
curl -X PUT http://localhost:3000/api/v1/events/{eventId}/activate
```

#### 3. Crear Reserva

```bash
curl -X POST http://localhost:3000/api/v1/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "ticketTypeId": "{ticketTypeId}",
    "quantity": 2,
    "userId": "user_123"
  }'
```

#### 4. Crear Orden

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "{reservationId}",
    "userId": "user_123",
    "idempotencyKey": "order_unique_key_123"
  }'
```

#### 5. Simular Pago

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/payment/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "{orderId}"
  }'
```