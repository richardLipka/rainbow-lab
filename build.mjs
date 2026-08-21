/**
 * build.mjs -- bundles the ES modules and the stylesheet into one
 * self-contained HTML file (dist/rainbow-lab.html) that runs from file://
 * and inside a strict CSP with no external requests.
 *
 * The bundler is deliberately tiny: every module is authored so that its
 * top-level names are unique, so the bundle is just "strip the imports,
 * strip the export keyword, concatenate in dependency order". The one thing
 * that needs care is `import * as O from './optics.js'`, which is replaced by
 * a generated namespace object built from optics.js's own export list.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Dependency order matters: a module may only use names defined above it. */
const ORDER = [
  'optics.js',
  'i18n.js',
  'state.js',
  'ui.js',
  'rays.js',
  'dropletView.js',
  'graphView.js',
  'dropsView.js',
  'skyView.js',
  'panels.js',
  'app.js',
];

const IMPORT_LINE = /^\s*import\s+[^;]*?from\s+['"][^'"]+['"];?\s*$/gm;
const REEXPORT_LINE = /^\s*export\s*\{[^}]*\}\s*;?\s*$/gm;
const EXPORT_KEYWORD = /^(\s*)export\s+(const|let|var|function|class|async\s+function)\s/gm;

/** Collect the names optics.js exports, so we can rebuild the `O` namespace. */
function exportedNames(source) {
  const names = [];
  const re = /^\s*export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(source))) names.push(m[1]);
  return names;
}

function strip(source) {
  return source
    .replace(IMPORT_LINE, '')
    .replace(REEXPORT_LINE, '')
    .replace(EXPORT_KEYWORD, '$1$2 ');
}

async function build() {
  const sources = {};
  for (const f of ORDER) sources[f] = await readFile(join(HERE, 'src', f), 'utf8');

  const opticsNames = exportedNames(sources['optics.js']);
  if (!opticsNames.includes('traceRay')) throw new Error('optics export scan failed');

  const parts = [];
  for (const f of ORDER) {
    parts.push(`/* ============ src/${f} ============ */`);
    parts.push(strip(sources[f]).trim());
    if (f === 'optics.js') {
      parts.push(
        '/* namespace object standing in for `import * as O from "./optics.js"` */',
        `const O = { ${opticsNames.join(', ')} };`
      );
    }
  }

  const js = parts.join('\n\n');
  const css = await readFile(join(HERE, 'styles.css'), 'utf8');

  // Google Fonts is the one external host an Artifact CSP admits; the stacks
  // in styles.css still name real local fallbacks if it is unavailable.
  const FONTS =
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">';

  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jak vzniká duha / How a rainbow forms</title>
<meta name="description" content="Interaktivní simulace vzniku duhy — geometrická optika, kaustika, antisolární bod. Interactive geometric-optics rainbow simulation.">
${FONTS}
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<noscript>Tato simulace vyžaduje JavaScript. / This simulation requires JavaScript.</noscript>
<script type="module">
${js}
</script>
</body>
</html>
`;

  await mkdir(join(HERE, 'dist'), { recursive: true });
  const out = join(HERE, 'dist', 'rainbow-lab.html');
  await writeFile(out, html, 'utf8');
  console.log(`built ${out}  (${(html.length / 1024).toFixed(1)} kB)`);

  // Body-only variant: the Artifact host supplies the document skeleton, so
  // this file must not carry its own doctype/html/head/body tags.
  const artifact = `<title>Jak vzniká duha</title>
${FONTS}
<style>
${css}
</style>
<div id="app"></div>
<noscript>Tato simulace vyžaduje JavaScript. / This simulation requires JavaScript.</noscript>
<script type="module">
${js}
</script>
`;
  const outA = join(HERE, 'dist', 'artifact.html');
  await writeFile(outA, artifact, 'utf8');
  console.log(`built ${outA}  (${(artifact.length / 1024).toFixed(1)} kB)`);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
