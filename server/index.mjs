import { createApp } from './app.mjs';

// Also protects SQLite sidecar files created after initial setup.
process.umask(0o077);
const port = Number(process.env.PORT ?? 5300);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be a valid port number.');
  process.exitCode = 1;
} else {
  try {
    const backend = await createApp({ requireBuild: true });
    const server = backend.app.listen(port, '0.0.0.0', () => {
      console.log(`Website server ready on port ${port}. Private inbox storage initialized.`);
    });
    server.requestTimeout = 20_000;
    server.headersTimeout = 15_000;
    server.keepAliveTimeout = 5_000;
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      server.close(() => {
        backend.close();
        process.exit(0);
      });
      server.closeIdleConnections?.();
      setTimeout(() => { server.closeAllConnections?.(); }, 5000).unref();
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    server.once('error', () => {
      backend.close();
      console.error('Website server could not start. Check the configured port.');
      process.exitCode = 1;
    });
  } catch (error) {
    // Startup configuration errors are authored messages, never request payloads.
    const safe = /^(Build the website|Private data|Initial admin|A private access file|The database file|SESSION_TTL_HOURS|TRUST_PROXY|Boolean environment)/.test(error.message);
    console.error(safe ? error.message : 'Website startup failed. Check private storage permissions and configuration.');
    process.exitCode = 1;
  }
}
