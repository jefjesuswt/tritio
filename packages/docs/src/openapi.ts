import { HTTPMethod, RouteSchema } from 'tritio';
import { type TObject, type TSchema } from 'typebox';

interface Route {
  method: HTTPMethod;
  path: string;
  schema: RouteSchema;
}

interface OpenApiPaths {
  [key: string]: Record<string, unknown>;
}

export const generateOpenApiSpec = (routes: Route[]) => {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Tritio API',
      version: '1.0.0',
      description: 'Generated automatically by Tritio',
    },
    // Tags globales (opcional, pero ayuda al orden)
    tags: [],
    paths: routes.reduce((acc: OpenApiPaths, route) => {
      // Convertir /users/:id a /users/{id} para OpenAPI
      const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');

      if (!acc[openApiPath]) acc[openApiPath] = {};

      // Extraemos los detalles nuevos
      const { tags, summary, description, security } = route.schema.detail || {};

      acc[openApiPath][route.method.toLowerCase()] = {
        // 🔥 AQUÍ SE INYECTA LA MAGIA
        tags: tags || ['General'], // Si no tiene tag, va a General
        summary: summary || '',
        description: description || '',
        security: security,

        parameters: [
          ...(route.schema.params
            ? Object.entries((route.schema.params as TObject).properties || {}).map(
                ([name, schema]: [string, any]) => ({
                  name,
                  in: 'path',
                  required: true,
                  schema,
                  description: schema.description, // Leemos la descripción de TypeBox
                })
              )
            : []),
          ...(route.schema.query
            ? Object.entries((route.schema.query as TObject).properties || {}).map(
                ([name, schema]: [string, any]) => ({
                  name,
                  in: 'query',
                  required: !(schema as TSchema & { optional?: boolean }).optional,
                  schema,
                  description: schema.description, // Leemos la descripción de TypeBox
                })
              )
            : []),
        ],
        requestBody: route.schema.body
          ? {
              description: (route.schema.body as any).description, // Descripción del body entero
              content: {
                'application/json': {
                  schema: route.schema.body,
                },
              },
            }
          : undefined,
        responses: {
          '200': {
            description: (route.schema.response as any)?.description || 'Successful response',
            content: route.schema.response
              ? {
                  'application/json': { schema: route.schema.response },
                }
              : undefined,
          },
        },
      };
      return acc;
    }, {} as OpenApiPaths),
  };
};
