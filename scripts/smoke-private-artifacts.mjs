#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = process.env.BASE_URL || 'http://portfolio-private-smoke:8080';
const password = process.env.LABS_SMOKE_PASSWORD || 'artifact-smoke-password';
const apps = JSON.parse(readFileSync(join(repoRoot, 'apps.json'), 'utf8')).filter((app) => app.source?.type === 'artifact');

function authCookie(app) {
  const expires = Math.floor(Date.now() / 1000) + 300;
  const nonce = '0'.repeat(32);
  const payload = `${app.name}:${expires}:${nonce}`;
  const signature = createHmac('sha256', password).update(payload).digest('hex');
  return `__Host-demo-auth=${payload}:${signature}`;
}

for (const app of apps) {
  const unauthenticated = await fetch(`${baseUrl}${app.path}`, { redirect: 'manual' });
  if (unauthenticated.status !== 401) throw new Error(`${app.name}: expected unauthenticated 401, got ${unauthenticated.status}`);
  const cookie = authCookie(app);
  const page = await fetch(`${baseUrl}${app.path}`, { headers: { Cookie: cookie } });
  if (page.status !== 200) throw new Error(`${app.name}: authenticated index returned ${page.status}`);
  const html = await page.text();
  if (!/<html/i.test(html)) throw new Error(`${app.name}: artifact index is not HTML`);
  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/gi)].map((match) => match[1]).filter((ref) => !/^(?:https?:|data:|mailto:|\/\/|#)/i.test(ref));
  for (const ref of refs) {
    const asset = await fetch(new URL(ref, `${baseUrl}${app.path}`), { headers: { Cookie: cookie } });
    if (asset.status !== 200) throw new Error(`${app.name}: asset ${ref} returned ${asset.status}`);
  }
  if (app.api?.type === 'upstream') {
    const denied = await fetch(`${baseUrl}${app.api.prefix}`, { redirect: 'manual' });
    if (denied.status !== 401) throw new Error(`${app.name}: upstream API did not fail closed (got ${denied.status})`);
  }
  console.log(`[labs:smoke-private] ${app.name} authenticated index/assets passed`);
}
if (apps.length === 0) console.log('[labs:smoke-private] no private artifacts declared');
