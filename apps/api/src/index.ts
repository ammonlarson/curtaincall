import { getDb, closeDb } from './db/database.js';
import { createPublicRouter } from './routes/public.js';
import { createAdminRouter } from './routes/admin.js';
import { getCorsHeaders, handlePreflight } from './middleware/cors.js';

// ─── Lambda Function URL Handler ────────────────────────────────

interface LambdaFunctionUrlEvent {
  requestContext: {
    http: {
      method: string;
      path: string;
    };
  };
  headers: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  cookies?: string[];
}

function parseBody(event: LambdaFunctionUrlEvent): unknown {
  if (!event.body) return undefined;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function responseToLambda(response: Response): Promise<LambdaResponse> {
  const body = await response.text();
  const headers: Record<string, string> = {};
  const cookies: string[] = [];

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      cookies.push(value);
    } else {
      headers[key] = value;
    }
  });

  return {
    statusCode: response.status,
    headers,
    body,
    ...(cookies.length > 0 ? { cookies } : {}),
  };
}

export async function handler(event: LambdaFunctionUrlEvent & { action?: string }): Promise<LambdaResponse> {
  // Handle non-HTTP invocations (EventBridge, CLI)
  if (event.action === 'migrate') {
    const { runMigrations } = await import('./db/migrate.js');
    const db = await getDb();
    await runMigrations(db);
    return { statusCode: 200, headers: {}, body: JSON.stringify({ message: 'Migrations complete' }) };
  }

  if (event.action === 'seed') {
    const { runSeed } = await import('./db/seed.js');
    const db = await getDb();
    await runSeed(db);
    return { statusCode: 200, headers: {}, body: JSON.stringify({ message: 'Seed complete' }) };
  }

  const db = await getDb();
  const publicRouter = createPublicRouter(db);
  const adminRouter = createAdminRouter(db);

  const method = event.requestContext.http.method.toUpperCase();
  const rawPath = event.requestContext.http.path;
  const path = rawPath.replace(/^\/+|\/+$/g, ''); // trim slashes
  const origin = event.headers['origin'];

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    const preflightResponse = handlePreflight(origin);
    return responseToLambda(preflightResponse);
  }

  const context = {
    query: event.queryStringParameters ?? {},
    body: parseBody(event),
    headers: event.headers,
  };

  // Try public routes first, then admin routes
  let response = await publicRouter.handle(method, path, context);
  if (!response) {
    response = await adminRouter.handle(method, path, context);
  }

  if (!response) {
    response = Response.json(
      { error: 'not_found', message: `Route not found: ${method} /${path}`, status: 404 },
      { status: 404 }
    );
  }

  // Add CORS headers to response
  const corsHeaders = getCorsHeaders(origin);
  const lambdaResponse = await responseToLambda(response);
  lambdaResponse.headers = { ...lambdaResponse.headers, ...corsHeaders };

  return lambdaResponse;
}

// ─── Local Development Server ───────────────────────────────────

async function startDevServer() {
  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const db = await getDb();
  const publicRouter = createPublicRouter(db);
  const adminRouter = createAdminRouter(db);

  const server = Bun?.serve?.({
    port,
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      const path = url.pathname.replace(/^\/+|\/+$/g, '');
      const origin = request.headers.get('origin') ?? undefined;

      // Handle CORS preflight
      if (method === 'OPTIONS') {
        return handlePreflight(origin);
      }

      // Parse query params
      const query: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      // Parse body
      let body: unknown = undefined;
      const contentType = request.headers.get('content-type') ?? '';
      if (contentType.includes('application/json') && request.body) {
        try {
          body = await request.json();
        } catch {
          body = undefined;
        }
      }

      // Collect headers
      const headers: Record<string, string | undefined> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const context = { query, body, headers };

      let response = await publicRouter.handle(method, path, context);
      if (!response) {
        response = await adminRouter.handle(method, path, context);
      }

      if (!response) {
        response = Response.json(
          { error: 'not_found', message: `Route not found: ${method} /${path}`, status: 404 },
          { status: 404 }
        );
      }

      // Add CORS headers
      const corsHeaders = getCorsHeaders(origin);
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }

      return response;
    },
  });

  if (server) {
    console.log(`Curtain Call API running on http://localhost:${port}`);
  }
}

// If running with Node.js HTTP (tsx watch), use a Node.js HTTP server
async function startNodeDevServer() {
  const { createServer } = await import('node:http');
  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const db = await getDb();
  const publicRouter = createPublicRouter(db);
  const adminRouter = createAdminRouter(db);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const method = (req.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/+|\/+$/g, '');
    const origin = req.headers['origin'];

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      const preflightResp = handlePreflight(origin);
      res.writeHead(preflightResp.status, Object.fromEntries(preflightResp.headers.entries()));
      res.end();
      return;
    }

    // Parse query params
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Parse body
    let body: unknown = undefined;
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      if (rawBody) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = undefined;
        }
      }
    }

    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }

    const context = { query, body, headers };

    let response = await publicRouter.handle(method, path, context);
    if (!response) {
      response = await adminRouter.handle(method, path, context);
    }

    if (!response) {
      response = Response.json(
        { error: 'not_found', message: `Route not found: ${method} /${path}`, status: 404 },
        { status: 404 }
      );
    }

    // Add CORS headers
    const corsHeaders = getCorsHeaders(origin);
    const responseHeaders: Record<string, string> = { ...corsHeaders };
    const cookies: string[] = [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        cookies.push(value);
      } else {
        responseHeaders[key] = value;
      }
    });

    if (cookies.length > 0) {
      responseHeaders['Set-Cookie'] = cookies.join(', ');
    }
    res.writeHead(response.status, responseHeaders);
    res.end(await response.text());
  });

  server.listen(port, () => {
    console.log(`Curtain Call API running on http://localhost:${port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    server.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Detect environment and start appropriately
const isLambda = !!process.env['AWS_LAMBDA_FUNCTION_NAME'];
if (!isLambda) {
  // Check if Bun is available
  if (typeof globalThis.Bun !== 'undefined') {
    startDevServer().catch(console.error);
  } else {
    startNodeDevServer().catch(console.error);
  }
}

// Type augmentation for Bun global
declare global {
  // eslint-disable-next-line no-var
  var Bun: { serve: (opts: { port: number; fetch: (req: Request) => Promise<Response> }) => unknown } | undefined;
}
