import { HTTPMethod } from '../http/methods';
import { RouteSchema } from '../types';

export interface RegisteredRoute {
  method: HTTPMethod;
  path: string;
  schema: RouteSchema;
}

export class RouteRegistry {
  private routes: RegisteredRoute[] = [];

  add(method: HTTPMethod, path: string, schema: RouteSchema) {
    this.routes.push({ method, path, schema });
  }

  getAll() {
    return this.routes;
  }
}
