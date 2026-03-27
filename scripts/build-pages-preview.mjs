import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const deployDir = join(root, '.pages-local');

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...options.env,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const copyDir = (from, to) => {
  if (!existsSync(from)) {
    throw new Error(`Missing build output: ${from}`);
  }
  cpSync(from, to, { recursive: true });
};

console.log('Building workspace packages...');
run('pnpm', ['build']);

console.log('Building CDN bundle...');
run('pnpm', ['--filter', '@nostr-post/cdn', 'build']);

console.log('Building example apps for static hosting...');
run('pnpm', ['--filter', '@nostr-post/example', 'build']);
run('pnpm', ['--filter', 'react-demo', 'build']);
run('pnpm', ['--filter', 'nextjs-demo', 'build'], {
  env: {
    NOSTR_POST_BASE_PATH: '/examples/nextjs-demo',
  },
});
run('pnpm', ['--filter', 'manifest-creator', 'build'], {
  env: {
    NOSTR_POST_BASE_PATH: '/manifest-creator',
  },
});

console.log('Assembling local Pages artifact...');
rmSync(deployDir, { recursive: true, force: true });
mkdirSync(join(deployDir, 'examples'), { recursive: true });

copyDir(join(root, 'packages/cdn/dist'), deployDir);
cpSync(join(root, 'packages/cdn/index.html'), join(deployDir, 'index.html'));
cpSync(join(root, 'packages/cdn/examples-index.html'), join(deployDir, 'examples/index.html'));
copyDir(join(root, 'examples/basic/dist'), join(deployDir, 'examples/basic'));
copyDir(join(root, 'examples/pwa-share'), join(deployDir, 'examples/pwa-share'));
copyDir(join(root, 'examples/react-demo/dist'), join(deployDir, 'examples/react-demo'));
copyDir(join(root, 'examples/nextjs-demo/out'), join(deployDir, 'examples/nextjs-demo'));
copyDir(join(root, 'tools/manifest-creator/out'), join(deployDir, 'manifest-creator'));

console.log('Done. Local artifact at .pages-local');
console.log('Preview with: npx serve .pages-local');
