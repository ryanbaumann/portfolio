#!/usr/bin/env node
// scripts/artifact-cards.mjs — regenerate the SVG artifact cards used where
// no honest screenshot exists (see .agents/skills/portfolio-design/SKILL.md).
//
// Rule: cards state only facts that already appear in the entry's copy
// (real commands, real published stats). Never mock a product UI.
//
// Usage: node scripts/artifact-cards.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'portfolio', 'static', 'img');

const CARDS = [
  {
    file: 'work/code-assist.svg',
    eyebrow: 'SHIPPED · GOOGLE MAPS PLATFORM',
    title: 'Code Assist',
    lines: ['agent ▸ tool call ▸ retrieval ▸ official docs'],
    footer: 'Claude Code · Cursor · Antigravity · Gemini CLI',
  },
  {
    file: 'work/agent-skills.svg',
    eyebrow: 'ONE-COMMAND INSTALL',
    title: 'Agent Skills',
    lines: ['$ npx skills add googlemaps/agent-skills'],
    mono: true,
    footer: 'Web · Android · iOS · Web Services',
  },
  {
    file: 'work/agentic-evals.svg',
    eyebrow: 'THE LAUNCH BAR',
    title: 'Agentic Evals',
    lines: ['task ▸ agent run ▸ score ▸ ship or hold'],
    footer: 'benchmarked against a no-context baseline',
  },
  {
    file: 'work/agentic-growth.svg',
    eyebrow: 'PUBLIC OSS REACH',
    title: '1M+ weekly downloads',
    lines: ['@vis.gl/react-google-maps'],
    footer: 'npm downloads API · verified July 14, 2026',
  },
  {
    file: 'work/voice-of-developer.svg',
    eyebrow: 'DEMAND SENSING',
    title: 'Voice of Developer',
    lines: ['Discord + Stack Overflow + issues + support', '▾', 'ranked roadmap priorities'],
    footer: 'AI does the reading',
  },
  {
    file: 'work/geo-architecture-center.svg',
    eyebrow: 'GEO ARCHITECTURE CENTER',
    title: 'Solution architectures',
    lines: ['public diagrams · guidance · reference implementations'],
    footer: 'developers.google.com/maps/architecture',
  },
  {
    file: 'work/intelligent-product-essentials.svg',
    eyebrow: 'GOOGLE CLOUD · MANUFACTURING',
    title: '0 → launch in 9 months',
    lines: ['Intelligent Product Essentials'],
    footer: 'launched with GE Appliances',
  },
  {
    file: 'work/mapbox-boundaries-atlas.svg',
    eyebrow: 'TWO PRODUCTS, ZERO TO ONE',
    title: 'Boundaries · Atlas',
    lines: ['global boundaries · self-hosted maps'],
    footer: 'both remain in the Mapbox product portfolio',
  },
  {
    file: 'talks/geomob-vibing-with-maps.svg',
    eyebrow: 'GEOMOB SF · APRIL 2025',
    title: 'Vibe with Maps',
    lines: ['concept to prototype, fast'],
    footer: 'three live demos, prompt to working map',
  },
  {
    file: 'talks/visgl-vibe-your-viz.svg',
    eyebrow: 'VIS.GL SUMMIT · SEATTLE · OCT 2025',
    title: 'Vibe your Viz',
    lines: ['growing with AI-native makers'],
    footer: 'deck.gl · kepler.gl · AI-native visualization',
  },
  {
    file: 'talks/code-assist-video.svg',
    eyebrow: 'VIDEO · GOOGLE MAPS PLATFORM',
    title: 'Code Assist, live',
    lines: ['grounded code generation in a real agent session'],
    footer: 'youtu.be/L2V58kKIHvc',
  },
  {
    file: 'talks/agent-skills-video.svg',
    eyebrow: 'VIDEO · GOOGLE MAPS PLATFORM',
    title: 'Agent skills, introduced',
    lines: ['production-ready platform code in one install'],
    footer: 'youtu.be/NEk37sPlgaY',
  },
  {
    file: 'writing/this-weeks-learnings.svg',
    eyebrow: 'LINKEDIN SERIES',
    title: '#ThisWeeksLearnings',
    lines: ['what shipping taught me this week'],
    footer: 'traces read · evals written · opinions revised',
  },
  {
    file: 'writing/vibing-with-maps.svg',
    eyebrow: 'SUBSTACK',
    title: 'Vibing with Maps',
    lines: ['practical experiments'],
    footer: 'ryanbaumann.substack.com',
  },
  {
    file: 'writing/code-assist-launch.svg',
    eyebrow: 'LAUNCH POST · GOOGLE MAPS PLATFORM',
    title: 'Announcing Code Assist',
    lines: ['grounded platform expertise in any AI assistant'],
    footer: 'mapsplatform.google.com',
  },
];

const escape = (t) => String(t).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Cards are referenced via <img>, and an SVG loaded that way still honors an
// internal prefers-color-scheme media query. Colors are driven by CSS custom
// properties so one stylesheet flips the whole card between light and dark to
// match the page it sits on.
function card({ eyebrow, title, lines, footer, mono }) {
  const W = 960;
  const H = 600;
  const sans = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const monoStack = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  const lineCount = lines.length;
  const blockStart = 300 - ((lineCount - 1) * 26);
  const bodyFont = mono ? monoStack : sans;
  const body = lines
    .map((line, i) => `<text class="body" x="480" y="${blockStart + 92 + i * 52}" text-anchor="middle" font-family="${bodyFont}" font-size="30">${escape(line)}</text>`)
    .join('\n  ');
  const styles = `
    :root {
      --bg: #0b1220; --border: #1f2b3f; --dot: #26334a;
      --eyebrow: #2563eb; --title: #f3f6fb; --body: #c7d2e4; --footer: #7e8aa0;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f7f8fb; --border: #dfe4ee; --dot: #c7cede;
        --eyebrow: #2563eb; --title: #111827; --body: #384156; --footer: #6b7280;
      }
    }
  `.trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(`${eyebrow}: ${title}`)}">
  <style>${styles}
    .card-bg { fill: var(--bg); } .card-border { stroke: var(--border); } .dot { fill: var(--dot); }
    .rule { stroke: var(--border); } .eyebrow { fill: var(--eyebrow); }
    .title { fill: var(--title); } .body { fill: var(--body); } .footer { fill: var(--footer); }
  </style>
  <rect class="card-bg" width="${W}" height="${H}"/>
  <rect class="card-border" x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="none" stroke-width="3" rx="14"/>
  <circle class="dot" cx="46" cy="46" r="7"/>
  <circle class="dot" cx="72" cy="46" r="7"/>
  <circle class="dot" cx="98" cy="46" r="7"/>
  <text class="eyebrow" x="480" y="${blockStart - 34}" text-anchor="middle" font-family="${monoStack}" font-size="19" letter-spacing="4">${escape(eyebrow)}</text>
  <text class="title" x="480" y="${blockStart + 30}" text-anchor="middle" font-family="${sans}" font-size="52" font-weight="700">${escape(title)}</text>
  ${body}
  <line class="rule" x1="120" y1="${H - 96}" x2="${W - 120}" y2="${H - 96}" stroke-width="2"/>
  <text class="footer" x="480" y="${H - 56}" text-anchor="middle" font-family="${monoStack}" font-size="19">${escape(footer)}</text>
</svg>
`;
}

for (const spec of CARDS) {
  const path = join(OUT, spec.file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, card(spec));
  console.log(`[artifact-cards] wrote portfolio/static/img/${spec.file}`);
}
