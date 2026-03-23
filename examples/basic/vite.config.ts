import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  server: {
    port: 3000,
  },
  optimizeDeps: {
    include: ['nostr-login'],
  },
}));
