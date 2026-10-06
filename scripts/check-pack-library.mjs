#!/usr/bin/env node
/**
 * Coordinator-owned pack-library observations.
 *
 * Expected case IDs are the reviewed fresh-build and artifact-negative roster.
 * They are fixed before the candidate run is judged. Post-build observations
 * rehash the packed bytes and preserve the prepack binding the coordinator
 * assigned before ng-packagr. Negative probes use disposable copies and the
 * shipped consumer resolver. They do not modify the accepted package.
 *
 *   node scripts/check-pack-library.mjs --run <run.json>
 *
 * Without the coordinator environment this still runs the observations and
 * exits, but it does not write an acceptance report.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {coordinatorRequest, writeAcceptanceReport} from './packed-consumer-evidence.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const FRESH_BUILD_IDS = [
  'pack-library/fresh-build/source-clean',
  'pack-library/fresh-build/tracked-lock',
  'pack-library/fresh-build/install-policy',
  'pack-library/fresh-build/tool-versions',
  'pack-library/fresh-build/chainman-revision',
  'pack-library/fresh-build/line',
  'pack-library/fresh-build/package-version',
  'pack-library/fresh-build/pack-exit',
  'pack-library/fresh-build/library-rehash',
  'pack-library/fresh-build/run-relative-output',
  'pack-library/fresh-build/prepack-preserved',
  'pack-library/fresh-build/host-nix',
];

export const ARTIFACT_NEGATIVE_IDS = [
  'pack-library/artifact-negatives/corrupt-bytes',
  'pack-library/artifact-negatives/missing-artifact',
  'pack-library/artifact-negatives/stale-digest',
  'pack-library/artifact-negatives/wrong-line',
  'pack-library/artifact-negatives/path-escape',
  'pack-library/artifact-negatives/implicit-fallback',
];

export function packLibraryCaseIds() {
  return [...FRESH_BUILD_IDS, ...ARTIFACT_NEGATIVE_IDS];
}

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {cwd: root, encoding: 'utf8'});
  if (result.status !== 0) return null;
  return (result.stdout || result.stderr || '').trim().split('\n')[0];
}

function git(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  if (result.status !== 0) return null;
  return result.stdout;
}

function caseResult(caseId, ok, detail) {
  return {case_id: caseId, result: ok ? 'pass' : 'fail', ...detail, failure: ok ? null : detail.failure};
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function lineForVersion(version) {
  const major = String(version || '').split('.')[0];
  if (major === '22') return 'main';
  if (major === '21') return '21.x';
  return null;
}

function packedIdentity(tarball) {
  const extracted = spawnSync('tar', ['-xOf', tarball, 'package/package.json'], {encoding: 'utf8'});
  if (extracted.status !== 0 || !extracted.stdout) return null;
  try {
    const manifest = JSON.parse(extracted.stdout);
    if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') return null;
    return manifest;
  } catch {
    return null;
  }
}

function observeFreshBuild(runPath) {
  const runDir = dirname(runPath);
  const run = readJson(runPath);
  const sourcePackage = readJson(join(root, 'projects/ngx-material-legacy/package.json'));
  const library = (run.artifacts || []).find(item => item && item.id === 'library');
  const metaPath = join(runDir, 'pack-meta.json');
  const packPath = join(runDir, 'pack-execution.json');
  const meta = existsSync(metaPath) ? readJson(metaPath) : null;
  const pack = existsSync(packPath) ? readJson(packPath) : null;
  const tarball = library && typeof library.path === 'string' && !library.path.includes('/') && !library.path.includes('\\')
    ? join(runDir, library.path)
    : null;
  const tarballBytes = tarball && existsSync(tarball) ? readFileSync(tarball) : null;
  const digest = tarballBytes ? sha256(tarballBytes) : null;
  const identity = tarball && tarballBytes ? packedIdentity(tarball) : null;
  const status = git(['status', '--porcelain', '--untracked-files=all', '--', '.', ':(exclude)compatibility/rc/reports']);
  const liveClean = status !== null && status.trim() === '';
  const recordedClean = run.execution_inputs && run.execution_inputs.clean === true && run.source && run.source.clean === true;
  const lockHash = sha256File(join(root, 'pnpm-lock.yaml'));
  const policyHash = sha256File(join(root, 'toolchain-lock.json'));
  const chainman = readFileSync(join(root, 'chainman.lock'), 'utf8').trim();
  const tools = {
    node: runCommand('node', ['-v']),
    pnpm: runCommand('pnpm', ['-v']),
    npm: runCommand('npm', ['-v']),
  };
  const recordedTools = run.environment && run.environment.tool_versions ? run.environment.tool_versions : {};
  const toolsOk = ['node', 'pnpm', 'npm'].every(name => tools[name] && tools[name] === recordedTools[name]);
  const expectedLine = identity ? lineForVersion(identity.version) : null;
  const prepack = pack && pack.binding && typeof pack.binding === 'object' ? pack.binding : null;
  const prepackOk = Boolean(
    prepack
    && prepack.phase === 'prepack'
    && prepack.run_id === run.run_id
    && !Object.prototype.hasOwnProperty.call(prepack, 'library_sha256')
    && !Object.prototype.hasOwnProperty.call(prepack, 'artifacts_sha256')
    && prepack.source_commit === run.source?.commit
    && prepack.source_line === run.source?.line,
  );
  const singleLibrary = Array.isArray(run.artifacts)
    && run.artifacts.filter(item => item && item.id === 'library').length === 1;
  const relativeOk = Boolean(
    library
    && typeof library.path === 'string'
    && /^[A-Za-z0-9._+-]+\.tgz$/.test(library.path)
    && meta
    && meta.tarball === library.path
    && tarball
    && existsSync(tarball),
  );
  const cases = [
    caseResult('pack-library/fresh-build/source-clean', Boolean(recordedClean && liveClean), {
      recorded_clean: recordedClean,
      live_clean: liveClean,
      failure: 'source or checker inputs were not clean',
    }),
    caseResult('pack-library/fresh-build/tracked-lock', Boolean(run.environment && run.environment.lock_sha256 === lockHash), {
      expected: lockHash,
      observed: run.environment ? run.environment.lock_sha256 : null,
      failure: 'pnpm-lock.yaml does not match the frozen lock identity',
    }),
    caseResult('pack-library/fresh-build/install-policy', Boolean(run.environment && run.environment.install_policy_sha256 === policyHash), {
      expected: policyHash,
      observed: run.environment ? run.environment.install_policy_sha256 : null,
      failure: 'toolchain-lock.json does not match the frozen install policy',
    }),
    caseResult('pack-library/fresh-build/tool-versions', toolsOk, {
      expected: tools,
      observed: recordedTools,
      failure: 'node, pnpm, or npm version does not match the frozen tool policy',
    }),
    caseResult('pack-library/fresh-build/chainman-revision', Boolean(
      /^[0-9a-f]{40}$/.test(chainman) && run.environment && run.environment.chainman_revision === chainman,
    ), {
      expected: chainman,
      observed: run.environment ? run.environment.chainman_revision : null,
      failure: 'chainman.lock does not match the frozen revision',
    }),
    caseResult('pack-library/fresh-build/line', Boolean(
      expectedLine
      && run.source
      && run.source.line === expectedLine
      && run.execution_inputs
      && run.execution_inputs.line === expectedLine
      && meta
      && meta.line === expectedLine,
    ), {
      package_version: identity ? identity.version : null,
      expected_line: expectedLine,
      observed_line: run.source ? run.source.line : null,
      failure: 'packed version line does not match the run line',
    }),
    caseResult('pack-library/fresh-build/package-version', Boolean(
      identity
      && identity.name === sourcePackage.name
      && identity.version === sourcePackage.version,
    ), {
      expected_name: sourcePackage.name,
      expected_version: sourcePackage.version,
      observed_name: identity ? identity.name : null,
      observed_version: identity ? identity.version : null,
      failure: 'packed package identity does not match the reviewed project manifest',
    }),
    caseResult('pack-library/fresh-build/pack-exit', Boolean(
      pack
      && pack.status === 'completed'
      && pack.exit_code === 0
      && pack.check_id === 'pack-library'
      && pack.run_id === run.run_id
      && Array.isArray(pack.command)
      && pack.command.some(part => String(part).includes('pack-draft-run.mjs'))
      && typeof pack.started_at === 'string'
      && typeof pack.finished_at === 'string',
    ), {
      status: pack ? pack.status : null,
      exit_code: pack ? pack.exit_code : null,
      failure: 'pack child did not complete with exit 0',
    }),
    caseResult('pack-library/fresh-build/library-rehash', Boolean(
      library
      && digest
      && digest === library.sha256
      && tarballBytes
      && tarballBytes.length === library.bytes
      && meta
      && meta.sha256 === digest,
    ), {
      expected_sha256: library ? library.sha256 : null,
      observed_sha256: digest,
      failure: 'packed bytes do not match the run library digest',
    }),
    caseResult('pack-library/fresh-build/run-relative-output', relativeOk && singleLibrary, {
      path: library ? library.path : null,
      failure: 'library tarball is not one safe run-relative filename',
    }),
    caseResult('pack-library/fresh-build/prepack-preserved', prepackOk, {
      phase: prepack ? prepack.phase : null,
      failure: 'prepack binding was missing or already contained output digests',
    }),
    caseResult('pack-library/fresh-build/host-nix', Boolean(
      run.environment
      && run.environment.mode === 'host-nix'
      && process.env.CHAINMAN_MODE === 'host-nix',
    ), {
      recorded_mode: run.environment ? run.environment.mode : null,
      env_mode: process.env.CHAINMAN_MODE || null,
      failure: 'full acceptance requires the declared host-nix mode',
    }),
  ];
  return {cases, run, runDir, library, prepack, tarball, digest};
}

function writeMiniRun(dir, mutate) {
  const tarball = join(dir, 'library.tgz');
  writeFileSync(tarball, 'disposable-pack-probe\n');
  const bytes = statSync(tarball).size;
  const digest = sha256File(tarball);
  const run = {
    schema_version: 1,
    template: false,
    stage: 'draft',
    purpose: 'candidate',
    run_id: 'pack-library-probe',
    source: {line: 'main', commit: 'a'.repeat(40), clean: true},
    artifacts: [{id: 'library', path: 'library.tgz', sha256: digest, bytes}],
  };
  mutate(dir, run, tarball);
  writeFileSync(join(dir, 'run.json'), JSON.stringify(run));
  return dir;
}

function probeConsumer(args) {
  const env = {...process.env};
  for (const key of Object.keys(env)) {
    if (key.startsWith('RC_')) delete env[key];
  }
  return spawnSync(process.execPath, ['scripts/packed-consumer-aot-smoke.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env,
  });
}

export function artifactNegativeObservations() {
  const scratch = mkdtempSync(join(tmpdir(), 'pack-library-negatives-'));
  const results = [];
  try {
    const corruptDir = join(scratch, 'corrupt');
    mkdirSync(corruptDir);
    writeMiniRun(corruptDir, (_dir, _run, tarball) => {
      const original = readFileSync(tarball);
      writeFileSync(tarball, Buffer.concat([original, Buffer.from("x")]));
    });
    const corrupt = probeConsumer(['--run', join(corruptDir, 'run.json')]);
    results.push(caseResult('pack-library/artifact-negatives/corrupt-bytes', corrupt.status === 1, {
      exit_code: corrupt.status,
      stderr_tail: (corrupt.stderr || '').slice(-400),
      failure: 'corrupt bytes were not rejected by the shipped resolver',
    }));

    const missingDir = join(scratch, 'missing');
    mkdirSync(missingDir);
    writeMiniRun(missingDir, (dir, run) => {
      rmSync(join(dir, run.artifacts[0].path));
    });
    const missing = probeConsumer(['--run', join(missingDir, 'run.json')]);
    results.push(caseResult('pack-library/artifact-negatives/missing-artifact', missing.status === 2, {
      exit_code: missing.status,
      stderr_tail: (missing.stderr || '').slice(-400),
      failure: 'a missing artifact was not rejected',
    }));

    const staleDir = join(scratch, 'stale');
    mkdirSync(staleDir);
    writeMiniRun(staleDir, (_dir, run) => {
      run.artifacts[0].sha256 = 'a'.repeat(64);
    });
    const stale = probeConsumer(['--run', join(staleDir, 'run.json')]);
    results.push(caseResult('pack-library/artifact-negatives/stale-digest', stale.status === 1, {
      exit_code: stale.status,
      stderr_tail: (stale.stderr || '').slice(-400),
      failure: 'a stale digest was not rejected',
    }));

    const wrongDir = join(scratch, 'wrong-line');
    mkdirSync(wrongDir);
    const packageDir = join(wrongDir, 'package');
    mkdirSync(packageDir);
    writeFileSync(packageDir + '/package.json', JSON.stringify({
      name: '@ngx-compat/material-legacy',
      version: '22.0.0-rc.0',
    }));
    const wrongTar = join(wrongDir, 'library.tgz');
    const packed = spawnSync('tar', ['-czf', wrongTar, '-C', wrongDir, 'package'], {encoding: 'utf8'});
    if (packed.status !== 0) throw new Error(packed.stderr || 'tar failed');
    const wrongBytes = statSync(wrongTar).size;
    writeFileSync(join(wrongDir, 'run.json'), JSON.stringify({
      schema_version: 1,
      template: false,
      stage: 'draft',
      purpose: 'candidate',
      run_id: 'pack-library-wrong-line',
      source: {line: '21.x', commit: 'b'.repeat(40), clean: true},
      artifacts: [{id: 'library', path: 'library.tgz', sha256: sha256File(wrongTar), bytes: wrongBytes}],
    }));
    const wrong = probeConsumer(['--run', join(wrongDir, 'run.json')]);
    results.push(caseResult('pack-library/artifact-negatives/wrong-line', wrong.status === 1, {
      exit_code: wrong.status,
      stderr_tail: (wrong.stderr || '').slice(-400),
      failure: 'a wrong-line package was not rejected',
    }));

    const escapeDir = join(scratch, 'escape');
    mkdirSync(escapeDir);
    writeMiniRun(escapeDir, (_dir, run) => {
      run.artifacts[0].path = '../outside.tgz';
    });
    const escape = probeConsumer(['--run', join(escapeDir, 'run.json')]);
    results.push(caseResult('pack-library/artifact-negatives/path-escape', escape.status === 2, {
      exit_code: escape.status,
      stderr_tail: (escape.stderr || '').slice(-400),
      failure: 'a path escape was not rejected',
    }));

    const fallbackDir = join(scratch, 'fallback');
    mkdirSync(fallbackDir);
    const outside = join(scratch, 'outside.tgz');
    writeFileSync(outside, 'not-the-run-artifact');
    writeMiniRun(fallbackDir, () => {});
    const fallback = probeConsumer(['--run', join(fallbackDir, 'run.json'), '--tarball', outside]);
    const fallbackText = `${fallback.stderr || ''}${fallback.stdout || ''}`;
    const rejectedFallback = fallback.status === 2
      && /does not match|must stay inside/.test(fallbackText)
      && !/dist\/ngx-material-legacy/.test(fallbackText);
    results.push(caseResult('pack-library/artifact-negatives/implicit-fallback', rejectedFallback, {
      exit_code: fallback.status,
      stderr_tail: fallbackText.slice(-400),
      failure: 'an outside tarball was accepted or the resolver fell back to workspace dist',
    }));
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
  return results;
}

function main() {
  let runPath = null;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === '--run') {
      const value = process.argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--run requires a path');
      runPath = resolve(root, value);
      i += 1;
      continue;
    }
    fail(2, `Unknown argument: ${arg}`);
  }
  if (!runPath) fail(2, '--run is required');
  const expectedIds = packLibraryCaseIds();
  console.log(`pack-library: derived ${expectedIds.length} cases before judging the candidate`);
  if (!existsSync(runPath)) fail(2, `Missing run manifest: ${runPath}`);

  const fresh = observeFreshBuild(runPath);
  const negatives = artifactNegativeObservations();
  const acceptedDigest = fresh.digest;
  const after = fresh.tarball && existsSync(fresh.tarball) ? sha256File(fresh.tarball) : null;
  if (acceptedDigest && after !== acceptedDigest) {
    fail(2, 'negative probes changed the accepted library bytes');
  }
  const cases = [...fresh.cases, ...negatives];
  const known = new Set(expectedIds);
  if (cases.length !== expectedIds.length || cases.some(item => !known.has(item.case_id))) {
    fail(2, 'pack observations do not match the reviewed roster');
  }
  const request = coordinatorRequest('pack-library');
  if (request && request.error) {
    console.error(`pack-library: refusing acceptance report: ${request.error}`);
    process.exit(2);
  }
  const failed = cases.filter(item => item.result !== 'pass');
  if (request) {
    if (request.runId !== fresh.run.run_id) fail(2, 'coordinator run id does not match the manifest');
    if (resolve(request.runDir) !== resolve(fresh.runDir)) fail(2, 'coordinator run directory does not match --run');
    const library = fresh.library && acceptedDigest
      ? {sha256: acceptedDigest, bytes: fresh.library.bytes}
      : {sha256: '0'.repeat(64), bytes: 1};
    const written = writeAcceptanceReport({
      checkId: 'pack-library',
      request,
      cases,
      expectedIds,
      library,
      assertionName: 'build-observations.json',
      assertionBody: {prepack_preserved: Boolean(fresh.prepack)},
      command: ['node', 'scripts/check-pack-library.mjs', '--run', runPath],
    });
    const reportPath = join(fresh.runDir, 'reports/pack-library.json');
    const report = readJson(reportPath);
    report.evidence_origin = 'coordinator';
    report.prepack_binding = fresh.prepack;
    if (!fresh.prepack || !written.passed) report.coverage = 'incomplete';
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    if (!written.passed || report.coverage !== 'complete') {
      console.error(`pack-library observations failed: ${failed.map(item => item.case_id).join(', ')}`);
      process.exit(1);
    }
  } else if (failed.length) {
    console.error(`pack-library observations failed: ${failed.map(item => item.case_id).join(', ')}`);
    process.exit(1);
  }
  console.log(`pack-library: ${expectedIds.length} observations passed`);
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) main();
