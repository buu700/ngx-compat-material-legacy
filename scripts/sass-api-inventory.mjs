#!/usr/bin/env node
/**
 * Sass API inventory of a module: exported variables (with inspected values),
 * functions and mixins (with declaration file and parsed signature), and the
 * ordered membership of all-* aggregate mixins.
 *
 * Members come from the compiler (meta.module-variables / -functions /
 * -mixins), not from a hand list. Declarations come from the compiler's own
 * "declaration" span on a deliberately invalid probe call, so forwards,
 * prefixes and show/hide lists are resolved by Sass itself.
 *
 *   node scripts/sass-api-inventory.mjs --reference <node_modules> --out <json>
 *
 * The --reference mode generates the frozen Material 16.2.14 oracle from the
 * authentic isolated reference environment (reference/material-16.2.14/
 * environment-package*.json). sass-seal.mjs imports the same functions for the
 * packed candidate.
 */
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, relative, resolve, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SILENCE = ['import', 'if-function', 'global-builtin', 'color-functions', 'mixed-decls', 'slash-div'];
const QUIET = {warn() {}, debug() {}};

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

/** Split a Sass list/arg string at top-level commas. */
export function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.map(part => part.trim()).filter(Boolean);
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

/** Parse a parameter list: [{name, default}] plus rest. Defaults are whitespace-normalized source text. */
export function parseParams(paramText) {
  const params = [];
  let rest = null;
  for (const raw of splitTopLevel(stripComments(paramText))) {
    const item = raw.replace(/\s+/g, ' ').trim();
    const restMatch = item.match(/^\$([\w-]+)\.\.\.$/);
    if (restMatch) { rest = restMatch[1].replace(/_/g, '-'); continue; }
    const match = item.match(/^\$([\w-]+)\s*(?::\s*([\s\S]+))?$/);
    if (!match) throw new Error(`unparsed parameter: ${item}`);
    params.push({name: match[1].replace(/_/g, '-'), default: match[2] === undefined ? null : match[2].trim()});
  }
  return {params, rest};
}

/** Text of the declaration (params and body) of `@mixin|@function name` starting near line. */
export function declarationAt(text, kind, name, line) {
  const lines = text.split('\n');
  const start = lines.slice(0, Math.max(0, line - 1)).join('\n').length;
  const re = new RegExp(`@${kind}\\s+${name.replace(/[-_]/g, '[-_]')}\\s*(\\(|\\{)`, 'g');
  re.lastIndex = Math.max(0, start - 1);
  const match = re.exec(text);
  if (!match) return null;
  let i = match.index + match[0].length - 1;
  let paramText = '';
  if (text[i] === '(') {
    let depth = 0;
    const open = i;
    for (; i < text.length; i += 1) {
      if (text[i] === '(') depth += 1;
      else if (text[i] === ')') { depth -= 1; if (depth === 0) break; }
    }
    paramText = text.slice(open + 1, i);
    i = text.indexOf('{', i);
  }
  let depth = 0;
  const bodyStart = i;
  for (; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') { depth -= 1; if (depth === 0) break; }
  }
  return {paramText, body: text.slice(bodyStart + 1, i)};
}

function loadSass(sassModule) {
  return sassModule || createRequire(join(root, 'package.json'))('sass');
}

