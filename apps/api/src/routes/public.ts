import type { Kysely } from 'kysely';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SHOW_CATEGORIES } from '@curtaincall/shared';
import type { Database } from '../db/types.js';
import { Router } from '../router.js';

export function createPublicRouter(db: Kysely<Database>): Router {
  const router = new Router();

  // GET /health - Health check
  router.get('health', async () => {
    try {
      // Verify database connectivity
      const result = await db.selectFrom('shows').select(db.fn.count<number>('id').as('count')).executeTakeFirst();
      return Response.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        shows_count: result?.count ?? 0,
      });
    } catch (err) {
      return Response.json(
        { status: 'error', message: 'Database connection failed' },
        { status: 503 }
      );
    }
  });

  // GET /v1/categories - List available categories
  router.get('v1/categories', async () => {
    return Response.json({
      data: SHOW_CATEGORIES,
    });
  });

  const handleListShows: import('../router.js').RouteHandler = async (ctx) => {
    const page = Math.max(1, parseInt(ctx.query['page'] ?? '1', 10) || 1);
    const perPage = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(ctx.query['per_page'] ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    );
    const offset = (page - 1) * perPage;

    const category = ctx.query['category'];
    const running = ctx.query['running'];
    const search = ctx.query['q'];
    const sortBy = ctx.query['sort'] ?? 'title';
    const sortOrder = ctx.query['order'] === 'desc' ? 'desc' as const : 'asc' as const;

    // Build query
    let query = db.selectFrom('shows');
    let countQuery = db.selectFrom('shows');

    // Filter by category
    if (category && (SHOW_CATEGORIES as readonly string[]).includes(category)) {
      query = query.where('category', '=', category);
      countQuery = countQuery.where('category', '=', category);
    }

    // Filter by running status
    if (running === 'true') {
      query = query.where('is_currently_running', '=', true);
      countQuery = countQuery.where('is_currently_running', '=', true);
    } else if (running === 'false') {
      query = query.where('is_currently_running', '=', false);
      countQuery = countQuery.where('is_currently_running', '=', false);
    }

    // Search by title (case-insensitive LIKE)
    if (search && search.trim().length > 0) {
      const searchPattern = `%${search.trim()}%`;
      query = query.where('title', 'ilike', searchPattern);
      countQuery = countQuery.where('title', 'ilike', searchPattern);
    }

    // Get total count
    const totalResult = await countQuery
      .select(db.fn.count<number>('id').as('count'))
      .executeTakeFirst();
    const total = Number(totalResult?.count ?? 0);

    // Sort
    const allowedSorts = ['title', 'opening_date', 'created_at', 'theater', 'category'] as const;
    type AllowedSort = typeof allowedSorts[number];
    const sortColumn = (allowedSorts as readonly string[]).includes(sortBy)
      ? (sortBy as AllowedSort)
      : 'title';

    // Fetch shows
    const shows = await query
      .selectAll()
      .orderBy(sortColumn, sortOrder)
      .limit(perPage)
      .offset(offset)
      .execute();

    return Response.json({
      data: shows,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    });
  };

  const handleSearchShows: import('../router.js').RouteHandler = async (ctx) => {
    const q = ctx.query['q']?.trim();

    if (!q || q.length === 0) {
      return Response.json({ data: [] });
    }

    const shows = await db
      .selectFrom('shows')
      .where('title', 'ilike', `%${q}%`)
      .selectAll()
      .orderBy('title', 'asc')
      .limit(20)
      .execute();

    return Response.json({ data: shows });
  };

  const handleGetShow: import('../router.js').RouteHandler = async (ctx) => {
    const { id } = ctx.params;

    const show = await db
      .selectFrom('shows')
      .where('id', '=', id!)
      .selectAll()
      .executeTakeFirst();

    if (!show) {
      return Response.json(
        { error: 'not_found', message: 'Show not found', status: 404 },
        { status: 404 }
      );
    }

    return Response.json({ data: show });
  };

  router.get('v1/shows', handleListShows);
  router.get('v1/shows/search', handleSearchShows);
  router.get('v1/shows/:id', handleGetShow);

  return router;
}
