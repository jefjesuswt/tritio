import { getCookie } from 'h3';
import { UnauthorizedException, type Tritio } from 'tritio';

export interface AuthConfig {
  header?: string;
  scheme?: string;
  cookie?: string;
  exclude?: string[];
}

export const auth = <TUser = any>(config: AuthConfig = {}) => {
  return <Env, Schema>(app: Tritio<Env, Schema>) => {
    const headerName = (config.header || 'authorization').toLowerCase();
    const scheme = config.scheme || 'Bearer';
    const exclude = config.exclude || [];

    app.onBeforeHandle(async (ctx: any) => {
      const path = ctx.event.path;

      if (exclude.some((prefix: string) => path.startsWith(prefix))) {
        return;
      }

      let token: string | undefined;

      const authHeader = ctx.event.node.req.headers[headerName];
      if (authHeader && typeof authHeader === 'string') {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === scheme) {
          token = parts[1];
        }
      }

      if (!token && config.cookie) {
        token = getCookie(ctx.event, config.cookie);
      }

      if (!token) {
        throw new UnauthorizedException({ message: 'Missing authentication token' });
      }

      const jwtHelper = ctx.jwt;

      if (!jwtHelper) {
        throw new Error(
          'JWT plugin not installed. Please use .use(jwt(...)) before .use(auth(...))'
        );
      }

      const payload = await jwtHelper.verify(token);

      if (!payload) {
        throw new UnauthorizedException({ message: 'Invalid or expired token' });
      }

      Object.assign(ctx, { user: payload as TUser });
    });

    return app;
  };
};
