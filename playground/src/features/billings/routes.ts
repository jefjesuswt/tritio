import { Tritio, t } from 'tritio';
import { jwt } from '@tritio/jwt';
import { auth } from '@tritio/auth';
import type { User } from '../../types';

const JWT_SECRET = 'tu-secreto-super-seguro-cambiar-en-produccion';

// Crear app de billings con JWT y Auth
export const billingsApp = new Tritio()
  .use(
    jwt({
      secret: JWT_SECRET,
      issuer: 'tritio-demo',
      expiresIn: '1h',
    })
  )
  .use(
    auth<User>({
      // Todas las rutas de billing requieren autenticación
    })
  );

// Listar facturas del usuario
billingsApp.get(
  '/',
  {
    detail: {
      tags: ['Billings'],
      summary: 'Listar facturas',
      description: 'Lista las facturas del usuario autenticado.',
      security: [{ Bearer: [] }],
    },
    response: t.Object({
      billings: t.Array(
        t.Object({
          id: t.String(),
          amount: t.Number(),
          date: t.String(),
          status: t.String(),
        })
      ),
      userEmail: t.String(),
    }),
  },
  (ctx) => {
    // ✅ ctx.user está completamente tipado
    return {
      billings: [
        {
          id: 'bill-1',
          amount: 1029.98,
          date: '2026-01-15',
          status: 'paid',
        },
        {
          id: 'bill-2',
          amount: 109.98,
          date: '2026-01-10',
          status: 'pending',
        },
      ],
      userEmail: ctx.user.email, // ✅ Tipado correctamente
    };
  }
);

// Crear nueva factura
billingsApp.post(
  '/',
  {
    detail: {
      tags: ['Billings'],
      summary: 'Crear factura',
      description: 'Crea una nueva factura para el usuario.',
      security: [{ Bearer: [] }],
    },
    body: t.Object({
      items: t.Array(
        t.Object({
          productId: t.String(),
          quantity: t.Number({ minimum: 1 }),
          price: t.Number({ minimum: 0 }),
        })
      ),
    }),
    response: t.Object({
      billingId: t.String(),
      total: t.Number(),
      createdFor: t.Object({
        userId: t.String(),
        email: t.String(),
      }),
      date: t.String(),
    }),
  },
  (ctx) => {
    // ✅ Cálculo del total
    const total = ctx.body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // ✅ ctx.user tiene todas sus propiedades tipadas
    return {
      billingId: Math.random().toString(36).substring(7),
      total,
      createdFor: {
        userId: ctx.user.sub, // ✅ string
        email: ctx.user.email, // ✅ string
      },
      date: new Date().toISOString(),
    };
  }
);

// Obtener factura específica
billingsApp.get(
  '/:id',
  {
    detail: {
      tags: ['Billings'],
      summary: 'Obtener factura',
      description: 'Obtiene los detalles de una factura específica.',
      security: [{ Bearer: [] }],
    },
    params: t.Object({
      id: t.String(),
    }),
    response: t.Object({
      id: t.String(),
      amount: t.Number(),
      date: t.String(),
      status: t.String(),
      owner: t.Object({
        userId: t.String(),
        email: t.String(),
        role: t.String(),
      }),
    }),
  },
  (ctx) => {
    // ✅ Acceso completo a todas las propiedades de User
    return {
      id: ctx.params.id,
      amount: 1029.98,
      date: '2026-01-15',
      status: 'paid',
      owner: {
        userId: ctx.user.sub, // ✅ Tipado
        email: ctx.user.email, // ✅ Tipado
        role: ctx.user.role, // ✅ Tipado
      },
    };
  }
);

// Pagar factura
billingsApp.post(
  '/:id/pay',
  {
    detail: {
      tags: ['Billings'],
      summary: 'Pagar factura',
      description: 'Procesa el pago de una factura.',
      security: [{ Bearer: [] }],
    },
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      paymentMethod: t.String(),
    }),
    response: t.Object({
      billingId: t.String(),
      status: t.String(),
      paidBy: t.String(),
      paidAt: t.String(),
    }),
  },
  (ctx) => {
    // ✅ ctx.user.email está tipado
    return {
      billingId: ctx.params.id,
      status: 'paid',
      paidBy: ctx.user.email, // ✅ No hay errores de tipo
      paidAt: new Date().toISOString(),
    };
  }
);
