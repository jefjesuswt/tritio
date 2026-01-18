import { Tritio, t, type InferApp } from 'tritio';
import { createClient } from 'tritio-client';

const app = new Tritio({
  cors: true,
});

const appWithContext = app.derive((ctx) => {
  const authHeader = ctx.event.runtime?.node?.req.headers['authorization'];
  return {
    user: {
      id: 1,
      role: authHeader === 'Bearer admin' ? 'admin' : 'guest',
    },
    timestamp: Date.now(),
  };
});

const routeApp = appWithContext
  .get(
    '/hello',
    {
      response: t.Object({ message: t.String() }),
    },
    () => {
      return { message: 'Hello from Tritio V1' };
    }
  )
  .post(
    '/echo',
    {
      body: t.Object({ text: t.String() }),
      response: t.Object({ original: t.String(), length: t.Numeric() }),
    },
    (c) => {
      return {
        original: c.body.text,
        length: c.body.text.length,
      };
    }
  )
  .get(
    '/whoami',
    {
      response: t.Object({
        userId: t.Numeric(),
        role: t.String(),
        ts: t.Numeric(),
      }),
    },
    (c) => {
      return {
        userId: c.user.id,
        role: c.user.role,
        ts: c.timestamp,
      };
    }
  );

const authApp = new Tritio().post(
  '/login',
  {
    body: t.Object({ username: t.String(), password: t.String() }),
    response: t.Object({ token: t.String() }),
  },
  (c) => ({ token: c.body.username })
);

const fullApp = routeApp.mount('/auth', authApp);

fullApp.docs();

type AppType = InferApp<typeof fullApp>;

const PORT = 3045;
console.log(`🚀 Server running on http://localhost:${PORT}`);
fullApp.listen(PORT);

const testClient = async () => {
  console.log('\n--- Client Test Starting (Simulation) ---');

  const client = createClient<AppType>(`http://localhost:${PORT}`);

  try {
    const hello = await client.hello.get();
    console.log('✅ client.hello.get() =>', hello);

    const echo = await client.echo.post({ text: 'Tritio Rocks' });
    console.log('✅ client.echo.post() =>', echo);

    const login = await client.auth.login.post({
      username: 'jeff',
      password: '123',
    });
    console.log('✅ client.auth.login.post() =>', login);

    const who = await client.whoami.get();
    console.log('✅ client.whoami.get() =>', who);
  } catch (err) {
    console.error('❌ Client Test Failed:', err);
  }
};

setTimeout(testClient, 1000);
