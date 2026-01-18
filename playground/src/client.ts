import { PORT, type fullApp } from 'src';
import type { InferApp } from 'tritio';
import { createClient } from 'tritio-client';

type AppType = InferApp<typeof fullApp>;

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
