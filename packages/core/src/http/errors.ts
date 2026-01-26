import { HTTPError as H3Error } from 'h3';

export interface HTTPErrorOptions {
  res?: Response;
  message?: string;
  cause?: unknown;
}

export class HTTPError extends H3Error {
  readonly status: number;
  override statusText: string;
  readonly res?: Response;
  override cause: unknown;

  constructor(status: number, options?: HTTPErrorOptions) {
    super(options?.message || 'HTTP Error');
    this.status = status;
    this.res = options?.res;
    this.cause = options?.cause;

    this.statusText = HTTPError.getStatusText(status);
  }

  override get statusCode(): number {
    return this.status;
  }

  override get statusMessage(): string {
    return this.statusText;
  }

  getResponse(): Response {
    if (this.res) {
      return this.res;
    }
    return new Response(
      JSON.stringify({
        error: this.message || this.statusText,
        data: this.cause, // Use cause for data/validation errors
      }),
      {
        status: this.status,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private static getStatusText(status: number): string {
    switch (status) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 405:
        return 'Method Not Allowed';
      case 406:
        return 'Not Acceptable';
      case 408:
        return 'Request Timeout';
      case 409:
        return 'Conflict';
      case 410:
        return 'Gone';
      case 411:
        return 'Length Required';
      case 412:
        return 'Precondition Failed';
      case 413:
        return 'Payload Too Large';
      case 414:
        return 'URI Too Long';
      case 415:
        return 'Unsupported Media Type';
      case 418:
        return "I'm a teapot";
      case 422:
        return 'Unprocessable Entity';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Internal Server Error';
      case 501:
        return 'Not Implemented';
      case 502:
        return 'Bad Gateway';
      case 503:
        return 'Service Unavailable';
      case 504:
        return 'Gateway Timeout';
      default:
        return 'Error';
    }
  }
}

export class BadRequestException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(400, { message: 'Bad Request', ...options });
  }
}

export class UnauthorizedException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(401, { message: 'Unauthorized', ...options });
  }
}

export class ForbiddenException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(403, { message: 'Forbidden', ...options });
  }
}

export class NotFoundException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(404, { message: 'Not Found', ...options });
  }
}

export class MethodNotAllowedException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(405, { message: 'Method Not Allowed', ...options });
  }
}

export class NotAcceptableException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(406, { message: 'Not Acceptable', ...options });
  }
}

export class RequestTimeoutException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(408, { message: 'Request Timeout', ...options });
  }
}

export class ConflictException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(409, { message: 'Conflict', ...options });
  }
}

export class GoneException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(410, { message: 'Gone', ...options });
  }
}

export class PayloadTooLargeException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(413, { message: 'Payload Too Large', ...options });
  }
}

export class UnsupportedMediaTypeException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(415, { message: 'Unsupported Media Type', ...options });
  }
}

export class UnprocessableEntityException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(422, { message: 'Unprocessable Entity', ...options });
  }
}

export class TooManyRequestsException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(429, { message: 'Too Many Requests', ...options });
  }
}

export class InternalServerErrorException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(500, { message: 'Internal Server Error', ...options });
  }
}

export class NotImplementedException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(501, { message: 'Not Implemented', ...options });
  }
}

export class BadGatewayException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(502, { message: 'Bad Gateway', ...options });
  }
}

export class ServiceUnavailableException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(503, { message: 'Service Unavailable', ...options });
  }
}

export class GatewayTimeoutException extends HTTPError {
  constructor(options?: HTTPErrorOptions) {
    super(504, { message: 'Gateway Timeout', ...options });
  }
}

export const errorHandler = (error: H3Error | HTTPError) => {
  if (error instanceof HTTPError) {
    return error.getResponse();
  }

  const status = error.status || (error as unknown as { status: number }).status || 500;
  const message = error.statusText || error.message || 'Internal Server Error';

  if (status !== 500) {
    return new Response(
      JSON.stringify({
        error: message,
        data: error.data,
      }),
      {
        status: status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // For 500 errors, you can log to your logger here if needed
  // console.error('[500 Error]', error.message);

  return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
};
