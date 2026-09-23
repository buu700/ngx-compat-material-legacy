#!/usr/bin/env node
/**
 * Build / verify the peer-light bundled migrate-legacy CLI artifact.
 *
 * Assembles a zero-Angular dependency package under migration/dist/package/,
 * packs it to migration/dist/*.tgz, and records sha256 + engines in
 * compatibility/migrate-legacy-cli-artifact.json.
 *
 * npm pack tarballs are not bit-reproducible across hosts (mtime/uid), so
 * --verify checks:
 *   1) committed tarball sha256 == recorded sha256
 *   2) rebuilt package/ contents match a recorded content_sha256 (sorted file hashes)
 *
 * Usage:
 *   node scripts/build-migrate-legacy-cli.mjs           # rebuild + write hash record
 *   node scripts/build-migrate-legacy-cli.mjs --verify   # verify committed artifact + contents
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
  statSync,
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

function listFilesRecursive(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      listFilesRecursive(full, base, out);
    } else if (st.isFile()) {
      out.push(relative(base, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

/** Content identity independent of tarball mtime/uid. */
function contentSha256(packageRoot) {
  const files = listFilesRecursive(packageRoot);
  const hash = createHash('sha256');
  for (const rel of files) {
    hash.update(rel);
    hash.update('\0');
    hash.update(readFileSync(join(packageRoot, rel)));
    hash.update('\0');
  }
  return {sha256: hash.digest('hex'), files};
}

