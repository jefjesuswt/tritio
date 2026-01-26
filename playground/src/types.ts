import { type JWTHelper } from '@tritio/jwt';

export interface User {
  sub: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  subscription?: 'free' | 'premium' | 'enterprise';
}

export interface AppDefs {
  store: {
    user: User;
    isAuthenticated: boolean;
  };
  decorators: {
    jwt: JWTHelper;
  };
  schema: {};
}
