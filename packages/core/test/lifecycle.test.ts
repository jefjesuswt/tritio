import { describe, expect, it } from 'bun:test';
import { treat } from '@tritio/testing';
import { Tritio } from '../src';

describe('Core > Lifecycle', () => {
  it('should execute hooks in order', async () => {
    const app = new Tritio();
    const stack: string[] = [];

    app
      .onRequest(() => {
        stack.push('1. global-request');
      })
      .derive(() => {
        stack.push('2. transform');
        return {};
      })
      .onBeforeHandle(() => {
        stack.push('3. before-handle');
      })
      .onAfterHandle(() => {
        stack.push('5. after-handle');
      }) // Ojo al índice
      .get('/', {}, () => {
        stack.push('4. handler');
        return 'ok';
      });

    const client = treat(app);
    await client.get('/');

    expect(stack).toEqual([
      '1. global-request',
      '2. transform',
      '3. before-handle',
      '4. handler',
      '5. after-handle',
    ]);
  });

  it('should interrupt request if onBeforeHandle returns response', async () => {
    const app = new Tritio();

    app.onBeforeHandle(() => {
      return new Response('Blocked', { status: 401 });
    });

    app.get('/', {}, () => 'Should not run');

    const client = treat(app);
    const res = await client.get('/');

    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Blocked');
  });
});
