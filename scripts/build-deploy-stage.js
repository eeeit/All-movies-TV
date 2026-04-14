#!/usr/bin/env node

/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const stageDir = path.join(projectRoot, 'deploy_stage');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const nextStaticDir = path.join(projectRoot, '.next', 'static');
const publicDir = path.join(projectRoot, 'public');
const scriptsDir = path.join(projectRoot, 'scripts');
const startFile = path.join(projectRoot, 'start.js');
const configFile = path.join(projectRoot, 'config.json');

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function copyRecursive(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

function verifyStageBundle() {
  const middlewareFile = path.join(
    stageDir,
    '.next',
    'server',
    'src',
    'middleware.js'
  );

  ensureExists(middlewareFile, 'Compiled middleware');

  const middlewareContent = fs.readFileSync(middlewareFile, 'utf8');
  const expectedTokens = [
    'x-moontv-auth',
    'Access-Control-Allow-Origin',
    '/api/image-proxy',
  ];
  const missingTokens = expectedTokens.filter(
    (token) => !middlewareContent.includes(token)
  );

  if (missingTokens.length > 0) {
    throw new Error(
      `deploy_stage is stale; missing tokens: ${missingTokens.join(', ')}`
    );
  }
}

function main() {
  ensureExists(standaloneDir, 'Standalone build output');
  ensureExists(nextStaticDir, 'Next static assets');
  ensureExists(publicDir, 'Public assets');
  ensureExists(startFile, 'Runtime entry');
  ensureExists(configFile, 'Runtime config');

  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });

  copyRecursive(standaloneDir, stageDir);
  copyRecursive(nextStaticDir, path.join(stageDir, '.next', 'static'));
  copyRecursive(publicDir, path.join(stageDir, 'public'));
  copyRecursive(scriptsDir, path.join(stageDir, 'scripts'));
  fs.copyFileSync(startFile, path.join(stageDir, 'start.js'));
  fs.copyFileSync(configFile, path.join(stageDir, 'config.json'));

  verifyStageBundle();

  console.log('deploy_stage refreshed from current standalone build.');
}

main();
