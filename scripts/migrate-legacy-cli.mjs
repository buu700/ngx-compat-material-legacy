#!/usr/bin/env node
/**
 * Peer-light pre-upgrade CLI for migrate-legacy Sass/TS rewrites.
 *
 * Shares the same transformation modules as the Angular schematic
 * (`projects/ngx-material-legacy/schematics/migrate-legacy/{sass,ts}-rewrite.js`).
 * No @angular/* runtime peers are required to run this CLI.
 *
 * Default mode is dry-run (report only). Pass --apply to write edits.
 * Companion/aggregate/current-component cases require explicit acknowledgement
 * flags (same semantics as the schematic options).
 *
 * Usage:
 *   node scripts/migrate-legacy-cli.mjs <path> [--apply] [--json]
 *     [--acknowledge-companion-bridges]
 *     [--acknowledge-aggregates]
 *     [--acknowledge-current-components]
 *   node scripts/migrate-legacy-cli.mjs --help
 *
 * Exit codes:
 *   0  completed; safe edits reported (and applied if --apply); no blocking diagnostics
 *   1  blocking diagnostics and/or I/O errors (no partial apply for a file that blocks)
 *   2  usage / invalid arguments
 */

import {createRequire} from 'node:module';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const engineDir = join(
  root,
  'projects/ngx-material-legacy/schematics/migrate-legacy',
);

const {rewriteSassModuleSource} = require(join(engineDir, 'sass-rewrite.js'));
const {rewriteLegacyTypescriptImports} = require(join(engineDir, 'ts-rewrite.js'));

const SCSS_RE = /\.(scss|sass)$/i;
const TS_RE = /\.tsx?$/i;
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.angular',
  'coverage',
  '.yarn',
  '.pnpm-store',
]);

