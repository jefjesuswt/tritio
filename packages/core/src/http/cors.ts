import { H3Event, handleCors } from 'h3';

interface CorsOptions {
    origin?: string[];
    methods?: string[];
    allowHeaders?: string[];
    preflight?: {
        statusCode?: number;
    };
}

export const useCors = (event: H3Event, options?: CorsOptions) => {
    const handled = handleCors(event, {
        origin: options?.origin || '*',
        methods: options?.methods || '*', 
        allowHeaders: options?.allowHeaders || '*',
        preflight: {
            statusCode: options?.preflight?.statusCode || 204
        }
    });
    
    return handled; 
};
