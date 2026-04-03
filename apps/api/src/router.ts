export interface RequestContext {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string | undefined>;
  method: string;
  path: string;
}

export type RouteHandler = (context: RequestContext) => Promise<Response>;

interface Route {
  method: string;
  pattern: string;
  segments: string[];
  handler: RouteHandler;
}

/**
 * Simple path-based router following Greenspace patterns.
 * Supports path parameters like /shows/:id.
 */
export class Router {
  private routes: Route[] = [];

  get(path: string, handler: RouteHandler): void {
    this.addRoute('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.addRoute('POST', path, handler);
  }

  patch(path: string, handler: RouteHandler): void {
    this.addRoute('PATCH', path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.addRoute('DELETE', path, handler);
  }

  private addRoute(method: string, pattern: string, handler: RouteHandler): void {
    const segments = pattern.split('/').filter(Boolean);
    this.routes.push({ method, pattern, segments, handler });
  }

  /**
   * Match and handle a request. Returns null if no route matched.
   */
  async handle(method: string, path: string, context: Omit<RequestContext, 'params' | 'method' | 'path'>): Promise<Response | null> {
    const pathSegments = path.split('/').filter(Boolean);

    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== pathSegments.length) continue;

      const params: Record<string, string> = {};
      let matched = true;

      for (let i = 0; i < route.segments.length; i++) {
        const routeSegment = route.segments[i]!;
        const pathSegment = pathSegments[i]!;

        if (routeSegment.startsWith(':')) {
          params[routeSegment.slice(1)] = pathSegment;
        } else if (routeSegment !== pathSegment) {
          matched = false;
          break;
        }
      }

      if (matched) {
        const fullContext: RequestContext = {
          ...context,
          params,
          method,
          path,
        };

        try {
          return await route.handler(fullContext);
        } catch (err) {
          console.error(`Error handling ${method} ${path}:`, err);
          return Response.json(
            {
              error: 'internal_server_error',
              message: 'An unexpected error occurred',
              status: 500,
            },
            { status: 500 }
          );
        }
      }
    }

    return null;
  }
}
