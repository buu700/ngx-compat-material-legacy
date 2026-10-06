/** Exact run artifacts for the old-workspace migration; no dist fallback. */
import {createHash} from 'node:crypto';
import {extractPackageArchive} from './safe-package-extract.mjs';
import {lstatSync, readFileSync} from 'node:fs';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {coordinatorRequest, lineForPackageVersion} from './packed-consumer-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function resolveMigrationRun(runPath) {
  const runDir = dirname(resolve(runPath));
  const run = JSON.parse(readFileSync(runPath, 'utf8'));
  const line = lineForPackageVersion(JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'), 'utf8')).version);
  const request = coordinatorRequest('migration-packaged');
  if (run.schema_version !== 1 || run.stage !== 'draft' || run.template === true || run.purpose === 'release'
    || !line || run.source?.line !== line || typeof run.run_id !== 'string'
    || (request && (request.error || request.runId !== run.run_id || resolve(request.runDir) !== runDir
      || request.binding.source_commit !== run.source.commit || request.binding.source_tree !== run.source.git_tree_sha))) {
    throw new Error('migration run/source/coordinator identities do not match');
  }
  const artifacts = {};
  for (const id of ['library', 'migrate-cli']) {
    const records = run.artifacts?.filter(a => a.id === id);
    if (records?.length !== 1) throw new Error(`one ${id} artifact required`);
    const record = records[0];
    if (typeof record.path !== 'string' || isAbsolute(record.path) || record.path.includes('\\')
      || record.path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('unsafe run artifact path');
    let path = runDir;
    for (const part of record.path.split('/')) { path = join(path, part); if (lstatSync(path).isSymbolicLink()) throw new Error('symlink run artifact path'); }
    const bytes = readFileSync(path);
    if (!lstatSync(path).isFile() || bytes.length !== record.bytes || digest(bytes) !== record.sha256) throw new Error('run artifact identity mismatch');
    artifacts[id] = {...record, absolute: path};
  }
  return {run, runDir, line, request, artifacts};
}
export function extractMigrationCli(input, destination) {
  extractPackageArchive(input.artifacts['migrate-cli'].absolute,destination,{maxFiles:1000,maxBytes:10*1024*1024});
  const packageRoot = join(destination, 'package');
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  if (manifest.name !== '@ngx-compat/material-legacy-migrate-cli' || lineForPackageVersion(manifest.version) !== input.line
    || manifest.dependencies || manifest.peerDependencies || manifest.optionalDependencies) throw new Error('wrong CLI line or non-peer-light manifest');
  const files = ['package.json', 'bin/migrate-legacy.js', 'lib/ts-rewrite.js', 'lib/sass-rewrite.js', 'lib/transaction-write.js', 'LICENSE'];
  const identities = files.map(path => {
    const bytes = readFileSync(join(packageRoot, path));
    return {path: `package/${path}`, bytes: bytes.length, sha256: digest(bytes)};
  });
  return {packageRoot, bin: join(packageRoot, 'bin/migrate-legacy.js'), identities, manifest};
}
