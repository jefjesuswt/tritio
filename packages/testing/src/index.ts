import { Tritio } from 'tritio';

export interface TestClient {
  get: (path: string, headers?: HeadersInit) => Promise<Response>;
  post: (path: string, body?: unknown, headers?: HeadersInit) => Promise<Response>;
  put: (path: string, body?: unknown, headers?: HeadersInit) => Promise<Response>;
  delete: (path: string, headers?: HeadersInit) => Promise<Response>;
  patch: (path: string, body?: unknown, headers?: HeadersInit) => Promise<Response>;
  request: (path: string, options?: RequestInit) => Promise<Response>;
}

export const treat = (app: Tritio): TestClient => {
  const base = 'http://localhost';

  const fetch = (path: string, init: RequestInit) => {
    return app.fetch(new Request(`${base}${path}`, init));
  };

  return {
    get: (path, headers) => fetch(path, { method: 'GET', headers }),

    post: (path, body, headers) =>
      fetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...headers },
      }),

    put: (path, body, headers) =>
      fetch(path, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...headers },
      }),

    patch: (path, body, headers) =>
      fetch(path, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...headers },
      }),

    delete: (path, headers) => fetch(path, { method: 'DELETE', headers }),

    request: (path, options) => fetch(path, options || {}),
  };
};
