#!/usr/bin/env node
// build.mjs — the entire CMS.
//
// Zero dependencies. Reads flat files from content/ (markdown with a small
// front-matter block, plus site.json), renders static HTML into dist/, and
// copies static/ verbatim. Adding content is adding a file; adding a content
// type is adding an entry to COLLECTIONS below.
//
// Usage:
//   node build.mjs                 # build into dist/
//   BASE_PATH=/portfolio/ node build.mjs   # build for a subpath mount

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = resolve(process.env.PORTFOLIO_CONTENT_DIR || join(ROOT, 'content'));
const STATIC_DIR = resolve(process.env.PORTFOLIO_STATIC_DIR || join(ROOT, 'static'));
const OUTPUT_DIR = resolve(process.env.PORTFOLIO_DIST_DIR || join(ROOT, 'dist'));
const DIST_DIR = `${OUTPUT_DIR}.building-${process.pid}`;
const BASE = (process.env.BASE_PATH || '/').endsWith('/')
  ? (process.env.BASE_PATH || '/')
  : `${process.env.BASE_PATH}/`;

// Each collection is a folder of markdown files. Files starting with "_"
// (templates, drafts) are skipped. `listPage` controls whether the
// collection gets its own index page; `detailPages` controls whether
// entries with a body get their own page at /<name>/<slug>/.
const COLLECTIONS = [
  { name: 'work', label: 'Work', listPage: true, detailPages: true },
  { name: 'writing', label: 'Writing', listPage: true, detailPages: true },
  { name: 'talks', label: 'Talks', listPage: true, detailPages: true },
];

const site = JSON.parse(readFileSync(join(CONTENT_DIR, 'site.json'), 'utf8'));

const validationErrors = [];

function failValidation(message) {
  validationErrors.push(message);
}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidUrl(value) {
  if (typeof value !== 'string') return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

function pagePathForInternalHref(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (demos.some((demo) => demo.path === clean || demo.path === `${clean}/`)) return null;
  if (!clean || !clean.startsWith('/') || clean.startsWith('//')) return null;
  if (/\.[a-z0-9]+$/i.test(clean)) return join(STATIC_DIR, clean.slice(1));
  return join(DIST_DIR, clean.slice(1), 'index.html');
}

function collectMarkdownLinks(markdown) {
  const links = [];
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)\)/g;
  let match;
  while ((match = pattern.exec(markdown))) links.push(match[1]);
  return links;
}

function validateInternalHref(id, href) {
  if (!href?.startsWith('/')) return;
  const path = pagePathForInternalHref(href);
  if (path && !existsSync(path)) failValidation(`${id}: broken internal link ${href}`);
}

function validateEntry(collection, entry, seenSlugs) {
  const id = `${collection.name}/${entry.slug}`;
  if (seenSlugs.has(id)) failValidation(`${id}: duplicate slug`);
  seenSlugs.add(id);
  const { meta } = entry;
  for (const field of ['title', 'summary']) {
    if (!meta[field] || typeof meta[field] !== 'string') failValidation(`${id}: missing required ${field}`);
  }
  if (meta.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) failValidation(`${id}: slug must be lowercase kebab-case`);
  if (meta.draft !== undefined && typeof meta.draft !== 'boolean') failValidation(`${id}: draft must be a boolean`);
  if (meta.noindex !== undefined && typeof meta.noindex !== 'boolean') failValidation(`${id}: noindex must be a boolean`);
  if (meta.draft === true && meta.noindex !== true) failValidation(`${id}: drafts must set noindex: true`);
  if (meta.draft !== true && meta.noindex === true && meta.canonical) failValidation(`${id}: published noindex entries should not also set canonical`);
  if (collection.name === 'writing' && !isValidIsoDate(meta.date)) failValidation(`${id}: writing date must be YYYY-MM-DD`);
  for (const field of ['external', 'canonical']) {
    if (meta[field] && !isValidUrl(meta[field])) failValidation(`${id}: ${field} must be an https, mailto, or root-relative URL`);
  }
  if (meta.image) {
    if (!meta.imageAlt) failValidation(`${id}: imageAlt is required when image is set`);
    const imagePath = meta.image.startsWith('/') ? join(STATIC_DIR, meta.image.slice(1)) : join(CONTENT_DIR, collection.name, meta.image);
    if (!existsSync(imagePath)) failValidation(`${id}: image asset not found: ${meta.image}`);
  }
  if (meta.tags && !Array.isArray(meta.tags)) failValidation(`${id}: tags must be a JSON array`);
  if (meta.updated && !isValidIsoDate(meta.updated)) failValidation(`${id}: updated must be YYYY-MM-DD`);
  for (const link of meta.links || []) {
    if (!link.label || !isValidUrl(link.url)) failValidation(`${id}: links entries require label and valid url`);
    else validateInternalHref(id, link.url);
  }
  for (const href of collectMarkdownLinks(entry.body)) validateInternalHref(id, href);
}

function validatePage(slug, meta, body) {
  const id = `pages/${slug}`;
  for (const field of ['title', 'summary']) {
    if (!meta[field] || typeof meta[field] !== 'string') failValidation(`${id}: missing required ${field}`);
  }
  if (meta.image) {
    if (!meta.imageAlt) failValidation(`${id}: imageAlt is required when image is set`);
    const imagePath = meta.image.startsWith('/') ? join(STATIC_DIR, meta.image.slice(1)) : join(CONTENT_DIR, 'pages', meta.image);
    if (!existsSync(imagePath)) failValidation(`${id}: image asset not found: ${meta.image}`);
  }
  for (const href of collectMarkdownLinks(body)) validateInternalHref(id, href);
}

