#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDependabot, manifestEntry, parseArgs, registerEntry, rollbackPath, titleFromName } from './lib/labs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { positionals: [name], flags } = parseArgs(process.argv.slice(2));
const template = flags.template || 'static';
const visibility = flags.visibility || 'public';
if (!name) throw new Error('usage: npm run labs:new -- <name> [--template static|maps-2d|maps-3d] [--visibility public|unlisted|private]');
if (!['static', 'maps-2d', 'maps-3d'].includes(template)) throw new Error(`unknown template: ${template}`);

const title = flags.title || titleFromName(name);
const description = flags.description || `An interactive ${title} lab demo.`;
const appDir = join(repoRoot, 'demos', name);
if (existsSync(appDir)) throw new Error(`demos/${name} already exists`);
const entry = manifestEntry({
  name, title, description, visibility,
  source: { type: 'workspace', package: `demos/${name}`, output: 'dist' },
  tags: template.startsWith('maps-') ? ['google-maps-platform'] : ['interactive-demo'],
});
const manifestPath = join(repoRoot, 'apps.json');
const dependabotPath = join(repoRoot, '.github/dependabot.yml');
const originalManifest = readFileSync(manifestPath, 'utf8');
const originalDependabot = readFileSync(dependabotPath, 'utf8');

const usesMaps = template.startsWith('maps-');
const main = usesMaps ? `import { importLibrary, setOptions } from '@googlemaps/js-api-loader';\nimport './styles.css';\n\nconst status = document.querySelector('#status');\nconst key = import.meta.env.VITE_GMP_API_KEY;\nif (!key) {\n  status.textContent = 'Set VITE_GMP_API_KEY to load the map.';\n} else {\n  setOptions({ key, v: '${template === 'maps-3d' ? 'alpha' : 'weekly'}', authReferrerPolicy: 'origin' });\n  try {\n    ${template === 'maps-3d'
      ? `const { Map3DElement } = await importLibrary('maps3d');\n    const map = new Map3DElement({ center: { lat: 37.7749, lng: -122.4194, altitude: 0 }, range: 12000, tilt: 55, heading: 0 });\n    map.setAttribute('aria-label', '${title} map');\n    document.querySelector('#map').append(map);`
      : `const { Map } = await importLibrary('maps');\n    new Map(document.querySelector('#map'), { center: { lat: 37.7749, lng: -122.4194 }, zoom: 11, mapTypeControl: false, streetViewControl: false, internalUsageAttributionIds: ['gmp_git_agentskills_v1'] });`}
    status.textContent = 'Map ready.';\n  } catch (error) {\n    console.error(error);\n    status.textContent = 'Map failed to load. Check key restrictions for this origin.';\n  }\n}\n` : `import './styles.css';\ndocument.querySelector('#status').textContent = 'Demo ready — build from here.';\n`;

try {
  mkdirSync(join(appDir, 'src'), { recursive: true });
  const dependencies = usesMaps ? { '@googlemaps/js-api-loader': '^2.1.1', vite: '^8.0.16' } : { vite: '^8.0.16' };
  writeFileSync(join(appDir, 'package.json'), `${JSON.stringify({ name, version: '1.0.0', private: true, type: 'module', scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview', test: 'npm run build' }, dependencies, engines: { node: '>=20' } }, null, 2)}\n`);
  writeFileSync(join(appDir, 'vite.config.js'), "import { defineConfig } from 'vite';\nexport default defineConfig({ base: process.env.BASE_PATH || '/' });\n");
  writeFileSync(join(appDir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"></head><body><main><a href="/">← Ryan Baumann</a><h1>${title}</h1><p>${description}</p><p id="status" role="status"></p><div id="map" aria-label="${title} map"></div></main><script type="module" src="/src/main.js"></script></body></html>\n`);
  writeFileSync(join(appDir, 'src/main.js'), main);
  writeFileSync(join(appDir, 'src/styles.css'), `:root{font-family:system-ui,sans-serif;color-scheme:dark;background:#08111f;color:#f8fafc}*{box-sizing:border-box}body{margin:0}main{min-height:100vh;padding:clamp(1rem,4vw,3rem)}a{color:#7dd3fc}#map{display:block;min-height:65vh;margin-top:1rem;border-radius:1rem;overflow:hidden}gmp-map-3d{display:block;width:100%;height:65vh}\n`);
  writeFileSync(join(appDir, 'README.md'), `# ${title}\n\n${description}\n\n\`npm install && npm run dev\`\n\nThe browser key must be HTTP-referrer and API restricted. Secret-bearing calls belong in a bounded gateway handler.\n`);
  registerEntry(repoRoot, entry);
  addDependabot(repoRoot, `demos/${name}`);
} catch (error) {
  rollbackPath(appDir);
  writeFileSync(manifestPath, originalManifest);
  writeFileSync(dependabotPath, originalDependabot);
  throw error;
}

console.log(`[labs:new] created demos/${name} with template ${template}`);
console.log(`[labs:new] next: cd demos/${name} && npm install; add a preview for public visibility; npm run labs:check`);
if (entry.auth) console.log(`[labs:new] private route requires Cloud Run env ${entry.auth.envVar}`);
