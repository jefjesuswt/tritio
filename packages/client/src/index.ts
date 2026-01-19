import type { Client } from './types';

export class TritioClientError extends Error {
  constructor(
    public status: number,
    public data: any,
    public statusText: string
  ) {
    super(`HTTP Error ${status}: ${statusText}`);
    this.name = 'TritioClientError';
  }
}

export const createClient = <T extends Record<string, any>>(baseUrl: string) => {
  const request = async (path: string[], method: string, payload?: unknown): Promise<unknown> => {
    const url = `${baseUrl}/${path.join('/')}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const options: RequestInit = {
      method: method.toUpperCase(),
      headers,
    };

    if (method === 'get' && payload) {
      const params = new URLSearchParams(payload as Record<string, string>).toString();
      const res = await fetch(`${url}?${params}`, options);
      return handleResponse(res);
    }

    if (payload) {
      options.body = JSON.stringify(payload);
    }

    const res = await fetch(url, options);
    return handleResponse(res);
  };

  const handleResponse = async (res: Response) => {
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({
        error: res.statusText || 'Unknown Error',
      }));

      throw new TritioClientError(res.status, errorData, res.statusText);
    }

    if (res.status === 204) return undefined;

    return res.json().catch(() => undefined);
  };

  const buildProxy = (path: string[]): unknown => {
    return new Proxy(() => {}, {
      get(_target, prop) {
        return buildProxy([...path, prop as string]);
      },
      apply(_target, _this, args) {
        const method = path.pop();
        if (!method) throw new Error('Invalid RPC call');

        return request(path, method, args[0]);
      },
    });
  };

  return buildProxy([]) as unknown as Client<T>;
};