function validateSite() {
  for (const field of ['name', 'role', 'description', 'siteUrl', 'canonicalHost', 'defaultShareImage']) {
    if (!site[field] || typeof site[field] !== 'string') failValidation(`site.json: missing required ${field}`);
  }
  if (!isValidUrl(site.siteUrl)) failValidation('site.json: siteUrl must be an https URL');
  if (site.siteUrl) {
    try {
      if (new URL(site.siteUrl).host !== site.canonicalHost) failValidation('site.json: canonicalHost must match siteUrl');
    } catch {
      // The URL-specific error above is more useful.
    }
  }
  if (site.defaultShareImage) {
    const imagePath = join(STATIC_DIR, site.defaultShareImage.replace(/^\//, ''));
    if (!existsSync(imagePath)) failValidation(`site.json: defaultShareImage asset not found: ${site.defaultShareImage}`);
  }
}

function assertValidBuild() {
  if (!validationErrors.length) return;
  console.error('[portfolio] content validation failed:');
  for (const error of validationErrors) console.error(`- ${error}`);
  rmSync(DIST_DIR, { recursive: true, force: true });
  process.exit(1);
}


// Live demo apps. The manifest is the repo-root apps.json (the same file the
// gateway routes from), so a demo added there shows up here on the next
// build with zero portfolio changes. When this site is extracted into its
// own repo (no ../apps.json), the demos section and nav item simply
// disappear — nothing else breaks.
function loadDemos() {
  const manifestPath = resolve(process.env.PORTFOLIO_APPS_MANIFEST || join(ROOT, '..', 'apps.json'));
  if (!existsSync(manifestPath)) return [];
  try {
    const entries = JSON.parse(readFileSync(manifestPath, 'utf8'));
    // The portfolio itself is listed in the manifest (it's how the gateway
    // mounts this site at "/"); everything else is a demo.
    return entries.filter((entry) =>
      entry.path !== '/' && entry.name !== 'portfolio' && (entry.visibility || 'public') === 'public');
  } catch {
    return [];
  }
}

const demos = loadDemos();

// ---------------------------------------------------------------------------
// Front matter: a leading block delimited by --- lines, one `key: value` per
// line. Values that parse as JSON (arrays, objects, booleans, numbers) are
// used as-is; everything else is a string.
// ---------------------------------------------------------------------------

function parseFrontMatter(raw) {
  const meta = {};
  if (!raw.startsWith('---')) return { meta, body: raw.trim() };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta, body: raw.trim() };
  const block = raw.slice(raw.indexOf('\n') + 1, end);
  for (const line of block.split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key) continue;
    try {
      meta[key] = JSON.parse(value);
    } catch {
      meta[key] = value;
    }
  }
  return { meta, body: raw.slice(end + 4).trim() };
}

// ---------------------------------------------------------------------------
// Markdown: the small subset the content actually uses — headings, bold,
// italic, inline code, links, images, lists, blockquotes, fenced code, hr.
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Content authors write site-internal links root-relative (`/work/`,
// `/decks/foo.pdf`); rebase them onto BASE_PATH so the same content works
// at the domain root and mounted under a subpath.
function rebase(href) {
  if (href.startsWith('/') && !href.startsWith('//')) return BASE + href.slice(1);
  return href;
}

function inlineMd(text) {
  let html = escapeHtml(text);
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    const localPath = src.startsWith('/') ? join(STATIC_DIR, src.slice(1)) : null;
    const { width, height } = localPath && existsSync(localPath) ? getImageDimensions(localPath) : { width: 960, height: 600 };
    return `<img src="${rebase(src)}" alt="${alt}" loading="lazy" width="${width}" height="${height}" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    return `<a href="${rebase(href)}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function markdownToHtml(markdown) {
  const lines = markdown.split('\n');
  const out = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith('```')) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 5); // page h1 is the title
      out.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      out.push('<hr />');
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(`<li>${inlineMd(lines[index].replace(/^\s*[-*]\s+/, ''))}</li>`);
        index += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(`<li>${inlineMd(lines[index].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        index += 1;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (line.startsWith('> ')) {
      const quote = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        quote.push(inlineMd(lines[index].slice(2)));
        index += 1;
      }
      out.push(`<blockquote><p>${quote.join('<br />')}</p></blockquote>`);
      continue;
    }

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== '' && !/^(#{1,4}\s|```|>\s|\s*[-*]\s|\s*\d+\.\s)/.test(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    out.push(`<p>${inlineMd(paragraph.join(' '))}</p>`);
  }

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Content loading
// ---------------------------------------------------------------------------

function loadCollection(name) {
  const dir = join(CONTENT_DIR, name);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && !file.startsWith('_'))
    .map((file) => {
      const fileSlug = file.replace(/\.md$/, '');
      const { meta, body } = parseFrontMatter(readFileSync(join(dir, file), 'utf8'));
      const slug = meta.slug || fileSlug;
      return { slug, sourceSlug: fileSlug, meta, body };
    })
    .sort((a, b) => {
      const orderA = a.meta.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.meta.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return String(b.meta.date || '').localeCompare(String(a.meta.date || ''));
    });
}

function entryUrl(collection, entry) {
  if (entry.meta.external) return entry.meta.external;
  return `${BASE}${collection}/${entry.slug}/`;
}

