import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');

/** The split build's parts (src/<name>.ts → dist/split/<name>.js); index.ts is their sum */
const SPLIT_ENTRIES = ['base', 'plugins', 'wiki', 'calendar', 'article', 'list'];

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

  // Split ESM: one module per part, sharing their code (chunks); field plugins load on demand
  // (plugin autoload's dynamic imports become their own chunks)
  await build({
    ...shared,
    entryPoints: SPLIT_ENTRIES.map((name) => `src/${name}.ts`),
    format: 'esm',
    splitting: true,
    outdir: 'dist/split',
    entryNames: '[name]',
    chunkNames: 'chunks/[name]-[hash]',
    minify: true,
  });

  console.log(
    'Built dist/nostr-post.js (ESM), dist/nostr-post.iife.js (IIFE) and dist/split/ (ESM parts)'
  );
}
