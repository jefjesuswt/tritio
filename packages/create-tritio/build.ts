import { build } from 'bun';
import pkg from './package.json' with { type: 'json' };

console.log(`📦 Building ${pkg.name} v${pkg.version}...`);

await build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  minify: true,
  define: {
    'process.env.CLI_VERSION': JSON.stringify(pkg.version),
    'process.env.CLI_NAME': JSON.stringify(pkg.name),
  },
});

console.log('✅ Build successful!');
