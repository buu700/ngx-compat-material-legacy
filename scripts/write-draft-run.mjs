#!/usr/bin/env node
/**
 * Write a draft run.json for one library tarball that already exists.
 *
 * The tarball must sit inside --out. This script rehashes those bytes and
 * does not pack, seal, or store a digest of the manifest inside the manifest.
 *
 *   node scripts/write-draft-run.mjs --tarball <path> --line main|21.x --out <run-dir>
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {constants, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const matrixPath = join(root, 'compatibility/rc/matrices/pack-draft.json');

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  let outDir = null;
  let line = null;
  let tarball = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' || arg === '--line' || arg === '--tarball') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(`${arg} requires a value`);
      if (arg === '--out') outDir = resolve(root, value);
      else if (arg === '--line') line = value;
      else tarball = resolve(root, value);
      i += 1;
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }
  if (line !== 'main' && line !== '21.x') fail('--line must be main or 21.x');
  if (!outDir) fail('--out is required');
  if (!tarball) fail('--tarball is required');
  return {outDir, line, tarball};
}

function allowedOut(dir) {
  const resolved = resolve(dir);
  const artifacts = resolve(root, 'artifacts');
  const relArtifacts = relative(artifacts, resolved);
  const underArtifacts =
    relArtifacts !== '' && !relArtifacts.startsWith('..') && !isAbsolute(relArtifacts);
  const relTmp = relative(resolve(tmpdir()), resolved);
  const underTmp = relTmp !== '' && !relTmp.startsWith('..') && !isAbsolute(relTmp);
  return underArtifacts || underTmp;
}

function git(args) {
  const res = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  if (res.status !== 0) {
    console.error(res.stderr || `git ${args.join(' ')} failed`);
    process.exit(1);
  }
  return res.stdout;
}

function toolVersion(cmd) {
  const res = spawnSync(cmd, ['-v'], {cwd: root, encoding: 'utf8'});
  if (res.status !== 0) {
    console.error(res.stderr || `Unable to read ${cmd} version`);
    process.exit(1);
  }
  return (res.stdout || res.stderr).trim().split('\n')[0];
}

function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const {outDir, line, tarball} = parseArgs(process.argv.slice(2));
if (existsSync(join(outDir, 'run.json'))) fail('Refusing to overwrite an existing run manifest');
if (!allowedOut(outDir)) {
  fail('--out must be a subdirectory of artifacts/ or the system temp directory');
}
if (!existsSync(tarball)) fail(`Missing tarball: ${tarball}`);
const tarballRel = relative(outDir, tarball);
if (tarballRel.startsWith('..') || isAbsolute(tarballRel)) {
  fail('The tarball must sit inside the run directory');
}
if (!existsSync(matrixPath)) fail(`Missing check matrix: ${matrixPath}`);

const commit = git(['rev-parse', 'HEAD']).trim();
const gitTree = git(['rev-parse', 'HEAD^{tree}']).trim();
const indexLines = git(['ls-files', '-s'])
  .split('\n')
  .filter(lineText => lineText && !lineText.split('\t')[1]?.startsWith('compatibility/rc/reports/'))
  .sort();
const dirtyDiff = git([
  'diff',
  'HEAD',
  '--',
  '.',
  ':(exclude)compatibility/rc/reports',
]);
const porcelain = git(['status', '--porcelain', '--', '.', ':(exclude)compatibility/rc/reports']);
const clean = porcelain.trim() === '';
const provenance = JSON.parse(readFileSync(join(root, 'compatibility/provenance.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const peers = pkg.devDependencies ?? {};
const chainmanRevision = readFileSync(join(root, 'chainman.lock'), 'utf8').trim();
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
let runId = `draft-${line === '21.x' ? '21x' : 'main'}-${commit.slice(0, 12)}-${stamp}`;
if (process.env.RC_CHECK_ID === 'pack-library') {
  let prepack;
  try { prepack = JSON.parse(process.env.RC_EVIDENCE_BINDING || 'null'); }
  catch { fail('Invalid coordinator prepack binding'); }
  const selected = process.env.RC_RUN_ID;
  if (!selected || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,191}$/.test(selected) ||
      !prepack || prepack.phase !== 'prepack' || prepack.run_id !== selected ||
      prepack.source_commit !== commit || prepack.source_tree !== gitTree || prepack.source_line !== line ||
      !/^[0-9a-f]{64}$/.test(prepack.matrix_sha256 || '') || !process.env.RC_INVOCATION_ID) {
    fail('Coordinator prepack identity does not match this writer/source');
  }
  runId = selected;
}

const artifactStat = statSync(tarball);

const manifest = {
  schema_version: 1,
  template: false,
  run_id: runId,
  stage: 'draft',
  purpose: clean ? 'candidate' : 'iteration',
  created_at: new Date().toISOString(),
  source: {
    repository: 'buu700/ngx-compat-material-legacy',
    line,
    commit,
    git_tree_sha: gitTree,
    content_sha256: sha256Text(`${indexLines.join('\n')}\n${dirtyDiff}`),
    clean,
    candidate_base_commit: commit,
  },
  environment: {
    chainman_revision: chainmanRevision,
    lock_sha256: sha256File(join(root, 'pnpm-lock.yaml')),
    install_policy_sha256: sha256File(join(root, 'toolchain-lock.json')),
    tool_versions: {
      node: toolVersion('node'),
      pnpm: toolVersion('pnpm'),
      npm: toolVersion('npm'),
    },
    mode: process.env.CHAINMAN_MODE || 'unqualified-host',
    platform: `${process.platform}-${process.arch}`,
  },
  oracles: {
    historical: [
      {
        id: 'angular-components',
        tag: provenance.baseline_tag,
        commit: provenance.baseline_full_commit,
      },
    ],
    current_peer: ['@angular/core', '@angular/cdk', '@angular/material'].map(name => ({
      id: name,
      version: peers[name] ?? null,
    })),
  },
  artifacts: [
    {
      id: 'library',
      path: tarballRel,
      bytes: artifactStat.size,
      sha256: sha256File(tarball),
    },
    ...(() => {
      const cliRel = 'migration/dist/ngx-compat-material-legacy-migrate-cli-21.0.0-rc.0.tgz';
      const cliPath = join(root, cliRel);
      if (!existsSync(cliPath)) return [];
      // All artifact paths in run.json are relative to this run, including
      // the separately identified CLI. Do not point at a repository-relative
      // path that becomes missing or ambiguous after CI artifact transport.
      const runCliRel = 'inputs/migrate-cli.tgz';
      const runCliPath = join(outDir, runCliRel);
      mkdirSync(dirname(runCliPath), {recursive: true});
      copyFileSync(cliPath, runCliPath, constants.COPYFILE_EXCL);
      const st = statSync(runCliPath);
      return [{
        id: 'migrate-cli',
        path: runCliRel,
        bytes: st.size,
        sha256: sha256File(runCliPath),
        source_path: cliRel,
        note: 'Committed peer-light CLI copy; its build/source qualification is a separate migration obligation.',
      }];
    })(),
  ],
  expected_matrix: {
    path: 'compatibility/rc/matrices/pack-draft.json',
    sha256: sha256File(matrixPath),
  },
  reports: [],
  summary: {
    automatic_product_result: 'not_run',
    required_review_state: 'pending',
    limitations: [
      'Draft only. The library artifact identity is fixed; run.json is not sealed.',
      'content_sha256 covers the git index excluding compatibility/rc/reports, plus the diff of that same set.',
      'This manifest does not claim G01-G13, historical families, or publication.',
    ],
  },
};

mkdirSync(outDir, {recursive: true});
writeFileSync(join(outDir, 'run.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote draft ${runId} artifact sha256=${manifest.artifacts[0].sha256}`);
