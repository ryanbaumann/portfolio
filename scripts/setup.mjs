#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_PATH = resolve(process.env.PORTFOLIO_ENV_PATH || join(REPO_ROOT, '.env'));

async function main() {
  console.log('--- Ryan Baumann Portfolio Local Environment Setup ---');
  if (existsSync(ENV_PATH)) {
    console.log('✅ .env already exists! If you want to re-run setup, delete it first.');
    process.exit(0);
  }

  console.log("No .env file found. Let's generate one.\n");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = async (prompt, defaultValue = '') => {
    const answer = await rl.question(`${prompt} ${defaultValue ? `[${defaultValue}]: ` : ': '}`);
    return answer.trim() || defaultValue;
  };

  console.log('1. Strava API (https://www.strava.com/settings/api)');
  const STRAVA_CLIENT_ID = await ask('   Strava Client ID');
  const STRAVA_CLIENT_SECRET = await ask('   Strava Client Secret');
  
  console.log('\n2. Google Maps Platform (use separately restricted browser and server keys)');
  const VITE_GMP_API_KEY = await ask('   Browser key for Strava Explorer and Air Quality Map');
  const VITE_ISOCHRONES_GMP_API_KEY = await ask('   Browser key for the Isochrones map', VITE_GMP_API_KEY);
  const GMP_SERVER_API_KEY = await ask('   Server key for gateway API calls');

  console.log('\n3. Contact form (optional for local development)');
  const RESEND_API_KEY = await ask('   Resend API key');
  const CONTACT_TO_EMAIL = await ask('   Contact destination email');
  const CONTACT_FROM_EMAIL = await ask('   Verified sender', 'Portfolio Contact <onboarding@resend.dev>');

  rl.close();

  const envContent = formatEnv({
    STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET,
    VITE_GMP_API_KEY,
    VITE_ISOCHRONES_GMP_API_KEY,
    GMP_SERVER_API_KEY,
    RESEND_API_KEY,
    CONTACT_TO_EMAIL,
    CONTACT_FROM_EMAIL,
  });

  writeFileSync(ENV_PATH, envContent + '\n');
  console.log('\n🎉 Successfully created .env file in the root directory!');
  console.log('You can now run `npm run build && npm start` to start the local gateway.');
}

export function formatEnv(values) {
  return `
# Strava
STRAVA_CLIENT_ID=${values.STRAVA_CLIENT_ID}
STRAVA_CLIENT_SECRET=${values.STRAVA_CLIENT_SECRET}
VITE_STRAVA_CLIENT_ID=${values.STRAVA_CLIENT_ID}

# Google Maps Platform
GMP_SERVER_API_KEY=${values.GMP_SERVER_API_KEY}
VITE_GMP_API_KEY=${values.VITE_GMP_API_KEY}
VITE_ISOCHRONES_GMP_API_KEY=${values.VITE_ISOCHRONES_GMP_API_KEY}

# Contact form
RESEND_API_KEY=${values.RESEND_API_KEY}
CONTACT_TO_EMAIL=${values.CONTACT_TO_EMAIL}
CONTACT_FROM_EMAIL=${values.CONTACT_FROM_EMAIL}
`.trim();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
