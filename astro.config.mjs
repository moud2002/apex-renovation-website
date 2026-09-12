import { defineConfig } from 'astro/config';
export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  trailingSlash: 'always',
  build: { format: 'directory' },
});
