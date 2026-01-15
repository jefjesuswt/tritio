export const generateOpenApiSpec = (routes: any[]) => {
    return {
        openapi: '3.0.0',
        info: {
            title: 'Tritio API',
            version: '1.0.0',
            description: 'Generated automatically by Tritio'
        },
        paths: routes.reduce((acc, route) => {
            // Convertir formato :id a {id} para OpenAPI
            const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');

            if (!acc[openApiPath]) acc[openApiPath] = {};

            acc[openApiPath][route.method.toLowerCase()] = {
                // Convertir Params y Query a "parameters"
                parameters: [
                    ...(route.schema.params ? Object.entries((route.schema.params as any).properties || {}).map(([name, schema]) => ({
                        name,
                        in: 'path',
                        required: true,
                        schema
                    })) : []),
                    ...(route.schema.query ? Object.entries((route.schema.query as any).properties || {}).map(([name, schema]) => ({
                        name,
                        in: 'query',
                        required: !(schema as any).optional,
                        schema
                    })) : [])
                ],
                // Convertir Body a "requestBody"
                requestBody: route.schema.body ? {
                    content: {
                        'application/json': {
                            schema: route.schema.body
                        }
                    }
                } : undefined,
                responses: {
                    '200': { description: 'Successful response' }
                }
            };
            return acc;
        }, {} as any)
    };
};
