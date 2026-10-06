import {extractPackageArchive} from './safe-package-extract.mjs';
/**
 * Resolve a draft --run manifest to a rehashed library tarball and extract it.
 *
 * Shared by packed-consumer-style artifact consumers and the historical suite.
 * Never repacks. Never falls back to workspace dist/.
 */
import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function insideDir(dir, target) {
  const rel = relative(resolve(dir), resolve(target));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function fail(code, message) {
  console.error(message);
  process.exit(code);
}

/**
 * Parse --run / --family / --tarball from argv. Returns remaining unknown flags
 * as `unknown` so callers can reject them.
 */
export function parseLegacyArgs(argv) {
  let runPath = null;
  let family = null;
  let tarball = null;
  const unknown = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--run' || arg === '--family' || arg === '--tarball') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, `${arg} requires a value`);
      if (arg === '--run') runPath = resolve(root, value);
      else if (arg === '--family') family = value;
      else tarball = resolve(root, value);
      i += 1;
      continue;
    }
    unknown.push(arg);
  }
  return {runPath, family, tarball, unknown, root};
}

/**
 * Load an unsealed draft run.json, locate the library artifact, and rehash it.
 */
export function resolveLibraryFromRun(runManifestPath, {tarball: tarballOverride = null} = {}) {
  if (!existsSync(runManifestPath)) {
    fail(2, `Missing run manifest: ${runManifestPath}`);
  }
  const draft = JSON.parse(readFileSync(runManifestPath, 'utf8'));
  if (draft.schema_version !== 1 || draft.template === true || draft.stage !== 'draft') {
    fail(2, 'run manifest must be an unsealed schema_version 1 draft');
  }
  if (draft.purpose === 'release') {
    fail(2, 'historical runner does not accept a release manifest');
  }
  const artifact = (draft.artifacts || []).find(item => item && item.id === 'library');
  if (!artifact || typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string') {
    fail(2, 'draft run has no library artifact');
  }
  const runDir = dirname(runManifestPath);
  if (isAbsolute(artifact.path) || artifact.path.split(/[\\/]/).includes('..')) {
    fail(2, 'draft library path must stay inside the run directory');
  }
  const fromRun = resolve(runDir, artifact.path);
  if (!insideDir(runDir, fromRun)) {
    fail(2, 'draft library path must stay inside the run directory');
  }
  let tarball = fromRun;
  if (tarballOverride) {
    if (resolve(tarballOverride) !== fromRun) {
      fail(2, '--tarball does not match the draft library artifact');
    }
    tarball = resolve(tarballOverride);
  }
  if (!existsSync(tarball)) {
    fail(2, `Draft library artifact is missing: ${tarball}`);
  }
  const digest = sha256File(tarball);
  const bytes = statSync(tarball).size;
  if (digest !== artifact.sha256 || bytes !== artifact.bytes) {
    fail(1, 'Tarball bytes do not match the draft library artifact. Not repacking.');
  }
  return {
    root,
    runDir,
    runId: draft.run_id,
    line: draft.source?.line ?? null,
    draft,
    artifact,
    tarball,
    digest,
    bytes,
  };
}

/**
 * Extract the npm-pack tarball into a unique directory. Returns the package root
 * (the directory that contains package.json).
 */
export function extractLibraryPackage(tarball, {parentDir = null} = {}) {
  const base=parentDir ? resolve(parentDir) : tmpdir();
  mkdirSync(base,{recursive:true});
  const extractRoot=mkdtempSync(join(base,'ngx-legacy-artifact-'));
  extractPackageArchive(tarball,extractRoot);
  const packageRoot = join(extractRoot, 'package');
  if (!existsSync(join(packageRoot, 'package.json'))) {
    fail(1, `Extracted tarball is missing package/package.json under ${extractRoot}`);
  }
  // Refuse accidental workspace binding: extracted path must not be under dist/ or projects/.
  const dist = resolve(root, 'dist/ngx-material-legacy');
  const projects = resolve(root, 'projects/ngx-material-legacy');
  const realPkg = resolve(packageRoot);
  if (insideDir(dist, realPkg) || insideDir(projects, realPkg) || realPkg === dist || realPkg === projects) {
    fail(1, `Extracted package resolved inside workspace build/source: ${realPkg}`);
  }
  return {extractRoot, packageRoot};
}

export function workspaceDistPackage() {
  const packageRoot = join(root, 'dist/ngx-material-legacy');
  if (!existsSync(join(packageRoot, 'package.json'))) {
    fail(1, 'dist/ngx-material-legacy missing; run ng-packagr / pack:lib first');
  }
  return packageRoot;
}

export function isPathUnder(parent, target) {
  const rel = relative(resolve(parent), resolve(target));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function workspaceSourceRoots() {
  return {
    dist: resolve(root, 'dist/ngx-material-legacy'),
    projects: resolve(root, 'projects/ngx-material-legacy'),
  };
}

export {root as repoRoot, sep};
