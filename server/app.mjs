import express from 'express';
import { createSettingsGate } from './settings-gate.mjs';
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasOnlyKeys, validateInquiry } from './validation.mjs';
import { isWithin, openStore } from './store.mjs';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DATA_DIR = '/home/user/workspace/apex-website-private/data';
export const DEFAULT_CREDENTIALS_PATH = '/home/user/workspace/apex-website-private/Website Inbox Access.md';
const RECEIVED = 'Your project inquiry has been received.';
const WINDOW_MS = 15 * 60 * 1000;

function readBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new Error('Boolean environment settings must be true or false.');
}

function readTrustProxy(value) {
  if (value === undefined || value === '' || value === 'false' || value === false) return false;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10) return value;
  if (typeof value === 'string' && /^[1-9]$|^10$/.test(value)) return Number(value);
  // Explicit networks or Express named ranges are safer than blindly trusting all peers.
  if (typeof value === 'string' && value !== 'true') return value.split(',').map((item) => item.trim()).filter(Boolean);
  throw new Error('TRUST_PROXY must be false, a hop count, or a comma-separated list of trusted proxy networks.');
}

export function resolveConfig(options = {}) {
  const ttlHours = Number(options.sessionTtlHours ?? process.env.SESSION_TTL_HOURS ?? 8);
  if (!Number.isFinite(ttlHours) || ttlHours < 1 || ttlHours > 24) throw new Error('SESSION_TTL_HOURS must be between 1 and 24.');
  return {
    projectRoot: PROJECT_ROOT,
    distDir: path.resolve(options.distDir ?? path.join(PROJECT_ROOT, 'dist')),
    dataDir: path.resolve(options.dataDir ?? process.env.DATA_DIR ?? DEFAULT_DATA_DIR),
    credentialsPath: path.resolve(options.credentialsPath ?? process.env.ADMIN_ACCESS_FILE ?? DEFAULT_CREDENTIALS_PATH),
    adminUsername: options.adminUsername ?? process.env.ADMIN_USERNAME ?? 'moud',
    adminPassword: options.adminPassword ?? process.env.ADMIN_PASSWORD,
    settingsPasscodeHash: options.settingsPasscodeHash ?? process.env.SETTINGS_PASSCODE_HASH,
    now: options.now ?? Date.now,
    sessionTtlMs: options.sessionTtlMs ?? ttlHours * 60 * 60 * 1000,
    previewNoindex: readBoolean(options.previewNoindex ?? process.env.PREVIEW_NOINDEX, true),
    allowOpaqueOrigin: readBoolean(options.allowOpaqueOrigin ?? process.env.ALLOW_OPAQUE_ORIGIN, true),
    allowedOrigins: options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean),
    trustProxy: readTrustProxy(options.trustProxy ?? process.env.TRUST_PROXY),
    limits: { inquiries: 20, login: 8, loginAccount: 30, globalInquiries: 300, globalLogin: 120, windowMs: WINDOW_MS, ...options.limits },
    requireBuild: options.requireBuild ?? false,
  };
}

function makeLimiter(now, windowMs) {
  // Neither raw addresses nor request bodies are retained or logged.
  const secret = randomBytes(32);
  const buckets = new Map();
  const anonymize = (value) => createHmac('sha256', secret).update(String(value)).digest('hex');
  return {
    anonymize,
    hit(key, limit) {
      const time = now();
      let bucket = buckets.get(key);
      if (bucket && bucket.resetAt <= time) { buckets.delete(key); bucket = undefined; }
      if (!bucket) {
        if (buckets.size >= 5000) {
          for (const [entry, value] of buckets) if (value.resetAt <= time) buckets.delete(entry);
        }
        if (buckets.size >= 10000) return Math.ceil(windowMs / 1000);
        bucket = { hits: 0, resetAt: time + windowMs };
        buckets.set(key, bucket);
      }
      bucket.hits++;
      return bucket.hits > limit ? Math.max(1, Math.ceil((bucket.resetAt - time) / 1000)) : 0;
    },
  };
}

function staticManifest(distDir) {
  const files = new Map();
  if (!existsSync(distDir)) return files;
  const realRoot = realpathSync(distDir);
  const extensions = new Set(['.html', '.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm', '.mp3', '.ogg', '.pdf', '.xml', '.webmanifest']);
  const blocked = new Set(['server', 'tests', 'node_modules', 'private', 'data', 'apex-website-private']);
  function visit(directory, relative = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || blocked.has(entry.name.toLowerCase()) || entry.isSymbolicLink()) continue;
      const relativePath = `${relative}/${entry.name}`;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(fullPath, relativePath); continue; }
      if (!entry.isFile()) continue;
      if (!extensions.has(path.extname(entry.name).toLowerCase()) && !['/robots.txt', '/humans.txt', '/manifest.json'].includes(relativePath)) continue;
      if (!isWithin(realRoot, realpathSync(fullPath))) continue;
      files.set(relativePath, fullPath);
      if (entry.name === 'index.html') files.set(`${relative}/`, fullPath);
    }
  }
  visit(distDir);
  return files;
}

