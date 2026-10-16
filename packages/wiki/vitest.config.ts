import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Compile like the web build (tsconfig.web.json): Lit's legacy decorators and class fields
  // assigned rather than defined; the package's tsconfig.json doesn't cover src/web
  oxc: { tsconfig: fileURLToPath(new URL('./tsconfig.web.json', import.meta.url)) },
  test: {
    globals: true,
    environment: 'node',
  },
});
