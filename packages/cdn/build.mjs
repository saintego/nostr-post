import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: ['es2022'],
  // All deps are bundled into the output — nothing external
  external: [],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

if (isWatch) {
  const ctx = await context({
    ...shared,
    format: 'esm',
    outfile: 'dist/nostr-post.js',
    minify: false,
  });
  await ctx.watch();
  console.log('Watching for changes…');
} else {
  // ESM — <script type="module">
  await build({
    ...shared,
    format: 'esm',
    outfile: 'dist/nostr-post.js',
    minify: true,
  });

  // IIFE — classic <script> tag (non-module)
  await build({
    ...shared,
    format: 'iife',
    globalName: 'NostrPost',
    outfile: 'dist/nostr-post.iife.js',
    minify: true,
  });

  console.log('Built dist/nostr-post.js (ESM) and dist/nostr-post.iife.js (IIFE)');
}
