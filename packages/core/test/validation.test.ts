import { describe, expect, it } from 'bun:test';
import { treat } from '@tritio/testing';
import { Type } from 'typebox';
import { Tritio } from '../src';

describe('Core > Validation', () => {
  it('should validate body structure', async () => {
    const app = new Tritio();

    app.post(
      '/auth',
      {
        body: Type.Object({
          username: Type.String(),
          age: Type.Number({ minimum: 18 }),
        }),
      },
      () => ({ status: 'ok' })
    );

    const client = treat(app);

    const resOk = await client.post('/auth', { username: 'jeff', age: 25 });
    expect(resOk.status).toBe(200);

    const resFail = await client.post('/auth', { username: 'kid', age: 10 });
    expect(resFail.status).not.toBe(200);

    const resType = await client.post('/auth', { username: 'hacker', age: 'veinte' });
    expect(resType.status).not.toBe(200);
  });
});
