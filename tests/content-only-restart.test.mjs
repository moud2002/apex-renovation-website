// Disposable synthetic records only; no production paths or credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { openStore } from '../server/store.mjs';
import { createSettingsGate, hashSettingsPasscode } from '../server/settings-gate.mjs';

test('same-code restart preserves schema, inquiries, credentials, settings and unexpired stored sessions', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'apex-content-only-restart-'));
  const projectRoot = path.resolve(import.meta.dirname, '..');
  const dataDir = path.join(root, 'private-data');
  const credentialsPath = path.join(root, 'owner-access.md');
  const config = {dataDir, credentialsPath, projectRoot, distDir: path.join(projectRoot, 'dist'),
    adminUsername: 'synthetic-owner', adminPassword: randomBytes(24).toString('base64url'),
    now: () => 1800000000000};
  let store;
  const snapshot = () => {
    const db = new Database(path.join(dataDir, 'website-inbox.sqlite3'), {readonly: true});
    try {
      return {
        schema: db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_autoindex%' ORDER BY name").all(),
        inquiries: db.prepare('SELECT * FROM inquiries ORDER BY id').all(),
        admin: db.prepare('SELECT * FROM admin_user').all(),
        settings: db.prepare('SELECT * FROM settings ORDER BY key').all(),
        sessions: db.prepare('SELECT * FROM admin_sessions ORDER BY token_hash').all(),
        sequence: db.prepare('SELECT * FROM sqlite_sequence ORDER BY name').all(),
      };
    } finally { db.close(); }
  };
  try {
    store = await openStore(config);
    const lead = {name: 'Synthetic investor', email: 'fixture@example.test', phone: '', city: 'Test city',
      projectType: 'Investment property', budget: 'Discuss options', timeline: 'Planning ahead',
      details: 'Synthetic referral details', consent: true, submissionId: 'synthetic-content-only-restart'};
    const reference = store.createInquiry(lead);
    const row = store.listInquiries().inquiries[0];
    store.updateStatus(row.id, 'contacted');
    const session = store.createSession();
    store.close();
    store = undefined;
    const writable = new Database(path.join(dataDir, 'website-inbox.sqlite3'));
    writable.prepare('INSERT INTO settings VALUES (?, ?)').run('synthetic_owner_preference', 'preserve');
    writable.prepare('INSERT INTO admin_sessions VALUES (?, ?, ?)').run('synthetic-expired-session', 1, 2);
    writable.close();
    const before = snapshot();
    const accessBefore = readFileSync(credentialsPath);
    store = await openStore({...config, adminUsername: 'ignored-change', adminPassword: 'ignored-change'});
    assert.equal(await store.verifyCredentials(config.adminUsername, config.adminPassword), true);
    assert.equal(store.authenticate(session.token), true);
    assert.equal(store.createInquiry(lead), reference, 'deduplication survives the restart');
    const after = snapshot();
    assert.deepEqual(after, {...before, sessions: before.sessions.filter(row => row.expires_at > config.now())});
    assert.deepEqual(readFileSync(credentialsPath), accessBefore);
  } finally {
    store?.close();
    rmSync(root, {recursive: true, force: true});
  }
});

test('existing Settings unlock is in memory and must be repeated after a process restart', async () => {
  const hash = await hashSettingsPasscode('1234');
  const first = createSettingsGate({hash});
  let token;
  first.unlock({secure: false}, {cookie(_name, value) {token = value;}});
  const request = {get: name => name === 'Cookie' ? `apex_settings=${token}` : ''};
  assert.equal(first.allows(request), true);
  const restarted = createSettingsGate({hash});
  assert.equal(restarted.allows(request), false);
  assert.equal(await restarted.verify('1234'), true, 'the configured passcode remains valid');
});
