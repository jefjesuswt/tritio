import { SignJWT, jwtVerify, type JWTPayload as JosePayload } from 'jose';
import { asPlugin, type Tritio, type TritioDefs } from 'tritio';

export interface JwtConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string | number;
  algorithm?: string;
}

export interface JWTPayload extends JosePayload {
  [key: string]: unknown;
}

export interface JWTHelper {
  sign: (payload: JWTPayload) => Promise<string>;
  verify: <T = JWTPayload>(token: string) => Promise<T | null>;
}

export const jwt = (config: JwtConfig) => {
  const secret = new TextEncoder().encode(config.secret);

  const jwtHelper: JWTHelper = {
    sign: async (payload) => {
      const jwt = new SignJWT(payload).setProtectedHeader({
        alg: config.algorithm || 'HS256',
      });

      if (config.issuer) jwt.setIssuer(config.issuer);
      if (config.audience) jwt.setAudience(config.audience);
      if (config.expiresIn) jwt.setExpirationTime(config.expiresIn);

      jwt.setIssuedAt();
      return await jwt.sign(secret);
    },

    verify: async <T = JWTPayload>(token: string): Promise<T | null> => {
      try {
        const { payload } = await jwtVerify(token, secret, {
          issuer: config.issuer,
          audience: config.audience,
        });
        return payload as T;
      } catch {
        return null;
      }
    },
  };

  return <Defs extends TritioDefs, Schema>(
    app: Tritio<Defs, Schema>
  ): Tritio<
    {
      store: Defs['store'];
      schema: Defs['schema'];
      decorators: Defs['decorators'] & { jwt: JWTHelper };
    },
    Schema
  > => {
    app.decorate('jwt', jwtHelper);

    return asPlugin<
      {
        store: Defs['store'];
        schema: Defs['schema'];
        decorators: Defs['decorators'] & { jwt: JWTHelper };
      },
      Schema
    >(app);
  };
};
