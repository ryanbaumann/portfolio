#!/usr/bin/env node
// scripts/new-demo.mjs — one-command demo scaffold.
//
// Creates a new Vite demo app wired into everything the repo already has:
// the folder itself, the apps.json manifest entry (which drives gateway
// routing, the homepage Demos section, build-local, and the smoke test),
// the Dockerfile builder + COPY stages, and the dependabot config.
// Zero dependencies; anchors its Dockerfile/dependabot edits on exact
// strings and fails loudly (with manual instructions) if they've drifted.
//
// Usage:
//   npm run new:demo -- my-demo --title "My Demo" --description "One line for the card."
//   npm run new:demo -- client-preview --visibility private --providers isochrones
//   node scripts/new-demo.mjs my-demo
//
// After scaffolding:
//   cd demos/my-demo && npm install && npm run dev  # build the thing
//   node scripts/build-local.mjs && npm run smoke   # verify the wiring

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEMOS_DIR = join(REPO_ROOT, 'demos');

function fail(message) {
  console.error(`[new-demo] ERROR: ${message}`);
  process.exit(1);
}

// --- parse args -------------------------------------------------------------

const args = process.argv.slice(2);
const name = args[0];
if (!name || name.startsWith('-')) fail('usage: npm run new:demo -- <kebab-case-name> [--title "..."] [--description "..."] [--visibility public|unlisted|private]');
if (!/^[a-z][a-z0-9-]*$/.test(name)) fail(`name must be kebab-case (got "${name}")`);

function flag(flagName, fallback) {
  const index = args.indexOf(`--${flagName}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
}

const title = flag('title', name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' '));
const description = flag('description', `One line about ${title} — shown on the homepage demo card.`);
const visibility = flag('visibility', 'public');
if (!['public', 'unlisted', 'private'].includes(visibility)) fail(`visibility must be public, unlisted, or private (got "${visibility}")`);
const providers = flag('providers', '').split(',').map((provider) => provider.trim()).filter(Boolean);
const knownProviders = new Set(['strava', 'isochrones', 'resend']);
if (providers.some((provider) => !knownProviders.has(provider))) fail(`providers must be named gateway providers: ${[...knownProviders].join(', ')}`);
const authEnv = flag('auth-env', `${name.replace(/-/g, '_').toUpperCase()}_PASSWORD`);
if (visibility === 'private' && !/^[A-Z][A-Z0-9_]*$/.test(authEnv)) fail(`auth-env must be an uppercase environment variable name (got "${authEnv}")`);

const appDir = join(DEMOS_DIR, name);
if (existsSync(appDir)) fail(`demos/${name}/ already exists`);

// --- 1. app folder ----------------------------------------------------------

mkdirSync(join(appDir, 'src'), { recursive: true });

writeFileSync(join(appDir, 'package.json'), `${JSON.stringify({
  name,
  version: '1.0.0',
  private: true,
  type: 'module',
  description,
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview', test: 'npm run build' },
  dependencies: { '@googlemaps/js-api-loader': '^2.1.1', vite: '^8.0.16' },
  engines: { node: '>=20' },
}, null, 2)}\n`);

writeFileSync(join(appDir, 'vite.config.js'), `import { defineConfig } from 'vite';

// BASE_PATH lets the gateway container mount this app at /${name}/
// while local \`npm run build\` still defaults to '/'.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
});
`);

writeFileSync(join(appDir, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} — Google Maps Platform Demo</title>
    <meta name="description" content="${description}" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧪</text></svg>" />
  </head>
  <body>
    <div id="app">
      <aside class="panel" aria-label="${title} controls">
        <a class="home-link" href="/" aria-label="Back to Ryan Baumann home">&larr; Ryan Baumann</a>
        <p class="eyebrow">Google Maps Platform demo</p>
        <h1>${title}</h1>
        <p class="lede">${description}</p>
        <p id="status" role="status"></p>
      </aside>
      <main id="map" aria-label="Map"></main>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`);

writeFileSync(join(appDir, 'src', 'main.js'), `import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import './styles.css';

const API_KEY = import.meta.env.VITE_GMP_API_KEY;
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

const elements = {
  map: document.querySelector('#map'),
  status: document.querySelector('#status'),
};

function setStatus(message, tone = 'neutral') {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

async function init() {
  if (!API_KEY) {
    setStatus('Set VITE_GMP_API_KEY to load the map.', 'error');
    return;
  }

  setOptions({ key: API_KEY, v: 'weekly', authReferrerPolicy: 'origin' });
  let Map;
  try {
    ({ Map } = await importLibrary('maps'));
  } catch (error) {
    console.error('Google Maps failed to load:', error);
    setStatus('Google Maps failed to load — the API key may be invalid or restricted for this origin.', 'error');
    return;
  }

  const map = new Map(elements.map, {
    center: DEFAULT_CENTER,
    zoom: 11,
    mapId: 'DEMO_MAP_ID',
    colorScheme: 'DARK',
    mapTypeControl: false,
    streetViewControl: false,
  });

  setStatus('Map ready — build your demo in src/main.js.');
  return map;
}

init().catch((error) => {
  console.error('Initialization failed:', error);
  setStatus(\`Initialization failed: \${error.message}\`, 'error');
});
`);