/** Exported member names of a module, from the compiler. */
export function enumerateModule(sass, moduleUrl, loadPaths, importers = []) {
  const out = {};
  const source = `@use 'sass:meta'; @use 'sass:map'; @use '${moduleUrl}' as m;
@debug "VARS" meta.inspect(map.keys(meta.module-variables(m)));
@debug "FUNCS" meta.inspect(map.keys(meta.module-functions(m)));
@debug "MIXINS" meta.inspect(map.keys(meta.module-mixins(m)));`;
  sass.compileString(source, {
    loadPaths, importers, silenceDeprecations: SILENCE,
    logger: {warn() {}, debug(message) {
      const [key, ...restParts] = message.split(' ');
      const list = restParts.join(' ').replace(/^\(|\)$/g, '');
      out[key.replace(/"/g, '')] = list ? list.split(', ').map(item => item.replace(/^"|"$/g, '')) : [];
    }},
  });
  return {variables: out.VARS.sort(), functions: out.FUNCS.sort(), mixins: out.MIXINS.sort()};
}

/** Inspected value of every exported variable. */
export function variableValues(sass, moduleUrl, loadPaths, names, importers = []) {
  const values = {};
  const body = names.map(name => `@debug "${name}=" + meta.inspect(m.$${name});`).join('\n');
  sass.compileString(`@use 'sass:meta'; @use '${moduleUrl}' as m;\n${body}`, {
    loadPaths, importers, silenceDeprecations: SILENCE,
    logger: {warn() {}, debug(message) {
      const at = message.indexOf('=');
      values[message.slice(0, at)] = message.slice(at + 1);
    }},
  });
  return values;
}

const DECLARATION = /┌──> ([^\n]+)\n\s*(\d+)\s*│[^\n]*\n[\s\S]*?declaration/;

/** Declaration file/line of an exported member, from the compiler's own error span. */
export function locateMember(sass, moduleUrl, loadPaths, kind, name, importers = []) {
  const call = kind === 'mixin'
    ? `@include m.${name}($__inventory-probe__: null);`
    : `a { b: meta.inspect(m.${name}($__inventory-probe__: null)); }`;
  try {
    sass.compileString(`@use 'sass:meta'; @use '${moduleUrl}' as m;\n${call}`, {
      loadPaths, importers, silenceDeprecations: SILENCE, logger: QUIET,
    });
  } catch (error) {
    const match = String(error.message).match(DECLARATION);
    if (match) return {file: match[1].trim(), line: Number(match[2]), probe_error: error.sassMessage};
    return {file: null, line: null, probe_error: error.sassMessage ?? String(error.message).split('\n')[0]};
  }
  return {file: null, line: null, probe_error: null};
}

function resolveFile(file, loadPaths) {
  if (isAbsolute(file) && existsSync(file)) return file;
  for (const base of [process.cwd(), ...loadPaths, ...loadPaths.map(dirname)]) {
    const candidate = resolve(base, file);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Strip a package root and the leading underscore / extension for a stable path id. */
export function packagePathId(absolute, packageRoot) {
  const rel = relative(packageRoot, absolute).split('\\').join('/');
  return rel.replace(/(^|\/)_([^/]+)$/, '$1$2').replace(/\.scss$/, '');
}

/** Ordered @include targets of an aggregate body, as `<used module path id>#<mixin>`. */
export function aggregateMembers(body, fileText) {
  const uses = new Map();
  for (const match of stripComments(fileText).matchAll(/@use\s+['"]([^'"]+)['"](?:\s+as\s+([\w-]+))?/g)) {
    const path = match[1];
    const ns = match[2] || path.split('/').pop().replace(/^_/, '').replace(/\.scss$/, '');
    uses.set(ns, path);
  }
  const members = [];
  for (const match of stripComments(body).matchAll(/@include\s+(?:([\w-]+)\.)?([\w-]+)/g)) {
    const [, ns, mixin] = match;
    const path = ns ? uses.get(ns) ?? `?${ns}` : '.';
    members.push(`${path.split('/').slice(-2).join('/').replace(/(^|\/)_/, '$1')}#${mixin}`);
  }
  return members;
}

/** Full inventory of a module. */
export function inventoryModule({sass: sassModule, moduleUrl, loadPaths, packageRoot, importers = []}) {
  const sass = loadSass(sassModule);
  const names = enumerateModule(sass, moduleUrl, loadPaths, importers);
  const values = variableValues(sass, moduleUrl, loadPaths, names.variables, importers);
  const members = {variables: {}, functions: {}, mixins: {}};
  for (const name of names.variables) members.variables[name] = {value: values[name] ?? null};
  for (const [kind, key] of [['function', 'functions'], ['mixin', 'mixins']]) {
    for (const name of names[key]) {
      const located = locateMember(sass, moduleUrl, loadPaths, kind, name, importers);
      const entry = {file: null, params: null, rest: null, probe_error: located.probe_error};
      const file = located.file ? resolveFile(located.file, loadPaths) : null;
      if (file) {
        const text = readFileSync(file, 'utf8');
        const base = name.replace(/^.*?([\w-]+)$/, '$1');
        let declaration = null;
        // A prefixed forward exposes `prefix-base`; try the longest suffix that is declared at that line.
        const parts = base.split('-');
        for (let i = 0; i < parts.length && !declaration; i += 1) {
          declaration = declarationAt(text, kind, parts.slice(i).join('-'), located.line);
        }
        if (declaration) {
          const parsed = parseParams(declaration.paramText);
          entry.file = packagePathId(file, packageRoot);
          entry.line = located.line;
          entry.params = parsed.params;
          entry.rest = parsed.rest;
          entry.content = /@content\b/.test(stripComments(declaration.body));
          if (kind === 'mixin' && /^all-/.test(name)) entry.aggregate = aggregateMembers(declaration.body, text);
        }
      }
      members[key][name] = entry;
    }
  }
  return members;
}

function main(argv) {
  let reference = null;
  let out = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--reference') reference = resolve(argv[++i]);
    else if (argv[i] === '--out') out = resolve(argv[++i]);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!reference || !out) throw new Error('--reference <node_modules> and --out <json> are required');
  const sass = createRequire(join(reference, 'sass', 'package.json'))('sass');
  const materialRoot = join(reference, '@angular/material');
  const pkg = JSON.parse(readFileSync(join(materialRoot, 'package.json'), 'utf8'));
  if (pkg.version !== '16.2.14') throw new Error(`reference @angular/material is ${pkg.version}, not 16.2.14`);
  const lockPath = join(root, 'reference/material-16.2.14/environment-package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const members = inventoryModule({sass, moduleUrl: '@angular/material', loadPaths: [reference], packageRoot: materialRoot});
  for (const [name, entry] of Object.entries(members.mixins)) {
    const plan = invocationPlan(name, entry);
    entry.invocation = {invocable: plan.invocable, reason: plan.reason};
    if (plan.argument_source) entry.invocation.argument_source = plan.argument_source;
    if (!plan.invocable) continue;
    const compiled = compileInvocation(sass, '@angular/material', [reference], plan.call);
    if (compiled.error) throw new Error(`reference invocation of ${name} failed: ${compiled.error}`);
    entry.invocation.css_sha256 = sha256(compiled.css);
    entry.invocation.css_bytes = Buffer.byteLength(compiled.css);
  }
  const report = {
    schema_version: 1,
    role: 'authentic @angular/material 16.2.14 Sass API inventory',
    provenance: {
      package: '@angular/material',
      version: pkg.version,
      lock_path: 'reference/material-16.2.14/environment-package-lock.json',
      lock_sha256: sha256(readFileSync(lockPath)),
      material_integrity: lock.packages['node_modules/@angular/material']?.integrity ?? null,
      cdk_integrity: lock.packages['node_modules/@angular/cdk']?.integrity ?? null,
      index_sha256: sha256(readFileSync(join(materialRoot, '_index.scss'))),
      sass_version: JSON.parse(readFileSync(join(reference, 'sass/package.json'), 'utf8')).version,
      generator: 'scripts/sass-api-inventory.mjs --reference',
      argument_cases_sha256: existsSync(ARGUMENT_CASES_PATH) ? sha256(readFileSync(ARGUMENT_CASES_PATH)) : null,
    },
    counts: Object.fromEntries(Object.entries(members).map(([key, value]) => [key, Object.keys(value).length])),
    standard_theme: standardThemeSource(),
    members,
  };
  writeFileSync(out, `${JSON.stringify(report, null, 1)}\n`);
  console.log(JSON.stringify(report.counts));
}


/** Required parameters that the predeclared standard theme satisfies. Nothing else is guessed. */
export const THEME_PARAMS = Object.freeze([
  'config-or-theme',
  'theme-or-color-config',
  'config-or-theme-or-color',
  'theme-or-color-config-or-color',
]);

/** The one predeclared theme every invocable mixin receives, built by the module's own constructors. */
export function standardThemeSource() {
  return `$__theme: m.define-light-theme((
  color: (
    primary: m.define-palette(m.$indigo-palette),
    accent: m.define-palette(m.$pink-palette, A200, A100, A400),
    warn: m.define-palette(m.$red-palette),
  ),
  typography: m.define-typography-config(),
  density: 0,
));`;
}

export const ARGUMENT_CASES_PATH = join(root, 'compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json');
let argumentCasesCache = null;

/** Authentic 16.2.14 argument cases, transcribed from cited callers, docs and tests. */
export function argumentCases() {
  if (argumentCasesCache === null) {
    argumentCasesCache = existsSync(ARGUMENT_CASES_PATH)
      ? JSON.parse(readFileSync(ARGUMENT_CASES_PATH, 'utf8')).mixins || {}
      : {};
  }
  return argumentCasesCache;
}

/** Invocation plan for a mixin entry: {invocable, reason, call, argument_source}. */
export function invocationPlan(name, entry, cases = argumentCases()) {
  if (!entry || !Array.isArray(entry.params)) return {invocable: false, reason: 'signature unknown', call: null};
  const required = entry.params.filter(param => param.default === null).map(param => param.name);
  const unknown = required.filter(param => !THEME_PARAMS.includes(param));
  if (unknown.length) {
    const authentic = Object.prototype.hasOwnProperty.call(cases, name) ? cases[name] : null;
    if (authentic && typeof authentic.call === 'string' && Array.isArray(authentic.sources) && authentic.sources.length) {
      // Top level exactly as the cited caller wrote it; identical on both sides.
      return {invocable: true, reason: null, call: authentic.call, argument_source: authentic.sources};
    }
    return {invocable: false, reason: `required parameters without a predeclared argument: ${unknown.map(p => `$${p}`).join(', ')}`, call: null};
  }
  const args = required.map(() => '$__theme').join(', ');
  // Every invocation sits in the same probe rule so declaration-only mixins compile;
  // both sides receive the identical wrapper.
  return {invocable: true, reason: null, call: `.sass-api-probe { @include m.${name}(${args}); }`};
}

/** Compile one planned invocation; returns {css, error, loaded}. */
export function compileInvocation(sass, moduleUrl, loadPaths, call, {importers = []} = {}) {
  const source = `@use '${moduleUrl}' as m;\n${standardThemeSource()}\n${call}\n`;
  try {
    const result = sass.compileString(source, {
      loadPaths, importers, style: 'expanded', silenceDeprecations: SILENCE, logger: QUIET,
    });
    return {css: result.css, error: null, loaded: result.loadedUrls.map(url => url.href)};
  } catch (error) {
    return {css: null, error: error.sassMessage ?? String(error.message).split('\n')[0], loaded: []};
  }
}

/** Predeclared sass-api-and-values case ids, derived only from the authentic oracle. */
export function apiCaseIds(oracle) {
  const members = oracle.members;
  const ids = [];
  for (const name of Object.keys(members.variables).sort()) ids.push(`variable/${name}`);
  for (const name of Object.keys(members.functions).sort()) ids.push(`function/${name}`);
  for (const name of Object.keys(members.mixins).sort()) ids.push(`mixin/${name}`);
  for (const name of Object.keys(members.mixins).sort()) ids.push(`mixin-css/${name}`);
  for (const name of Object.keys(members.mixins).sort()) {
    if (Array.isArray(members.mixins[name].aggregate)) ids.push(`aggregate/${name}`);
  }
  return ids;
}

function sameSignature(expected, actual) {
  if (!actual || !Array.isArray(actual.params)) return 'candidate signature unknown';
  if (JSON.stringify(expected.params) !== JSON.stringify(actual.params)) {
    return `parameters differ: expected (${expected.params.map(fmtParam).join(', ')}) got (${actual.params.map(fmtParam).join(', ')})`;
  }
  if ((expected.rest ?? null) !== (actual.rest ?? null)) return `rest parameter differs: ${expected.rest} vs ${actual.rest}`;
  if (expected.content !== undefined && Boolean(expected.content) !== Boolean(actual.content)) {
    return `@content acceptance differs: ${expected.content} vs ${actual.content}`;
  }
  return null;
}

function fmtParam(param) {
  return param.default === null ? `$${param.name}` : `$${param.name}: ${param.default}`;
}

/**
 * Pure comparison of a candidate inventory (and its invocation CSS digests)
 * against the oracle. One result per predeclared case id; nothing is dropped.
 */
export function compareInventory(oracle, candidate, candidateCss) {
  const results = [];
  const push = (case_id, failure, extra = {}) => results.push({case_id, result: failure ? 'fail' : 'pass', reason: failure, ...extra});
  const om = oracle.members;
  const cm = candidate || {variables: {}, functions: {}, mixins: {}};
  for (const name of Object.keys(om.variables).sort()) {
    const expected = om.variables[name].value;
    const actual = cm.variables?.[name]?.value;
    push(`variable/${name}`, actual === undefined ? 'missing from candidate'
      : actual !== expected ? 'value differs' : null, {expected, actual: actual ?? null});
  }
  for (const [kind, key] of [['function', 'functions'], ['mixin', 'mixins']]) {
    for (const name of Object.keys(om[key]).sort()) {
      const actual = cm[key]?.[name];
      push(`${kind}/${name}`, actual ? sameSignature(om[key][name], actual) : 'missing from candidate', {
        expected_params: om[key][name].params, actual_params: actual?.params ?? null,
      });
    }
  }
  for (const name of Object.keys(om.mixins).sort()) {
    const invocation = om.mixins[name].invocation || {};
    if (!invocation.invocable) {
      push(`mixin-css/${name}`, `not invoked: ${invocation.reason}`, {invocable: false});
      continue;
    }
    const got = candidateCss?.[name];
    const failure = !got ? 'candidate invocation missing'
      : got.error ? `candidate invocation failed: ${got.error}`
        : got.sha256 !== invocation.css_sha256 ? 'compiled CSS differs' : null;
    push(`mixin-css/${name}`, failure, {
      invocable: true, expected_sha256: invocation.css_sha256, expected_bytes: invocation.css_bytes,
      actual_sha256: got?.sha256 ?? null, actual_bytes: got?.css === undefined ? null : Buffer.byteLength(got.css),
    });
  }
  for (const name of Object.keys(om.mixins).sort()) {
    const expected = om.mixins[name].aggregate;
    if (!Array.isArray(expected)) continue;
    const actual = cm.mixins?.[name]?.aggregate ?? null;
    push(`aggregate/${name}`, !Array.isArray(actual) ? 'candidate aggregate membership unknown'
      : JSON.stringify(actual) !== JSON.stringify(expected) ? 'membership or order differs' : null, {expected, actual});
  }
  return results;
}

/**
 * Mark a failing case as pending only when a recorded pending decision names
 * that case with the exact expected and candidate sha256. Pending never passes.
 */
export function classifyPending(results, decisions) {
  const index = new Map();
  for (const decision of decisions?.decisions || []) {
    if (decision?.state !== 'pending') continue;
    for (const item of decision.cases || []) index.set(item.case_id, {decision: decision.id, item});
  }
  return results.map(result => {
    if (result.result === 'pass') return result;
    const hit = index.get(result.case_id);
    if (!hit) return {...result, status: 'unexplained-failure'};
    const {item} = hit;
    const exact = item.expected_sha256 === undefined
      ? result.invocable === false && typeof item.reason === 'string' && result.reason === `not invoked: ${item.reason}`
      : item.expected_sha256 === result.expected_sha256 && item.candidate_sha256 === result.actual_sha256;
    return exact
      ? {...result, status: 'pending-decision', decision: hit.decision}
      : {...result, status: 'unexplained-failure', stale_decision: hit.decision};
  });
}

/**
 * API negative: wrong-but-nonempty mutations of a candidate inventory must
 * fail exactly their own cases. Returns {detected, expected, failed}.
 */
export function apiDriftNegative(oracle, candidate, candidateCss) {
  const copy = JSON.parse(JSON.stringify(candidate));
  const css = JSON.parse(JSON.stringify(candidateCss || {}));
  const mutated = [];
  const variable = Object.keys(oracle.members.variables).sort()[0];
  if (copy.variables[variable]) { copy.variables[variable].value = `${copy.variables[variable].value} `; mutated.push(`variable/${variable}`); }
  const fn = Object.keys(oracle.members.functions).sort().find(name => oracle.members.functions[name].params?.some(p => p.default !== null));
  if (fn && copy.functions[fn]?.params) {
    const param = copy.functions[fn].params.find(p => p.default !== null);
    param.default = `${param.default}-drift`;
    mutated.push(`function/${fn}`);
  }
  const removed = Object.keys(oracle.members.mixins).sort().find(name => !/^all-/.test(name));
  delete copy.mixins[removed];
  mutated.push(`mixin/${removed}`);
  const cssName = Object.keys(oracle.members.mixins).sort().find(name => oracle.members.mixins[name].invocation?.invocable && css[name]?.sha256);
  if (cssName) { css[cssName] = {...css[cssName], sha256: '0'.repeat(64)}; mutated.push(`mixin-css/${cssName}`); }
  const baseline = new Set(compareInventory(oracle, candidate, candidateCss).filter(r => r.result === 'fail').map(r => r.case_id));
  const after = new Set(compareInventory(oracle, copy, css).filter(r => r.result === 'fail').map(r => r.case_id));
  const newly = [...after].filter(id => !baseline.has(id)).sort();
  const expectedNew = mutated.filter(id => !baseline.has(id)).sort();
  return {detected: expectedNew.length > 0 && JSON.stringify(newly) === JSON.stringify(expectedNew), mutated, newly_failed: newly};
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) main(process.argv.slice(2));

/** Complete finite Sass results; a digest-matched pending decision is a failure. */
export function sassResultsComplete(results,expectedIds) {
  if (!Array.isArray(results) || !Array.isArray(expectedIds) || !expectedIds.length || results.length !== expectedIds.length) return false;
  const expected = new Set(expectedIds), seen = new Set();
  if (expected.size !== expectedIds.length) return false;
  return results.every(item => {
    if (!item || item.result !== 'pass' || ['pending-decision','unexplained-failure'].includes(item.status) || !expected.has(item.case_id) || seen.has(item.case_id)) return false;
    seen.add(item.case_id);return true;
  });
}
