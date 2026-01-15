import { H3Event } from 'h3';
import { HTTPError } from './http-error';

export const errorHandler = (error: any, event?: H3Event) => {
    if (error instanceof HTTPError) {
        return error.getResponse();
    }

    // Fallback for other errors
    const status = error.statusCode || error.status || 500;
    const message = error.statusMessage || error.message || "Internal Server Error";
    
    if (status !== 500) {
       return new Response(JSON.stringify({ 
           error: message,
           data: error.data 
       }), { 
            status: status,
            headers: { "Content-Type": "application/json" }
        }) 
    }

    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
};