function hasDetailPage(entry) {
  return !entry.meta.external && entry.body.length > 0;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const CSS = readFileSync(join(ROOT, 'style.css'), 'utf8');

function layout({ title, description, content, active = '', canonical, ogImage, ogImageAlt, ogType, articleDate, articleUpdated, robots, jsonLd }) {
  const navItems = [
    { href: `${BASE}work/`, label: 'Work', key: 'work' },
    { href: `${BASE}writing/`, label: 'Writing', key: 'writing' },
    { href: `${BASE}talks/`, label: 'Talks', key: 'talks' },
    ...(demos.length ? [{ href: `${BASE}demos/`, label: 'Demos', key: 'demos' }] : []),
    { href: `${BASE}resume/`, label: 'Resume', key: 'resume' },
    { href: `${BASE}contact/`, label: 'Contact', key: 'contact' },
    { href: `${BASE}about/`, label: 'About', key: 'about' },
  ];
  const nav = navItems
    .map((item) => `<a href="${item.href}"${item.key === active ? ' aria-current="page"' : ''}>${item.label}</a>`)
    .join('');

  const resolvedCanonical = canonical || absoluteUrl('/');
  const resolvedImage = absoluteUrl(ogImage || site.defaultShareImage);
  const resolvedImageAlt = escapeHtml(ogImageAlt || `${site.name} — ${site.role}`);
  const resolvedOgType = ogType || 'website';
  const socialHandle = site.socialHandle || '';
  const twitterCardType = ogImage ? 'summary_large_image' : 'summary';

  const canonicalTag = `<link rel="canonical" href="${escapeHtml(resolvedCanonical)}" />`;
  const ogUrlTag = `<meta property="og:url" content="${escapeHtml(resolvedCanonical)}" />`;
  const ogImageTag = `<meta property="og:image" content="${escapeHtml(resolvedImage)}" />`;
  const ogImageAltTag = `<meta property="og:image:alt" content="${resolvedImageAlt}" />`;

  const twitterTags = [
    `<meta name="twitter:card" content="${twitterCardType}" />`,
    socialHandle ? `<meta name="twitter:site" content="${escapeHtml(socialHandle)}" />` : '',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(resolvedImage)}" />`,
  ].filter(Boolean).join('\n');

  const articleTags = resolvedOgType === 'article'
    ? [
        articleDate ? `<meta property="article:published_time" content="${escapeHtml(articleDate)}T00:00:00Z" />` : '',
        articleUpdated ? `<meta property="article:modified_time" content="${escapeHtml(articleUpdated)}T00:00:00Z" />` : '',
        `<meta property="article:author" content="${escapeHtml(site.name)}" />`,
      ].filter(Boolean).join('\n')
    : '';

  const robotsTag = robots ? `<meta name="robots" content="${escapeHtml(robots)}" />` : '';

  const jsonLdTag = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
${canonicalTag}
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:type" content="${escapeHtml(resolvedOgType)}" />
${ogUrlTag}
${ogImageTag}
${ogImageAltTag}
${twitterTags}
${articleTags ? articleTags + '\n' : ''}<link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml" />
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.name)} Writing" href="${absoluteUrl('/feed.xml')}" />
${robotsTag ? robotsTag + '\n' : ''}${jsonLdTag ? jsonLdTag + '\n' : ''}<script>try{const t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch{}</script>
<style>${CSS}</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="site-name" href="${BASE}">${escapeHtml(site.name)}</a>
  <nav aria-label="Site">${nav}</nav>
  <button class="theme-toggle" type="button" aria-label="Toggle color theme" onclick="try{const e=document.documentElement;const n=e.dataset.theme==='dark'?'light':'dark';e.dataset.theme=n;localStorage.setItem('theme',n)}catch{}">Theme</button>
</header>
<main id="main">
${content}
</main>
<footer class="site-footer">
  <p>&copy; <span>${new Date().getFullYear()}</span> ${escapeHtml(site.name)}</p>
  <p class="footer-links">
    <a href="${site.links.github}" rel="noopener">GitHub</a>
    <a href="${site.links.linkedin}" rel="noopener">LinkedIn</a>
    ${site.links.x ? `<a href="${site.links.x}" rel="noopener">X</a>` : ''}
    ${site.links.substack ? `<a href="${site.links.substack}" rel="noopener">Substack</a>` : ''}
    <a href="${BASE}contact/">Contact</a>
  </p>
</footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function metaLine(parts) {
  return parts.filter(Boolean).map((part) => escapeHtml(part)).join(' · ');
}

function linkChips(links = []) {
  if (!links.length) return '';
  const chips = links
    .map((link) => `<a class="chip" href="${rebase(link.url)}" rel="noopener">${escapeHtml(link.label)} ↗</a>`)
    .join('');
  return `<p class="chips">${chips}</p>`;
}

function getImageDimensions(imagePath) {
  if (!imagePath) return { width: 960, height: 600 };
  
  if (imagePath.endsWith('.svg')) {
    try {
      const content = readFileSync(imagePath, 'utf8');
      const viewBoxMatch = content.match(/viewBox=["']\d+\s+\d+\s+(\d+)\s+(\d+)["']/i);
      if (viewBoxMatch) {
        return { width: parseInt(viewBoxMatch[1], 10), height: parseInt(viewBoxMatch[2], 10) };
      }
      const widthMatch = content.match(/width=["'](\d+)["']/i);
      const heightMatch = content.match(/height=["'](\d+)["']/i);
      if (widthMatch && heightMatch) {
        return { width: parseInt(widthMatch[1], 10), height: parseInt(heightMatch[2], 10) };
      }
    } catch (e) {
      console.warn(`[build.mjs] failed to parse SVG dimensions for ${imagePath}:`, e.message);
    }
    return { width: 960, height: 600 };
  }

  if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
    try {
      const buffer = readFileSync(imagePath);
      let offset = 2;
      while (offset < buffer.length - 8) {
        const markerType = buffer.readUInt16BE(offset);
        if ((markerType & 0xFF00) !== 0xFF00 || markerType === 0xFFFF) {
          offset += 1;
          continue;
        }
        offset += 2;
        if (markerType === 0xFFD9 || markerType === 0xFFDA) {
          break;
        }
        const length = buffer.readUInt16BE(offset);
        if (markerType === 0xFFC0 || markerType === 0xFFC2) {
          const height = buffer.readUInt16BE(offset + 3);
          const width = buffer.readUInt16BE(offset + 5);
          return { width, height };
        }
        offset += length;
      }
    } catch (e) {
      console.warn(`[build.mjs] failed to parse JPG dimensions for ${imagePath}:`, e.message);
    }
  }

  return { width: 960, height: 600 };
}

function workCard(entry) {
  const { meta } = entry;
  const imagePath = meta.image ? join(STATIC_DIR, meta.image.replace(/^\//, '')) : '';
  const imageSize = meta.image ? getImageDimensions(imagePath) : null;
  const url = hasDetailPage(entry) ? entryUrl('work', entry) : rebase(meta.links?.[0]?.url || `${BASE}work/`);
  const external = !hasDetailPage(entry) && /^https?:/.test(url);
  const cardMeta = `<p class="card-meta">${metaLine([meta.org, meta.period])}</p>
  <h3>${escapeHtml(meta.title)}</h3>
  <p>${escapeHtml(meta.summary || '')}</p>
  ${meta.tags ? `<p class="card-tags">${meta.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</p>` : ''}`;
  if (meta.image) {
    return `<a class="card work-card has-thumb" href="${url}"${external ? ' rel="noopener"' : ''}>
  <img class="card-thumb" src="${rebase(meta.image)}" alt="${escapeHtml(meta.imageAlt || meta.title)}" loading="lazy" width="${imageSize.width}" height="${imageSize.height}" />
  <div class="card-body">
  ${cardMeta}
  </div>
</a>`;
  }
  return `<a class="card" href="${url}"${external ? ' rel="noopener"' : ''}>
  ${cardMeta}
</a>`;
}

function listRow(collection, entry) {
  const { meta } = entry;
  const url = entryUrl(collection, entry);
  const external = Boolean(meta.external);
  const clickable = external || hasDetailPage(entry);
  const title = clickable
    ? `<a href="${url}"${external ? ' rel="noopener"' : ''}>${escapeHtml(meta.title)}${external ? ' ↗' : ''}</a>`
    : escapeHtml(meta.title);
  const imagePath = meta.image ? join(STATIC_DIR, meta.image.replace(/^\//, '')) : '';
  const imageSize = meta.image ? getImageDimensions(imagePath) : null;
  const thumb = meta.image
    ? `<img class="row-thumb" src="${rebase(meta.image)}" alt="${escapeHtml(meta.imageAlt || meta.title)}" loading="lazy" width="${imageSize.width}" height="${imageSize.height}" />`
    : '';
  return `<li class="row">
  ${thumb}
  <div>
    <p class="row-title">${title}</p>
    <p class="row-summary">${escapeHtml(meta.summary || '')}</p>
    ${linkChips(clickable ? [] : meta.links)}
  </div>
  <p class="row-meta">${metaLine([meta.venue || meta.org, meta.type, meta.date || meta.period])}</p>
</li>`;
}

function demoCard(demo) {
  const tags = (demo.tags || []).length
    ? `<p class="card-tags">${demo.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</p>`
    : '';
  const previewPath = demo.preview ? join(STATIC_DIR, demo.preview.replace(/^\//, '')) : null;
  const previewSize = previewPath && existsSync(previewPath) ? getImageDimensions(previewPath) : { width: 960, height: 600 };
  const preview = demo.preview
    ? `<img class="demo-preview" src="${rebase(demo.preview)}" alt="Screenshot of ${escapeHtml(demo.title)}" loading="lazy" width="${previewSize.width}" height="${previewSize.height}" />`
    : '';
  return `<a class="card demo-card" href="${rebase(demo.path)}">
  ${preview}
  <div class="demo-body">
    <h3>${escapeHtml(demo.title)}</h3>
    <p>${escapeHtml(demo.description || '')}</p>
    ${tags}
    <span class="demo-action">Launch demo →</span>
  </div>
</a>`;
}

function sectionHeader(eyebrow, title, moreHref, moreLabel) {
  return `<div class="section-header">
  <div><p class="eyebrow">${escapeHtml(eyebrow)}</p>${title ? `<h2>${escapeHtml(title)}</h2>` : ''}</div>
  ${moreHref ? `<a class="more" href="${moreHref}">${escapeHtml(moreLabel)} →</a>` : ''}
</div>`;
}

function shareLinks(pageUrl, title) {
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedTitle = encodeURIComponent(title);
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const email = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
  return `<p class="share-links">
  <span class="share-label">Share</span>
  <a class="chip" href="${linkedIn}" rel="noopener" aria-label="Share on LinkedIn">LinkedIn</a>
  <a class="chip" href="${email}" aria-label="Share via email">Email</a>
</p>`;
}

function jsonLdPerson() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    jobTitle: site.role,
    url: absoluteUrl('/'),
    description: site.answerEngineSummary || site.description,
    knowsAbout: [
      'Google Maps Platform',
      'developer experience',
      'agent-ready documentation',
      'model context protocol',
      'agentic evals',
      'AI-native developer tools',
      'geospatial applications',
    ],
    sameAs: [
      site.links.github,
      site.links.linkedin,
      site.links.x,
      site.links.substack,
    ].filter(Boolean),
    image: absoluteUrl(site.profileImage || site.defaultShareImage),
  };
}

function jsonLdWebSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: absoluteUrl('/'),
    description: site.answerEngineSummary || site.description,
    author: { '@type': 'Person', name: site.name },
  };
}

function jsonLdHomePage() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${site.name} portfolio`,
    url: absoluteUrl('/'),
    description: site.answerEngineSummary || site.description,
    about: { '@type': 'Person', name: site.name, url: absoluteUrl('/') },
    mainEntity: jsonLdPerson(),
  };
}

function jsonLdBlogPosting(entry, pageUrl) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: entry.meta.title,
    description: entry.meta.summary || '',
    url: pageUrl,
    author: { '@type': 'Person', name: site.name, url: absoluteUrl('/') },
    publisher: { '@type': 'Person', name: site.name },
  };
  if (entry.meta.date) ld.datePublished = `${entry.meta.date}T00:00:00Z`;
  if (entry.meta.updated) ld.dateModified = `${entry.meta.updated}T00:00:00Z`;
  if (entry.meta.image) ld.image = absoluteUrl(entry.meta.image);
  return ld;
}

function jsonLdCreativeWork(entry, pageUrl) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: entry.meta.title,
    description: entry.meta.summary || '',
    url: pageUrl,
    author: { '@type': 'Person', name: site.name, url: absoluteUrl('/') },
  };
  if (entry.meta.org) ld.sourceOrganization = { '@type': 'Organization', name: entry.meta.org };
  if (entry.meta.image) ld.image = absoluteUrl(entry.meta.image);
  return ld;
}

function jsonLdArticle(entry, pageUrl) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entry.meta.title,
    description: entry.meta.summary || '',
    url: pageUrl,
    author: { '@type': 'Person', name: site.name, url: absoluteUrl('/') },
  };
  if (entry.meta.date) ld.datePublished = `${entry.meta.date}T00:00:00Z`;
  if (entry.meta.venue) ld.publisher = { '@type': 'Organization', name: entry.meta.venue };
  if (entry.meta.image) ld.image = absoluteUrl(entry.meta.image);
  return ld;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function writePage(outPath, html) {
  const target = join(DIST_DIR, outPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

function detailPage(collection, entry, activeKey) {
  const { meta } = entry;
  const pageUrl = meta.canonical || absoluteUrl(entryUrl(collection.name, entry));
  const isWriting = collection.name === 'writing';
  const isTalk = collection.name === 'talks';
  const isWork = collection.name === 'work';

  let jsonLd;
  if (isWriting) jsonLd = jsonLdBlogPosting(entry, pageUrl);
  else if (isWork) jsonLd = jsonLdCreativeWork(entry, pageUrl);
  else if (isTalk) jsonLd = jsonLdArticle(entry, pageUrl);

  const content = `<article class="prose">
  <p class="eyebrow">${escapeHtml(collection.label)}</p>
  <h1>${escapeHtml(meta.title)}</h1>
  <p class="article-meta">${metaLine([meta.org || meta.venue, meta.role, meta.period || meta.date])}</p>
  ${linkChips(meta.links)}
  ${(() => {
    if (!meta.image) return '';
    const imagePath = meta.image.startsWith('/') ? join(STATIC_DIR, meta.image.slice(1)) : join(CONTENT_DIR, collection.name, meta.image);
    const { width, height } = getImageDimensions(imagePath);
    return `<img class="article-hero" src="${rebase(meta.image)}" alt="${escapeHtml(meta.imageAlt || meta.title)}" loading="lazy" width="${width}" height="${height}" />`;
  })()}
  ${markdownToHtml(entry.body)}
  ${shareLinks(pageUrl, meta.title)}
  <p class="back"><a href="${BASE}${collection.name}/">← All ${collection.label.toLowerCase()}</a></p>
</article>`;
  writePage(join(collection.name, entry.slug, 'index.html'), layout({
    title: `${meta.title} — ${site.name}`,
    description: meta.summary || site.description,
    content,
    active: activeKey,
    canonical: pageUrl,
    ogImage: meta.image || null,
    ogImageAlt: meta.imageAlt || meta.title,
    ogType: (isWriting || isTalk) ? 'article' : 'website',
    articleDate: meta.date || null,
    articleUpdated: meta.updated || null,
    robots: meta.noindex ? 'noindex, follow' : null,
    jsonLd,
  }));
}

function buildHome(collections) {
  const featuredWork = collections.work.filter((entry) => entry.meta.featured);
  const writingEntries = collections.writing.slice(0, 3);
  const talkEntries = collections.talks.slice(0, 3);

  const heroLinks = [
    { label: 'Work', href: `${BASE}work/` },
    ...(demos.length ? [{ label: 'Demos', href: `${BASE}demos/` }] : []),
    { label: 'Writing', href: `${BASE}writing/` },
    { label: 'Resume', href: `${BASE}resume/` },
    { label: 'Contact', href: `${BASE}contact/` },
    { label: 'GitHub', href: site.links.github, external: true },
    { label: 'LinkedIn', href: site.links.linkedin, external: true },
  ];
  const demosSection = demos.length
    ? `
<section>
  ${sectionHeader('The lab', '', `${BASE}demos/`, 'All demos')}
  <p class="section-note">${escapeHtml(site.sectionIntros?.demos || '')}</p>
  <div class="grid demo-grid">
    ${demos.map(demoCard).join('\n')}
  </div>
</section>
`
    : '';

  const proofPoints = Array.isArray(site.proofPoints) && site.proofPoints.length
    ? `<dl class="proof-grid" aria-label="Proof points">
      ${site.proofPoints.map((point) => `<div>
        <dt>${escapeHtml(point.label)}</dt>
        <dd>${escapeHtml(point.text)}</dd>
      </div>`).join('\n')}
    </dl>`
    : '';
  const profileImagePath = site.profileImage?.startsWith('/') ? join(STATIC_DIR, site.profileImage.slice(1)) : null;
  const profileImageDims = profileImagePath && existsSync(profileImagePath) ? getImageDimensions(profileImagePath) : { width: 800, height: 800 };
  const profileImage = site.profileImage
    ? `<img class="profile-image" src="${rebase(site.profileImage)}" alt="${escapeHtml(site.profileImageAlt || `${site.name} profile image`)}" width="${profileImageDims.width}" height="${profileImageDims.height}" loading="eager" />`
    : '';

  const content = `
<section class="hero hero-split">
  <div>
  ${profileImage}
  <p class="eyebrow">${escapeHtml(site.tagline)}</p>
  <h1>${escapeHtml(site.name)}</h1>
  <p class="lede">${escapeHtml(site.intro)}</p>
  <p class="hero-meta">${escapeHtml(site.role)} · ${escapeHtml(site.location)}</p>
  <p class="chips hero-links">${heroLinks
    .map((link) => `<a class="chip" href="${link.href}"${link.external ? ' rel="noopener"' : ''}>${escapeHtml(link.label)}${link.external ? ' ↗' : ''}</a>`)
    .join('')}</p>
  </div>
  <figure class="hero-figure">
    <img class="hero-image" src="${rebase('/previews/strava-explorer.jpg')}" alt="The Strava 3D Explorer flying a route in Photorealistic 3D, one of the live demos in the lab" width="1200" height="687" loading="eager" />
    <p class="hero-image-caption">From the lab: <a href="${rebase('/strava-explorer/')}">Strava 3D Explorer</a></p>
  </figure>
</section>
${proofPoints}

<section>
  ${sectionHeader('Selected work', '', `${BASE}work/`, 'All work')}
  <p class="section-note">${escapeHtml(site.headline)}</p>
  <div class="grid">
    ${featuredWork.map(workCard).join('\n')}
  </div>
</section>
${demosSection}
<section>
  ${sectionHeader('Writing', '', `${BASE}writing/`, 'All writing')}
  <ul class="rows">
    ${writingEntries.map((entry) => listRow('writing', entry)).join('\n')}
  </ul>
</section>

<section>
  ${sectionHeader('Talks', '', `${BASE}talks/`, 'All talks')}
  <ul class="rows">
    ${talkEntries.map((entry) => listRow('talks', entry)).join('\n')}
  </ul>
</section>

<section class="about-teaser">
  ${sectionHeader('Background', '')}
  <p class="lede">${escapeHtml(site.aboutTeaser)}</p>
  <p><a class="more" href="${BASE}about/">The full story →</a></p>
</section>
`;

  writePage('index.html', layout({
    title: `${site.name} — ${site.role}`,
    description: site.description,
    content,
    canonical: absoluteUrl('/'),
    ogImage: site.defaultShareImage,
    ogImageAlt: `${site.name} — ${site.role}`,
    jsonLd: [jsonLdHomePage(), jsonLdWebSite()],
  }));
}

function buildDemosPage() {
  if (!demos.length) return;
  const content = `<section>
  <p class="eyebrow">Demos</p>
  <h1>The lab</h1>
  <p class="lede">${escapeHtml(site.sectionIntros?.demos || '')}</p>
  <div class="grid demo-grid">
    ${demos.map(demoCard).join('\n')}
  </div>
  <p class="section-note">Every demo is open source. <a href="${site.links.github}/Portfolio" rel="noopener">read the code</a>. One Ryan Baumann portfolio container, one Cloud Run service, no secrets in the browser.</p>
</section>`;

  writePage(join('demos', 'index.html'), layout({
    title: `Demos — ${site.name}`,
    description: site.sectionIntros?.demos || site.description,
    content,
    active: 'demos',
    canonical: absoluteUrl('/demos/'),
  }));
}

function buildCollectionIndex(collection, entries) {
  const isEmpty = entries.length === 0;
  const emptyState = `<div class="empty-state">
  <h2>Coming soon</h2>
  <p>This section is designed, built, and waiting for its first entry. Drop a markdown file into <code>content/${collection.name}/</code> and rebuild.</p>
</div>`;

  const body = collection.name === 'work'
    ? `<div class="grid">${entries.map(workCard).join('\n')}</div>`
    : `<ul class="rows">${entries.map((entry) => listRow(collection.name, entry)).join('\n')}</ul>`;

  const intro = site.sectionIntros?.[collection.name]
    ? `<p class="lede">${escapeHtml(site.sectionIntros[collection.name])}</p>`
    : '';

  const content = `<section>
  <p class="eyebrow">${escapeHtml(collection.label)}</p>
  <h1>${escapeHtml(collection.label)}</h1>
  ${intro}
  ${isEmpty ? emptyState : body}
</section>`;

  writePage(join(collection.name, 'index.html'), layout({
    title: `${collection.label} — ${site.name}`,
    description: site.sectionIntros?.[collection.name] || site.description,
    content,
    active: collection.name,
    canonical: absoluteUrl(`/${collection.name}/`),
  }));
}


function pageImage(meta) {
  if (!meta.image) return '';
  const imagePath = meta.image.startsWith('/') ? join(STATIC_DIR, meta.image.slice(1)) : join(CONTENT_DIR, 'pages', meta.image);
  const { width, height } = getImageDimensions(imagePath);
  return `<img class="article-hero" src="${rebase(meta.image)}" alt="${escapeHtml(meta.imageAlt)}" loading="lazy" width="${width}" height="${height}" />`;
}

function resumePageContent(meta) {
  return `<section class="resume-shell">
  <div class="resume-header">
    <div>
      <p class="eyebrow">Resume</p>
      <h1>${escapeHtml(site.name)}</h1>
      <p class="lede">${escapeHtml(site.positioning || site.role)}</p>
    </div>
    <p class="resume-meta">${escapeHtml(site.location)}<br /><a href="${site.links.linkedin}" rel="noopener">LinkedIn</a> · <a href="${site.links.github}" rel="noopener">GitHub</a></p>
  </div>
  ${pageImage(meta)}
  <div class="resume-section"><h2>Focus</h2><p>${escapeHtml(site.answerEngineSummary || site.description)}</p></div>
  <div class="resume-section"><h2>Experience</h2>
    <article><h3>Google Maps Platform</h3><p class="resume-meta">Developer Experience, solution architecture, product incubation · 2022 – present</p><p>Lead developer experience and forward-deployed platform work across Code Assist, agent skills, evals, AI-native distribution, and the Geo Architecture Center.</p></article>
    <article><h3>Google Cloud</h3><p class="resume-meta">0→1 industry solution product and engineering lead · 2021 – 2022</p><p>Led Intelligent Product Essentials from zero to launch with GE Appliances in nine months.</p></article>
    <article><h3>Mapbox</h3><p class="resume-meta">Customer engineering, product, partnerships · 2015 – 2020</p><p>Grew customer engineering from 1 to 15 as Mapbox crossed $100M ARR. Took Boundaries and Atlas to their first $5M ARR and led OSS partnerships with Uber's visualization stack.</p></article>
    <article><h3>Instabase and Caterpillar</h3><p class="resume-meta">Solution architecture and industrial IoT</p><p>Led solution architecture at Series-B Instabase. Earlier, built industrial IoT systems at Caterpillar with 3 US patents.</p></article>
  </div>
  <div class="resume-section"><h2>Selected proof</h2><ul>${(site.proofPoints || []).map((point) => `<li><strong>${escapeHtml(point.label)}</strong>: ${escapeHtml(point.text)}</li>`).join('')}</ul></div>
  <p class="chips"><a class="chip" href="${BASE}work/">Work</a><a class="chip" href="${BASE}contact/">Contact</a></p>
</section>`;
}

function contactPageContent(meta) {
  return `<section class="contact-shell">
  <p class="eyebrow">Contact</p>
  <h1>Build better platform experiences</h1>
  <p class="lede">I am most useful when the work is about developer experience, AI-native product surfaces, or platform growth. Bring me in for advisor work, more platform seats, or content collaboration that helps builders succeed.</p>
  ${pageImage(meta)}
  <div class="contact-prompts" aria-label="Good reasons to reach out">
    <article><h2>Advisor work</h2><p>Strategy for developer experience, agent-ready platforms, AI distribution, evals, and growth loops.</p></article>
    <article><h2>Platform growth</h2><p>Turning natural-language and agentic product behavior into better user experience, better developer experience, and more durable adoption.</p></article>
    <article><h2>Content collaboration</h2><p>Specific writing, talks, and launch content about how AI changes what builders can make and how platforms should meet them.</p></article>
  </div>
  <form class="contact-form" action="${BASE}api/contact" method="post">
    <label>Name <input name="name" autocomplete="name" required /></label>
    <label>Email <input name="email" type="email" autocomplete="email" required /></label>
    <label>What should I know? <textarea name="message" rows="7" required minlength="20" placeholder="Tell me if this is advisor work, platform seats, or content collaboration. Include the audience, the product surface, and what outcome you want to improve."></textarea></label>
    <button class="button" type="submit">Send note</button>
  </form>
  <p class="section-note">The form sends through the backend so my address stays out of the HTML.</p>
</section>`;
}

function buildStandalonePages() {
  const dir = join(CONTENT_DIR, 'pages');
  if (!existsSync(dir)) return;
  const pages = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md') || file.startsWith('_')) continue;
    const slug = file.replace(/\.md$/, '');
    const { meta, body } = parseFrontMatter(readFileSync(join(dir, file), 'utf8'));
    pages.push({ slug, meta, body });
    const customContent = slug === 'resume' ? resumePageContent(meta) : slug === 'contact' ? contactPageContent(meta) : null;
    const content = customContent || `<article class="prose">
  <p class="eyebrow">${escapeHtml(meta.eyebrow || site.name)}</p>
  <h1>${escapeHtml(meta.title)}</h1>
  ${(() => {
    if (!meta.image) return '';
    const imagePath = meta.image.startsWith('/') ? join(STATIC_DIR, meta.image.slice(1)) : join(CONTENT_DIR, 'pages', meta.image);
    const { width, height } = getImageDimensions(imagePath);
    return `<img class="article-hero" src="${rebase(meta.image)}" alt="${escapeHtml(meta.imageAlt || meta.title)}" loading="lazy" width="${width}" height="${height}" />`;
  })()}
  ${markdownToHtml(body)}
</article>`;
    writePage(join(slug, 'index.html'), layout({
      title: `${meta.title} — ${site.name}`,
      description: meta.summary || site.description,
      content,
      active: slug,
      canonical: absoluteUrl(`/${slug}/`),
      ogImage: meta.image || null,
      ogImageAlt: meta.imageAlt || meta.title,
    }));
  }
  for (const page of pages) validatePage(page.slug, page.meta, page.body);
}


function absoluteUrl(pathOrUrl) {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl.replace(/^\//, ''), site.siteUrl || BASE).toString();
}

function rssFeed(entries) {
  const items = entries
    .filter((entry) => !entry.meta.noindex)
    .map((entry) => `<item>
      <title>${escapeHtml(entry.meta.title)}</title>
      <link>${escapeHtml(absoluteUrl(entryUrl('writing', entry)))}</link>
      <guid>${escapeHtml(absoluteUrl(entry.meta.canonical || entryUrl('writing', entry)))}</guid>
      <pubDate>${new Date(`${entry.meta.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeHtml(entry.meta.summary || '')}</description>
    </item>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${escapeHtml(site.name)} Writing</title>
<link>${escapeHtml(absoluteUrl('/writing/'))}</link>
<description>${escapeHtml(site.sectionIntros?.writing || site.description)}</description>
${items}
</channel></rss>`;
}

function sitemapXml(collections) {
  const urls = [];

  // Homepage
  urls.push({ loc: absoluteUrl('/'), priority: '1.0' });

  // Collection index pages
  for (const col of COLLECTIONS) {
    urls.push({ loc: absoluteUrl(`/${col.name}/`), priority: '0.8' });
  }

  // Demos index
  if (demos.length) {
    urls.push({ loc: absoluteUrl('/demos/'), priority: '0.7' });
  }

  // Detail pages
  for (const col of COLLECTIONS) {
    for (const entry of collections[col.name]) {
      if (!hasDetailPage(entry)) continue;
      if (entry.meta.noindex) continue;
      const loc = absoluteUrl(entryUrl(col.name, entry));
      const lastmod = entry.meta.updated || entry.meta.date || null;
      urls.push({ loc, lastmod, priority: '0.6' });
    }
  }

  // Standalone pages
  const pagesDir = join(CONTENT_DIR, 'pages');
  if (existsSync(pagesDir)) {
    for (const file of readdirSync(pagesDir)) {
      if (!file.endsWith('.md') || file.startsWith('_')) continue;
      const slug = file.replace(/\.md$/, '');
      urls.push({ loc: absoluteUrl(`/${slug}/`), priority: '0.5' });
    }
  }

  const entries = urls.map((u) => {
    const lastmod = u.lastmod ? `\n  <lastmod>${u.lastmod}</lastmod>` : '';
    return `<url>\n  <loc>${escapeHtml(u.loc)}</loc>${lastmod}\n  <priority>${u.priority}</priority>\n</url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

function robotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
}

function validateMetadata() {
  const htmlFiles = readdirSync(DIST_DIR, { recursive: true })
    .filter((file) => String(file).endsWith('.html'));
  const errors = [];
  const descriptions = new Map();

  for (const file of htmlFiles) {
    const filePath = join(DIST_DIR, String(file));
    const html = readFileSync(filePath, 'utf8');
    const id = String(file);

    if (!html.includes('<link rel="canonical"')) errors.push(`${id}: missing canonical link`);
    if (!html.includes('og:url')) errors.push(`${id}: missing og:url`);
    if (!html.includes('og:image')) errors.push(`${id}: missing og:image`);
    if (!html.includes('twitter:card')) errors.push(`${id}: missing twitter:card`);
    if (!html.includes('name="description"')) errors.push(`${id}: missing meta description`);
    if (!html.includes('og:title')) errors.push(`${id}: missing og:title`);
    if (!html.includes('og:description')) errors.push(`${id}: missing og:description`);
    if (!html.includes('twitter:title')) errors.push(`${id}: missing twitter:title`);
    if (!html.includes('twitter:description')) errors.push(`${id}: missing twitter:description`);
    if (!html.includes('twitter:image')) errors.push(`${id}: missing twitter:image`);
    const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
    if (description) {
      if (descriptions.has(description)) errors.push(`${id}: duplicate description also used by ${descriptions.get(description)}`);
      descriptions.set(description, id);
    }
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
    if (!canonical || !/^https:\/\//.test(canonical)) errors.push(`${id}: canonical must be an absolute https URL`);
  }

  if (errors.length) {
    console.error('[portfolio] metadata validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    rmSync(DIST_DIR, { recursive: true, force: true });
    process.exit(1);
  }
  console.log(`[portfolio] metadata validation passed for ${htmlFiles.length} pages`);
}

function publishOutput() {
  const backupDir = `${OUTPUT_DIR}.previous-${process.pid}`;
  rmSync(backupDir, { recursive: true, force: true });
  const hadPreviousOutput = existsSync(OUTPUT_DIR);
  if (hadPreviousOutput) renameSync(OUTPUT_DIR, backupDir);
  try {
    renameSync(DIST_DIR, OUTPUT_DIR);
    rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    if (hadPreviousOutput && !existsSync(OUTPUT_DIR) && existsSync(backupDir)) {
      renameSync(backupDir, OUTPUT_DIR);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });

validateSite();

const collections = {};
const allCollections = {};
for (const collection of COLLECTIONS) {
  const allEntries = loadCollection(collection.name);
  const entries = allEntries.filter((entry) => entry.meta.draft !== true);
  allCollections[collection.name] = allEntries;
  collections[collection.name] = entries;
  buildCollectionIndex(collection, entries);
  if (collection.detailPages) {
    for (const entry of entries) {
      if (hasDetailPage(entry)) detailPage(collection, entry, collection.name);
    }
  }
}

buildHome(collections);
buildDemosPage();
buildStandalonePages();

const seenSlugs = new Set();
for (const collection of COLLECTIONS) {
  for (const entry of allCollections[collection.name]) validateEntry(collection, entry, seenSlugs);
}
assertValidBuild();
writePage('feed.xml', rssFeed(collections.writing));
writePage('sitemap.xml', sitemapXml(collections));
writePage('robots.txt', robotsTxt());

if (existsSync(STATIC_DIR)) {
  cpSync(STATIC_DIR, DIST_DIR, { recursive: true });
}

const pageCount = readdirSync(DIST_DIR, { recursive: true }).filter((file) => String(file).endsWith('index.html')).length;
validateMetadata();
publishOutput();
console.log(`[portfolio] built ${pageCount} pages into ${OUTPUT_DIR} (base: ${BASE})`);
