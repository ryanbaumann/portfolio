#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_PATH = join(REPO_ROOT, '.env');

async function main() {
  console.log('--- trails.ninja Local Environment Setup ---');
  if (existsSync(ENV_PATH)) {
    console.log('✅ .env already exists! If you want to re-run setup, delete it first.');
    process.exit(0);
  }

  console.log('No .env file found. Let\\'s generate one.\\n');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = async (prompt, defaultValue = '') => {
    const answer = await rl.question(`${prompt} ${defaultValue ? `[${defaultValue}]: ` : ': '}`);
    return answer.trim() || defaultValue;
  };

  console.log('1. Strava API (https://www.strava.com/settings/api)');
  const STRAVA_CLIENT_ID = await ask('   Strava Client ID');
  const STRAVA_CLIENT_SECRET = await ask('   Strava Client Secret');
  
  console.log('\\n2. Google Maps Platform');
  const GMP_SERVER_API_KEY = await ask('   Google Maps API Key (Needs Maps JS, Elevation/Isochrones, Air Quality & Places)');

  rl.close();

  const envContent = `
# Strava
STRAVA_CLIENT_ID=${STRAVA_CLIENT_ID}
STRAVA_CLIENT_SECRET=${STRAVA_CLIENT_SECRET}
VITE_STRAVA_CLIENT_ID=${STRAVA_CLIENT_ID}

# Google Maps Platform
GMP_SERVER_API_KEY=${GMP_SERVER_API_KEY}
VITE_GMP_API_KEY=${GMP_SERVER_API_KEY}
`.trim();

  writeFileSync(ENV_PATH, envContent + '\\n');
  console.log('\\n🎉 Successfully created .env file in the root directory!');
  console.log('You can now run `npm run build && npm start` to start the local gateway.');
}

main().catch(console.error);
