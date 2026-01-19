import { Tritio, t } from 'tritio';
import { docs } from '@tritio/docs';
import { cors } from '@tritio/cors';
import { rateLimit } from '@tritio/rate-limit';
import { jwt } from '@tritio/jwt';
import { auth } from '@tritio/auth';

// Configurar JWT secret
const JWT_SECRET = 'tu-secreto-super-seguro-cambiar-en-produccion';

// Crear aplicación principal
const app = new Tritio();

// ========================================
// DEMO 1: CORS
// ========================================
app.group('/demo-cors', (group) => {
  group.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    })
  );

  group.get(
    '/test',
    {
      detail: {
        tags: ['CORS Demo'],
        summary: 'Probar CORS',
        description:
          'Endpoint para verificar que los headers CORS están configurados correctamente.',
      },
      response: t.Object({
        message: t.String(),
        corsEnabled: t.Boolean(),
      }),
    },
    () => ({
      message: 'CORS está habilitado. Verifica los headers de la respuesta.',
      corsEnabled: true,
    })
  );
});

// ========================================
// DEMO 2: Rate Limiting
// ========================================
app.group('/demo-ratelimit', (group) => {
  // Límite: 5 requests por minuto
  group.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      message: {
        error: 'Demasiadas peticiones',
        details: 'Por favor, espera 1 minuto antes de intentar de nuevo',
      },
    })
  );

  group.get(
    '/test',
    {
      detail: {
        tags: ['Rate Limit Demo'],
        summary: 'Probar Rate Limiting',
        description: 'Endpoint limitado a 5 requests por minuto. Verifica los headers RateLimit-*.',
      },
      response: t.Object({
        message: t.String(),
        timestamp: t.Number(),
      }),
    },
    () => ({
      message: 'Request exitoso. Tienes un límite de 5 requests por minuto.',
      timestamp: Date.now(),
    })
  );
});

// ========================================
// DEMO 3: JWT - Firmar y Verificar Tokens
// ========================================
app.use(
  jwt({
    secret: JWT_SECRET,
    issuer: 'tritio-demo',
    audience: 'tritio-users',
    expiresIn: '1h',
  })
);

// Endpoint para generar un token
app.post(
  '/demo-jwt/sign',
  {
    detail: {
      tags: ['JWT Demo'],
      summary: 'Generar Token JWT',
      description: 'Genera un token JWT firmado con los datos del usuario.',
    },
    body: t.Object({
      userId: t.String({ description: 'ID del usuario' }),
      email: t.String({ format: 'email', description: 'Email del usuario' }),
      role: t.String({ description: 'Rol del usuario', default: 'user' }),
    }),
    response: t.Object({
      token: t.String({ description: 'Token JWT generado' }),
      expiresIn: t.String(),
    }),
  },
  async (ctx) => {
    const token = await ctx.jwt.sign({
      sub: ctx.body.userId,
      email: ctx.body.email,
      role: ctx.body.role,
    });

    return {
      token,
      expiresIn: '1 hour',
    };
  }
);

// Endpoint para verificar un token
app.post(
  '/demo-jwt/verify',
  {
    detail: {
      tags: ['JWT Demo'],
      summary: 'Verificar Token JWT',
      description: 'Verifica y decodifica un token JWT.',
    },
    body: t.Object({
      token: t.String({ description: 'Token JWT a verificar' }),
    }),
    response: t.Object({
      valid: t.Boolean(),
      payload: t.Optional(
        t.Object({
          sub: t.String(),
          email: t.String(),
          role: t.String(),
        })
      ),
    }),
  },
  async (ctx) => {
    const payload = await ctx.jwt.verify<{
      sub: string;
      email: string;
      role: string;
    }>(ctx.body.token);

    return {
      valid: payload !== null,
      payload: payload || undefined,
    };
  }
);

// ========================================
// DEMO 4: Auth - Rutas Protegidas
// ========================================

// Primero configuramos JWT para que Auth pueda usarlo
const authApp = new Tritio().use(
  jwt({
    secret: JWT_SECRET,
    issuer: 'tritio-demo',
    expiresIn: '1h',
  })
);

// Luego agregamos Auth, excluyendo rutas públicas
authApp.use(
  auth<{ sub: string; email: string; role: string }>({
    exclude: ['/login', '/public'],
  })
);

// Ruta pública - Login
authApp.post(
  '/login',
  {
    detail: {
      tags: ['Auth Demo'],
      summary: 'Login (público)',
      description: 'Genera un token de autenticación. Esta ruta NO requiere autenticación.',
    },
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
    }),
    response: t.Object({
      token: t.String(),
      message: t.String(),
    }),
  },
  async (ctx) => {
    // En producción, verificar credenciales contra DB
    const token = await ctx.jwt.sign({
      sub: 'user-123',
      email: ctx.body.email,
      role: 'user',
    });

    return {
      token,
      message: 'Login exitoso. Usa este token en el header Authorization: Bearer <token>',
    };
  }
);

// Ruta pública - Info
authApp.get(
  '/public',
  {
    detail: {
      tags: ['Auth Demo'],
      summary: 'Info pública',
      description: 'Endpoint público que NO requiere autenticación.',
    },
    response: t.Object({
      message: t.String(),
      requiresAuth: t.Boolean(),
    }),
  },
  () => ({
    message: 'Esta ruta es pública y no requiere autenticación',
    requiresAuth: false,
  })
);

// Ruta protegida - Perfil
authApp.get(
  '/profile',
  {
    detail: {
      tags: ['Auth Demo'],
      summary: 'Perfil (protegido)',
      description:
        'Endpoint protegido que REQUIERE autenticación. Usa: Authorization: Bearer <token>',
      security: [{ Bearer: [] }],
    },
    response: t.Object({
      message: t.String(),
      user: t.Object({
        sub: t.String(),
        email: t.String(),
        role: t.String(),
      }),
    }),
  },
  (ctx) => ({
    message: '¡Autenticado exitosamente!',
    user: ctx.user,
  })
);

// Ruta protegida - Datos sensibles
authApp.get(
  '/secure-data',
  {
    detail: {
      tags: ['Auth Demo'],
      summary: 'Datos seguros (protegido)',
      description: 'Endpoint que retorna datos sensibles. REQUIERE autenticación.',
      security: [{ Bearer: [] }],
    },
    response: t.Object({
      data: t.Array(t.String()),
      accessedBy: t.String(),
    }),
  },
  (ctx) => ({
    data: ['dato-confidencial-1', 'dato-confidencial-2', 'dato-confidencial-3'],
    accessedBy: ctx.user.email,
  })
);

// Montar el módulo de auth en la app principal
app.mount('/demo-auth', authApp);

// ========================================
// DEMO 5: Documentación con Scalar
// ========================================
app.use(docs());

// ========================================
// Iniciar servidor
// ========================================
console.log('🚀 Tritio Playground Demo');
console.log('================================');
console.log('📚 Documentación: http://localhost:3000/reference');
console.log('');
console.log('🧪 Demos disponibles:');
console.log('  1. CORS:        GET  /demo-cors/test');
console.log('  2. Rate Limit:  GET  /demo-ratelimit/test (5 req/min)');
console.log('  3. JWT Sign:    POST /demo-jwt/sign');
console.log('  4. JWT Verify:  POST /demo-jwt/verify');
console.log('  5. Auth Login:  POST /demo-auth/login');
console.log('  6. Auth Public: GET  /demo-auth/public');
console.log('  7. Auth Profile: GET /demo-auth/profile (requiere token)');
console.log('  8. Auth Secure:  GET /demo-auth/secure-data (requiere token)');
console.log('================================');

app.listen(3000);
