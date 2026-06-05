/**
 * Browser build script — uses Vite 8 library mode to produce browser-compatible bundles
 *
 * Outputs:
 *   dist/browser/fund-indicators.js       — IIFE (for <script> tags / CDN), exposes window.FundIndicators
 *   dist/browser/fund-indicators.min.js   — IIFE minified
 *   dist/browser/fund-indicators.esm.js   — ESM (for <script type="module"> or bundlers)
 *   dist/browser/fund-indicators.esm.min.js — ESM minified
 */

import { build } from 'vite';
import { readFileSync, statSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const banner = `/**
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * (c) ${new Date().getFullYear()} ${pkg.name} contributors
 * Released under the ${pkg.license} License
 */`;

const entry = 'src/index.ts';
const libName = 'FundIndicators';

/**
 * Helper: build a single browser bundle via Vite library mode
 * @param {string} format  — 'iife' | 'es'
 * @param {string} name    — output file name (without path)
 * @param {boolean} minify — whether to minify
 */
async function buildBundle(format, name, minify) {
  await build({
    configFile: false,
    logLevel: 'info',
    build: {
      lib: {
        entry,
        name: libName,
        formats: [format],
        fileName: () => name,
      },
      outDir: 'dist/browser',
      emptyOutDir: false,
      minify: minify ? 'esbuild' : false,
      sourcemap: minify,
      rolldownOptions: {
        output: {
          banner,
        },
      },
    },
  });
}

async function main() {
  console.log(`\nBuilding browser bundles for ${pkg.name}@${pkg.version} (Vite 8 library mode)...\n`);

  // IIFE — global: FundIndicators (for <script> tag / CDN)
  await buildBundle('iife', 'fund-indicators.js', false);
  console.log('  ✓ fund-indicators.js       (IIFE)');

  // IIFE minified
  await buildBundle('iife', 'fund-indicators.min.js', true);
  console.log('  ✓ fund-indicators.min.js   (IIFE minified)');

  // ESM (for <script type="module"> or bundlers)
  await buildBundle('es', 'fund-indicators.esm.js', false);
  console.log('  ✓ fund-indicators.esm.js   (ESM)');

  // ESM minified
  await buildBundle('es', 'fund-indicators.esm.min.js', true);
  console.log('  ✓ fund-indicators.esm.min.js (ESM minified)');

  // Print sizes
  const files = [
    'dist/browser/fund-indicators.js',
    'dist/browser/fund-indicators.min.js',
    'dist/browser/fund-indicators.esm.js',
    'dist/browser/fund-indicators.esm.min.js',
  ];
  console.log('\n  Bundle sizes:');
  for (const f of files) {
    try {
      const size = statSync(f).size;
      const kb = (size / 1024).toFixed(1);
      console.log(`    ${f.padEnd(45)} ${kb} KB`);
    } catch {
      console.log(`    ${f.padEnd(45)} (not found)`);
    }
  }
  console.log('\n  Browser build complete.\n');
}

main().catch((err) => {
  console.error('Browser build failed:', err);
  process.exit(1);
});
