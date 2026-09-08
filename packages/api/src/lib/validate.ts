import type { Context } from 'hono';
import type { ZodType } from 'zod';
import { ApiError } from './errors';

export async function parseBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw new ApiError('BAD_REQUEST', 'Body must be JSON.');
  }
  const r = schema.safeParse(json);
  if (!r.success) {
    const issue = r.error.issues[0];
    throw new ApiError('BAD_REQUEST', issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Invalid body.');
  }
  return r.data;
}
