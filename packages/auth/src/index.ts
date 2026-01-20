import { getCookie } from 'h3';
import { UnauthorizedException, asPlugin, type Tritio } from 'tritio';
import { type JWTHelper } from '@tritio/jwt';

export interface AuthConfig {
  header?: string;
  scheme?: string;
  cookie?: string;
  exclude?: string[];
  optional?: boolean;
}

type EnvWithJWT = { jwt: JWTHelper };

type AuthUserContext<TUser> = {
  user: TUser;
  isAuthenticated: boolean;
};

export const auth = <TUser = any>(config: AuthConfig = {}) => {
  return <Env extends EnvWithJWT, Schema>(
    app: Tritio<Env, Schema>
  ): Tritio<Env & AuthUserContext<TUser>, Schema> => {
    const headerName = (config.header || 'authorization').toLowerCase();
    const scheme = config.scheme || 'Bearer';
    const exclude = config.exclude || [];
    const optional = config.optional ?? true;

    app.derive(async (ctx) => {
      const path = ctx.event.path;

      if (exclude.some((prefix: string) => path.startsWith(prefix))) {
        if (optional) {
          return {
            user: undefined as any as TUser,
            isAuthenticated: false,
          };
        }
      }

      let token: string | undefined;

      const authHeader = ctx.event.req.headers.get(headerName);
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

      return {
        user: payload as TUser,
        isAuthenticated: true,
      };
    });

    return asPlugin<Env & AuthUserContext<TUser>, Schema>(app);
  };
};

export type AuthenticatedUser<TUser> = TUser extends undefined ? never : TUser;

export const requireAuth = <TUser>(user: TUser | undefined): user is TUser => {
  if (!user) {
    throw new UnauthorizedException({ message: 'Authentication required' });
  }
  return true;
};
