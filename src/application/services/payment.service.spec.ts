import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PaymentEventRepository } from '../../infrastructure/database/repositories/payment-event.repository';
import { OrderService } from './order.service';
import { PaymentWebhookDto } from '../dto/payment-webhook.dto';
import { PaymentEvent } from '../../domain/entities/payment-event.entity';

describe('PaymentService', () => {
    let service: PaymentService;
    let paymentEventRepository: PaymentEventRepository;
    let orderService: OrderService;

    const mockPaymentEvent: Partial<PaymentEvent> = {
        id: 'pe-123',
        orderId: 'order-123',
        paymentId: 'pay-123',
        status: 'approved',
        eventId: 'evt-123',
        payload: {},
        processedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentService,
                {
                    provide: PaymentEventRepository,
                    useValue: {
                        exists: jest.fn(),
                        create: jest.fn(),
                        findByEventId: jest.fn(),
                    },
                },
                {
                    provide: OrderService,
                    useValue: {
                        confirmPayment: jest.fn(),
                        failPayment: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PaymentService>(PaymentService);
        paymentEventRepository = module.get<PaymentEventRepository>(PaymentEventRepository);
        orderService = module.get<OrderService>(OrderService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ========================================================================
    // PRUEBAS: processPaymentWebhook
    // ========================================================================

    describe('processPaymentWebhook', () => {

        // ====================================================================
        // Caso 1: Webhook con pago APROBADO (approved)
        // ====================================================================
        it('should process approved payment webhook successfully', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_unique_123',
                orderId: 'order-123',
                paymentId: 'pay_stripe_abc123',
                status: 'approved',
                amount: 300.00,
                timestamp: new Date().toISOString(),
            };

            // Mock: El evento NO existe (primera vez que llega)
            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);

            // Mock: Se crea el registro del evento
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);

            // Mock: Se confirma el pago
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            // EJECUTAR
            await service.processPaymentWebhook(dto);

            // VERIFICACIONES
            expect(paymentEventRepository.exists).toHaveBeenCalledWith(dto.eventId);
            expect(paymentEventRepository.create).toHaveBeenCalledWith({
                orderId: dto.orderId,
                paymentId: dto.paymentId,
                status: dto.status,
                eventId: dto.eventId,
                payload: dto,
            });
            expect(orderService.confirmPayment).toHaveBeenCalledWith(dto.orderId, dto.paymentId);
            expect(orderService.failPayment).not.toHaveBeenCalled();
        });

        // ====================================================================
        // Caso 2: Webhook con pago COMPLETADO (completed)
        // ====================================================================
        it('should process completed payment webhook successfully', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_unique_456',
                orderId: 'order-456',
                paymentId: 'pay_mercadopago_xyz789',
                status: 'completed', // Estado alternativo de éxito
                amount: 500.00,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(dto);

            expect(orderService.confirmPayment).toHaveBeenCalledWith(dto.orderId, dto.paymentId);
        });

        // ====================================================================
        // Caso 3: Webhook con pago RECHAZADO (rejected)
        // ====================================================================
        it('should process rejected payment webhook successfully', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_unique_789',
                orderId: 'order-789',
                paymentId: 'pay_rejected_123',
                status: 'rejected',
                amount: 200.00,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'failPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(dto);

            // VERIFICACIONES
            expect(paymentEventRepository.create).toHaveBeenCalled();
            expect(orderService.failPayment).toHaveBeenCalledWith(dto.orderId, dto.status);
            expect(orderService.confirmPayment).not.toHaveBeenCalled();
        });

        // ====================================================================
        // Caso 4: Webhook con pago FALLIDO (failed)
        // ====================================================================
        it('should process failed payment webhook successfully', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_unique_999',
                orderId: 'order-999',
                paymentId: 'pay_failed_456',
                status: 'failed',
                amount: 150.00,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'failPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(dto);

            expect(orderService.failPayment).toHaveBeenCalledWith(dto.orderId, dto.status);
        });

        // ====================================================================
        // Caso 5: IDEMPOTENCIA - Webhook DUPLICADO (ya procesado)
        // ====================================================================
        it('should ignore duplicate webhook (idempotency)', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_duplicate_123', // El mismo eventId llega 2 veces
                orderId: 'order-123',
                paymentId: 'pay-123',
                status: 'approved',
                amount: 300.00,
                timestamp: new Date().toISOString(),
            };

            // Mock: El evento YA EXISTE (fue procesado anteriormente)
            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(true);

            // EJECUTAR
            await service.processPaymentWebhook(dto);

            // VERIFICACIONES: NO debe hacer nada
            expect(paymentEventRepository.exists).toHaveBeenCalledWith(dto.eventId);
            expect(paymentEventRepository.create).not.toHaveBeenCalled();
            expect(orderService.confirmPayment).not.toHaveBeenCalled();
            expect(orderService.failPayment).not.toHaveBeenCalled();
        });

        // ====================================================================
        // Caso 6: Webhook con estado DESCONOCIDO
        // ====================================================================
        it('should handle unknown payment status gracefully', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_unknown_123',
                orderId: 'order-123',
                paymentId: 'pay-123',
                status: 'unknown_status', // Estado no manejado
                amount: 300.00,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);

            // EJECUTAR
            await service.processPaymentWebhook(dto);

            // VERIFICACIONES: Solo registra el evento, no procesa nada
            expect(paymentEventRepository.create).toHaveBeenCalled();
            expect(orderService.confirmPayment).not.toHaveBeenCalled();
            expect(orderService.failPayment).not.toHaveBeenCalled();
        });

        // ====================================================================
        // Caso 7: Múltiples webhooks del mismo pago (reintentos del gateway)
        // ====================================================================
        it('should handle multiple webhook retries correctly', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_retry_123',
                orderId: 'order-123',
                paymentId: 'pay-123',
                status: 'approved',
                amount: 300.00,
                timestamp: new Date().toISOString(),
            };

            // Primera llamada: procesa
            jest.spyOn(paymentEventRepository, 'exists')
                .mockResolvedValueOnce(false)  // 1ra vez: no existe
                .mockResolvedValueOnce(true)   // 2da vez: ya existe
                .mockResolvedValueOnce(true);  // 3ra vez: ya existe

            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            // Intento 1: Procesa
            await service.processPaymentWebhook(dto);
            expect(orderService.confirmPayment).toHaveBeenCalledTimes(1);

            // Intento 2: Ignora (idempotente)
            await service.processPaymentWebhook(dto);
            expect(orderService.confirmPayment).toHaveBeenCalledTimes(1); // No incrementa

            // Intento 3: Ignora (idempotente)
            await service.processPaymentWebhook(dto);
            expect(orderService.confirmPayment).toHaveBeenCalledTimes(1); // No incrementa
        });

        // ====================================================================
        // Caso 8: Webhook con datos completos y payload personalizado
        // ====================================================================
        it('should store complete webhook payload for audit', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_full_payload_123',
                orderId: 'order-123',
                paymentId: 'pay-123',
                status: 'approved',
                amount: 450.75,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(dto);

            // Verificar que se guardó el payload completo
            expect(paymentEventRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: dto, // El DTO completo se guarda
                }),
            );
        });

        // ====================================================================
        // Caso 9: Webhook llega fuera de orden (tarde)
        // ====================================================================
        it('should handle late webhook arrival correctly', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_late_123',
                orderId: 'order-123',
                paymentId: 'pay-123',
                status: 'approved',
                amount: 300.00,
                timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min atrás
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            // Aún así debe procesarse
            await service.processPaymentWebhook(dto);

            expect(orderService.confirmPayment).toHaveBeenCalled();
        });
    });

    // ========================================================================
    // PRUEBAS: simulatePayment (método auxiliar para desarrollo)
    // ========================================================================

    describe('simulatePayment', () => {

        it('should simulate a successful payment', async () => {
            // Mock del processPaymentWebhook
            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            // EJECUTAR
            await service.simulatePayment({ eventId: "event-test-123", orderId: "order-test-123", paymentId: "paypal" });

            // VERIFICACIONES
            expect(orderService.confirmPayment).toHaveBeenCalled();
            expect(paymentEventRepository.create).toHaveBeenCalled();
        });

        it('should generate unique eventId for each simulation', async () => {
            const request = { eventId: "event-test-1", orderId: "order-test-123", paymentId: "paypal" }
            const requestOne = { eventId: "event-test-12", orderId: "order-test-123", paymentId: "paypal" }
            const requestTwo = { eventId: "event-test-123", orderId: "order-test-123", paymentId: "paypal" }

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            // Simular 3 veces
            await service.simulatePayment(request);
            await service.simulatePayment(requestOne);
            await service.simulatePayment(requestTwo);

            // Cada simulación debe generar un eventId único
            const calls = (paymentEventRepository.create as jest.Mock).mock.calls;
            const eventIds = calls.map(call => call[0].eventId);

            // Verificar que todos los eventIds son diferentes
            const uniqueEventIds = new Set(eventIds);
            expect(uniqueEventIds.size).toBe(3); // 3 eventos únicos
        });
    });

    // ========================================================================
    // PRUEBAS DE INTEGRACIÓN: Escenarios reales
    // ========================================================================

    describe('Real-world scenarios', () => {

        // ====================================================================
        // Escenario 1: Usuario paga con MercadoPago
        // ====================================================================
        it('should handle MercadoPago webhook correctly', async () => {
            const mercadoPagoWebhook: PaymentWebhookDto = {
                eventId: 'mp_evt_12345',
                orderId: 'order-mp-001',
                paymentId: 'mp_payment_67890',
                status: 'approved',
                amount: 299.99,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(mercadoPagoWebhook);

            expect(orderService.confirmPayment).toHaveBeenCalledWith(
                'order-mp-001',
                'mp_payment_67890',
            );
        });

        // ====================================================================
        // Escenario 2: Pago rechazado por fondos insuficientes
        // ====================================================================
        it('should handle insufficient funds rejection', async () => {
            const rejectedWebhook: PaymentWebhookDto = {
                eventId: 'evt_insufficient_funds',
                orderId: 'order-failed-001',
                paymentId: 'pay_failed_001',
                status: 'rejected',
                amount: 500.00,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'failPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(rejectedWebhook);

            expect(orderService.failPayment).toHaveBeenCalledWith(
                'order-failed-001',
                'rejected',
            );
        });

        // ====================================================================
        // Escenario 3: Gateway envía webhook 5 veces (reintentos agresivos)
        // ====================================================================
        it('should handle aggressive webhook retries', async () => {
            const webhook: PaymentWebhookDto = {
                eventId: 'evt_aggressive_retry',
                orderId: 'order-retry-001',
                paymentId: 'pay-retry-001',
                status: 'approved',
                amount: 300.00,
                timestamp: new Date().toISOString(),
            };

            let callCount = 0;
            jest.spyOn(paymentEventRepository, 'exists').mockImplementation(async () => {
                callCount++;
                return callCount > 1; // Primera vez false, luego true
            });

            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            // Simular 5 llamadas
            for (let i = 0; i < 5; i++) {
                await service.processPaymentWebhook(webhook);
            }

            // Solo debe procesar UNA vez
            expect(orderService.confirmPayment).toHaveBeenCalledTimes(1);
            expect(paymentEventRepository.create).toHaveBeenCalledTimes(1);
        });

        // ====================================================================
        // Escenario 4: Dos usuarios compran al mismo tiempo
        // ====================================================================
        it('should handle concurrent payments for different orders', async () => {
            const webhook1: PaymentWebhookDto = {
                eventId: 'evt_concurrent_1',
                orderId: 'order-user1',
                paymentId: 'pay-user1',
                status: 'approved',
                amount: 200.00,
                timestamp: new Date().toISOString(),
            };

            const webhook2: PaymentWebhookDto = {
                eventId: 'evt_concurrent_2',
                orderId: 'order-user2',
                paymentId: 'pay-user2',
                status: 'approved',
                amount: 300.00,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            // Procesar concurrentemente
            await Promise.all([
                service.processPaymentWebhook(webhook1),
                service.processPaymentWebhook(webhook2),
            ]);

            // Ambos deben procesarse
            expect(orderService.confirmPayment).toHaveBeenCalledTimes(2);
            expect(orderService.confirmPayment).toHaveBeenCalledWith('order-user1', 'pay-user1');
            expect(orderService.confirmPayment).toHaveBeenCalledWith('order-user2', 'pay-user2');
        });
    });

    // ========================================================================
    // PRUEBAS DE EDGE CASES
    // ========================================================================

    describe('Edge cases', () => {

        it('should handle webhook with zero amount', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_zero_amount',
                orderId: 'order-free',
                paymentId: 'pay-free',
                status: 'approved',
                amount: 0, // Ticket gratis
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(dto);

            expect(orderService.confirmPayment).toHaveBeenCalled();
        });

        it('should handle webhook with very large amount', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_large_amount',
                orderId: 'order-vip-premium',
                paymentId: 'pay-large',
                status: 'approved',
                amount: 99999.99, // Monto muy alto
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(dto);

            expect(orderService.confirmPayment).toHaveBeenCalled();
        });

        it('should handle webhook with special characters in IDs', async () => {
            const dto: PaymentWebhookDto = {
                eventId: 'evt_special-chars_123@456#789',
                orderId: 'order-special_123',
                paymentId: 'pay-special@456',
                status: 'approved',
                amount: 100.00,
                timestamp: new Date().toISOString(),
            };

            jest.spyOn(paymentEventRepository, 'exists').mockResolvedValue(false);
            jest.spyOn(paymentEventRepository, 'create').mockResolvedValue(mockPaymentEvent as PaymentEvent);
            jest.spyOn(orderService, 'confirmPayment').mockResolvedValue({} as any);

            await service.processPaymentWebhook(dto);

            expect(paymentEventRepository.create).toHaveBeenCalled();
        });
    });
});