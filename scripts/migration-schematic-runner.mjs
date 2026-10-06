#!/usr/bin/env node
/**
 * Run the migrate-legacy factory from the packed library through SchematicTestRunner.
 *
 *   node scripts/migration-schematic-runner.mjs --tarball <library.tgz>
 */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/migration-schematic.json');
const schematicsDir = readdirSync(join(root, 'node_modules/.pnpm')).find(name =>
  name.startsWith('@angular-devkit+schematics@22.1.8_'),
);
if (!schematicsDir) fail(1, 'Installed @angular-devkit/schematics 22.1.8 was not found');
const schematicsPkg = join(
  root,
  'node_modules/.pnpm',
  schematicsDir,
  'node_modules/@angular-devkit/schematics/package.json',
);
const requireSchematics = createRequire(schematicsPkg);

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = join(root, 'artifacts/main/draft/ngx-compat-material-legacy-22.0.0-rc.0.tgz');
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--tarball') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--tarball requires a path');
    tarball = resolve(value);
    i += 1;
    continue;
  }
  fail(2, `Unknown argument: ${arg}`);
}

const work = mkdtempSync(join(tmpdir(), 'ngx-compat-schematic-'));
const extracted = spawnSync('tar', ['-xzf', tarball, '-C', work], {encoding: 'utf8'});
if (extracted.status !== 0) fail(1, extracted.stderr || 'tar extract failed');
const collection = join(work, 'package/schematics/collection.json');
const schematicPackage = JSON.parse(readFileSync(join(work, 'package/schematics/package.json'), 'utf8'));
if (schematicPackage.type !== 'commonjs') {
  fail(1, 'Packed schematics/package.json must set type commonjs so the factory can load');
}
const {SchematicTestRunner} = requireSchematics('@angular-devkit/schematics/testing');
const {HostTree} = requireSchematics('@angular-devkit/schematics');
const runner = new SchematicTestRunner('packed-library', collection);

const safe = "import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n";
const safeTree = new HostTree();
safeTree.create('/src/app.ts', safe);
const updated = await runner.runSchematic('migrate-legacy', {}, safeTree);
const rewritten = updated.readContent('/src/app.ts');
if (!rewritten.includes("from '@ngx-compat/material-legacy/legacy-button'")) {
  fail(1, `schematic did not rewrite the packed factory output:\n${rewritten}`);
}

const blocked = new HostTree();
blocked.create('/src/ok.ts', safe);
blocked.create('/src/bad.ts', "import {X} from '@angular/material/legacy-select/private';\n");
let blockedError = '';
try {
  await runner.runSchematic('migrate-legacy', {}, blocked);
  fail(1, 'blocked schematic resolved instead of throwing');
} catch (error) {
  blockedError = String(error && error.message ? error.message : error);
}
if (!blockedError.includes('wrote nothing')) fail(1, `unexpected blocked error: ${blockedError}`);
if (blocked.read('/src/ok.ts').toString() !== safe || !blocked.read('/src/bad.ts').toString().includes('legacy-select/private')) {
  fail(1, 'blocked schematic changed an input file');
}

const report = {
  schema_version: 1,
  role: 'packaged schematic factory',
  captured_at: new Date().toISOString(),
  collection: 'package/schematics/collection.json',
  factory: './migrate-legacy/index#migrateLegacy',
  runner: 'SchematicTestRunner',
  safe_rewritten: true,
  blocked_error: blockedError.split('\n')[0],
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  limitations: [
    'The library tarball is a local pack and is not a sealed release artifact.',
    'Does not rehearse a Material 16 workspace upgrade.',
    'This is not RC-04-A04.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ok: true, blocked: report.blocked_error}, null, 2));
