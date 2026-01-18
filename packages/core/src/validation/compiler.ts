import Compile from 'typebox/compile';
import { Context, RouteSchema } from '../types';
import { BadRequestException } from '../http/errors';

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
    if (this.paramsCheck && !this.paramsCheck.Check(ctx.params)) {
      throw new BadRequestException({
        message: 'Invalid params',
        cause: [...this.paramsCheck.Errors(ctx.params)],
      });
    }
    if (this.queryCheck && !this.queryCheck.Check(ctx.query)) {
      throw new BadRequestException({
        message: 'Invalid query',
        cause: [...this.queryCheck.Errors(ctx.query)],
      });
    }
    if (this.bodyCheck && !this.bodyCheck.Check(ctx.body)) {
      throw new BadRequestException({
        message: 'Invalid body',
        cause: [...this.bodyCheck.Errors(ctx.body)],
      });
    }
  }

  public hasBodyValidator() {
    return !!this.bodyCheck;
  }
}
