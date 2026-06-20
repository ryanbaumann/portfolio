#!/usr/bin/env node
const { copyFileSync, createWriteStream, mkdirSync } = require('fs');
const { spawn } = require('child_process');
const { join } = require('path');

const appRoot = join(__dirname, '..');
const buildDir = join(appRoot, 'build');
const browserifyBin = join(appRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'browserify.cmd' : 'browserify');

mkdirSync(buildDir, { recursive: true });
copyFileSync(join(appRoot, 'index.html'), join(buildDir, 'index.html'));

const browserify = spawn(browserifyBin, ['-p', 'esmify', 'index.js'], {
  cwd: appRoot,
  env: {
    ...process.env,
    BROWSERSLIST_IGNORE_OLD_DATA: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

browserify.stdout.pipe(createWriteStream(join(buildDir, 'bundle.js')));

let pendingStderr = '';
const filterStderrLine = (line) => {
  if (line.includes('[BABEL] Note: The code generator has deoptimised the styling of') && line.includes('mapbox-gl')) {
    return;
  }
  process.stderr.write(`${line}\n`);
};

browserify.stderr.on('data', (chunk) => {
  pendingStderr += chunk.toString();
  const lines = pendingStderr.split(/\r?\n/);
  pendingStderr = lines.pop() ?? '';
  lines.forEach(filterStderrLine);
});

browserify.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});

browserify.on('close', (code) => {
  if (pendingStderr) filterStderrLine(pendingStderr);
  process.exit(code ?? 0);
});