writeFileSync(join(appDir, 'src', 'styles.css'), `:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #050816;
  color: #f8fafc;
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; }
button, input, select { font: inherit; }

#app {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(320px, 400px) 1fr;
}

.panel {
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  overflow-y: auto;
  max-height: 100vh;
  border-right: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.88);
}

.home-link { display: inline-block; color: #94a3b8; text-decoration: none; font-size: 0.78rem; font-weight: 600; }
.home-link:hover { color: #38bdf8; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.7rem; font-weight: 700; color: #38bdf8; margin: 0; }
h1 { margin: 0; }
.lede { margin: 0; color: #cbd5e1; }
#status[data-tone="error"] { color: #fca5a5; }
#map { min-height: 100vh; }

@media (max-width: 860px) {
  #app { grid-template-columns: 1fr; }
  .panel { max-height: none; border-right: 0; border-bottom: 1px solid rgba(148, 163, 184, 0.2); }
  #map { min-height: 60vh; }
}
`);

writeFileSync(join(appDir, 'README.md'), `# ${title}

${description}

Part of [Ryan Baumann's demo lab](https://www.ryanbaumann-portfolio.com/demos/). Scaffolded by \`npm run new:demo\`.

\`\`\`bash
npm install
VITE_GMP_API_KEY=<browser key> npm run dev
npm run build
\`\`\`

If this demo needs a secret-bearing API call, do not call the third-party
API from the browser — add a proxy module under \`gateway/lib/\` (see
\`gateway/lib/isochrones.js\` for the pattern) and route it in
\`gateway/server.js\`.
`);

console.log(`[new-demo] created demos/${name}/ (package.json, vite.config.js, index.html, src/)`);

// --- 2. apps.json -----------------------------------------------------------

const appsJsonPath = join(REPO_ROOT, 'apps.json');
const apps = JSON.parse(readFileSync(appsJsonPath, 'utf8'));
if (apps.some((app) => app.name === name)) fail(`apps.json already has an entry named "${name}"`);
apps.push({
  name,
  title,
  description,
  path: `/${name}/`,
  dev_build_dir: `demos/${name}/dist`,
  ...(providers.length ? { providers } : {}),
  ...(visibility !== 'public' ? { visibility } : {}),
  ...(visibility === 'private' ? { auth: { type: 'password', envVar: authEnv } } : {}),
  tags: ['google-maps-platform'],
  preview: null,
});
writeFileSync(appsJsonPath, `${JSON.stringify(apps, null, 2)}\n`);
console.log('[new-demo] added apps.json entry (drives gateway routing, homepage card, build, smoke)');
if (visibility === 'private') console.log(`[new-demo] private access requires server env ${authEnv}; the demo is hidden and fails closed until it is set`);

// --- 3. Dockerfile ----------------------------------------------------------

const dockerfilePath = join(REPO_ROOT, 'Dockerfile');
let dockerfile = readFileSync(dockerfilePath, 'utf8');
const runtimeAnchor = 'FROM node:20-slim AS runtime';
const copyAnchor = 'ENV NODE_ENV=production';
const builderStage = `FROM node:20-slim AS ${name}-builder
ARG VITE_GMP_API_KEY
ENV VITE_GMP_API_KEY=$VITE_GMP_API_KEY
WORKDIR /src/${name}
COPY demos/${name}/package.json demos/${name}/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY demos/${name}/ ./
ENV BASE_PATH=/${name}/
RUN npm run build

`;
const copyLine = `COPY --chown=node:node --from=${name}-builder /src/${name}/dist ./apps/${name}\n`;

if (dockerfile.includes(runtimeAnchor) && dockerfile.includes(copyAnchor)) {
  dockerfile = dockerfile.replace(runtimeAnchor, builderStage + runtimeAnchor);
  dockerfile = dockerfile.replace(copyAnchor, copyLine + '\n' + copyAnchor);
  writeFileSync(dockerfilePath, dockerfile);
  console.log('[new-demo] added Dockerfile builder stage + runtime COPY');
} else {
  console.warn('[new-demo] WARN: Dockerfile anchors not found — add the builder stage and COPY line by hand (copy the pattern of the other *-builder stages).');
}

// --- 4. dependabot ----------------------------------------------------------

const dependabotPath = join(REPO_ROOT, '.github', 'dependabot.yml');
if (existsSync(dependabotPath)) {
  let dependabot = readFileSync(dependabotPath, 'utf8');
  const dependabotAnchor = '  - package-ecosystem: "github-actions"';
  const dependabotEntry = `  - package-ecosystem: "npm"
    directory: "/demos/${name}"
    schedule:
      interval: "weekly"

`;
  if (dependabot.includes(dependabotAnchor)) {
    dependabot = dependabot.replace(dependabotAnchor, dependabotEntry + dependabotAnchor);
    writeFileSync(dependabotPath, dependabot);
    console.log('[new-demo] added dependabot entry');
  } else {
    console.warn('[new-demo] WARN: dependabot anchor not found — add the npm entry by hand.');
  }
}

// --- done -------------------------------------------------------------------

console.log(`
[new-demo] ${name} is wired in. Next:

  cd demos/${name} && npm install && VITE_GMP_API_KEY=<key> npm run dev
  node scripts/build-local.mjs && npm run smoke   # CI runs this same pair
  node scripts/previews.mjs                       # regenerate homepage screenshots

The homepage Demos section, nav, gateway route, container build, and smoke
coverage all come from the apps.json entry — no other wiring needed.
`);
