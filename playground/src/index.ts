import { Tritio, t } from 'tritio';
import { docs } from '@tritio/docs';
import { jwt } from '@tritio/jwt';
import { productsApp } from './features/products/routes.js';
import { billingsApp } from './features/billings/routes.js';
import { testRoutes } from './features/test/routes.js';
import { staticPlugin } from '@tritio/static';

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
    const isAdmin = ctx.body.email.includes('admin');
    const isPremium = ctx.body.email.includes('premium');

    const token = await ctx.jwt.sign({
      sub: 'user-' + Math.random().toString(36).substring(7),
      email: ctx.body.email,
      role: isAdmin ? 'admin' : 'user',
      emailVerified: true, // Para testing de guards
      subscription: isPremium ? 'premium' : 'free', // Para testing de guards
    });

    return {
      token,
      user: {
        email: ctx.body.email,
        role: isAdmin ? 'admin' : 'user',
      },
    };
  }
);

app.mount('/auth', authApp);
app.mount('/products', productsApp);
app.mount('/billings', billingsApp);
app.mount('/test', testRoutes);

app.use(
  staticPlugin({
    root: './public',
    prefix: '/public',
  })
);

app.use(docs());

app.listen(3000);
