/**
 * tools-check-collisions.mjs -- guard against the hand-rolled bundler's one
 * sharp edge.
 *
 * build.mjs strips `import`/`export` and concatenates every module into a
 * single scope, so two files that each declare a module-level `const SUN_FAR`
 * are fine as ES modules and a SyntaxError as a bundle. That failure only
 * shows up in dist/, which is exactly where nobody is looking while writing a
 * view -- it shipped once, as a blank page with
 * "Identifier 'SUN_FAR' has already been declared" in the console.
 *
 *   node tools-check-collisions.mjs
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const ORDER = [
  'optics.js', 'assets.js', 'i18n.js', 'state.js', 'ui.js', 'camera3d.js',
  'rays.js', 'dropletView.js', 'graphView.js', 'dropsView.js', 'skyView.js',
  'fieldView.js', 'panels.js', 'app.js',
];

/** Top-level declarations only: column 0, after `export` is stripped. */
const DECL = /^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;

const seen = new Map();
const clashes = [];

for (const file of ORDER) {
  const src = await readFile(join(HERE, 'src', file), 'utf8');
  for (const m of src.matchAll(DECL)) {
    const name = m[1];
    if (seen.has(name)) clashes.push(`${name}: ${seen.get(name)} and ${file}`);
    else seen.set(name, file);
  }
}

if (clashes.length) {
  console.error(`Bundle-scope collisions (${clashes.length}):`);
  for (const c of clashes) console.error(`  ${c}`);
  process.exit(1);
}
console.log(`no bundle-scope collisions across ${ORDER.length} modules (${seen.size} names)`);
