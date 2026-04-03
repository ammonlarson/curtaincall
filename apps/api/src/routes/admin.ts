import type { Kysely } from 'kysely';
import {
  validateCreateShowInput,
  validateUpdateShowInput,
  validateCreateAdminInput,
  validateLoginInput,
  validateChangePasswordInput,
  sanitizeShowInput,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@curtaincall/shared';
import type { Database } from '../db/types.js';
import { Router, type RequestContext } from '../router.js';
import { requireAdmin } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { createSession, deleteSession, buildSessionCookie, buildClearSessionCookie } from '../auth/session.js';
import { logAuditEvent } from '../audit.js';
import { generateUploadUrl } from './images.js';

interface AuthenticatedContext extends RequestContext {
  adminId: string;
  sessionId: string;
}

export function createAdminRouter(db: Kysely<Database>): Router {
  const router = new Router();

  // ─── Auth Routes ──────────────────────────────────────────────

  // POST /admin/auth/login
  router.post('admin/auth/login', async (ctx) => {
    const validation = validateLoginInput(ctx.body);
    if (!validation.valid) {
      return Response.json(
        { error: 'validation_error', message: validation.errors.join('; '), status: 400 },
        { status: 400 }
      );
    }

    const { email, password, remember_me } = ctx.body as { email: string; password: string; remember_me?: boolean };

    // Find admin by email
    const admin = await db
      .selectFrom('admins')
      .where('email', '=', email.toLowerCase().trim())
      .selectAll()
      .executeTakeFirst();

    if (!admin) {
      return Response.json(
        { error: 'unauthorized', message: 'Invalid email or password', status: 401 },
        { status: 401 }
      );
    }

    // Verify password
    const credentials = await db
      .selectFrom('admin_credentials')
      .where('admin_id', '=', admin.id)
      .selectAll()
      .executeTakeFirst();

    if (!credentials) {
      return Response.json(
        { error: 'unauthorized', message: 'Invalid email or password', status: 401 },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(password, credentials.password_hash);
    if (!passwordValid) {
      return Response.json(
        { error: 'unauthorized', message: 'Invalid email or password', status: 401 },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = await createSession(db, admin.id, remember_me ?? false);
    const cookie = buildSessionCookie(sessionId, remember_me ?? false);

    await logAuditEvent(db, {
      actor_type: 'admin',
      actor_id: admin.id,
      action: 'admin.login',
      entity_type: 'session',
      entity_id: sessionId,
    });

    return new Response(
      JSON.stringify({
        data: {
          id: admin.id,
          email: admin.email,
          created_at: admin.created_at,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie,
        },
      }
    );
  });

  // GET /admin/auth/me - Check auth status
  router.get(
    'admin/auth/me',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const admin = await db
        .selectFrom('admins')
        .where('id', '=', ctx.adminId)
        .selectAll()
        .executeTakeFirst();

      if (!admin) {
        return Response.json(
          { error: 'not_found', message: 'Admin not found', status: 404 },
          { status: 404 }
        );
      }

      return Response.json({
        data: {
          id: admin.id,
          email: admin.email,
          created_at: admin.created_at,
        },
      });
    })
  );

  // POST /admin/auth/logout
  router.post(
    'admin/auth/logout',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      await deleteSession(db, ctx.sessionId);

      await logAuditEvent(db, {
        actor_type: 'admin',
        actor_id: ctx.adminId,
        action: 'admin.logout',
        entity_type: 'session',
        entity_id: ctx.sessionId,
      });

      return new Response(
        JSON.stringify({ message: 'Logged out successfully' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': buildClearSessionCookie(),
          },
        }
      );
    })
  );

  // POST /admin/auth/change-password
  router.post(
    'admin/auth/change-password',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const validation = validateChangePasswordInput(ctx.body);
      if (!validation.valid) {
        return Response.json(
          { error: 'validation_error', message: validation.errors.join('; '), status: 400 },
          { status: 400 }
        );
      }

      const { current_password, new_password } = ctx.body as { current_password: string; new_password: string };

      // Verify current password
      const credentials = await db
        .selectFrom('admin_credentials')
        .where('admin_id', '=', ctx.adminId)
        .selectAll()
        .executeTakeFirst();

      if (!credentials) {
        return Response.json(
          { error: 'unauthorized', message: 'Credentials not found', status: 401 },
          { status: 401 }
        );
      }

      const currentValid = await verifyPassword(current_password, credentials.password_hash);
      if (!currentValid) {
        return Response.json(
          { error: 'unauthorized', message: 'Current password is incorrect', status: 401 },
          { status: 401 }
        );
      }

      // Hash and store new password
      const newHash = await hashPassword(new_password);

      await db
        .updateTable('admin_credentials')
        .set({ password_hash: newHash })
        .where('admin_id', '=', ctx.adminId)
        .execute();

      await logAuditEvent(db, {
        actor_type: 'admin',
        actor_id: ctx.adminId,
        action: 'admin.change_password',
        entity_type: 'admin',
        entity_id: ctx.adminId,
      });

      return Response.json({ message: 'Password changed successfully' });
    })
  );

  // ─── Show Routes ──────────────────────────────────────────────

  // GET /admin/shows - List all shows with more detail
  router.get(
    'admin/shows',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const page = Math.max(1, parseInt(ctx.query['page'] ?? '1', 10) || 1);
      const perPage = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(ctx.query['per_page'] ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
      );
      const offset = (page - 1) * perPage;

      const totalResult = await db
        .selectFrom('shows')
        .select(db.fn.count<number>('id').as('count'))
        .executeTakeFirst();
      const total = Number(totalResult?.count ?? 0);

      const shows = await db
        .selectFrom('shows')
        .selectAll()
        .orderBy('updated_at', 'desc')
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
    })
  );

  // POST /admin/shows - Create a single show
  router.post(
    'admin/shows',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const validation = validateCreateShowInput(ctx.body);
      if (!validation.valid) {
        return Response.json(
          { error: 'validation_error', message: validation.errors.join('; '), status: 400 },
          { status: 400 }
        );
      }

      const input = sanitizeShowInput(ctx.body as Record<string, unknown>);

      const show = await db.transaction().execute(async (trx) => {
        const created = await trx
          .insertInto('shows')
          .values({
            title: input['title'] as string,
            description: input['description'] as string,
            opening_date: (input['opening_date'] as string) ?? null,
            closing_date: (input['closing_date'] as string) ?? null,
            theater: input['theater'] as string,
            image_url: (input['image_url'] as string) ?? null,
            composer: (input['composer'] as string) ?? null,
            lyricist: (input['lyricist'] as string) ?? null,
            book_writer: (input['book_writer'] as string) ?? null,
            director: (input['director'] as string) ?? null,
            music_director: (input['music_director'] as string) ?? null,
            choreographer: (input['choreographer'] as string) ?? null,
            is_currently_running: (input['is_currently_running'] as boolean) ?? true,
            category: input['category'] as string,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        await logAuditEvent(trx, {
          actor_type: 'admin',
          actor_id: ctx.adminId,
          action: 'show.create',
          entity_type: 'show',
          entity_id: created.id,
          after: created as unknown as Record<string, unknown>,
        });

        return created;
      });

      return Response.json({ data: show }, { status: 201 });
    })
  );

  // POST /admin/shows/bulk - Bulk create shows
  router.post(
    'admin/shows/bulk',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const body = ctx.body;

      if (!Array.isArray(body)) {
        return Response.json(
          { error: 'validation_error', message: 'Request body must be an array of shows', status: 400 },
          { status: 400 }
        );
      }

      if (body.length === 0) {
        return Response.json(
          { error: 'validation_error', message: 'Array must not be empty', status: 400 },
          { status: 400 }
        );
      }

      if (body.length > 50) {
        return Response.json(
          { error: 'validation_error', message: 'Cannot create more than 50 shows at once', status: 400 },
          { status: 400 }
        );
      }

      // Validate all inputs first
      const errors: string[] = [];
      for (let i = 0; i < body.length; i++) {
        const validation = validateCreateShowInput(body[i]);
        if (!validation.valid) {
          errors.push(`Show ${i}: ${validation.errors.join('; ')}`);
        }
      }

      if (errors.length > 0) {
        return Response.json(
          { error: 'validation_error', message: errors.join('\n'), status: 400 },
          { status: 400 }
        );
      }

      const shows = await db.transaction().execute(async (trx) => {
        const created = [];

        for (const item of body) {
          const input = sanitizeShowInput(item as Record<string, unknown>);

          const show = await trx
            .insertInto('shows')
            .values({
              title: input['title'] as string,
              description: input['description'] as string,
              opening_date: (input['opening_date'] as string) ?? null,
              closing_date: (input['closing_date'] as string) ?? null,
              theater: input['theater'] as string,
              image_url: (input['image_url'] as string) ?? null,
              composer: (input['composer'] as string) ?? null,
              lyricist: (input['lyricist'] as string) ?? null,
              book_writer: (input['book_writer'] as string) ?? null,
              director: (input['director'] as string) ?? null,
              music_director: (input['music_director'] as string) ?? null,
              choreographer: (input['choreographer'] as string) ?? null,
              is_currently_running: (input['is_currently_running'] as boolean) ?? true,
              category: input['category'] as string,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

          await logAuditEvent(trx, {
            actor_type: 'admin',
            actor_id: ctx.adminId,
            action: 'show.create',
            entity_type: 'show',
            entity_id: show.id,
            after: show as unknown as Record<string, unknown>,
          });

          created.push(show);
        }

        return created;
      });

      return Response.json({ data: shows, count: shows.length }, { status: 201 });
    })
  );

  // PATCH /admin/shows/:id - Update a show
  router.patch(
    'admin/shows/:id',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const { id } = ctx.params;

      const validation = validateUpdateShowInput(ctx.body);
      if (!validation.valid) {
        return Response.json(
          { error: 'validation_error', message: validation.errors.join('; '), status: 400 },
          { status: 400 }
        );
      }

      const input = sanitizeShowInput(ctx.body as Record<string, unknown>);

      // Build update object with only provided fields
      const updateFields: Record<string, unknown> = {};
      const allowedFields = [
        'title', 'description', 'opening_date', 'closing_date', 'theater',
        'image_url', 'composer', 'lyricist', 'book_writer', 'director',
        'music_director', 'choreographer', 'is_currently_running', 'category',
      ];

      for (const field of allowedFields) {
        if (field in input) {
          updateFields[field] = input[field];
        }
      }

      if (Object.keys(updateFields).length === 0) {
        return Response.json(
          { error: 'validation_error', message: 'No fields to update', status: 400 },
          { status: 400 }
        );
      }

      const show = await db.transaction().execute(async (trx) => {
        // Get current state for audit log
        const before = await trx
          .selectFrom('shows')
          .where('id', '=', id!)
          .selectAll()
          .executeTakeFirst();

        if (!before) return null;

        const updated = await trx
          .updateTable('shows')
          .set(updateFields)
          .where('id', '=', id!)
          .returningAll()
          .executeTakeFirstOrThrow();

        await logAuditEvent(trx, {
          actor_type: 'admin',
          actor_id: ctx.adminId,
          action: 'show.update',
          entity_type: 'show',
          entity_id: id!,
          before: before as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });

        return updated;
      });

      if (!show) {
        return Response.json(
          { error: 'not_found', message: 'Show not found', status: 404 },
          { status: 404 }
        );
      }

      return Response.json({ data: show });
    })
  );

  // DELETE /admin/shows/:id - Delete a show
  router.delete(
    'admin/shows/:id',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const { id } = ctx.params;

      const deleted = await db.transaction().execute(async (trx) => {
        const before = await trx
          .selectFrom('shows')
          .where('id', '=', id!)
          .selectAll()
          .executeTakeFirst();

        if (!before) return null;

        await trx
          .deleteFrom('shows')
          .where('id', '=', id!)
          .execute();

        await logAuditEvent(trx, {
          actor_type: 'admin',
          actor_id: ctx.adminId,
          action: 'show.delete',
          entity_type: 'show',
          entity_id: id!,
          before: before as unknown as Record<string, unknown>,
        });

        return before;
      });

      if (!deleted) {
        return Response.json(
          { error: 'not_found', message: 'Show not found', status: 404 },
          { status: 404 }
        );
      }

      return Response.json({ message: 'Show deleted successfully' });
    })
  );

  // POST /admin/shows/:id/image - Upload show image (presigned URL)
  router.post(
    'admin/shows/:id/image',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const { id } = ctx.params;

      // Check show exists
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

      const { content_type } = ctx.body as { content_type?: string };
      if (!content_type) {
        return Response.json(
          { error: 'validation_error', message: 'content_type is required', status: 400 },
          { status: 400 }
        );
      }

      try {
        const { uploadUrl, imageKey } = await generateUploadUrl(id!, content_type);

        return Response.json({
          data: {
            upload_url: uploadUrl,
            image_key: imageKey,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate upload URL';
        return Response.json(
          { error: 'bad_request', message, status: 400 },
          { status: 400 }
        );
      }
    })
  );

  // ─── Admin Management Routes ──────────────────────────────────

  // GET /admin/admins - List admins
  router.get(
    'admin/admins',
    requireAdmin(db, async (_ctx: AuthenticatedContext) => {
      const admins = await db
        .selectFrom('admins')
        .select(['id', 'email', 'created_at'])
        .orderBy('created_at', 'asc')
        .execute();

      return Response.json({ data: admins });
    })
  );

  // POST /admin/admins - Create admin
  router.post(
    'admin/admins',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const validation = validateCreateAdminInput(ctx.body);
      if (!validation.valid) {
        return Response.json(
          { error: 'validation_error', message: validation.errors.join('; '), status: 400 },
          { status: 400 }
        );
      }

      const { email, password } = ctx.body as { email: string; password: string };
      const normalizedEmail = email.toLowerCase().trim();

      // Check for existing admin
      const existing = await db
        .selectFrom('admins')
        .where('email', '=', normalizedEmail)
        .selectAll()
        .executeTakeFirst();

      if (existing) {
        return Response.json(
          { error: 'conflict', message: 'An admin with this email already exists', status: 409 },
          { status: 409 }
        );
      }

      const passwordHash = await hashPassword(password);

      const admin = await db.transaction().execute(async (trx) => {
        const created = await trx
          .insertInto('admins')
          .values({ email: normalizedEmail })
          .returningAll()
          .executeTakeFirstOrThrow();

        await trx
          .insertInto('admin_credentials')
          .values({
            admin_id: created.id,
            password_hash: passwordHash,
          })
          .execute();

        await logAuditEvent(trx, {
          actor_type: 'admin',
          actor_id: ctx.adminId,
          action: 'admin.create',
          entity_type: 'admin',
          entity_id: created.id,
          after: { id: created.id, email: created.email },
        });

        return created;
      });

      return Response.json(
        {
          data: {
            id: admin.id,
            email: admin.email,
            created_at: admin.created_at,
          },
        },
        { status: 201 }
      );
    })
  );

  // DELETE /admin/admins/:id - Delete admin
  router.delete(
    'admin/admins/:id',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const { id } = ctx.params;

      // Prevent self-deletion
      if (id === ctx.adminId) {
        return Response.json(
          { error: 'bad_request', message: 'Cannot delete your own account', status: 400 },
          { status: 400 }
        );
      }

      const deleted = await db.transaction().execute(async (trx) => {
        const before = await trx
          .selectFrom('admins')
          .where('id', '=', id!)
          .selectAll()
          .executeTakeFirst();

        if (!before) return null;

        await trx
          .deleteFrom('admins')
          .where('id', '=', id!)
          .execute();

        await logAuditEvent(trx, {
          actor_type: 'admin',
          actor_id: ctx.adminId,
          action: 'admin.delete',
          entity_type: 'admin',
          entity_id: id!,
          before: { id: before.id, email: before.email },
        });

        return before;
      });

      if (!deleted) {
        return Response.json(
          { error: 'not_found', message: 'Admin not found', status: 404 },
          { status: 404 }
        );
      }

      return Response.json({ message: 'Admin deleted successfully' });
    })
  );

  // ─── Audit Events Route ───────────────────────────────────────

  // GET /admin/audit-events - Paginated audit log
  router.get(
    'admin/audit-events',
    requireAdmin(db, async (ctx: AuthenticatedContext) => {
      const page = Math.max(1, parseInt(ctx.query['page'] ?? '1', 10) || 1);
      const perPage = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(ctx.query['per_page'] ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
      );
      const offset = (page - 1) * perPage;

      let query = db.selectFrom('audit_events');
      let countQuery = db.selectFrom('audit_events');

      // Optional filters
      const entityType = ctx.query['entity_type'];
      const entityId = ctx.query['entity_id'];
      const actorId = ctx.query['actor_id'];
      const action = ctx.query['action'];

      if (entityType) {
        query = query.where('entity_type', '=', entityType);
        countQuery = countQuery.where('entity_type', '=', entityType);
      }
      if (entityId) {
        query = query.where('entity_id', '=', entityId);
        countQuery = countQuery.where('entity_id', '=', entityId);
      }
      if (actorId) {
        query = query.where('actor_id', '=', actorId);
        countQuery = countQuery.where('actor_id', '=', actorId);
      }
      if (action) {
        query = query.where('action', '=', action);
        countQuery = countQuery.where('action', '=', action);
      }

      const totalResult = await countQuery
        .select(db.fn.count<number>('id').as('count'))
        .executeTakeFirst();
      const total = Number(totalResult?.count ?? 0);

      const events = await query
        .selectAll()
        .orderBy('timestamp', 'desc')
        .limit(perPage)
        .offset(offset)
        .execute();

      return Response.json({
        data: events,
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      });
    })
  );

  return router;
}
