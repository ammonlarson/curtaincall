import { describe, it, expect } from 'vitest';
import { Router } from '../router.js';

function makeContext(query: Record<string, string> = {}) {
  return { query, body: undefined, headers: {} };
}

describe('v1 show routes', () => {
  it('should match GET /v1/shows', async () => {
    const router = new Router();
    router.get('v1/shows', async () => Response.json({ matched: 'list' }));

    const response = await router.handle('GET', 'v1/shows', makeContext());
    expect(response).not.toBeNull();
    const body = await response!.json();
    expect(body.matched).toBe('list');
  });

  it('should match GET /v1/shows/search', async () => {
    const router = new Router();
    router.get('v1/shows/search', async () => Response.json({ matched: 'search' }));

    const response = await router.handle('GET', 'v1/shows/search', makeContext());
    expect(response).not.toBeNull();
    const body = await response!.json();
    expect(body.matched).toBe('search');
  });

  it('should match GET /v1/shows/:id with path parameter', async () => {
    const router = new Router();
    router.get('v1/shows/:id', async (ctx) => Response.json({ id: ctx.params['id'] }));

    const response = await router.handle('GET', 'v1/shows/abc-123', makeContext());
    expect(response).not.toBeNull();
    const body = await response!.json();
    expect(body.id).toBe('abc-123');
  });

  it('should return null for unmatched v1 route', async () => {
    const router = new Router();
    router.get('v1/shows', async () => Response.json({}));

    const response = await router.handle('GET', 'v1/unknown', makeContext());
    expect(response).toBeNull();
  });
});

describe('public and v1 routes coexist', () => {
  it('should match both /public/shows and /v1/shows to the same handler', async () => {
    const handler = async () => Response.json({ data: [] });
    const router = new Router();
    router.get('public/shows', handler);
    router.get('v1/shows', handler);

    const publicResponse = await router.handle('GET', 'public/shows', makeContext());
    const v1Response = await router.handle('GET', 'v1/shows', makeContext());

    expect(publicResponse).not.toBeNull();
    expect(v1Response).not.toBeNull();

    const publicBody = await publicResponse!.json();
    const v1Body = await v1Response!.json();
    expect(publicBody).toEqual(v1Body);
  });

  it('should match both /public/shows/:id and /v1/shows/:id', async () => {
    const handler = async (ctx: { params: Record<string, string> }) =>
      Response.json({ id: ctx.params['id'] });
    const router = new Router();
    router.get('public/shows/:id', handler);
    router.get('v1/shows/:id', handler);

    const publicResponse = await router.handle('GET', 'public/shows/test-id', makeContext());
    const v1Response = await router.handle('GET', 'v1/shows/test-id', makeContext());

    expect(publicResponse).not.toBeNull();
    expect(v1Response).not.toBeNull();

    const publicBody = await publicResponse!.json();
    const v1Body = await v1Response!.json();
    expect(publicBody.id).toBe('test-id');
    expect(v1Body.id).toBe('test-id');
  });

  it('should match both /public/shows/search and /v1/shows/search', async () => {
    const handler = async () => Response.json({ data: [] });
    const router = new Router();
    router.get('public/shows/search', handler);
    router.get('v1/shows/search', handler);

    const publicResponse = await router.handle('GET', 'public/shows/search', makeContext({ q: 'ham' }));
    const v1Response = await router.handle('GET', 'v1/shows/search', makeContext({ q: 'ham' }));

    expect(publicResponse).not.toBeNull();
    expect(v1Response).not.toBeNull();
  });
});