function printHelp() {
  console.log(`migrate-legacy-cli — peer-light pre-upgrade rewriter

Shares the migrate-legacy Sass/TS transformation engine with the Angular
schematic. Does not load the target workspace's Angular runtime.

Usage:
  node scripts/migrate-legacy-cli.mjs <path> [--apply] [--json]
    [--acknowledge-companion-bridges]
    [--acknowledge-aggregates]
    [--acknowledge-current-components]
  node scripts/migrate-legacy-cli.mjs --help

Options:
  <path>     File or directory to scan (scss/sass/ts/tsx).
  --apply    Write safe edits. Default is dry-run (report only).
  --json     Emit a machine-readable summary on stdout.
  --acknowledge-companion-bridges
             Allow safe @use rewrite when ordinary-current companions
             (e.g. expansion-theme) are present; records acknowledgement.
  --acknowledge-aggregates
             Allow safe @use rewrite when all-legacy-component-themes is
             present; does not substitute owned-only aggregates.
  --acknowledge-current-components
             Record acknowledgement of ordinary (non-legacy) Material
             imports for readiness; does not rewrite those imports.
  --help     Show this help.

Exit codes:
  0  ok (safe edits only / nothing to do; acknowledgements satisfied)
  1  blocking diagnostics, unacknowledged risks, or errors
  2  bad usage

See migration/README.md for schematic vs CLI distribution notes.
`);
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, {withFileTypes: true});
  } catch (err) {
    throw new Error(`Cannot read directory ${dir}: ${err.message}`);
  }
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(full, out);
    } else if (ent.isFile()) {
      if (SCSS_RE.test(ent.name) || TS_RE.test(ent.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function collectFiles(target) {
  const st = statSync(target);
  if (st.isFile()) {
    if (!(SCSS_RE.test(target) || TS_RE.test(target))) {
      throw new Error(`Not a .scss/.sass/.ts/.tsx file: ${target}`);
    }
    return [target];
  }
  if (st.isDirectory()) {
    return walk(target);
  }
  throw new Error(`Not a file or directory: ${target}`);
}

function processFile(absPath, apply, rewriteOptions) {
  const content = readFileSync(absPath, 'utf8');
  const kind = SCSS_RE.test(absPath) ? 'scss' : 'ts';
  const result =
    kind === 'scss'
      ? rewriteSassModuleSource(content, rewriteOptions)
      : rewriteLegacyTypescriptImports(content, rewriteOptions);

  const record = {
    path: absPath,
    kind,
    ok: result.ok,
    changed: Boolean(result.changed),
    diagnostics: result.diagnostics || [],
    acknowledgements: result.acknowledgements || [],
    applied: false,
  };

  if (result.ok && result.changed && result.content != null) {
    if (apply) {
      writeFileSync(absPath, result.content, 'utf8');
      record.applied = true;
    }
  }

  return record;
}

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printHelp();
    process.exit(args.length === 0 ? 2 : 0);
  }

  const apply = args.includes('--apply');
  const asJson = args.includes('--json');
  const rewriteOptions = {
    acknowledgeCompanionBridges: args.includes('--acknowledge-companion-bridges'),
    acknowledgeAggregates: args.includes('--acknowledge-aggregates'),
    acknowledgeCurrentComponents: args.includes('--acknowledge-current-components'),
  };
  const positional = args.filter((a) => !a.startsWith('--'));
  if (positional.length !== 1) {
    console.error('Expected exactly one <path> argument.');
    printHelp();
    process.exit(2);
  }

  const target = resolve(positional[0]);
  if (!existsSync(target)) {
    console.error(`Path does not exist: ${target}`);
    process.exit(2);
  }

  let files;
  try {
    files = collectFiles(target);
  } catch (err) {
    console.error(String(err.message || err));
    process.exit(1);
  }

  const records = [];
  let blocking = 0;
  let safeEdits = 0;
  let applied = 0;
  /** @type {string[]} */
  const allAcks = [];

  for (const file of files) {
    let record;
    try {
      record = processFile(file, apply, rewriteOptions);
    } catch (err) {
      record = {
        path: file,
        kind: SCSS_RE.test(file) ? 'scss' : 'ts',
        ok: false,
        changed: false,
        diagnostics: [`io-error: ${err.message || err}`],
        acknowledgements: [],
        applied: false,
      };
    }
    records.push(record);
    if (!record.ok) {
      blocking += 1;
    }
    if (record.changed && record.ok) {
      safeEdits += 1;
    }
    if (record.applied) {
      applied += 1;
    }
    for (const a of record.acknowledgements || []) {
      if (!allAcks.includes(a)) allAcks.push(a);
    }
  }

  const summary = {
    target,
    mode: apply ? 'apply' : 'dry-run',
    files_scanned: files.length,
    safe_edits: safeEdits,
    applied,
    blocking,
    acknowledgements: allAcks,
    options: rewriteOptions,
    engine: {
      sass: 'projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js',
      ts: 'projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js',
      note: 'Same modules as ng generate @ngx-compat/material-legacy:migrate-legacy',
    },
    records: records
      .filter((r) => r.changed || !r.ok || r.diagnostics.length)
      .map((r) => ({
        path: relative(process.cwd(), r.path) || r.path,
        kind: r.kind,
        ok: r.ok,
        changed: r.changed,
        applied: r.applied,
        diagnostics: r.diagnostics,
        acknowledgements: r.acknowledgements,
      })),
  };

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(
      `migrate-legacy-cli (${summary.mode}): scanned ${summary.files_scanned} file(s); ` +
        `safe edits ${safeEdits}${apply ? ` (applied ${applied})` : ' (dry-run)'}; ` +
        `blocking ${blocking}` +
        (allAcks.length ? `; acknowledgements ${allAcks.join(',')}` : ''),
    );
    for (const r of summary.records) {
      const tag = !r.ok ? 'BLOCK' : r.changed ? (r.applied ? 'APPLY' : 'WOULD') : 'NOTE';
      console.log(`  ${tag}  ${r.path}`);
      for (const d of r.diagnostics) {
        console.log(`         ${d}`);
      }
    }
    if (!apply && safeEdits) {
      console.log('\nRe-run with --apply to write safe edits.');
    }
  }

  process.exit(blocking ? 1 : 0);
}

main(process.argv);
