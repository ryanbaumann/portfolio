#!/usr/bin/env node
// Generate factual 1200x627 social cards from existing portfolio assets.
//
// This script adds no production dependency. It uses the Playwright dev
// dependency already owned by demos/strava-explorer so Chromium can rasterize
// system-font HTML and the repository's real screenshots/artifact cards.
//
// Usage: node scripts/social-cards.mjs

import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'portfolio', 'static', 'social');
const WIDTH = 1200;
const HEIGHT = 627;

const CARDS = [
  {
    file: 'home.png',
    eyebrow: 'RYAN BAUMANN',
    title: 'I build platforms that get developers and agents to working code.',
    summary: 'Builder platforms · Developer tools · AI coding agents',
    source: 'portfolio/static/previews/portfolio.jpg',
    layout: 'screenshot',
  },
  {
    file: 'developer-experience-is-a-growth-discipline.png',
    eyebrow: 'WRITING · DEVELOPER EXPERIENCE',
    title: 'Developer Experience Is a Growth Discipline',
    summary: 'Product, distribution, and measurement as one system.',
    source: 'portfolio/static/img/work/agentic-growth.svg',
    layout: 'artifact',
  },
  {
    file: 'devx-growth-discipline.png',
    source: 'portfolio/static/social/devx-growth-discipline-final-source.png',
    layout: 'direct',
  },
  {
    file: 'the-next-platform-interface-is-an-agent-session.png',
    eyebrow: 'WRITING · AGENT EXPERIENCE',
    title: 'The Next Platform Interface Is an Agent Session',
    summary: 'Ship context and workflows where developers make decisions.',
    source: 'portfolio/static/img/work/code-assist.svg',
    layout: 'artifact',
  },
  {
    file: 'evals-turn-ai-developer-experience-into-an-operating-system.png',
    eyebrow: 'WRITING · EVALS',
    title: 'Evals Are How You Know an AI Developer Tool Got Better',
    summary: "Test whether a context, tool, or prompt improved the developer's actual job.",
    source: 'portfolio/static/img/work/agentic-evals.svg',
    layout: 'artifact',
  },
  {
    file: 'this-weeks-learnings.png',
    eyebrow: 'WRITING · LINKEDIN SERIES',
    title: '#ThisWeeksLearnings',
    summary: 'Notes from traces reviewed, evals written, products dogfooded, and opinions revised.',
    source: 'portfolio/static/img/writing/this-weeks-learnings.svg',
    layout: 'artifact',
  },
  {
    file: 'vibing-with-maps.png',
    eyebrow: 'WRITING · SUBSTACK',
    title: 'Vibing with Maps: Practical Experiments',
    summary: 'What worked, what broke, and why curated context beats raw model knowledge for geo work.',
    source: 'portfolio/static/img/writing/vibing-with-maps.svg',
    layout: 'artifact',
  },
  {
    file: 'code-assist-launch.png',
    eyebrow: 'WRITING · GOOGLE MAPS PLATFORM',
    title: 'Announcing the Code Assist Toolkit',
    summary: 'Grounded platform expertise in any AI coding assistant, and why retrieval beats training-data memory.',
    source: 'portfolio/static/img/writing/code-assist-launch.svg',
    layout: 'artifact',
  },
  {
    file: 'code-assist-video.png',
    eyebrow: 'TALK · AI DEVELOPER EXPERIENCE',
    title: 'Bring Platform Expertise to Your AI Coding Assistant',
    summary: 'A demo of grounded platform context inside an agent session.',
    source: 'portfolio/static/img/talks/code-assist-video.svg',
    layout: 'artifact',
  },
  {
    file: 'agent-skills-video.png',
    eyebrow: 'TALK · AGENT SKILLS',
    title: 'Agent Skills for Google Maps Platform',
    summary: 'Package platform workflows as a maintained, distributable artifact.',
    source: 'portfolio/static/img/talks/agent-skills-video.svg',
    layout: 'artifact',
  },
  {
    file: 'visgl-vibe-your-viz.png',
    eyebrow: 'TALK · VIS.GL SUMMIT',
    title: 'Vibe Your Viz: Growing With AI-Native Makers',
    summary: 'What open-source visualization libraries need from AI coding agents.',
    source: 'portfolio/static/img/talks/visgl-vibe-your-viz.svg',
    layout: 'artifact',
  },
  {
    file: 'geomob-vibing-with-maps.png',
    eyebrow: 'TALK · GEOMOB SF',
    title: 'Vibe With Maps: Concept to Prototype, Fast',
    summary: 'Three working demos and the context that makes them reliable.',
    source: 'portfolio/static/img/talks/geomob-vibing-with-maps.svg',
    layout: 'artifact',
  },
  {
    file: 'strava-explorer.png',
    eyebrow: 'DEMO · GOOGLE MAPS PLATFORM',
    title: 'Strava 3D Explorer',
    summary: 'Fly your Strava routes in Photorealistic 3D.',
    source: 'portfolio/static/previews/strava-explorer.jpg',
    layout: 'screenshot',
  },
  {
    file: 'aqi-map.png',
    eyebrow: 'DEMO · GOOGLE MAPS PLATFORM',
    title: 'Air Quality Map',
    summary: 'Live air-quality heatmap with pollutant detail.',
    source: 'portfolio/static/previews/aqi-map.jpg',
    layout: 'screenshot',
  },
  {
    file: 'isochrones.png',
    eyebrow: 'DEMO · GOOGLE MAPS PLATFORM',
    title: 'Isochrones',
    summary: 'Live reachability bands for delivery, commute, and response planning.',
    source: 'portfolio/static/previews/isochrones.jpg',
    layout: 'screenshot',
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function imageDataUrl(path) {
  const extension = extname(path).toLowerCase();
  const mime = extension === '.svg' ? 'image/svg+xml' : extension === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${readFileSync(path).toString('base64')}`;
}

function cardHtml(spec) {
  const assetPath = resolve(ROOT, spec.source);
  const image = imageDataUrl(assetPath);
  if (spec.layout === 'direct') {
    return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; margin: 0; overflow: hidden; }
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
</style></head><body><img src="${image}" alt=""></body></html>`;
  }
  const titleSize = spec.title.length > 64 ? 50 : spec.title.length > 56 ? 56 : spec.title.length > 42 ? 62 : 70;
  const screenshot = spec.layout === 'screenshot';

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; margin: 0; overflow: hidden; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; background: #f7f5f0; color: #172033; }
  .card { position: relative; width: 100%; height: 100%; background: #f7f5f0; }
  .visual { position: absolute; overflow: hidden; }
  .screenshot .visual { inset: 0 0 0 43%; }
  .artifact .visual { top: 68px; right: 58px; bottom: 68px; width: 47%; border: 1px solid #d9dde5; border-radius: 14px; background: #0b1220; }
  .visual img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .artifact .visual img { object-fit: contain; }
  .screenshot .visual::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, #f7f5f0 0%, rgba(247,245,240,.8) 12%, rgba(247,245,240,0) 38%); }
  .copy { position: absolute; z-index: 2; left: 68px; top: 64px; bottom: 58px; display: flex; flex-direction: column; justify-content: center; }
  .screenshot .copy { width: 545px; }
  .artifact .copy { width: 520px; }
  .eyebrow { margin: 0 0 27px; color: #1d5fd1; font: 700 19px/1.2 ui-monospace, "SFMono-Regular", Consolas, monospace; letter-spacing: 2.4px; }
  h1 { margin: 0; max-width: 530px; font-size: ${titleSize}px; line-height: .99; letter-spacing: -3.4px; font-weight: 760; text-wrap: balance; }
  .summary { margin: 28px 0 0; max-width: 500px; color: #505b6e; font-size: 25px; line-height: 1.35; text-wrap: balance; }
  .byline { margin-top: auto; color: #697386; font: 600 18px/1.2 ui-monospace, "SFMono-Regular", Consolas, monospace; }
  .rule { position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; height: 7px; background: #1d5fd1; }
</style></head><body>
  <main class="card ${escapeHtml(spec.layout)}">
    <div class="visual"><img src="${image}" alt=""></div>
    <div class="copy">
      <p class="eyebrow">${escapeHtml(spec.eyebrow)}</p>
      <h1>${escapeHtml(spec.title)}</h1>
      <p class="summary">${escapeHtml(spec.summary)}</p>
      <p class="byline">www.ryanbaumann-portfolio.com</p>
    </div>
    <div class="rule"></div>
  </main>
</body></html>`;
}

function assertPng(path) {
  const bytes = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) {
    throw new Error(`${relative(ROOT, path)} is not a PNG`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== WIDTH || height !== HEIGHT) {
    throw new Error(`${relative(ROOT, path)} is ${width}x${height}; expected ${WIDTH}x${HEIGHT}`);
  }
}

function loadChromium() {
  try {
    const demoRequire = createRequire(join(ROOT, 'demos', 'strava-explorer', 'package.json'));
    return demoRequire('playwright').chromium;
  } catch (error) {
    throw new Error(
      'Social card generation needs the existing Playwright dev dependency. ' +
      'Run `npm install` in demos/strava-explorer, then retry.',
      { cause: error },
    );
  }
}

mkdirSync(OUT, { recursive: true });
const chromium = loadChromium();
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

  for (const spec of CARDS) {
    const outputPath = join(OUT, spec.file);
    await page.setContent(cardHtml(spec), { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
      await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
    });
    await page.screenshot({ path: outputPath, type: 'png' });
    assertPng(outputPath);
    console.log(`[social-cards] wrote ${relative(ROOT, outputPath)} (${WIDTH}x${HEIGHT}, image/png)`);
  }

  writeFileSync(
    join(OUT, 'sources.json'),
    `${JSON.stringify(
      Object.fromEntries(CARDS.map(({ file, source }) => [file, source])),
      null,
      2,
    )}\n`,
  );
  console.log(`[social-cards] wrote ${relative(ROOT, join(OUT, 'sources.json'))}`);
} catch (error) {
  if (/Executable doesn't exist|browserType\.launch/.test(String(error))) {
    throw new Error(
      'Playwright Chromium is unavailable. Run `npx playwright install chromium` from demos/strava-explorer, then retry.',
      { cause: error },
    );
  }
  throw error;
} finally {
  await browser?.close();
}
