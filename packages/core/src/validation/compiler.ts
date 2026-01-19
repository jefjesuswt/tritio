import Compile from 'typebox/compile';
import { Context, RouteSchema } from '../types';
import { UnprocessableEntityException } from '../http/errors';

export class SchemaValidator {
  private bodyCheck: ReturnType<typeof Compile> | null;
  private queryCheck: ReturnType<typeof Compile> | null;
  private paramsCheck: ReturnType<typeof Compile> | null;

  constructor(schema: RouteSchema) {
    this.bodyCheck = schema.body ? Compile(schema.body) : null;
    this.queryCheck = schema.query ? Compile(schema.query) : null;
    this.paramsCheck = schema.params ? Compile(schema.params) : null;
  }

  public validate(ctx: Context<RouteSchema>) {
    const errors: Record<string, unknown[]> = {};

    if (this.paramsCheck && !this.paramsCheck.Check(ctx.params)) {
      errors.params = [...this.paramsCheck.Errors(ctx.params)];
    }
    if (this.queryCheck && !this.queryCheck.Check(ctx.query)) {
      errors.query = [...this.queryCheck.Errors(ctx.query)];
    }
    if (this.bodyCheck && !this.bodyCheck.Check(ctx.body)) {
      errors.body = [...this.bodyCheck.Errors(ctx.body)];
    }

    if (Object.keys(errors).length > 0) {
      throw new UnprocessableEntityException({
        message: 'Validation Failed',
        cause: errors,
      });
    }
  }

  public hasBodyValidator() {
    return !!this.bodyCheck;
  }
}
