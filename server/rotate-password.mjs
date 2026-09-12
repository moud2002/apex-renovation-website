import { randomBytes } from 'node:crypto';
import { resolveConfig } from './app.mjs';
import { rotatePassword } from './store.mjs';

// Run only while the website server is stopped. Never accept a password as a CLI argument.
process.umask(0o077);
if (!process.argv.includes('--confirm')) {
  console.error('Stop the website server, then run this command with --confirm to rotate the inbox password and revoke every session.');
  process.exitCode = 1;
} else {
  try {
    const config = resolveConfig();
    await rotatePassword({ ...config, password: process.env.NEW_ADMIN_PASSWORD ?? randomBytes(24).toString('base64url') });
    console.log('Inbox password rotated and all sessions revoked. Read the updated private access file, then restart the website server.');
  } catch {
    console.error('Password rotation failed. Check private storage and use a 8–128 character password. No inquiries were deleted.');
    process.exitCode = 1;
  }
}
