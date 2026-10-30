import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative paths: the build is a static site served from any folder (an nsite, PR previews)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
}));
