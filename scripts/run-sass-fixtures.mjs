#!/usr/bin/env node
/** Compile fixture inputs with a locally installed, pinned Dart Sass.
 * No package installation or network access. Never overwrites a reference directory.
 * Physical load-path compilation does not validate Angular CLI/package export resolution.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/run-sass-fixtures.mjs --environment DIR --module @angular/material|@ngx-compat/material-legacy --output NEW_DIR [--fixtures DIR] [--include-bridge]');
  process.exit(0);
}
const options = {};
for (let i = 0; i < args.length; i++) {
  const key = args[i];
  if (key === '--include-bridge') { options[key] = true; continue; }
  if (!['--environment','--module','--output','--fixtures'].includes(key) || !args[i+1] || args[i+1].startsWith('--')) {
    throw new Error(`Unknown/missing argument: ${key}`);
  }
  options[key] = args[++i];
}
for (const key of ['--environment','--module','--output']) {
  if (!options[key]) throw new Error(`Required argument missing: ${key}`);
}
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const env = path.resolve(options['--environment']);
const output = path.resolve(options['--output']);
const fixtureDir = path.resolve(options['--fixtures'] || path.join(root,'fixtures/sass'));
const targetModule = options['--module'];
if (!['@angular/material','@ngx-compat/material-legacy'].includes(targetModule)) throw new Error('Unexpected module target.');
if (fs.existsSync(output)) throw new Error('Output directory must be new; reference evidence is never overwritten.');
if (!fs.existsSync(path.join(env,'package.json'))) throw new Error('Environment must contain a package.json and installed pinned dependencies.');
const requireFromEnv = createRequire(pathToFileURL(path.join(env,'package.json')));
const sass = requireFromEnv('sass');
if (!sass.compileString || !sass.info) throw new Error('The environment must provide Dart Sass JS API.');
const manifest = JSON.parse(fs.readFileSync(path.join(fixtureDir,'manifest.json'),'utf8'));
const selected = manifest.cases.filter(c => c.comparison === 'strict' || options['--include-bridge']);
if (!selected.length) throw new Error('No fixtures selected.');
const reports = []; const hashes = {}; let failures = 0;
fs.mkdirSync(output, {recursive: true});
for (const c of selected) {
  if (path.basename(c.file) !== c.file || !c.file.endsWith('.scss')) throw new Error('Fixture filenames must be local SCSS files.');
  const sourceFile = path.join(fixtureDir,c.file);
  const source = fs.readFileSync(sourceFile,'utf8');
  const oldLiteral = "'@angular/material'";
  if (source.split(oldLiteral).length !== 2) throw new Error(`Expected exactly one historical module URL in ${c.file}`);
  const transformed = source.replace(oldLiteral, `'${targetModule}'`);
  const warningMessages = [];
  const record = {id:c.id, comparison:c.comparison, fixture_sha256:hash(source), module:targetModule};
  hashes[c.id+'.css'] = record.fixture_sha256;
  try {
    const result = sass.compileString(transformed, {
      url:pathToFileURL(sourceFile), loadPaths:[path.join(env,'node_modules')], style:'expanded',
      sourceMap:false, charset:false,
      logger:{warn(message, info) { warningMessages.push({message,deprecation:!!info?.deprecation}); }, debug(message) { warningMessages.push({debug:message}); }}
    });
    fs.writeFileSync(path.join(output,c.id+'.css'), result.css);
    Object.assign(record,{status:'compiled',css_sha256:hash(result.css),warnings:warningMessages});
  } catch (error) {
    failures++;
    Object.assign(record,{status:'compile-failed',error:String(error),warnings:warningMessages});
  }
  reports.push(record);
}
const installed = {};
for (const pkg of ['@angular/material','@angular/cdk','@ngx-compat/material-legacy','sass']) {
  const p = path.join(env,'node_modules',...pkg.split('/'),'package.json');
  if (fs.existsSync(p)) { const bytes=fs.readFileSync(p); const m=JSON.parse(bytes); installed[pkg]={version:m.version,manifest_sha256:hash(bytes)}; }
}
const lockfiles = {};
for (const f of ['package-lock.json','pnpm-lock.yaml','yarn.lock']) if(fs.existsSync(path.join(env,f))) lockfiles[f]=hash(fs.readFileSync(path.join(env,f)));
const report = {node:process.version, sass:sass.info, environment:env, installed, lockfile_sha256:lockfiles, failures, fixtures:reports,
  limits:'Compilation only, not CSS parity, package-exports resolution, runtime behavior, or security verification. Preserve source SHA and registry integrity separately.'};
fs.writeFileSync(path.join(output,'compile-report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(output,'fixture-hashes.json'),JSON.stringify(hashes,null,2)+'\n');
console.log(JSON.stringify({output,fixtures:reports.length,failures},null,2));
process.exitCode = failures ? 1 : 0;