function writePackageJson(targetDir) {
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
  writeFileSync(join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

function writeBin(targetDir) {
  mkdirSync(join(targetDir, 'bin'), {recursive: true});
  const dest = join(targetDir, 'bin/migrate-legacy.js');
  cpSync(binTemplate, dest);
  chmodSync(dest, 0o755);
}

function writeReadme(targetDir) {
  if (existsSync(packageReadmeTemplate)) {
    cpSync(packageReadmeTemplate, join(targetDir, 'README.md'));
    return;
  }
  writeFileSync(
    join(targetDir, 'README.md'),
    '# @ngx-compat/material-legacy-migrate-cli\n\nPeer-light pre-upgrade CLI. No Angular runtime peers. Node `' +
      ENGINES.node +
      '`.\n\nSee repository `migration/README.md`.\n',
  );
}

function copyLicense(targetDir) {
  const src = join(root, 'projects/ngx-material-legacy/LICENSE');
  const fallback = join(root, 'LICENSE');
  cpSync(existsSync(src) ? src : fallback, join(targetDir, 'LICENSE'));
}

function copyEngine(targetDir) {
  mkdirSync(join(targetDir, 'lib'), {recursive: true});
  for (const name of ['sass-rewrite.js', 'ts-rewrite.js']) {
    cpSync(join(engineDir, name), join(targetDir, 'lib', name));
  }
}

function assemblePackage(targetDir) {
  rmSync(targetDir, {recursive: true, force: true});
  mkdirSync(targetDir, {recursive: true});
  writePackageJson(targetDir);
  writeBin(targetDir);
  writeReadme(targetDir);
  copyLicense(targetDir);
  copyEngine(targetDir);
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
    return join(distDir, entries.sort().pop());
  }
  throw new Error('Packed tarball not found under migration/dist/');
}

function writeRecord(artifactRel, tarballHash, contentHash, fileList) {
  const record = {
    schema_version: 1,
    package_name: '@ngx-compat/material-legacy-migrate-cli',
    version,
    artifact: artifactRel,
    sha256: tarballHash,
    content_sha256: contentHash,
    content_files: fileList,
    engines: ENGINES,
    build_command: 'node scripts/build-migrate-legacy-cli.mjs',
    verify_command: 'node scripts/build-migrate-legacy-cli.mjs --verify',
    angular_peers: 'none',
    notes: [
      'Peer-light: no @angular/* runtime dependencies.',
      'Shares schematic sass-rewrite.js / ts-rewrite.js (copied into package/lib).',
      'Primary distribution is this committed tarball + sha256; optional npm publish of the CLI package is maintainer-authorized later.',
      'Do not advertise npx of the main library as peer-light.',
      'CI --verify checks committed tarball sha256 + rebuilt package content_sha256 (tarball bytes are not cross-host reproducible).',
    ],
  };
  writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
  console.log('Wrote', artifactRel);
  console.log('sha256 (tarball)', tarballHash);
  console.log('content_sha256', contentHash);
  console.log('Recorded compatibility/migrate-legacy-cli-artifact.json');
}

function verify() {
  if (!existsSync(recordPath)) {
    throw new Error('Missing compatibility/migrate-legacy-cli-artifact.json for --verify');
  }
  const prev = JSON.parse(readFileSync(recordPath, 'utf8'));
  const artifactAbs = join(root, prev.artifact);
  if (!existsSync(artifactAbs)) {
    throw new Error('Missing committed artifact: ' + prev.artifact);
  }
  const tarballHash = sha256File(artifactAbs);
  if (tarballHash !== prev.sha256) {
    console.error('Committed tarball SHA256 mismatch:');
    console.error('  recorded:', prev.sha256);
    console.error('  on disk :', tarballHash);
    process.exit(1);
  }
  console.log('OK  committed tarball sha256', tarballHash);

  // Rebuild package into a temp dir and compare content identity
  const tmpPkg = join(distDir, '.verify-package');
  assemblePackage(tmpPkg);
  const {sha256: contentHash, files} = contentSha256(tmpPkg);
  rmSync(tmpPkg, {recursive: true, force: true});

  if (!prev.content_sha256) {
    console.error('Record missing content_sha256; re-run build without --verify to refresh.');
    process.exit(1);
  }
  if (contentHash !== prev.content_sha256) {
    console.error('Package content_sha256 mismatch (engine/template drift):');
    console.error('  recorded:', prev.content_sha256);
    console.error('  rebuilt :', contentHash);
    console.error('  files   :', files.join(', '));
    process.exit(1);
  }
  console.log('OK  content_sha256', contentHash);
  console.log('OK  engines', JSON.stringify(prev.engines));

  if (JSON.stringify(prev.engines) !== JSON.stringify(ENGINES)) {
    console.error('Engines mismatch:', prev.engines, 'vs', ENGINES);
    process.exit(1);
  }

  // Smoke committed package/bin if present
  const binPath = join(pkgDir, 'bin/migrate-legacy.js');
  if (existsSync(binPath)) {
    const help = spawnSync(process.execPath, [binPath, '--help'], {encoding: 'utf8'});
    if (help.status !== 0) {
      console.error(help.stderr || help.stdout);
      throw new Error('bundled CLI --help failed');
    }
    console.log('OK  bundled bin --help');
  }
}

function build() {
  mkdirSync(distDir, {recursive: true});
  for (const name of readdirSync(distDir)) {
    if (name.endsWith('.tgz') && name.includes('migrate-cli')) {
      rmSync(join(distDir, name), {force: true});
    }
  }

  assemblePackage(pkgDir);
  const {sha256: contentHash, files} = contentSha256(pkgDir);
  const printed = npmPack();
  const artifactAbs = resolveArtifactPath(printed);
  const rel = relative(root, artifactAbs).replace(/\\/g, '/');
  const tarballHash = sha256File(artifactAbs);
  writeRecord(rel, tarballHash, contentHash, files);

  const binPath = join(pkgDir, 'bin/migrate-legacy.js');
  const help = spawnSync(process.execPath, [binPath, '--help'], {encoding: 'utf8'});
  if (help.status !== 0) {
    console.error(help.stderr || help.stdout);
    throw new Error('bundled CLI --help failed');
  }
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      'Usage:\n  node scripts/build-migrate-legacy-cli.mjs\n  node scripts/build-migrate-legacy-cli.mjs --verify',
    );
    process.exit(0);
  }
  if (argv.includes('--verify')) {
    verify();
    return;
  }
  build();
}

main(process.argv.slice(2));
