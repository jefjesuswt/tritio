import { Tritio, t } from 'tritio';
import { jwt } from '@tritio/jwt';
import { auth } from '@tritio/auth';
import type { User } from '../../types';

const JWT_SECRET = 'tu-secreto-super-seguro-cambiar-en-produccion';

// Crear app de products con JWT y Auth
export const productsApp = new Tritio()
  .use(
    jwt({
      secret: JWT_SECRET,
      issuer: 'tritio-demo',
      expiresIn: '1h',
    })
  )
  .use(
    auth<User>({
      exclude: ['/public'],
    })
  );

// Ruta pública - Listar productos
productsApp.get(
  '/public',
  {
    detail: {
      tags: ['Products'],
      summary: 'Listar productos (público)',
      description: 'Lista todos los productos disponibles. No requiere autenticación.',
    },
    response: t.Object({
      products: t.Array(
        t.Object({
          id: t.String(),
          name: t.String(),
          price: t.Number(),
          stock: t.Number(),
        })
      ),
    }),
  },
  () => ({
    products: [
      { id: '1', name: 'Laptop', price: 999.99, stock: 10 },
      { id: '2', name: 'Mouse', price: 29.99, stock: 50 },
      { id: '3', name: 'Keyboard', price: 79.99, stock: 30 },
    ],
  })
);

// Ruta protegida - Crear producto
productsApp.post(
  '/',
  {
    detail: {
      tags: ['Products'],
      summary: 'Crear producto (protegido)',
      description: 'Crea un nuevo producto. Requiere autenticación.',
      security: [{ Bearer: [] }],
    },
    body: t.Object({
      name: t.String({ minLength: 1 }),
      price: t.Number({ minimum: 0 }),
      stock: t.Number({ minimum: 0 }),
    }),
    response: t.Object({
      id: t.String(),
      name: t.String(),
      price: t.Number(),
      stock: t.Number(),
      createdBy: t.String(),
    }),
  },
  (ctx) => {
    // ✅ ctx.user está tipado como User
    // ✅ ctx.jwt está tipado como JWTHelper
    return {
      id: Math.random().toString(36).substring(7),
      name: ctx.body.name,
      price: ctx.body.price,
      stock: ctx.body.stock,
      createdBy: ctx.user.email, // ✅ ctx.user.email es string
    };
  }
);

// Ruta protegida - Actualizar producto
productsApp.put(
  '/:id',
  {
    detail: {
      tags: ['Products'],
      summary: 'Actualizar producto (protegido)',
      description: 'Actualiza un producto existente. Requiere autenticación.',
      security: [{ Bearer: [] }],
    },
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      price: t.Optional(t.Number({ minimum: 0 })),
      stock: t.Optional(t.Number({ minimum: 0 })),
    }),
    response: t.Object({
      id: t.String(),
      message: t.String(),
      updatedBy: t.String(),
    }),
  },
  (ctx) => {
    // ✅ ctx.user está completamente tipado
    return {
      id: ctx.params.id,
      message: 'Producto actualizado exitosamente',
      updatedBy: ctx.user.email, // ✅ Tipo correcto
    };
  }
);

// Ruta protegida - Eliminar producto
productsApp.delete(
  '/:id',
  {
    detail: {
      tags: ['Products'],
      summary: 'Eliminar producto (protegido)',
      description: 'Elimina un producto. Requiere autenticación.',
      security: [{ Bearer: [] }],
    },
    params: t.Object({
      id: t.String(),
    }),
    response: t.Object({
      message: t.String(),
      deletedBy: t.Object({
        email: t.String(),
        role: t.String(),
      }),
    }),
  },
  (ctx) => {
    // ✅ Acceso completo a propiedades de user
    return {
      message: `Producto ${ctx.params.id} eliminado`,
      deletedBy: {
        email: ctx.user.email, // ✅ Tipado
        role: ctx.user.role, // ✅ Tipado
      },
    };
  }
);