export async function createApp(options = {}) {
  const config = resolveConfig(options);
  const files = staticManifest(config.distDir);
  if (config.requireBuild && !files.has('/')) throw new Error('Build the website before starting the server.');
  const store = await openStore(config);
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.set('trust proxy', config.trustProxy);
  const limiter = makeLimiter(config.now, config.limits.windowMs);
  const gateLimiter = makeLimiter(config.now, config.limits.windowMs);
  const settingsGate = createSettingsGate({ hash: config.settingsPasscodeHash, now: config.now });

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'" + (config.allowOpaqueOrigin ? '' : "; frame-ancestors 'self'"),
    });
    if (config.previewNoindex || /^\/(?:api|inbox|admin|settings)(?:\/|$)/i.test(req.path)) res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!config.allowOpaqueOrigin) res.set('X-Frame-Options', 'SAMEORIGIN');
    if (!config.previewNoindex && req.secure) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.vary('Origin');
    const origin = req.get('Origin');
    const sameOrigin = `${req.protocol}://${req.get('host')}`;
    if (origin) {
      const allowed = origin === sameOrigin || (origin === 'null' && config.allowOpaqueOrigin) || config.allowedOrigins.includes(origin);
      if (!allowed) return res.status(403).json({ ok: false, message: 'This origin is not permitted.' });
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Expose-Headers', 'Retry-After');
      // No cross-origin credential access; the Settings cookie is same-origin only.
    }
    if (req.method === 'OPTIONS') {
      const method = req.get('Access-Control-Request-Method');
      const headers = (req.get('Access-Control-Request-Headers') ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
      if ((method && !['GET', 'POST', 'PATCH', 'OPTIONS'].includes(method)) || headers.some((h) => !['content-type', 'authorization'].includes(h))) {
        return res.status(403).json({ ok: false, message: 'This cross-origin request is not permitted.' });
      }
      res.set('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    next();
  });

  const rateLimit = (kind) => (req, res, next) => {
    const identity = limiter.anonymize(req.ip ?? req.socket.remoteAddress ?? 'unknown');
    const perClient = limiter.hit(`${kind}:${identity}`, config.limits[kind]);
    const global = limiter.hit(`global:${kind}`, kind === 'login' ? config.limits.globalLogin : config.limits.globalInquiries);
    const retry = Math.max(perClient, global);
    if (retry) {
      res.set('Retry-After', String(retry));
      return res.status(429).json({ ok: false, message: 'Too many attempts. Please wait and try again.' });
    }
    next();
  };
  const requireJson = (req, res, next) => {
    if (!req.is('application/json')) return res.status(400).json({ ok: false, message: 'Send the request as application/json.' });
    next();
  };
  const json = express.json({ limit: '16kb', strict: true, inflate: false });

  app.get('/api/health', (_req, res) => {
    store.health();
    res.json({ ok: true });
  });
  app.post('/api/inquiries', rateLimit('inquiries'), requireJson, json, (req, res) => {
    const result = validateInquiry(req.body);
    if (result.error) return res.status(400).json(result.error);
    const reference = result.honeypot ? store.makeReference() : store.createInquiry(result.data);
    res.status(201).json({ ok: true, reference, message: RECEIVED });
  });
  app.post('/api/settings/unlock', (req, res, next) => {
    const origin = req.get('Origin');
    if (origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ ok: false, message: 'Open Settings on the Apex website to continue.' });
    const retry = Math.max(gateLimiter.hit(gateLimiter.anonymize(req.ip), 8), gateLimiter.hit('global', 120));
    if (retry) return res.set('Retry-After', String(retry)).status(429).json({ ok: false, message: 'Too many attempts. Please wait and try again.' });
    next();
  }, requireJson, json, async (req, res, next) => {
    try {
      if (!settingsGate.enabled) return res.status(503).json({ ok: false, message: 'Settings access is not configured yet.' });
      if (!hasOnlyKeys(req.body, ['passcode']) || !await settingsGate.verify(req.body.passcode)) return res.status(401).json({ ok: false, message: 'The passcode is incorrect.' });
      if (!settingsGate.unlock(req, res)) return res.status(503).json({ ok: false, message: 'Please try again shortly.' });
      return res.json({ ok: true });
    } catch (error) { next(error); }
  });
  app.post('/api/admin/login', (req, res, next) => {
    if (!settingsGate.allows(req)) return res.status(403).json({ ok: false, message: 'Enter your Settings passcode first.', settingsRequired: true });
    next();
  }, rateLimit('login'), requireJson, json, async (req, res, next) => {
    try {
      const body = req.body;
      if (!hasOnlyKeys(body, ['username', 'password']) || typeof body.username !== 'string' || typeof body.password !== 'string' ||
          body.username.length < 1 || body.username.length > 64 || body.password.length < 1 || body.password.length > 128) {
        return res.status(400).json({ ok: false, message: 'Enter a username and password.' });
      }
      const account = limiter.anonymize(body.username.trim().toLowerCase());
      const retry = limiter.hit(`login-account:${account}`, config.limits.loginAccount);
      if (retry) {
        res.set('Retry-After', String(retry));
        return res.status(429).json({ ok: false, message: 'Too many attempts. Please wait and try again.' });
      }
      if (!await store.verifyCredentials(body.username, body.password)) {
        return res.status(401).json({ ok: false, message: 'The username or password is incorrect.' });
      }
      return res.json({ ok: true, ...store.createSession() });
    } catch (error) { next(error); }
  });
  app.use('/api/admin', (req, res, next) => {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(req.get('Authorization') ?? '');
    if (!match || !store.authenticate(match[1])) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ ok: false, message: 'Please sign in to the website inbox.' });
    }
    req.adminToken = match[1];
    next();
  });
  app.get('/api/admin/inquiries', (_req, res) => res.json(store.listInquiries()));
  app.patch('/api/admin/inquiries/:id', requireJson, json, (req, res) => {
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) return res.status(400).json({ ok: false, message: 'Enter a valid inquiry ID.' });
    if (!hasOnlyKeys(req.body, ['status']) || !['new', 'contacted', 'closed'].includes(req.body.status)) {
      return res.status(400).json({ ok: false, message: 'Choose new, contacted, or closed.', fields: { status: 'Choose a supported status.' } });
    }
    const inquiry = store.updateStatus(id, req.body.status);
    if (!inquiry) return res.status(404).json({ ok: false, message: 'Inquiry not found.' });
    return res.json({ ok: true, inquiry });
  });
  app.post('/api/admin/logout', (_req, res) => {
    store.revokeSession(_req.adminToken);
    settingsGate.lock(_req, res);
    res.json({ ok: true });
  });
  app.use('/api', (_req, res) => res.status(404).json({ ok: false, message: 'Not found.' }));

  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next();
    let requested;
    try { requested = decodeURIComponent(req.path); } catch { return res.status(400).type('text').send('Invalid request path.'); }
    if (requested.includes('\\') || requested.includes('\0') || requested.includes('//') ||
        requested.split('/').some((part) => part === '..' || part === '.' || part.startsWith('.'))) return next();
    if (['/404', '/404/', '/404.html'].includes(requested)) return next();
    if (/^\/inbox(?:\/|$)/i.test(requested) && !settingsGate.allows(req)) return res.set('Cache-Control', 'no-store').redirect(303, '/settings/');
    const file = files.get(requested);
    if (file) {
      const privatePage = /^\/(?:inbox|admin|settings)(?:\/|$)/i.test(requested);
      res.set('Cache-Control', privatePage ? 'no-store' : file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600');
      return res.sendFile(file, { dotfiles: 'deny', cacheControl: false }, (error) => error && next(error));
    }
    if (!requested.endsWith('/') && files.has(`${requested}/`)) {
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      return res.redirect(308, `${encodeURI(requested)}/${query}`);
    }
    next();
  });
  app.use((_req, res, next) => {
    res.status(404).set('Cache-Control', 'no-store');
    const notFound = files.get('/404.html') ?? files.get('/404/index.html');
    if (notFound) return res.sendFile(notFound, { cacheControl: false }, (error) => error && next(error));
    return res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found</title><main><h1>Page not found</h1><p>This page does not exist.</p><a href="/">Return home</a></main></html>');
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    // Never echo an exception, stack trace, submitted value, or raw request body.
    if (['entity.parse.failed', 'entity.too.large', 'encoding.unsupported', 'charset.unsupported', 'request.size.invalid', 'request.aborted'].includes(error.type)) {
      return res.status(400).json({ ok: false, message: error.type === 'entity.too.large' ? 'The request is too large. Please shorten your inquiry.' : 'Send a valid, uncompressed JSON request.' });
    }
    if (error instanceof URIError) return res.status(400).json({ ok: false, message: 'Invalid request path.' });
    if (error.status === 404 || error.code === 'ENOENT') return res.status(404).type('text').send('Not found.');
    if (req.path.startsWith('/api/')) return res.status(500).json({ ok: false, message: 'Unable to complete the request. Please try again.' });
    return res.status(500).type('text').send('Unable to load this page. Please try again.');
  });
  return { app, close: () => store.close(), config, store };
}
