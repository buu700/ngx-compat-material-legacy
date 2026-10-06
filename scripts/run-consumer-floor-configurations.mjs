/** Execute the reviewed floor set on the exact run artifacts; intended for Actions. */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {floorConfigurations} from './consumer-floor-roster.mjs';
import {coordinatorRequest, lineForPackageVersion} from './packed-consumer-evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--run') throw new Error('--run <run.json> is required');
const request = coordinatorRequest('consumer-floors');
if (!request || request.error) throw new Error(request?.error ?? 'run-bound coordinator request required');
const source = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'), 'utf8'));
const line = lineForPackageVersion(source.version);
if (line !== request.line) throw new Error('floor request does not match source package line');
const plan = JSON.parse(readFileSync(join(root, 'compatibility/rc/consumer-floor-plan.json'), 'utf8'));
const configurations = floorConfigurations(plan, line, source);
const runPath = resolve(args[1]);
const runDir = dirname(runPath);
const run = JSON.parse(readFileSync(runPath, 'utf8'));
if (run.run_id !== request.runId || run.source.line !== line || runDir !== resolve(request.runDir)
  || run.source.commit !== request.binding.source_commit || run.source.git_tree_sha !== request.binding.source_tree) {
  throw new Error('floor run does not match the bound source');
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function confinedPath(base, path) {
  if (typeof path !== 'string' || isAbsolute(path) || path.includes('\\') || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('unsafe artifact path');
  const result = resolve(base, path);
  let cursor = base;
  for (const part of path.split('/')) { cursor = join(cursor, part); if (lstatSync(cursor).isSymbolicLink()) throw new Error('symlink artifact path'); }
  if (!result.startsWith(resolve(base) + sep) || !lstatSync(result).isFile()) throw new Error('artifact is not a confined regular file');
  return result;
}
function artifact(id) {
  const entries = run.artifacts.filter(item => item.id === id);
  if (entries.length !== 1) throw new Error(`one ${id} artifact required`);
  const record = entries[0];
  const path = confinedPath(runDir, record.path);
  const bytes = readFileSync(path);
  if (bytes.length !== record.bytes || hash(bytes) !== record.sha256) throw new Error(`${id} bytes do not match run`);
  return {...record, path};
}
const library = artifact('library');
const cli = artifact('migrate-cli');
const owned = mkdtempSync(join(tmpdir(), 'ngx-consumer-floors-'));
const binaries = new Map();
const tools = JSON.parse(readFileSync(join(root, 'toolchain-lock.json'), 'utf8'));
if (process.versions.node !== tools.repository.node) throw new Error('floor orchestration requires the pinned private Node runtime');
const cleanEnv = {...process.env, NODE_OPTIONS: ''};
for (const name of Object.keys(cleanEnv)) if (name.startsWith('RC_') || name === 'NODE_PATH') delete cleanEnv[name];
function child(command, argv, options = {}) {
  const result = spawnSync(command, argv, {cwd: root, encoding: 'utf8', timeout: 300000, env: cleanEnv, ...options});
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status}): ${(result.stderr || result.error?.message || result.stdout || '').slice(-3000)}`);
  return result;
}
const npmCli = realpathSync(child('sh', ['-c', 'command -v npm']).stdout.trim());
if (!npmCli.endsWith('/npm-cli.js') || child(process.execPath, [npmCli, '--version']).stdout.trim() !== tools.release.npm) {
  throw new Error('floor installation requires the pinned private npm CLI');
}
async function runtime(version) {
  if (binaries.has(version)) return binaries.get(version);
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('qualified floor platform is linux-x64');
  const pin = plan.node_sources[version];
  const response = await fetch(pin.url, {signal: AbortSignal.timeout(120000)});
  if (!response.ok) throw new Error(`Node ${version} acquisition HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 100 * 1024 * 1024 || hash(bytes) !== pin.sha256) throw new Error('Node archive hash/size mismatch');
  const archive = join(owned, `node-${version}.tar.xz`);
  writeFileSync(archive, bytes);
  const prefix = `node-v${version}-linux-x64`;
  const members = child('tar', ['-tJf', archive]).stdout.trim().split('\n');
  if (!members.length || members.some(name => name.startsWith('/') || name.split('/').includes('..') || !(name === `${prefix}/` || name.startsWith(`${prefix}/`)))) throw new Error('Node archive path escape');
  child('tar', ['--no-same-owner', '--no-same-permissions', '-xJf', archive, '-C', owned]);
  const executable = join(owned, prefix, 'bin/node');
  const actual = child(executable, ['--version']).stdout.trim();
  if (actual !== `v${version}` || lstatSync(executable).isSymbolicLink()) throw new Error('downloaded Node version mismatch');
  const value = {executable, archive_sha256: pin.sha256, version: actual, executable_sha256: hash(readFileSync(executable))};
  binaries.set(version, value);
  return value;
}
function inspectCliArchive() {
  const members = child('tar', ['-tzf', cli.path]).stdout.trim().split('\n');
  if (!members.length || members.some(name => name.startsWith('/') || name.split('/').includes('..') || !name.startsWith('package/'))) throw new Error('CLI archive path escape');
  const directory = join(owned, 'cli'); mkdirSync(directory);
  child('tar', ['--no-same-owner', '--no-same-permissions', '-xzf', cli.path, '-C', directory]);
  const packageRoot = join(directory, 'package');
  const manifest = JSON.parse(readFileSync(confinedPath(packageRoot, 'package.json'), 'utf8'));
  if (manifest.name !== '@ngx-compat/material-legacy-migrate-cli' || lineForPackageVersion(manifest.version) !== line) throw new Error('wrong CLI artifact line');
  return confinedPath(packageRoot, 'bin/migrate-legacy.js');
}
const results = [];
try {
  const cliBin = inspectCliArchive();
  for (const configuration of configurations) {
    const filename = configuration.case_id.replaceAll('/', '__');
    const observation = {kind: 'assertion', check_id: 'consumer-floors', group: configuration.group,
      case_id: configuration.case_id, run_id: request.runId, invocation_id: request.invocation,
      line, binding: request.binding, configuration, result: 'fail', artifacts: {library: library.sha256, 'migrate-cli': cli.sha256}};
    try {
      const node = await runtime(configuration.node);
      observation.runtime = node;
      const env = {...cleanEnv, NGX_FLOOR_NPM_CLI: npmCli, PATH: `${dirname(node.executable)}:${cleanEnv.PATH ?? ''}`};
      if (configuration.group === 'library-runtime') {
        const detailPath = join(request.outputDir, `${filename}.consumer.json`);
        const command = [join(root, 'scripts/packed-consumer-aot-smoke.mjs'), '--tarball', library.path,
          '--floor-case', configuration.case_id, '--floor-out', detailPath];
        child(node.executable, command, {env, timeout: 600000});
        const detail = JSON.parse(readFileSync(detailPath, 'utf8'));
        if (detail.status !== 'ok' || detail.node_runtime.version !== `v${configuration.node}`
          || detail.tarball.sha256 !== library.sha256 || detail.aot.status !== 'ok' || detail.harness.status !== 'ok'
          || !Array.isArray(detail.acceptanceCases) || !detail.acceptanceCases.length
          || detail.acceptanceCases.some(item => item.result !== 'pass')) throw new Error('floor consumer did not satisfy every probe');
        observation.command = [node.executable, ...command];
        observation.consumer_detail = {path: relative(runDir, detailPath), sha256: hash(readFileSync(detailPath)), bytes: readFileSync(detailPath).length};
        observation.consumer_lock = {...detail.consumer_lock, path: relative(runDir, detail.consumer_lock.path)};
        observation.installed_versions = detail.installed_floor_versions;
      } else {
        const fixture = join(owned, filename); mkdirSync(fixture);
        const target = join(fixture, 'example.ts');
        writeFileSync(target, "import {MatLegacyButtonModule} from '@angular/material/legacy-button';\nexport {MatLegacyButtonModule};\n");
        const runCli = flags => {
          const execution = child(node.executable, [cliBin, fixture, '--json', ...flags], {env});
          return JSON.parse(execution.stdout);
        };
        const before = readFileSync(target);
        const dry = runCli([]);
        if (!readFileSync(target).equals(before) || dry.blocking !== 0 || dry.mode !== 'dry-run' || dry.safe_edits < 1) throw new Error('CLI dry-run modified data or did not plan migration');
        const applied = runCli(['--apply']);
        const after = readFileSync(target, 'utf8');
        if (applied.applied !== 1 || applied.blocking !== 0 || !after.includes('@ngx-compat/material-legacy/legacy-button')) throw new Error('CLI did not apply migration');
        const second = runCli(['--apply']);
        if (second.applied !== 0 || readFileSync(target, 'utf8') !== after) throw new Error('CLI is not idempotent');
        observation.cli = {support_files: Object.fromEntries(['bin/migrate-legacy.js', 'lib/ts-rewrite.js', 'lib/sass-rewrite.js', 'lib/transaction-write.js', 'package.json'].map(path => [path, hash(readFileSync(confinedPath(resolve(cliBin, '../..'), path)))])), dry_run: dry, apply: applied, second_apply: second, cli_bin_sha256: hash(readFileSync(cliBin))};
        observation.command = [node.executable, cliBin, '<owned-fixture>', '--json', '--apply'];
      }
      if (hash(readFileSync(library.path)) !== library.sha256 || hash(readFileSync(cli.path)) !== cli.sha256) throw new Error('artifact changed during floor execution');
      observation.exit_code = 0;
      observation.result = 'pass';
    } catch (error) { observation.failure = error.message; }
    writeFileSync(join(request.outputDir, `${filename}.json`), JSON.stringify(observation, null, 2) + '\n');
    results.push({case_id: observation.case_id, result: observation.result, failure: observation.failure});
    console.log(`consumer floor: ${observation.case_id}: ${observation.result}${observation.failure ? `: ${observation.failure}` : ''}`);
  }
} finally { rmSync(owned, {recursive: true, force: true}); }
process.exitCode = results.length === configurations.length && results.every(item => item.result === 'pass') ? 0 : 1;
