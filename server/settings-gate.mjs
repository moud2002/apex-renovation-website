import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const COOKIE = 'apex_settings';
const TTL = 10 * 60 * 1000;
export async function hashSettingsPasscode(passcode) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(passcode, salt, 32);
  return `${salt}:${hash.toString('hex')}`;
}
export function createSettingsGate({ hash, now = Date.now }) {
  const validHash = typeof hash === 'string' && /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(hash);
  const sessions = new Map();
  const digest = token => createHash('sha256').update(token).digest('hex');
  const cookie = req => (req.get('Cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
  const purge = () => { for (const [key, expires] of sessions) if (expires <= now()) sessions.delete(key); };
  return {
    enabled: validHash,
    async verify(passcode) {
      if (!validHash || typeof passcode !== 'string' || !/^[0-9]{4}$/.test(passcode)) return false;
      const [salt, expected] = hash.split(':');
      const actual = await scrypt(passcode, salt, 32);
      return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
    },
    unlock(req, res) {
      purge();
      if (sessions.size >= 1000) return false;
      const token = randomBytes(32).toString('base64url');
      sessions.set(digest(token), now() + TTL);
      res.cookie(COOKIE, token, { httpOnly: true, secure: req.secure, sameSite: 'strict', path: '/', maxAge: TTL });
      return true;
    },
    allows(req) {
      purge();
      const token = cookie(req);
      return /^[A-Za-z0-9_-]{43}$/.test(token) && sessions.has(digest(token));
    },
    lock(req, res) {
      sessions.delete(digest(cookie(req)));
      res.clearCookie(COOKIE, { httpOnly: true, secure: req.secure, sameSite: 'strict', path: '/' });
    },
  };
}
