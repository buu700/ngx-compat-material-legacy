#!/usr/bin/env node
/**
 * Build / verify the peer-light bundled migrate-legacy CLI artifact.
 *
 * Assembles a zero-Angular dependency package under migration/dist/package/,
 * packs it to migration/dist/*.tgz, and records sha256 + engines in
 * compatibility/migrate-legacy-cli-artifact.json.
 *
 * Usage:
 *   node scripts/build-migrate-legacy-cli.mjs           # rebuild + write hash record
 *   node scripts/build-migrate-legacy-cli.mjs --verify   # rebuild and fail if hash drifts
 *   node scripts/build-migrate-legacy-cli.mjs --help
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const version = '22.0.0-rc.0';
const distDir = join(root, 'migration/dist');
const pkgDir = join(distDir, 'package');
const recordPath = join(root, 'compatibility/migrate-legacy-cli-artifact.json');
const engineDir = join(
  root,
  'projects/ngx-material-legacy/schematics/migrate-legacy',
);
const binTemplate = join(here, 'migrate-cli-bundle/bin-template.js');
const packageReadmeTemplate = join(here, 'migrate-cli-bundle/package-README.md');

/** Peer-light CLI Node engines: pure JS, no Angular runtime. */
const ENGINES = {node: '>=18.0.0'};

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function writePackageJson() {
  const pkg = {
    name: '@ngx-compat/material-legacy-migrate-cli',
    version,
    private: false,
    description:
      'Peer-light pre-upgrade CLI for @ngx-compat/material-legacy migrate-legacy Sass/TS rewrites. No Angular runtime peers.',
    license: 'MIT',
    bin: {
      'ngx-material-legacy-migrate': 'bin/migrate-legacy.js',
    },
    main: 'bin/migrate-legacy.js',
    engines: ENGINES,
    files: ['bin', 'lib', 'README.md', 'LICENSE'],
    repository: {
      type: 'git',
      url: 'git+https://github.com/buu700/ngx-compat-material-legacy.git',
      directory: 'migration/dist',
    },
    publishConfig: {
      access: 'public',
    },
  };
  writeFileSync(join(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

function writeBin() {
  mkdirSync(join(pkgDir, 'bin'), {recursive: true});
  const dest = join(pkgDir, 'bin/migrate-legacy.js');
  cpSync(binTemplate, dest);
  chmodSync(dest, 0o755);
}

function writeReadme() {
  if (existsSync(packageReadmeTemplate)) {
    cpSync(packageReadmeTemplate, join(pkgDir, 'README.md'));
    return;
  }
  const text =
    '# @ngx-compat/material-legacy-migrate-cli\n\n' +
    'Peer-light pre-upgrade CLI. No Angular runtime peers. Node `' +
    ENGINES.node +
    '`.\n\n' +
    'See repository `migration/README.md`.\n';
  writeFileSync(join(pkgDir, 'README.md'), text);
}

function copyLicense() {
  const src = join(root, 'projects/ngx-material-legacy/LICENSE');
  const fallback = join(root, 'LICENSE');
  cpSync(existsSync(src) ? src : fallback, join(pkgDir, 'LICENSE'));
}

function copyEngine() {
  mkdirSync(join(pkgDir, 'lib'), {recursive: true});
  for (const name of ['sass-rewrite.js', 'ts-rewrite.js']) {
    cpSync(join(engineDir, name), join(pkgDir, 'lib', name));
  }
}

function npmPack() {
  const result = spawnSync(
    'npm',
    ['pack', './package', '--pack-destination', distDir],
    {cwd: distDir, encoding: 'utf8'},
  );
  if (result.status !== 0) {
    console.error(result.stdout || '');
    console.error(result.stderr || '');
    throw new Error('npm pack failed');
  }
  return (result.stdout || '').trim().split('\n').filter(Boolean).pop();
}

function resolveArtifactPath(printedName) {
  if (printedName) {
    const candidate = join(distDir, printedName);
    if (existsSync(candidate)) return candidate;
  }
  const entries = readdirSync(distDir).filter(
    (n) => n.endsWith('.tgz') && n.includes('migrate-cli'),
  );
  if (entries.length === 1) return join(distDir, entries[0]);
  if (entries.length > 1) {
    // Prefer the newest matching tarball
    return join(distDir, entries.sort().pop());
  }
  throw new Error('Packed tarball not found under migration/dist/');
}

function writeRecord(artifactRel, hash, verify) {
  const record = {
    schema_version: 1,
    package_name: '@ngx-compat/material-legacy-migrate-cli',
    version,
    artifact: artifactRel,
    sha256: hash,
    engines: ENGINES,
    build_command: 'node scripts/build-migrate-legacy-cli.mjs',
    verify_command: 'node scripts/build-migrate-legacy-cli.mjs --verify',
    angular_peers: 'none',
    notes: [
      'Peer-light: no @angular/* runtime dependencies.',
      'Shares schematic sass-rewrite.js / ts-rewrite.js (copied into package/lib).',
      'Primary distribution is this committed tarball + sha256; optional npm publish of the CLI package is maintainer-authorized later.',
      'Do not advertise npx of the main library as peer-light.',
    ],
  };

  if (verify) {
    if (!existsSync(recordPath)) {
      throw new Error(
        'Missing compatibility/migrate-legacy-cli-artifact.json for --verify',
      );
    }
    const prev = JSON.parse(readFileSync(recordPath, 'utf8'));
    if (prev.sha256 !== hash) {
      console.error('SHA256 mismatch:');
      console.error('  recorded:', prev.sha256);
      console.error('  rebuilt :', hash);
      process.exit(1);
    }
    if (prev.artifact !== artifactRel) {
      console.error('Artifact path mismatch:', prev.artifact, 'vs', artifactRel);
      process.exit(1);
    }
    if (JSON.stringify(prev.engines) !== JSON.stringify(ENGINES)) {
      console.error('Engines mismatch:', prev.engines, 'vs', ENGINES);
      process.exit(1);
    }
    console.log('OK  hash matches', hash);
    console.log('OK  artifact', artifactRel);
    console.log('OK  engines', JSON.stringify(ENGINES));
    return;
  }

  writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
  console.log('Wrote', artifactRel);
  console.log('sha256', hash);
  console.log('Recorded compatibility/migrate-legacy-cli-artifact.json');
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      'Usage:\n  node scripts/build-migrate-legacy-cli.mjs\n  node scripts/build-migrate-legacy-cli.mjs --verify',
    );
    process.exit(0);
  }
  const verify = argv.includes('--verify');

  mkdirSync(distDir, {recursive: true});
  rmSync(pkgDir, {recursive: true, force: true});
  mkdirSync(pkgDir, {recursive: true});

  // Remove previous migrate-cli tarballs so resolve is unambiguous
  for (const name of readdirSync(distDir)) {
    if (name.endsWith('.tgz') && name.includes('migrate-cli')) {
      rmSync(join(distDir, name), {force: true});
    }
  }

  writePackageJson();
  writeBin();
  writeReadme();
  copyLicense();
  copyEngine();
  const printed = npmPack();

  const artifactAbs = resolveArtifactPath(printed);
  const rel = relative(root, artifactAbs).replace(/\\/g, '/');
  const hash = sha256File(artifactAbs);
  writeRecord(rel, hash, verify);

  const binPath = join(pkgDir, 'bin/migrate-legacy.js');
  const help = spawnSync(process.execPath, [binPath, '--help'], {encoding: 'utf8'});
  if (help.status !== 0) {
    console.error(help.stderr || help.stdout);
    throw new Error('bundled CLI --help failed');
  }
}

main(process.argv.slice(2));
