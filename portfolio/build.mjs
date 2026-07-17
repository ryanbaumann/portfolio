#!/usr/bin/env node
// build.mjs - the entire CMS.
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
const WRITER_MODE = process.env.PORTFOLIO_WRITER_MODE === 'true';
const BUILD_TIME = new Date(process.env.PORTFOLIO_BUILD_TIME || Date.now());

if (Number.isNaN(BUILD_TIME.valueOf())) {
  throw new Error('PORTFOLIO_BUILD_TIME must be a valid ISO-8601 timestamp.');
}

// Each collection is a folder of markdown files. Files starting with "_"
// (templates, drafts) are skipped. `listPage` controls whether the
// collection gets its own index page; `detailPages` controls whether
// entries with a body get their own page at /<name>/<slug>/.
const COLLECTIONS = [
  { name: 'work', label: 'Work', listPage: true, detailPages: true },
  { name: 'writing', label: 'Field Notes', listPage: true, detailPages: true },
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

function isValidIsoTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?Z$/);
  if (!match) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return false;
  const [, year, month, day, hour, minute, second = '0', fraction = '0'] = match;
  return parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() + 1 === Number(month)
    && parsed.getUTCDate() === Number(day)
    && parsed.getUTCHours() === Number(hour)
    && parsed.getUTCMinutes() === Number(minute)
    && parsed.getUTCSeconds() === Number(second)
    && parsed.getUTCMilliseconds() === Number(fraction.padEnd(3, '0'));
}

