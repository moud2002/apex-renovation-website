import Database from 'better-sqlite3';
import { createHash, createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const deriveKey = promisify(scrypt);
const PASSWORD_OPTIONS = Object.freeze({ N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const hashPassword = async (password, salt) => (await deriveKey(password, salt, 64, PASSWORD_OPTIONS)).toString('hex');
const publicColumns = `id, reference, name, email, phone, city,
  project_type AS projectType, budget, timeline, details, consent, status,
  created_at AS createdAt, updated_at AS updatedAt`;

export function isWithin(parent, candidate) {
  const rel = path.relative(parent, candidate);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

// Resolve existing ancestors too, so a symlink cannot bypass the private-path check.
function resolvedDestination(target) {
  let parent = path.resolve(target);
  const tail = [];
  while (!existsSync(parent)) {
    tail.unshift(path.basename(parent));
    const next = path.dirname(parent);
    if (next === parent) throw new Error('Cannot resolve private storage location.');
    parent = next;
  }
  return path.join(realpathSync(parent), ...tail);
}

function privateDirectory(directory, forbiddenRoots) {
  const absolute = resolvedDestination(directory);
  if (forbiddenRoots.some((root) => isWithin(resolvedDestination(root), absolute))) {
    throw new Error('Private data and credentials must be outside the website repository and public build.');
  }
  mkdirSync(absolute, { recursive: true, mode: 0o700 });
  chmodSync(absolute, 0o700);
  return absolute;
}

function accessDocument(username, password) {
  return `# Website Inbox Access

Confidential — keep this file private. It is not part of the website or source repository.

## Sign in

Open the new renovation website's **Website Inbox** page, normally \`/inbox/\`.
Use the website preview supplied with the handoff, or \`http://localhost:5300/inbox/\` when running locally.
These credentials are for this standalone website only, not any property-renovation portal.

Username: \`${username}\`

Password:

\`\`\`text
${password}
\`\`\`

The password was created during first initialization. The database stores only a unique salt and an scrypt password hash, not this plaintext password.
If the owner supplied ADMIN_USERNAME / ADMIN_PASSWORD, those values were used only for first initialization.
Changing those environment variables later does not change existing credentials.

## Handling inquiries

Sign in to view submitted project inquiries. Mark each one **New**, **Contacted**, or **Closed**.
Status labels are manual tracking only; changing a status sends no email or text message.
Use **Sign out** to revoke the current session. Sessions expire after eight hours by default.
The browser should keep the bearer token in memory only; a page reload requires another sign-in.
Never put a token or password in a URL, public website file, shared screenshot, or client-side source.

## Preview and production

This is a working preview inbox backed by private SQLite storage in the sandbox.
The preview is not a production hosting or durability guarantee, and no email or SMS notifications are configured.
Before taking real customer inquiries publicly, arrange HTTPS hosting, a persistent private DATA_DIR volume, access controls,
encrypted backups, a retention policy, and a tested restore procedure. Deploy only the built public files plus server code,
never this access file, the database, test fixtures, or local environment files.

Keep this file in a password manager or another owner-controlled secure location.
Do not delete the database to change a password: that would also discard inquiries.
An authorized maintainer can use the documented local password rotation command without deleting inquiry data.
`;
}

function chmodDatabaseFiles(databasePath) {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = databasePath + suffix;
    if (existsSync(file)) chmodSync(file, 0o600);
  }
}

export async function openStore({
  dataDir, credentialsPath, projectRoot, distDir,
  adminUsername = 'moud', adminPassword,
  now = Date.now, sessionTtlMs = 8 * 60 * 60 * 1000,
}) {
  const forbiddenRoots = [projectRoot, distDir];
  const privateDataDir = privateDirectory(dataDir, forbiddenRoots);
  const databasePath = path.join(privateDataDir, 'website-inbox.sqlite3');
  if (existsSync(databasePath) && lstatSync(databasePath).isSymbolicLink()) {
    throw new Error('The database file must not be a symbolic link.');
  }
  const db = new Database(databasePath);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_user (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        username TEXT NOT NULL UNIQUE,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT NOT NULL UNIQUE,
        submission_hash TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL,
        project_type TEXT NOT NULL,
        budget TEXT NOT NULL DEFAULT '',
        timeline TEXT NOT NULL DEFAULT '',
        details TEXT NOT NULL,
        consent INTEGER NOT NULL CHECK (consent = 1),
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS inquiries_created ON inquiries(created_at DESC, id DESC);
    `);
    chmodDatabaseFiles(databasePath);
    let admin = db.prepare('SELECT * FROM admin_user WHERE id = 1').get();
    if (!admin) {
      if (typeof adminUsername !== 'string' || !/^[A-Za-z0-9._-]{3,64}$/.test(adminUsername)) {
        throw new Error('Initial admin username must contain 3–64 letters, numbers, dots, underscores, or hyphens.');
      }
      const password = adminPassword ?? randomBytes(24).toString('base64url');
      if (typeof password !== 'string' || password.length < 16 || password.length > 128 || /[\u0000-\u001f\u007f]/.test(password)) {
        throw new Error('Initial admin password must contain 16–128 characters without control characters.');
      }
      const privateCredentialsDir = privateDirectory(path.dirname(credentialsPath), forbiddenRoots);
      const accessPath = path.join(privateCredentialsDir, path.basename(credentialsPath));
      if (existsSync(accessPath)) {
        throw new Error('A private access file already exists but this database has no administrator. Preserve the file and resolve the storage configuration before retrying.');
      }
      const salt = randomBytes(32).toString('hex');
      const hash = await hashPassword(password, salt);
      // Exclusive creation prevents accidental replacement of an owner's credentials.
      writeFileSync(accessPath, accessDocument(adminUsername, password), { mode: 0o600, flag: 'wx' });
      chmodSync(accessPath, 0o600);
      db.prepare('INSERT INTO admin_user VALUES (1, ?, ?, ?, ?)').run(adminUsername, salt, hash, new Date(now()).toISOString());
      admin = db.prepare('SELECT * FROM admin_user WHERE id = 1').get();
    }
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('session_salt', randomBytes(32).toString('hex'));
    const sessionSalt = db.prepare('SELECT value FROM settings WHERE key = ?').get('session_salt').value;
    const sessionHash = (token) => createHmac('sha256', sessionSalt).update(token).digest('hex');
    const purgeSessions = db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?');
    const sessionQuery = db.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ? AND expires_at > ?');
    const inquiryQuery = db.prepare(`SELECT ${publicColumns} FROM inquiries WHERE id = ?`);
    const publicInquiry = (row) => row ? { ...row, consent: Boolean(row.consent) } : null;
    const insertInquiry = db.prepare(`INSERT OR IGNORE INTO inquiries
      (reference, submission_hash, name, email, phone, city, project_type, budget, timeline, details, consent, created_at, updated_at)
      VALUES (@reference, @submissionHash, @name, @email, @phone, @city, @projectType, @budget, @timeline, @details, 1, @createdAt, @createdAt)`);
    const submissionQuery = db.prepare('SELECT reference FROM inquiries WHERE submission_hash = ?');
    const makeReference = () => `APX-${new Date(now()).toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(6).toString('hex').toUpperCase()}`;
    purgeSessions.run(now());
    chmodDatabaseFiles(databasePath);

    return {
      databasePath,
      makeReference,
      health() { db.prepare('SELECT 1').get(); },
      async verifyCredentials(username, password) {
        // Always perform scrypt, including nonexistent usernames; return one generic error.
        const candidate = Buffer.from(await hashPassword(password, admin.password_salt), 'hex');
        const matches = timingSafeEqual(candidate, Buffer.from(admin.password_hash, 'hex'));
        return matches && username === admin.username;
      },
      createSession() {
        purgeSessions.run(now());
        // Keep a small, bounded number of simultaneous sessions.
        db.prepare(`DELETE FROM admin_sessions WHERE token_hash IN (
          SELECT token_hash FROM admin_sessions ORDER BY created_at DESC LIMIT -1 OFFSET 19
        )`).run();
        const token = randomBytes(32).toString('base64url');
        const expiresAt = now() + sessionTtlMs;
        db.prepare('INSERT INTO admin_sessions VALUES (?, ?, ?)').run(sessionHash(token), now(), expiresAt);
        return { token, expiresAt: new Date(expiresAt).toISOString() };
      },
      authenticate(token) {
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
        return Boolean(sessionQuery.get(sessionHash(token), now()));
      },
      revokeSession(token) {
        db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(sessionHash(token));
      },
      createInquiry(data) {
        const submissionHash = createHash('sha256').update(data.submissionId || randomUUID()).digest('hex');
        const existing = submissionQuery.get(submissionHash);
        if (existing) return existing.reference;
        const reference = makeReference();
        insertInquiry.run({ ...data, submissionHash, reference, createdAt: new Date(now()).toISOString() });
        const saved = submissionQuery.get(submissionHash);
        if (!saved) throw new Error('Unable to store inquiry.');
        return saved.reference;
      },
      listInquiries() {
        const inquiries = db.prepare(`SELECT ${publicColumns} FROM inquiries ORDER BY created_at DESC, id DESC`).all().map(publicInquiry);
        const counts = { new: 0, contacted: 0, closed: 0, total: inquiries.length };
        for (const inquiry of inquiries) counts[inquiry.status]++;
        return { inquiries, counts };
      },
      updateStatus(id, status) {
        const result = db.prepare('UPDATE inquiries SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date(now()).toISOString(), id);
        return result.changes ? publicInquiry(inquiryQuery.get(id)) : null;
      },
      close() {
        if (db.open) {
          db.pragma('wal_checkpoint(TRUNCATE)');
          db.close();
        }
      },
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Local maintenance only. Never exposed as an HTTP endpoint.
export async function rotatePassword({ dataDir, credentialsPath, projectRoot, distDir, password }) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 128 || /[\u0000-\u001f\u007f]/.test(password)) {
    throw new Error('The new password must contain 16–128 characters without control characters.');
  }
  const privateDataDir = privateDirectory(dataDir, [projectRoot, distDir]);
  const privateCredentialsDir = privateDirectory(path.dirname(credentialsPath), [projectRoot, distDir]);
  const databasePath = path.join(privateDataDir, 'website-inbox.sqlite3');
  if (!existsSync(databasePath) || lstatSync(databasePath).isSymbolicLink()) throw new Error('An existing private database is required.');
  const accessPath = path.join(privateCredentialsDir, path.basename(credentialsPath));
  if (existsSync(accessPath) && lstatSync(accessPath).isSymbolicLink()) throw new Error('The access file must not be a symbolic link.');
  const db = new Database(databasePath);
  try {
    const admin = db.prepare('SELECT username FROM admin_user WHERE id = 1').get();
    if (!admin) throw new Error('No administrator is initialized.');
    const salt = randomBytes(32).toString('hex');
    const hash = await hashPassword(password, salt);
    db.transaction(() => {
      db.prepare('UPDATE admin_user SET password_salt = ?, password_hash = ? WHERE id = 1').run(salt, hash);
      db.prepare('DELETE FROM admin_sessions').run();
    })();
    writeFileSync(accessPath, accessDocument(admin.username, password), { mode: 0o600 });
    chmodSync(accessPath, 0o600);
    chmodDatabaseFiles(databasePath);
  } finally {
    db.close();
  }
}
