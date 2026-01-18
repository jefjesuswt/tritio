import { H3Event, HTTPError as NativeH3Error } from 'h3';
import { GlobalHook, ErrorHook, TransformHook, ContextHook } from '../types';
import { errorHandler, HTTPError } from '../http';
import { logRequest } from '../logger';

export class LifecycleManager<Env> {
  //global
  public onRequestHooks: GlobalHook[] = [];
  public onResponseHooks: Array<(response: any, event: H3Event) => void | Promise<void>> = [];
  public onErrorHooks: ErrorHook[] = [];

  //pipeline
  public onTransformHooks: TransformHook<Env>[] = [];
  public onBeforeHandleHooks: ContextHook<Env>[] = [];
  public onAfterHandleHooks: ContextHook<Env>[] = [];

  addRequest(fn: GlobalHook) {
    this.onRequestHooks.push(fn);
  }
  addResponse(fn: (res: any, event: H3Event) => void) {
    this.onResponseHooks.push(fn);
  }
  addError(fn: ErrorHook) {
    this.onErrorHooks.push(fn);
  }

  addTransform(fn: TransformHook<Env>) {
    this.onTransformHooks.push(fn);
  }
  addBeforeHandle(fn: ContextHook<Env>) {
    this.onBeforeHandleHooks.push(fn);
  }
  addAfterHandle(fn: ContextHook<Env>) {
    this.onAfterHandleHooks.push(fn);
  }

  async runOnRequest(event: H3Event) {
    (event.context as any)._start = performance.now();
    for (const hook of this.onRequestHooks) await hook(event);
  }

  async runOnResponse(response: any, event: H3Event) {
    const start = (event.context as any)._start;
    if (start) {
      const duration = Math.round(performance.now() - start);
      const method = event.req.method || 'GET';
      const path = event.url.pathname || '/';
      logRequest(method, path, response.status || 200, duration);
    }
    for (const hook of this.onResponseHooks) await hook(response, event);
  }

  async runOnError(error: HTTPError | NativeH3Error, event: H3Event) {
    for (const hook of this.onErrorHooks) await hook(event, error);
    return errorHandler(error);
  }
}
