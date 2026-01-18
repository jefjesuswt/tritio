import { TObject, TSchema } from 'typebox';
import { HTTPMethod } from '../http/methods';
import { RouteSchema } from '../types';

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
    paths: routes.reduce((acc: OpenApiPaths, route) => {
      const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');

      if (!acc[openApiPath]) acc[openApiPath] = {};

      acc[openApiPath][route.method.toLowerCase()] = {
        parameters: [
          ...(route.schema.params
            ? Object.entries((route.schema.params as TObject).properties || {}).map(
                ([name, schema]) => ({
                  name,
                  in: 'path',
                  required: true,
                  schema,
                })
              )
            : []),
          ...(route.schema.query
            ? Object.entries((route.schema.query as TObject).properties || {}).map(
                ([name, schema]) => ({
                  name,
                  in: 'query',
                  required: !(schema as TSchema & { optional?: boolean }).optional,
                  schema,
                })
              )
            : []),
        ],
        requestBody: route.schema.body
          ? {
              content: {
                'application/json': {
                  schema: route.schema.body,
                },
              },
            }
          : undefined,
        responses: {
          '200': { description: 'Successful response' },
        },
      };
      return acc;
    }, {} as OpenApiPaths),
  };
};
