import { describe, expect, it } from 'bun:test';
import { treat } from '@tritio/testing';
import { Tritio } from '../src';

describe('Core > Routing', () => {
  it('should return 200 OK for basic GET', async () => {
    const app = new Tritio();
    app.get('/ping', {}, () => 'pong');

    const client = treat(app);
    const res = await client.get('/ping');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('pong');
  });

  it('should handle route params', async () => {
    const app = new Tritio();
    app.get('/user/:id', {}, (ctx) => {
      return { id: (ctx.params as any).id };
    });

    const client = treat(app);
    const res = await client.get('/user/123');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: '123' });
  });

  it('should return 404 for unknown routes', async () => {
    const app = new Tritio();
    const client = treat(app);
    const res = await client.get('/not-found');

    expect(res.status).toBe(404);
  });
});
