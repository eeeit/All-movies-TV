const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const nodeModulesRoot = path.join(projectRoot, 'node_modules');

function exitOnFailure(result) {
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  exitOnFailure(result);
}

function pathExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function findNextCli() {
  const rootCli = path.join(nodeModulesRoot, 'next', 'dist', 'bin', 'next');
  if (pathExists(rootCli)) {
    return rootCli;
  }

  const pnpmDir = path.join(nodeModulesRoot, '.pnpm');
  if (!pathExists(pnpmDir)) {
    return null;
  }

  const entries = fs.readdirSync(pnpmDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('next@')) {
      continue;
    }

    const cliPath = path.join(
      pnpmDir,
      entry.name,
      'node_modules',
      'next',
      'dist',
      'bin',
      'next'
    );

    if (pathExists(cliPath)) {
      return cliPath;
    }
  }

  return null;
}

function repairDependenciesIfNeeded() {
  if (findNextCli()) {
    return;
  }

  const result =
    process.platform === 'win32'
      ? spawnSync(
          'cmd.exe',
          ['/d', '/s', '/c', 'npx --yes pnpm@10 install --force'],
          {
            cwd: projectRoot,
            stdio: 'inherit',
          }
        )
      : spawnSync('npx', ['--yes', 'pnpm@10', 'install', '--force'], {
          cwd: projectRoot,
          stdio: 'inherit',
        });

  exitOnFailure(result);
}

function ensureNextCli() {
  repairDependenciesIfNeeded();

  const cliPath = findNextCli();
  if (!cliPath) {
    throw new Error('Next CLI entrypoint not found after dependency repair.');
  }

  return cliPath;
}

const nextCli = ensureNextCli();

run(process.execPath, [path.join(__dirname, 'convert-config.js')]);
run(process.execPath, [path.join(__dirname, 'generate-manifest.js')]);
run(process.execPath, [nextCli, 'build']);
run(process.execPath, [path.join(__dirname, 'build-deploy-stage.js')]);
