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

  it('should not match removed /public/shows routes', async () => {
    const router = new Router();
    router.get('v1/shows', async () => Response.json({ data: [] }));

    const response = await router.handle('GET', 'public/shows', makeContext());
    expect(response).toBeNull();
  });
});
