import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Web components use legacy decorators (as in tsconfig.web.json)
  oxc: { decorator: { legacy: true } },
  test: {
    globals: true,
    environment: 'node',
  },
});
