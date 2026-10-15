import { defineConfig } from 'vite';

// Empty default so index.html's %VITE_WEB3AUTH_CLIENT_ID% renders as "" (Nostr-only sign-in)
process.env.VITE_WEB3AUTH_CLIENT_ID ??= '';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  server: {
    port: 3000,
  },
}));
