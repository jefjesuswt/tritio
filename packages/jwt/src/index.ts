import { jwtVerify, SignJWT, type JWTPayload as JosePayload } from 'jose';
import { type Tritio } from 'tritio';

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

export const jwt = (config: JwtConfig) => {
  const secret = new TextEncoder().encode(config.secret);
  const alg = config.algorithm || 'HS256';

  const jwtHelper = {
    sign: async (payload: JWTPayload) => {
      const jwt = new SignJWT(payload).setProtectedHeader({ alg }).setIssuedAt();

      if (config.issuer) jwt.setIssuer(config.issuer);
      if (config.audience) jwt.setAudience(config.audience);
      if (config.expiresIn) jwt.setExpirationTime(config.expiresIn);

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

  return <Env, Schema>(app: Tritio<Env, Schema>) => app.decorate('jwt', jwtHelper);
};
