import { Tritio, t } from 'tritio';
import { rateLimit } from '@tritio/rate-limit';

// Crear app de prueba con rate limit
export const testApp = new Tritio();

// Aplicar rate limit: máximo 5 peticiones por minuto
testApp.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // máximo 5 peticiones
    message: {
      error: 'Demasiadas peticiones',
      details: 'Has excedido el límite de 5 peticiones por minuto. Intenta de nuevo más tarde.',
    },
  })
);

testApp.get(
  '/ping',
  {
    detail: {
      tags: ['Test'],
      summary: 'Test endpoint con rate limiting',
      description: 'Endpoint de prueba limitado a 5 peticiones por minuto.',
    },
    response: t.Object({
      message: t.String(),
      timestamp: t.Number(),
      requestNumber: t.String(),
    }),
  },
  () => ({
    message: 'Pong! Esta petición fue exitosa.',
    timestamp: Date.now(),
    requestNumber: Math.random().toString(36).substring(7),
  })
);
