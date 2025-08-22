import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/server.js',
  external: [
    // External packages that should not be bundled
    'express',
    'express-session',
    'bcrypt',
    'drizzle-orm',
    'connect-pg-simple',
    '@neondatabase/serverless',
    'ws'
  ]
});
