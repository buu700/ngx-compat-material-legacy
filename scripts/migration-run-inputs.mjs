/** Exact run artifacts for the old-workspace migration; no dist fallback. */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
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
  // Validate all members before extraction; no symlink/hardlink/device paths are allowed.
  const python = `import sys,tarfile,pathlib
with tarfile.open(sys.argv[1]) as t:
 members=t.getmembers(); seen=set(); total=0
 if not members or len(members)>1000: raise ValueError('CLI member count')
 for m in members:
  p=pathlib.PurePosixPath(m.name)
  if p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0]!='package' or m.name in seen or not (m.isdir() or m.isfile()): raise ValueError('unsafe CLI member')
  seen.add(m.name); total+=m.size
  if total>10*1024*1024: raise ValueError('CLI size')
 t.extractall(sys.argv[2],filter='data')
`;
  const extracted = spawnSync('python3', ['-c', python, input.artifacts['migrate-cli'].absolute, destination], {encoding: 'utf8', timeout: 30000});
  if (extracted.status !== 0) throw new Error(`CLI extraction refused: ${extracted.stderr}`);
  const packageRoot = join(destination, 'package');
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  if (manifest.name !== '@ngx-compat/material-legacy-migrate-cli' || lineForPackageVersion(manifest.version) !== input.line
    || manifest.dependencies || manifest.peerDependencies || manifest.optionalDependencies) throw new Error('wrong CLI line or non-peer-light manifest');
  const files = ['package.json', 'bin/migrate-legacy.js', 'lib/ts-rewrite.js', 'lib/sass-rewrite.js', 'LICENSE'];
  const identities = files.map(path => {
    const bytes = readFileSync(join(packageRoot, path));
    return {path: `package/${path}`, bytes: bytes.length, sha256: digest(bytes)};
  });
  return {packageRoot, bin: join(packageRoot, 'bin/migrate-legacy.js'), identities, manifest};
}
