import { Tritio } from 'tritio';
import * as dtos from './dtos';
import * as handlers from './handlers';
import type { AppDefs } from '../../types';

export const testRoutes = new Tritio<AppDefs>()
  .get('/ping', { ...dtos.PingSchema }, () => handlers.getPing())
  .get('/public', { ...dtos.PublicSchema }, () => handlers.getPublicMessage())
  .post('/create', { ...dtos.CreateItemSchema }, (ctx) => handlers.createItem(ctx.body.name));
