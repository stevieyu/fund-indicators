/**
 * Browser build script — uses esbuild to produce browser-compatible bundles
 *
 * Outputs:
 *   dist/browser/fund-indicators.js       — IIFE (for <script> tags), exposes window.FundIndicators
 *   dist/browser/fund-indicators.min.js   — IIFE minified
 *   dist/browser/fund-indicators.esm.js   — ESM (for <script type="module"> or bundlers)
 *   dist/browser/fund-indicators.esm.min.js — ESM minified
 */

import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const banner = `/**
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * (c) ${new Date().getFullYear()} ${pkg.name} contributors
 * Released under the ${pkg.license} License
 */`;

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'browser',
  target: ['es2020', 'chrome90', 'firefox90', 'safari15'],
  logLevel: 'info',
  banner: { js: banner },
};

async function main() {
  console.log(`\nBuilding browser bundles for ${pkg.name}@${pkg.version}...\n`);

  // ── IIFE (global: FundIndicators) ──
  await build({
    ...shared,
    format: 'iife',
    globalName: 'FundIndicators',
    outfile: 'dist/browser/fund-indicators.js',
  });
  console.log('  ✓ fund-indicators.js       (IIFE)');

  await build({
    ...shared,
    format: 'iife',
    globalName: 'FundIndicators',
    outfile: 'dist/browser/fund-indicators.min.js',
    minify: true,
    sourcemap: true,
  });
  console.log('  ✓ fund-indicators.min.js   (IIFE minified)');

  // ── ESM ──
  await build({
    ...shared,
    format: 'esm',
    outfile: 'dist/browser/fund-indicators.esm.js',
  });
  console.log('  ✓ fund-indicators.esm.js   (ESM)');

  await build({
    ...shared,
    format: 'esm',
    outfile: 'dist/browser/fund-indicators.esm.min.js',
    minify: true,
    sourcemap: true,
  });
  console.log('  ✓ fund-indicators.esm.min.js (ESM minified)');

  // ── Print sizes ──
  const { statSync } = await import('node:fs');
  const files = [
    'dist/browser/fund-indicators.js',
    'dist/browser/fund-indicators.min.js',
    'dist/browser/fund-indicators.esm.js',
    'dist/browser/fund-indicators.esm.min.js',
  ];
  console.log('\n  Bundle sizes:');
  for (const f of files) {
    const size = statSync(f).size;
    const kb = (size / 1024).toFixed(1);
    console.log(`    ${f.padEnd(45)} ${kb} KB`);
  }
  console.log('\n  Browser build complete.\n');
}

main().catch((err) => {
  console.error('Browser build failed:', err);
  process.exit(1);
});
