import { Tritio, t } from 'tritio';
import { docs } from '@tritio/docs';
import { jwt } from '@tritio/jwt';
import { productsApp } from './features/products/routes.js';
import { billingsApp } from './features/billings/routes.js';
import { testApp } from './features/test/routes.js';

const JWT_SECRET = 'tu-secreto-super-seguro-cambiar-en-produccion';

// Crear aplicación principal
const app = new Tritio();

// ========================================
// Auth - Login endpoint
// ========================================
const authApp = new Tritio().use(
  jwt({
    secret: JWT_SECRET,
    issuer: 'tritio-demo',
    expiresIn: '1h',
  })
);

authApp.post(
  '/login',
  {
    detail: {
      tags: ['Auth'],
      summary: 'Login',
      description: 'Autenticarse y obtener un token JWT.',
    },
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
    }),
    response: t.Object({
      token: t.String(),
      user: t.Object({
        email: t.String(),
        role: t.String(),
      }),
    }),
  },
  async (ctx) => {
    // En producción, verificar credenciales contra DB
    // ✅ ctx.jwt está tipado correctamente
    const token = await ctx.jwt.sign({
      sub: 'user-' + Math.random().toString(36).substring(7),
      email: ctx.body.email,
      role: 'user',
    });

    return {
      token,
      user: {
        email: ctx.body.email,
        role: 'user',
      },
    };
  }
);

// ========================================
// Montar módulos en la app principal
// ========================================

// Montar autenticación
app.mount('/auth', authApp);

// Montar features
app.mount('/products', productsApp);
app.mount('/billings', billingsApp);
app.mount('/test', testApp);

// ========================================
// Documentación
// ========================================
app.use(docs());

// ========================================
// Información de rutas
// ========================================
console.log('🚀 Tritio Modular App Demo');
console.log('================================');
console.log('📚 Documentación: http://localhost:3000/reference');
console.log('');
console.log('🔐 Auth:');
console.log('  POST /auth/login - Obtener token JWT');
console.log('');
console.log('📦 Products:');
console.log('  GET  /products/public - Listar productos (público)');
console.log('  POST /products - Crear producto (requiere token)');
console.log('  PUT  /products/:id - Actualizar producto (requiere token)');
console.log('  DELETE /products/:id - Eliminar producto (requiere token)');
console.log('');
console.log('💰 Billings:');
console.log('  GET  /billings - Listar facturas (requiere token)');
console.log('  POST /billings - Crear factura (requiere token)');
console.log('  GET  /billings/:id - Obtener factura (requiere token)');
console.log('  POST /billings/:id/pay - Pagar factura (requiere token)');
console.log('================================');
console.log('');
console.log('💡 Ejemplo de uso:');
console.log('1. POST /auth/login con { email, password }');
console.log('2. Usar el token en header: Authorization: Bearer <token>');
console.log('3. Acceder a rutas protegidas');
console.log('================================');

app.listen(3000);
