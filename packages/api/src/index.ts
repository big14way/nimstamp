import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { runWatcher } from './chain/watcher';
import { isDemo, type Env } from './env';
import { clientIp, type Vars } from './lib/auth';
import { ApiError } from './lib/errors';
import { fetchPrices } from './price/fetch';
import { auth } from './routes/auth';
import { cards } from './routes/cards';
import { merchants } from './routes/merchants';
import { payments } from './routes/payments';
import { redemptions } from './routes/redemptions';
import { stats } from './routes/stats';
import { demo } from './routes/demo';
import { q } from './db/queries';
import { now } from './lib/time';
import { PRICE_MAX_AGE } from './price/fetch';

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// ---- CORS: only the configured web origin(s)
app.use('*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const handler = cors({
    origin: (origin) => {
      if (!origin) return null;
      if (allowed.includes(origin)) return origin;
      if (isDemo(c.env) && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) return origin;
      return null;
    },
    allowHeaders: ['content-type', 'authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  });
  return handler(c, next);
});

// ---- best-effort per-isolate rate limit per IP (generous: carrier NAT shares IPs; a card page polls ~20/min)
const buckets = new Map<string, { n: number; reset: number }>();
app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS' || c.req.path === '/health') return next();
  const ip = clientIp(c);
  c.set('ip', ip);
  const t = now();
  const b = buckets.get(ip);
  if (!b || b.reset <= t) buckets.set(ip, { n: 1, reset: t + 60 });
  else if (++b.n > 300) throw new ApiError('RATE_LIMITED');
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= t) buckets.delete(k);
  await next();
});

app.use('*', async (c, next) => {
  await next();
  c.header('x-content-type-options', 'nosniff');
  c.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
  c.header('cache-control', 'no-store');
});

app.get('/', (c) => c.json({ name: 'nimstamp-api', docs: 'https://github.com/big14way/nimstamp' }));
app.route('/auth', auth);
app.route('/merchants', merchants);
app.route('/', cards);
app.route('/payments', payments);
app.route('/', redemptions);
app.route('/', stats);
app.route('/demo', demo);

app.notFound((c) => c.json(new ApiError('NOT_FOUND').toJSON(), 404));
app.onError((err, c) => {
  if (err instanceof ApiError) return c.json(err.toJSON(), err.status as 400);
  console.log(`unhandled: ${err.message}`);
  return c.json(new ApiError('INTERNAL').toJSON(), 500);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const minute = new Date(event.scheduledTime).getUTCMinutes();
        const price = await q.price(env.DB, 'USD');
        const stale = !price || price.fetched_at < now() - PRICE_MAX_AGE + 600;
        if (minute % 10 === 0 || stale) {
          try {
            await fetchPrices(env);
          } catch (e) {
            console.log(`price cron failed: ${String(e)}`);
          }
        }
        const results = await runWatcher(env);
        const stamped = results.reduce((n, r) => n + r.stamped, 0);
        const errors = results.filter((r) => r.error).length;
        console.log(`watcher run merchants=${results.length} stamped=${stamped} errors=${errors}`);
        if (minute === 0) await q.cleanup(env.DB);
      })(),
    );
  },
} satisfies ExportedHandler<Env>;