function isPublished(entry) {
  if (entry.meta.draft === true) return false;
  if (!entry.meta.publishAt) return true;
  return new Date(entry.meta.publishAt).valueOf() <= BUILD_TIME.valueOf();
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

function validateSocialImage(id, meta) {
  if (!meta.socialImage) return;
  if (!meta.shareTitle || !meta.shareSummary || !meta.shareImageAlt) {
    failValidation(`${id}: socialImage requires shareTitle, shareSummary, and shareImageAlt`);
  }
  const imagePath = meta.socialImage.startsWith('/') ? join(STATIC_DIR, meta.socialImage.slice(1)) : null;
  if (!imagePath || !existsSync(imagePath)) {
    failValidation(`${id}: social image asset not found: ${meta.socialImage}`);
    return;
  }
  const { width, height } = getImageDimensions(imagePath);
  if (/\.(png|jpe?g)$/i.test(meta.socialImage) && (width !== 1200 || height !== 627)) {
    failValidation(`${id}: raster social image must be 1200x627: ${meta.socialImage}`);
  }
}

function validateEntry(collection, entry, seenSlugs) {
  const id = `${collection.name}/${entry.slug}`;
  if (seenSlugs.has(id)) failValidation(`${id}: duplicate slug`);
  seenSlugs.add(id);
  const { meta } = entry;
  if (meta.aliases !== undefined) {
    if (!Array.isArray(meta.aliases) || meta.aliases.length === 0) {
      failValidation(`${id}: aliases must be a non-empty array`);
    } else {
      for (const alias of meta.aliases) {
        if (typeof alias !== 'string' || !/^\/[a-z0-9/-]+\/$/.test(alias) || alias.includes('//')) {
          failValidation(`${id}: alias must be a clean root-relative path ending in /: ${alias}`);
        }
      }
    }
    if (meta.external || !hasDetailPage(entry)) {
      failValidation(`${id}: aliases require a generated internal detail page`);
    }
  }
  for (const field of ['title', 'summary']) {
    if (!meta[field] || typeof meta[field] !== 'string') failValidation(`${id}: missing required ${field}`);
  }
  if (meta.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) failValidation(`${id}: slug must be lowercase kebab-case`);
  if (meta.draft !== undefined && typeof meta.draft !== 'boolean') failValidation(`${id}: draft must be a boolean`);
  if (meta.noindex !== undefined && typeof meta.noindex !== 'boolean') failValidation(`${id}: noindex must be a boolean`);
  if (meta.draft === true && meta.noindex !== true) failValidation(`${id}: drafts must set noindex: true`);
  if (meta.publishAt && !isValidIsoTimestamp(meta.publishAt)) failValidation(`${id}: publishAt must be a UTC ISO-8601 timestamp ending in Z`);
  if (meta.draft !== true && meta.noindex === true && meta.canonical) failValidation(`${id}: published noindex entries should not also set canonical`);
  if (['writing', 'scripts'].includes(collection.name) && !isValidIsoDate(meta.date)) {
    failValidation(`${id}: ${collection.name} date must be YYYY-MM-DD`);
  }
  for (const field of ['external', 'canonical']) {
    if (meta[field] && !isValidUrl(meta[field])) failValidation(`${id}: ${field} must be an https, mailto, or root-relative URL`);
  }
  if (!WRITER_MODE && meta.canonical && !meta.external && hasDetailPage(entry) && meta.canonical.startsWith(site.siteUrl)) {
    const expectedCanonical = absoluteUrl(entryUrl(collection.name, entry));
    if (meta.canonical !== expectedCanonical) {
      failValidation(`${id}: same-site canonical must match the generated detail URL: ${expectedCanonical}`);
    }
  }
  if (meta.image) {
    if (!meta.imageAlt) failValidation(`${id}: imageAlt is required when image is set`);
    const imagePath = meta.image.startsWith('/') ? join(STATIC_DIR, meta.image.slice(1)) : join(CONTENT_DIR, collection.name, meta.image);
    if (!existsSync(imagePath)) failValidation(`${id}: image asset not found: ${meta.image}`);
  }
  validateSocialImage(id, meta);
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
  validateSocialImage(id, meta);
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
    else {
      const { width, height } = getImageDimensions(imagePath);
      if (/\.(png|jpe?g)$/i.test(site.defaultShareImage) && (width !== 1200 || height !== 627)) {
        failValidation('site.json: raster defaultShareImage must be 1200x627');
      }
    }
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
// disappear - nothing else breaks.
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
// Markdown: the small subset the content actually uses - headings, bold,
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
    return `<a href="${rebase(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
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
  const headingIds = new Set();

  function headingId(rawHeading) {
    const explicit = rawHeading.match(/\s+\{#([a-z][a-z0-9-]*)\}\s*$/i);
    const label = explicit ? rawHeading.slice(0, explicit.index).trim() : rawHeading.trim();
    const base = explicit?.[1].toLowerCase()
      || label.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-')
      || 'section';
    let id = base;
    let suffix = 2;
    while (headingIds.has(id)) id = `${base}-${suffix++}`;
    headingIds.add(id);
    return { id, label };
  }

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith('```')) {
      const language = line.slice(3).trim().replace(/[^a-z0-9_-]/gi, '');
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      out.push(`<pre><code${language ? ` class="language-${language}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = Math.min(Math.max(heading[1].length, 2), 5); // page h1 is the title
      const { id, label } = headingId(heading[2]);
      out.push(`<h${level} id="${id}"><a class="heading-anchor" href="#${id}" aria-label="Link to this section">${inlineMd(label)}</a></h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      out.push('<hr />');
      index += 1;
      continue;
    }

    if (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || '')) {
      const cells = (value) => value.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      const headers = cells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      out.push(`<div class="table-scroll"><table><thead><tr>${headers.map((cell) => `<th>${inlineMd(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((_, cellIndex) => `<td>${inlineMd(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
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
      const raw = readFileSync(join(dir, file), 'utf8');
      const { meta, body } = parseFrontMatter(raw);
      const slug = meta.slug || fileSlug;
      return { slug, sourceSlug: fileSlug, meta, body, raw, collection: name };
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

function layout({ title, description, content, active = '', canonical, ogImage, ogImageAlt, shareTitle, shareSummary, ogType, articleDate, articleUpdated, robots, jsonLd, contactDelivery }) {
  const navItems = [
    { href: `${BASE}work/`, label: 'Work', key: 'work' },
    { href: `${BASE}writing/`, label: 'Field Notes', key: 'writing' },
    ...(demos.length ? [{ href: `${BASE}demos/`, label: 'Lab', key: 'demos' }] : []),
    { href: `${BASE}about/`, label: 'About', key: 'about' },
    { href: `${BASE}resume/`, label: 'Resume', key: 'resume' },
  ];
  const nav = navItems
    .map((item) => `<a href="${item.href}"${item.key === active ? ' aria-current="page"' : ''}>${item.label}</a>`)
    .join('');

  const resolvedCanonical = canonical || absoluteUrl('/');
  const resolvedImage = absoluteUrl(ogImage || site.defaultShareImage);
  const resolvedImageAlt = escapeHtml(ogImage
    ? (ogImageAlt || `${site.name} - ${site.role}`)
    : (site.defaultShareImageAlt || `${site.name} - ${site.role}`));
  const resolvedShareTitle = shareTitle || title;
  const resolvedShareSummary = shareSummary || description;
  const resolvedOgType = ogType || 'website';
  const socialHandle = site.socialHandle || '';
  const twitterCardType = 'summary_large_image';
  const localImage = ogImage || site.defaultShareImage;
  const localImagePath = localImage?.startsWith('/') ? join(STATIC_DIR, localImage.slice(1)) : null;
  const imageDimensions = localImagePath && existsSync(localImagePath) ? getImageDimensions(localImagePath) : null;
  const imageMime = localImage?.endsWith('.png') ? 'image/png' : localImage?.match(/\.jpe?g$/i) ? 'image/jpeg' : localImage?.endsWith('.webp') ? 'image/webp' : localImage?.endsWith('.svg') ? 'image/svg+xml' : null;

  const canonicalTag = `<link rel="canonical" href="${escapeHtml(resolvedCanonical)}" />`;
  const ogUrlTag = `<meta property="og:url" content="${escapeHtml(resolvedCanonical)}" />`;
  const ogImageTag = `<meta property="og:image" content="${escapeHtml(resolvedImage)}" />`;
  const ogImageAltTag = `<meta property="og:image:alt" content="${resolvedImageAlt}" />`;
  const ogImageDetails = [
    imageDimensions ? `<meta property="og:image:width" content="${imageDimensions.width}" />` : '',
    imageDimensions ? `<meta property="og:image:height" content="${imageDimensions.height}" />` : '',
    imageMime ? `<meta property="og:image:type" content="${imageMime}" />` : '',
  ].filter(Boolean).join('\n');

  const twitterTags = [
    `<meta name="twitter:card" content="${twitterCardType}" />`,
    socialHandle ? `<meta name="twitter:site" content="${escapeHtml(socialHandle)}" />` : '',
    `<meta name="twitter:title" content="${escapeHtml(resolvedShareTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(resolvedShareSummary)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(resolvedImage)}" />`,
    `<meta name="twitter:image:alt" content="${resolvedImageAlt}" />`,
  ].filter(Boolean).join('\n');

  const articleTags = resolvedOgType === 'article'
    ? [
        articleDate ? `<meta property="article:published_time" content="${escapeHtml(articleDate)}T00:00:00Z" />` : '',
        articleUpdated ? `<meta property="article:modified_time" content="${escapeHtml(articleUpdated)}T00:00:00Z" />` : '',
        `<meta property="article:author" content="${escapeHtml(site.name)}" />`,
      ].filter(Boolean).join('\n')
    : '';

  const robotsTag = WRITER_MODE
    ? '<meta name="robots" content="noindex, nofollow" />'
    : robots ? `<meta name="robots" content="${escapeHtml(robots)}" />` : '';

  const jsonLdTag = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  const contactDeliveryTag = contactDelivery ? `<meta name="contact-delivery" content="${escapeHtml(contactDelivery)}" />` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
${canonicalTag}
<meta property="og:title" content="${escapeHtml(resolvedShareTitle)}" />
<meta property="og:description" content="${escapeHtml(resolvedShareSummary)}" />
<meta property="og:type" content="${escapeHtml(resolvedOgType)}" />
${ogUrlTag}
${ogImageTag}
${ogImageAltTag}
${ogImageDetails}
${twitterTags}
${articleTags ? articleTags + '\n' : ''}<link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml" />
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.name)} Writing" href="${absoluteUrl('/feed.xml')}" />
${robotsTag ? robotsTag + '\n' : ''}${contactDeliveryTag ? contactDeliveryTag + '\n' : ''}${jsonLdTag ? jsonLdTag + '\n' : ''}<script>try{const t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch{}</script>
<style>${CSS}</style>
${analyticsMarkup()}
</head>
<body id="top">
<a class="skip-link" href="#main">Skip to content</a>
${WRITER_MODE ? '<div class="writer-banner" role="status">Private writer preview. Nothing here is indexed.</div>' : ''}
<header class="site-header">
  <div class="site-branding">
  <a class="site-name" href="${BASE}">${escapeHtml(site.name)}</a>
  </div>
  <nav class="site-nav" aria-label="Primary">
  ${nav}
  </nav>
  <div class="header-actions">
    <a class="header-cta${active === 'contact' ? ' is-active' : ''}" href="${BASE}contact/"${active === 'contact' ? ' aria-current="page"' : ''}>Contact</a>
    <button class="theme-toggle" type="button" aria-label="Color theme: system. Activate to use light."><span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg></span></button>
  </div>
</header>
<main id="main" class="site-main">
${content}
</main>
<footer class="site-footer">
  <p>&copy; <span>${new Date().getFullYear()}</span> ${escapeHtml(site.name)}</p>
  <p class="footer-links">
    <a href="${site.links.github}" target="_blank" rel="noopener noreferrer">GitHub</a>
    <a href="${site.links.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
    ${site.links.x ? `<a href="${site.links.x}" target="_blank" rel="noopener noreferrer">X</a>` : ''}
    ${site.links.substack ? `<a href="${site.links.substack}" target="_blank" rel="noopener noreferrer">Substack</a>` : ''}
    <a href="${BASE}talks/">Talks</a>
    <a href="${BASE}resume/">Resume</a>
    <a href="${BASE}privacy/">Privacy</a>
    <a href="${BASE}contact/">Contact</a>
  </p>
</footer>
<script>(()=>{const b=document.querySelector('.theme-toggle');if(!b)return;const states=['system','light','dark'];const icons={system:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>',light:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg>',dark:'<svg viewBox="0 0 24 24"><path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5a8.5 8.5 0 1 0 10.6 10.6Z"></path></svg>'};const sync=()=>{const current=document.documentElement.dataset.theme||'system';const next=states[(states.indexOf(current)+1)%states.length];b.querySelector('span').innerHTML=icons[current];b.setAttribute('aria-label','Color theme: '+current+'. Activate to use '+next+'.')};b.addEventListener('click',()=>{const current=document.documentElement.dataset.theme||'system';const next=states[(states.indexOf(current)+1)%states.length];if(next==='system'){delete document.documentElement.dataset.theme;localStorage.removeItem('theme')}else{document.documentElement.dataset.theme=next;localStorage.setItem('theme',next)}sync()});sync()})();</script>
</body>
</html>
`;
}

function analyticsMarkup() {
  if (WRITER_MODE) return '';
  const measurementId = String(process.env.ANALYTICS_MEASUREMENT_ID || site.analyticsMeasurementId || '');
  if (!measurementId) return '';
  const canonicalHost = String(site.canonicalHost || '');
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  const canonicalHost=${JSON.stringify(canonicalHost)};
  const debug=new URLSearchParams(location.search).get('analytics_debug')==='1';
  const hostAllowed=location.hostname===canonicalHost||debug;

  if (hostAllowed) {
    gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
    gtag('set','ads_data_redaction',true);
    gtag('config', '${measurementId}', {send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!hostAllowed) return;

    const sanitizedLocation=location.origin+location.pathname;
    const sanitizedReferrer=()=>{try{const value=new URL(document.referrer);return value.origin===location.origin?value.origin+value.pathname:''}catch{return ''}};
    const event=(name,params)=>{if(window.gtag)window.gtag('event',name,params||{})};

    event('page_view',{page_location:sanitizedLocation,page_referrer:sanitizedReferrer()});

    const delivered=document.querySelector('meta[name="contact-delivery"][content="success"]')&&new URLSearchParams(location.search).get('delivered')==='1';
    if(delivered&&!sessionStorage.getItem('contact-lead-recorded')){
      event('generate_lead',{currency:'USD',value:0});
      sessionStorage.setItem('contact-lead-recorded','1');
    }

    let formStarted=false;
    document.querySelector('.contact-form')?.addEventListener('focusin',()=>{if(!formStarted){formStarted=true;event('form_start',{form_id:'portfolio_contact'})}});
    document.querySelector('.contact-form')?.addEventListener('submit',()=>event('form_submit',{form_id:'portfolio_contact'}));

    document.addEventListener('click',(click)=>{
      const link=click.target.closest('[data-analytics-type][data-analytics-id]');
      if(link)event('select_content',{content_type:link.dataset.analyticsType,content_id:link.dataset.analyticsId});
      const share=click.target.closest('[data-analytics-share]');
      if(share)event('share',{method:share.dataset.analyticsShare,content_type:'page',item_id:location.pathname});
    });
  });
</script>`;
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
    .map((link) => {
      const external = link.url.startsWith('http');
      return `<a class="chip" href="${rebase(link.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(link.label)} ↗</a>`;
    })
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

  if (imagePath.endsWith('.png')) {
    try {
      const buffer = readFileSync(imagePath);
      const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      if (buffer.length >= 24 && buffer.subarray(0, 8).equals(signature)) {
        return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
      }
    } catch (e) {
      console.warn(`[build.mjs] failed to parse PNG dimensions for ${imagePath}:`, e.message);
    }
  }

  return { width: 960, height: 600 };
}

function gridCard(collection, entry) {
  const { meta } = entry;
  const imagePath = meta.image ? join(STATIC_DIR, meta.image.replace(/^\//, '')) : '';
  const imageSize = meta.image ? getImageDimensions(imagePath) : null;
  const url = hasDetailPage(entry) ? entryUrl(collection, entry) : rebase(meta.links?.[0]?.url || `${BASE}${collection}/`);
  const external = !hasDetailPage(entry) && /^https?:/.test(url);
  const formattedDate = meta.date ? formatLongDate(meta.date) : meta.period;
  const cardMeta = `<p class="card-meta">${metaLine([meta.venue || meta.org, meta.type, formattedDate])}</p>
  <h3>${escapeHtml(meta.title)}</h3>
  <p>${escapeHtml(meta.summary || '')}</p>
  ${meta.tags ? `<p class="card-tags">${meta.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</p>` : ''}`;
  if (meta.image) {
    return `<a class="card grid-card has-thumb" href="${url}" data-analytics-type="${escapeHtml(collection)}" data-analytics-id="${escapeHtml(entry.slug)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
  <img class="card-thumb" src="${rebase(meta.image)}" alt="${escapeHtml(meta.imageAlt || meta.title)}" loading="lazy" width="${imageSize.width}" height="${imageSize.height}" />
  <div class="card-body">
  ${cardMeta}
  </div>
</a>`;
  }
  return `<a class="card" href="${url}" data-analytics-type="${escapeHtml(collection)}" data-analytics-id="${escapeHtml(entry.slug)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
  ${cardMeta}
</a>`;
}

function listRow(collection, entry) {
  const { meta } = entry;
  const url = entryUrl(collection, entry);
  const external = Boolean(meta.external);
  const clickable = external || hasDetailPage(entry);
  const title = clickable
    ? `<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(meta.title)}${external ? ' ↗' : ''}</a>`
    : escapeHtml(meta.title);
  const imagePath = meta.image ? join(STATIC_DIR, meta.image.replace(/^\//, '')) : '';
  const imageSize = meta.image ? getImageDimensions(imagePath) : null;
  const thumb = meta.image
    ? `<img class="row-thumb" src="${rebase(meta.image)}" alt="${escapeHtml(meta.imageAlt || meta.title)}" loading="lazy" width="${imageSize.width}" height="${imageSize.height}" />`
    : '';
  return `<li class="row" data-analytics-type="${escapeHtml(collection)}" data-analytics-id="${escapeHtml(entry.slug)}">
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
  const external = demo.path.startsWith('http');
  return `<a class="card demo-card" href="${rebase(demo.path)}" data-analytics-type="demo" data-analytics-id="${escapeHtml(demo.name)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
  ${preview}
  <div class="demo-body">
    <h3>${escapeHtml(demo.title)}</h3>
    <p>${escapeHtml(demo.description || '')}</p>
    ${tags}
    <span class="demo-action">Launch demo →</span>
  </div>
</a>`;
}

function formatLongDate(isoDate) {
  if (!isoDate) return '';
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) return '';
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// Featured Field Note: a single large card (image left, text right) for the
// latest essay on the homepage. Falls back to the row list for a plain link.
function featuredNote(entry) {
  const { meta } = entry;
  const url = entryUrl('writing', entry);
  const external = Boolean(meta.external);
  const image = meta.socialImage || meta.image;
  const imagePath = image ? join(STATIC_DIR, image.replace(/^\//, '')) : '';
  const { width, height } = image && existsSync(imagePath) ? getImageDimensions(imagePath) : { width: 1200, height: 627 };
  const longDate = formatLongDate(meta.date);
  const thumb = image
    ? `<img class="featured-note-thumb" src="${rebase(image)}" alt="${escapeHtml(meta.shareImageAlt || meta.imageAlt || meta.title)}" loading="lazy" width="${width}" height="${height}" />`
    : '';
  return `<a class="featured-note" href="${url}" data-analytics-type="writing" data-analytics-id="${escapeHtml(entry.slug)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
  ${thumb}
  <div class="featured-note-body">
    <p class="featured-note-meta">${longDate ? `Latest · ${escapeHtml(longDate)}` : 'Latest'}</p>
    <h3>${escapeHtml(meta.title)}${external ? ' ↗' : ''}</h3>
    <p>${escapeHtml(meta.summary || '')}</p>
    <span class="featured-note-action">Read the note →</span>
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
  <a class="chip" href="${linkedIn}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" data-analytics-share="linkedin">LinkedIn</a>
  <a class="chip" href="${email}" aria-label="Share via email" data-analytics-share="email">Email</a>
</p>`;
}

// Email-list signup. Plain form POST to the gateway's /api/subscribe route
// (Resend audience) — works with zero client JavaScript. Sends go out from
// the Resend dashboard whenever there is something worth announcing.
function subscribeSection() {
  return `<section class="subscribe" aria-labelledby="subscribe-title">
  <p class="eyebrow">Email list</p>
  <h2 id="subscribe-title">Get new field notes by email</h2>
  <p>One email when a new essay, talk, or demo ships. No noise, and every send has a one-click unsubscribe.</p>
  <form class="subscribe-form" action="${BASE}api/subscribe" method="post">
    <label for="subscribe-email">Email address</label>
    <div class="subscribe-controls">
      <input id="subscribe-email" name="email" type="email" autocomplete="email" maxlength="200" placeholder="you@example.com" required />
      <button class="button button-primary" type="submit">Subscribe</button>
    </div>
    <div class="contact-honeypot" aria-hidden="true">
      <label>Company fax number <input name="company_fax_number" tabindex="-1" autocomplete="off" /></label>
    </div>
  </form>
  <p class="section-note">The address is stored only to deliver these updates. See <a href="${BASE}privacy/">Privacy</a>.</p>
</section>`;
}

// Reader comments on field notes via giscus, which stores each thread as a
// GitHub Discussion on the portfolio repo — readers sign in with GitHub
// inside the widget. Renders nothing until site.json's comments block has
// the repoId/categoryId values from https://giscus.app, so the site stays
// inert (and script-free) until comments are deliberately switched on.
// This is the one sanctioned third-party embed; see the portfolio-design
// skill before adding others. Skipped in the private writer preview.
function commentsSection() {
  const comments = site.comments || {};
  const configured = comments.provider === 'giscus'
    && comments.repo && comments.repoId && comments.category && comments.categoryId;
  if (!configured || WRITER_MODE) return '';
  const config = {
    'data-repo': comments.repo,
    'data-repo-id': comments.repoId,
    'data-category': comments.category,
    'data-category-id': comments.categoryId,
    'data-mapping': 'pathname',
    'data-strict': '0',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'bottom',
    'data-lang': 'en',
    'data-loading': 'lazy',
  };
  const configJson = JSON.stringify(config).replaceAll('<', '\\u003c');
  return `<section class="comments" aria-labelledby="comments-title">
  <p class="eyebrow">Discussion</p>
  <h2 id="comments-title">Comments</h2>
  <p class="section-note">Comments are GitHub Discussions rendered by <a href="https://giscus.app" target="_blank" rel="noopener noreferrer">giscus</a>. Sign in with GitHub inside the widget to post or react.</p>
  <div class="giscus"></div>
  <script>(()=>{const config=${configJson};const theme=()=>({light:'light',dark:'dark'})[document.documentElement.dataset.theme]||'preferred_color_scheme';const mount=document.querySelector('.giscus');const script=document.createElement('script');script.src='https://giscus.app/client.js';script.async=true;script.crossOrigin='anonymous';for(const [key,value] of Object.entries(config))script.setAttribute(key,value);script.setAttribute('data-theme',theme());mount.appendChild(script);new MutationObserver(()=>{const frame=document.querySelector('iframe.giscus-frame');if(frame)frame.contentWindow.postMessage({giscus:{setConfig:{theme:theme()}}},'https://giscus.app')}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']})})();</script>
</section>`;
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
      'developer platforms',
      'developer experience',
      'developer experience engineering',
      'developer product leadership',
      'agent-ready documentation',
      'model context protocol',
      'agentic evals',
      'AI-native developer tools',
      'Google Maps Platform',
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
  if (entry.meta.date) ld.datePublished = `${entry.meta.date}T00:00:00Z`;
  if (entry.meta.updated) ld.dateModified = `${entry.meta.updated}T00:00:00Z`;
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
  const isScript = collection.name === 'scripts';

  let jsonLd;
  if (isWriting) jsonLd = jsonLdBlogPosting(entry, pageUrl);
  else if (isWork || isScript) jsonLd = jsonLdCreativeWork(entry, pageUrl);
  else if (isTalk) jsonLd = jsonLdArticle(entry, pageUrl);

  const content = `<article class="prose">
  <p class="eyebrow">${escapeHtml(collection.label)}</p>
  <h1>${escapeHtml(meta.title)}</h1>
  <p class="article-meta">${metaLine([meta.org || meta.venue, meta.role, meta.period || meta.date])}</p>
  ${linkChips(meta.links)}
  ${heroImage(meta, collection.name)}
  ${markdownToHtml(entry.body)}
  ${shareLinks(pageUrl, meta.title)}
  <p class="back"><a href="${BASE}${collection.name}/">← All ${collection.label.toLowerCase()}</a></p>
</article>${isWriting ? `\n${subscribeSection()}\n${commentsSection()}` : ''}`;
  writePage(join(collection.name, entry.slug, 'index.html'), layout({
    title: `${meta.title} - ${site.name}`,
    description: meta.summary || site.description,
    content,
    active: activeKey,
    canonical: pageUrl,
    ogImage: meta.socialImage || meta.image || null,
    ogImageAlt: meta.shareImageAlt || meta.imageAlt || meta.title,
    shareTitle: meta.shareTitle || null,
    shareSummary: meta.shareSummary || null,
    ogType: (isWriting || isTalk) ? 'article' : 'website',
    articleDate: meta.date || null,
    articleUpdated: meta.updated || null,
    robots: meta.noindex ? 'noindex, follow' : null,
    jsonLd,
  }));
}

function writerDashboard(entries) {
  const grouped = { pages: [], writing: [], work: [], talks: [], scripts: [] };
  for (const entry of entries) {
    const col = entry.collection;
    if (!grouped[col]) grouped[col] = [];
    grouped[col].push(entry);
  }

  const rows = [];
  for (const col of ['writing', 'work', 'talks', 'scripts', 'pages']) {
    if (!grouped[col] || grouped[col].length === 0) continue;
    rows.push(`<h2>${escapeHtml(col.charAt(0).toUpperCase() + col.slice(1))}</h2>`);
    rows.push(grouped[col].map((entry) => {
      const isPub = isPublished(entry);
      const status = entry.meta.draft === true ? 'Draft' : (isPub ? 'Published' : `Scheduled ${entry.meta.publishAt}`);
      const previewUrl = entry.collection === 'pages' ? `${BASE}${entry.slug}/` : `${BASE}${entry.collection}/${entry.slug}/`;
      return `<article class="writer-entry">
  <div>
    <p class="eyebrow">${escapeHtml(status)}</p>
    <h2><a href="${previewUrl}">${escapeHtml(entry.meta.title)}</a></h2>
    <p>${escapeHtml(entry.meta.summary || '')}</p>
    <p class="writer-preview"><a href="${previewUrl}">Open private preview</a></p>
  </div>
  <details class="writer-edit">
    <summary>Edit and review</summary>
    <form class="writer-form" method="post" action="/api/writer/save">
      <input type="hidden" name="collection" value="${escapeHtml(entry.collection)}" />
      <input type="hidden" name="sourceSlug" value="${escapeHtml(entry.sourceSlug)}" />
      <label>Source Markdown
        <textarea name="markdown" rows="18" required>${escapeHtml(entry.raw)}</textarea>
      </label>
      <button class="button" type="submit">Save draft</button>
    </form>
    <form class="writer-form writer-review" method="post" action="/api/writer/review">
      <input type="hidden" name="collection" value="${escapeHtml(entry.collection)}" />
      <input type="hidden" name="sourceSlug" value="${escapeHtml(entry.sourceSlug)}" />
      <label>Note for the review agent <span>Optional. Tell the agent what changed or what feels uncertain.</span>
        <textarea name="comment" rows="4" maxlength="4000" placeholder="Check the opening claim and whether the examples support it."></textarea>
      </label>
      <p class="field-note">Save first. The agent reviews the committed draft against the writing, review, and design skills.</p>
      <button class="button" type="submit">Request agent review</button>
    </form>
  </details>
  <details class="writer-publish">
    <summary>Publishing controls</summary>
    <form class="writer-form" method="post" action="/api/writer/publish" data-writer-form>
      <input type="hidden" name="collection" value="${escapeHtml(entry.collection)}" />
      <input type="hidden" name="sourceSlug" value="${escapeHtml(entry.sourceSlug)}" />
      <input type="hidden" name="publishAt" value="${escapeHtml(entry.meta.publishAt || '')}" />
      <label>Publish time in your timezone
        <input type="datetime-local" name="publishAtLocal" data-publish-at="${escapeHtml(entry.meta.publishAt || '')}" />
      </label>
      <div class="writer-actions">
        <button class="button" type="submit" name="action" value="draft">Keep draft</button>
        <button class="button" type="submit" name="action" value="schedule">Schedule</button>
        <button class="button" type="submit" name="action" value="publish-now">Publish now</button>
      </div>
    </form>
  </details>
</article>`;
    }).join('\n'));
  }

  const content = `<section class="writer-dashboard">
  <p class="eyebrow">Private publishing</p>
  <h1>Release dashboard</h1>
  <p class="lede">Edit a draft, save it, ask an agent for a structured review, then publish only when the preview is ready. Every save creates a focused commit on <code>main</code>; the next deploy shows the iteration here.</p>
  <p class="writer-status" hidden role="status"></p>
  ${rows.length > 0 ? rows.join('\n') : '<p class="empty-state">No content found.</p>'}
</section>
<script>(()=>{const params=new URLSearchParams(location.search);const changed=params.get('updated')||params.get('saved');const status=document.querySelector('.writer-status');if(changed&&status){status.textContent='Saved '+changed+'. GitHub is starting the next deploy.';status.hidden=false}const review=params.get('review');const issue=params.get('issue');if(review&&status){status.replaceChildren('Review requested for '+review+'. ');if(issue){const link=document.createElement('a');link.href=issue;link.textContent='Open review request';link.rel='noopener';status.append(link)}status.hidden=false}const localValue=(iso)=>{if(!iso)return'';const d=new Date(iso);const part=(value)=>String(value).padStart(2,'0');return d.getFullYear()+'-'+part(d.getMonth()+1)+'-'+part(d.getDate())+'T'+part(d.getHours())+':'+part(d.getMinutes())};document.querySelectorAll('[data-writer-form]').forEach((form)=>{const field=form.elements.publishAtLocal;field.value=localValue(field.dataset.publishAt);form.addEventListener('submit',(event)=>{const action=event.submitter?.value;if(action==='publish-now'&&!window.confirm('Publish this essay now? This commits directly to the publishing branch.')){event.preventDefault();return}if(action!=='schedule')return;const local=field.value;if(!local){event.preventDefault();field.focus();return}const scheduled=new Date(local);if(Number.isNaN(scheduled.valueOf())||scheduled.valueOf()<=Date.now()){event.preventDefault();field.setCustomValidity('Choose a future publish time.');field.reportValidity();return}field.setCustomValidity('');form.elements.publishAt.value=scheduled.toISOString()})})})();</script>`;

  writePage('index.html', layout({
    title: `Writer dashboard - ${site.name}`,
    description: 'Private draft and scheduled essay administration.',
    content,
    active: 'writing',
    canonical: absoluteUrl('/writer/'),
    robots: 'noindex, nofollow',
  }));
}

function buildHome(collections) {
  const bySlug = (collection, slug) => collections[collection].find((entry) => entry.slug === slug);
  const selectedWork = ['code-assist', 'agent-skills', 'agentic-growth']
    .map((slug) => bySlug('work', slug)).filter(Boolean);
  const writingEntries = collections.writing.slice(0, 3);
  const homeDemos = demos.filter(d => !d.hideOnHome);
  const demosSection = homeDemos.length
    ? `
<section>
  ${sectionHeader('The lab', 'Working demos, open source', `${BASE}demos/`, 'All demos')}
  <p class="section-note">${escapeHtml(site.sectionIntros?.demos || '')}</p>
  <div class="grid demo-grid">
    ${homeDemos.map(demoCard).join('\n')}
  </div>
</section>
`
    : '';

  const stats = (site.heroStats || []).length
    ? `<dl class="hero-stats">
    ${site.heroStats.map((stat) => `<div>
      <dt>${escapeHtml(stat.label)}</dt>
      <dd>${escapeHtml(stat.value)}</dd>
    </div>`).join('\n')}
  </dl>`
    : '';

  const featured = writingEntries[0];
  const fieldNotesBody = featured
    ? `${featuredNote(featured)}\n<div class="grid home-work-grid">${writingEntries.slice(1).map((entry) => gridCard('writing', entry)).join('\n')}</div>`
    : `<div class="grid home-work-grid"></div>`;

  const content = `
<section class="hero">
  <div class="hero-profile">
    ${site.profileImage ? `<img class="profile-image" src="${rebase(site.profileImage)}" alt="${escapeHtml(site.profileImageAlt || site.name)}" width="460" height="460" />` : ''}
    <div>
      <p class="hero-role">${escapeHtml(site.profileHeadline || site.role)}</p>
      <p class="hero-location">${escapeHtml(site.location)}</p>
    </div>
  </div>

  <h1>${escapeHtml(site.heroHeadline || site.name)}</h1>
  <p class="lede">${escapeHtml(site.intro)}</p>
  <p class="hero-actions">
    <a class="button button-primary" href="${BASE}work/">See selected work</a>
    <a class="text-link" href="${BASE}writing/">Read the field notes →</a>
  </p>
  ${stats}
</section>

<section>
  ${sectionHeader('Field Notes', 'Learnings from users', `${BASE}writing/`, 'All field notes')}
  ${fieldNotesBody}
</section>

<section>
  ${sectionHeader('Selected work', '', `${BASE}work/`, 'All work')}
  <div class="grid home-work-grid">${selectedWork.map((entry) => gridCard('work', entry)).join('\n')}</div>
</section>

${demosSection}
<section class="build-section home-close">
  <div>
    <p class="eyebrow">Start a conversation</p>
    <h2>Working on a builder platform or developer tool?</h2>
  </div>
  <div>
    <p>I am most useful solving end-user technical opportunities for developer and builder platforms, working backwards from a growth hypothesis.</p>
    <a class="button button-primary" href="${BASE}contact/">Send a note</a>
  </div>
</section>
`;

  writePage('index.html', layout({
    title: `${site.name} - ${site.role}`,
    description: site.description,
    content,
    canonical: absoluteUrl('/'),
    ogImage: site.defaultShareImage,
    ogImageAlt: site.defaultShareImageAlt,
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
  <p class="section-note">Every demo is open source. <a href="${site.links.github}/Portfolio" target="_blank" rel="noopener noreferrer">read the code</a>. One Ryan Baumann portfolio container, one Cloud Run service, and no server secrets shipped to the browser.</p>
</section>`;

  writePage(join('demos', 'index.html'), layout({
    title: `Demos - ${site.name}`,
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

  let body;
  if (collection.name === 'work') {
    body = `<div class="grid">${entries.map((entry) => gridCard('work', entry)).join('\n')}</div>`;
  } else if (collection.name === 'writing') {
    const owned = entries.filter((entry) => !entry.meta.external);
    const elsewhere = entries.filter((entry) => entry.meta.external);
    body = `<div class="collection-group">
  <h2>Essays</h2>
  <p>Canonical ideas published here first, with evidence and a practical next move.</p>
  <ul class="rows">${owned.map((entry) => listRow(collection.name, entry)).join('\n')}</ul>
</div>
${elsewhere.length ? `<div class="collection-group">
  <h2>Elsewhere</h2>
  <p>Launch notes and experiments published with the teams and communities behind the work.</p>
  <ul class="rows">${elsewhere.map((entry) => listRow(collection.name, entry)).join('\n')}</ul>
</div>` : ''}
${subscribeSection()}`;
  } else {
    body = `<ul class="rows">${entries.map((entry) => listRow(collection.name, entry)).join('\n')}</ul>`;
  }

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
    title: `${collection.label} - ${site.name}`,
    description: site.sectionIntros?.[collection.name] || site.description,
    content,
    active: collection.name,
    canonical: absoluteUrl(`/${collection.name}/`),
  }));
}


// Shared hero-image renderer for detail pages and standalone pages. Relative
// image paths resolve against the entry's own content folder; absolute paths
// resolve against static/. Exact dimensions come from the file so the HTML
// never causes layout shift (portfolio-design rule 6).
function heroImage(meta, sourceDirName, extraClass = '') {
  if (!meta.image) return '';
  const imagePath = meta.image.startsWith('/') ? join(STATIC_DIR, meta.image.slice(1)) : join(CONTENT_DIR, sourceDirName, meta.image);
  const { width, height } = getImageDimensions(imagePath);
  return `<img class="article-hero${escapeHtml(extraClass)}" src="${rebase(meta.image)}" alt="${escapeHtml(meta.imageAlt || meta.title)}" loading="lazy" width="${width}" height="${height}" />`;
}

function resumePageContent(meta, body) {
  return `<section class="resume-shell">
  <div class="resume-header">
    <div>
      <p class="eyebrow">Resume</p>
      <h1>${escapeHtml(site.name)}</h1>
      <p class="lede">${escapeHtml(site.positioning || site.role)}</p>
    </div>
    <p class="resume-meta">${escapeHtml(site.location)}<br /><a href="${site.links.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a> · <a href="${site.links.github}" target="_blank" rel="noopener noreferrer">GitHub</a></p>
  </div>
  ${heroImage(meta, 'pages', ' profile-portrait')}
  <div class="resume-body">${markdownToHtml(body)}</div>
</section>`;
}

function contactPageContent(meta) {
  return `<section class="contact-shell">
  <p class="eyebrow">Contact</p>
  <h1>Start a conversation.</h1>
  <p class="lede">Choose what you want to discuss, then share enough context for a useful first reply.</p>
  <form id="contact-form" class="contact-form" action="${BASE}api/contact" method="post">
    <fieldset class="intent-options"><legend>What is this about?</legend>
      ${['Consulting', 'Content collaboration', 'Speaking opportunity', 'Other'].map((intent) => `<label><input type="radio" name="intent" value="${intent}" required /> <span>${intent}</span></label>`).join('')}
    </fieldset>
    <label>What would you like to discuss?
      <textarea name="message" rows="6" required minlength="20" maxlength="5000" placeholder="A few sentences about the idea, audience, timing, and useful next step."></textarea>
    </label>
    <label>Name <input name="name" autocomplete="name" maxlength="120" required /></label>
    <label>Email <input name="email" type="email" autocomplete="email" maxlength="200" required /></label>
    <div class="contact-honeypot" aria-hidden="true">
      <label>Company fax number <input name="company_fax_number" tabindex="-1" autocomplete="off" /></label>
    </div>
    <label class="human-check"><input name="human" type="checkbox" value="1" required /> <span>I am a person, and this is not an unsolicited sales pitch.</span></label>
    <button class="button" type="submit">Send note</button>
  </form>
  <p class="section-note">The server uses your details only to deliver the note and reply. See <a href="${BASE}privacy/">Privacy</a>.</p>
  <script>(()=>{const value=new URLSearchParams(location.search).get('intent');const intents={consulting:'Consulting',content:'Content collaboration',speaking:'Speaking opportunity',other:'Other'};const selected=intents[value];if(!selected)return;const input=[...document.querySelectorAll('input[name="intent"]')].find((item)=>item.value===selected);if(input)input.checked=true})();</script>
</section>`;
}

function loadPages() {
  const dir = join(CONTENT_DIR, 'pages');
  if (!existsSync(dir)) return [];
  const pages = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md') || file.startsWith('_')) continue;
    const sourceSlug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(dir, file), 'utf8');
    const { meta, body } = parseFrontMatter(raw);
    const slug = meta.slug || sourceSlug;
    pages.push({ slug, sourceSlug, meta, body, raw, collection: 'pages' });
  }
  return pages;
}

function buildStandalonePages(pages) {
  for (const page of pages) {
    const { slug, meta, body } = page;
    const customContent = slug === 'resume' ? resumePageContent(meta, body) : slug === 'contact' ? contactPageContent(meta) : null;
    const content = customContent || `<article class="prose">
  <p class="eyebrow">${escapeHtml(meta.eyebrow || site.name)}</p>
  <h1>${escapeHtml(meta.title)}</h1>
  ${heroImage(meta, 'pages', slug === 'about' ? ' profile-portrait' : '')}
  ${markdownToHtml(body)}
</article>`;
    writePage(join(slug, 'index.html'), layout({
      title: `${meta.title} - ${site.name}`,
      description: meta.summary || site.description,
      content,
      active: slug,
      canonical: absoluteUrl(`/${slug}/`),
      ogImage: meta.socialImage || meta.image || null,
      ogImageAlt: meta.shareImageAlt || meta.imageAlt || meta.title,
      shareTitle: meta.shareTitle || null,
      shareSummary: meta.shareSummary || null,
      robots: meta.noindex ? 'noindex, follow' : null,
      contactDelivery: meta.contactDelivery || null,
    }));
  }
  for (const page of pages) validatePage(page.slug, page.meta, page.body);
}


function buildNotFoundPage() {
  const content = `<section class="prose">
  <p class="eyebrow">404</p>
  <h1>Page not found</h1>
  <p>I couldn't find that page. It may have moved, or the link is out of date.</p>
  <p class="hero-actions">
    <a class="button button-primary" href="${BASE}">Home</a>
    <a href="${BASE}work/">Work</a>
    <a href="${BASE}writing/">Field Notes</a>
    ${demos.length ? `<a href="${BASE}demos/">Lab</a>` : ''}
  </p>
</section>`;
  writePage('404.html', layout({
    title: `Page not found - ${site.name}`,
    description: 'The page you were looking for could not be found.',
    content,
    canonical: absoluteUrl('/404.html'),
    robots: 'noindex, nofollow',
  }));
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
      const { meta } = parseFrontMatter(readFileSync(join(pagesDir, file), 'utf8'));
      if (meta.noindex) continue;
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

function permanentRedirects(collections) {
  if (WRITER_MODE) return {};
  const redirects = {};
  const canonicalPaths = new Set(['/', '/demos/', ...COLLECTIONS.filter((item) => item.listPage).map((item) => `/${item.name}/`)]);
  for (const collection of COLLECTIONS) {
    for (const entry of collections[collection.name]) {
      if (hasDetailPage(entry)) canonicalPaths.add(entryUrl(collection.name, entry));
    }
  }
  const pagesDir = join(CONTENT_DIR, 'pages');
  if (existsSync(pagesDir)) {
    for (const file of readdirSync(pagesDir)) {
      if (file.endsWith('.md') && !file.startsWith('_')) canonicalPaths.add(`/${file.replace(/\.md$/, '')}/`);
    }
  }
  for (const collection of COLLECTIONS) {
    for (const entry of collections[collection.name]) {
      if (!hasDetailPage(entry) || entry.meta.external) continue;
      const target = entryUrl(collection.name, entry);
      for (const alias of entry.meta.aliases || []) {
        if (alias === target) failValidation(`${collection.name}/${entry.slug}: alias duplicates its canonical path: ${alias}`);
        if (redirects[alias]) failValidation(`${collection.name}/${entry.slug}: duplicate alias: ${alias}`);
        if (canonicalPaths.has(alias)) failValidation(`${collection.name}/${entry.slug}: alias collides with a generated canonical path: ${alias}`);
        redirects[alias] = target;
      }
    }
  }
  return redirects;
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
    if (!html.includes('twitter:image:alt')) errors.push(`${id}: missing twitter:image:alt`);
    if (!html.includes('og:image:width')) errors.push(`${id}: missing og:image:width`);
    if (!html.includes('og:image:height')) errors.push(`${id}: missing og:image:height`);
    if (!html.includes('og:image:type')) errors.push(`${id}: missing og:image:type`);
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
  const entries = WRITER_MODE ? allEntries : allEntries.filter(isPublished);
  allCollections[collection.name] = allEntries;
  collections[collection.name] = entries;
  buildCollectionIndex(collection, entries);
  if (collection.detailPages) {
    for (const entry of entries) {
      if (hasDetailPage(entry)) detailPage(collection, entry, collection.name);
    }
  }
}

const allPages = loadPages();
if (WRITER_MODE) {
  const allContent = [...allPages];
  for (const collection of COLLECTIONS) {
    allContent.push(...allCollections[collection.name]);
  }
  writerDashboard(allContent);
} else {
  buildHome(collections);
}
buildDemosPage();
buildStandalonePages(allPages);
buildNotFoundPage();

const seenSlugs = new Set();
for (const collection of COLLECTIONS) {
  for (const entry of allCollections[collection.name]) validateEntry(collection, entry, seenSlugs);
}
const redirects = permanentRedirects(collections);
assertValidBuild();
writePage('feed.xml', rssFeed(collections.writing));
writePage('sitemap.xml', sitemapXml(collections));
writePage('robots.txt', robotsTxt());
writePage('redirects.json', `${JSON.stringify(redirects, null, 2)}\n`);

if (existsSync(STATIC_DIR)) {
  cpSync(STATIC_DIR, DIST_DIR, { recursive: true });
}

const pageCount = readdirSync(DIST_DIR, { recursive: true }).filter((file) => String(file).endsWith('index.html')).length;
validateMetadata();
publishOutput();
console.log(`[portfolio] built ${pageCount} pages into ${OUTPUT_DIR} (base: ${BASE})`);
