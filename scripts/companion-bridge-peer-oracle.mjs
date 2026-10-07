/**
 * In-run current-peer M2 oracle for the thirteen companion bridges.
 *
 * The expected value of every rostered bridge token is whatever the installed
 * @angular/material peer emits for the same M2 theme through its own public
 * `mat.m2-define-*` theme constructors and `mat.<companion>-theme` mixins.
 * Historical v16 output is deliberately NOT used as the oracle here.
 *
 * Checker-only: the product bridges never call the peer's m2 Sass; this module
 * compiles the peer only to obtain the expected values and compares them with
 * the compiled candidate bridge CSS in the same run.
 */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const COMPANIONS = [
  'badge', 'bottom-sheet', 'button-toggle', 'datepicker', 'divider', 'expansion',
  'grid-list', 'icon', 'sidenav', 'stepper', 'sort', 'toolbar', 'tree',
];

export const PEER_PACKAGE = '@angular/material';

const SILENCE = ['if-function', 'global-builtin', 'color-functions', 'import'];

/**
 * Theme scenarios. `contract` mirrors the RC plan theme (m2 indigo / pink
 * A200,A100,A400 / red, legacy typography, density 0). `alternate` proves that
 * a different palette, theme type, typography and density keep the meaning.
 */
export const SCENARIOS = [
  {
    id: 'contract',
    type: 'light',
    primary: ['indigo'],
    accent: ['pink', 'A200', 'A100', 'A400'],
    warn: ['red'],
    typography: 'legacy',
    density: '0',
  },
  {
    id: 'alternate',
    type: 'dark',
    primary: ['deep-purple'],
    accent: ['amber', 'A200', 'A100', 'A400'],
    warn: ['orange'],
    typography: '2018',
    density: '-2',
  },
  // Same non-default hues and complete typography overrides as the immutable
  // Material16 configurable-mixin probes, through independent peer constructors.
  ...['2018', 'legacy'].flatMap(typography => ['light', 'dark'].map(type => ({
    id: `closeout-custom-${typography}-${type}`,
    type,
    primary: ['indigo', '700', '200', '900', '300'],
    accent: ['pink', 'A200', 'A100', 'A400'],
    warn: ['red', '900'],
    typography,
    fontFamily: typography === 'legacy' ? 'Legacy Family' : 'Custom Family',
    customTypography: true,
    density: '-2',
  }))),
];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function parseAllowedLists(source) {
  const out = {};
  const re = /\$([a-z0-9-]+)-allowed:\s*\((.*?)\);/gs;
  let match;
  while ((match = re.exec(source))) {
    out[match[1]] = match[2].split(',').map((t) => t.trim()).filter(Boolean);
  }
  return out;
}

/** Roster case ids: the exact custom property names the producer asserts. */
export function rosterCaseIds(allowed) {
  const ids = [];
  for (const component of COMPANIONS) {
    for (const key of allowed[component] || []) ids.push(`--mat-${component}-${key}`);
  }
  return ids;
}

/** selector (wrapper stripped, ':root' for the wrapper itself) -> {prop: value}. */
export function parseCustomProperties(css, wrapper) {
  const out = {};
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = block[1].split(',').map((s) => {
      const stripped = s.trim().split(wrapper).join('').replace(/\s+/g, ' ').trim();
      return stripped || ':root';
    });
    for (const decl of block[2].matchAll(/(--mat-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      for (const selector of selectors) {
        (out[selector] ||= {})[decl[1]] = decl[2].trim();
      }
    }
  }
  return out;
}

function themeSass(ns, scenario, {m2Prefix}) {
  const pal = (spec) => {
    const [name, ...hues] = spec;
    const args = [`${ns}.$${m2Prefix}${name}-palette`, ...hues].join(', ');
    return `${ns}.${m2Prefix}define-palette(${args})`;
  };
  const level = scenario.customTypography
    ? `$closeout-level: ${ns}.${m2Prefix}define-typography-level(19px, 27px, 600, 'Closeout Font', 0.03em);\n`
    : '';
  const typeArgs = scenario.customTypography
    ? `$font-family: '${scenario.fontFamily}', $body-1: $closeout-level, $button: $closeout-level`
    : '';
  const typography = scenario.typography === 'legacy'
    ? `${ns}.${m2Prefix}define-legacy-typography-config(${typeArgs})`
    : `${ns}.${m2Prefix}define-typography-config(${typeArgs})`;
  return `
$primary: ${pal(scenario.primary)};
$accent: ${pal(scenario.accent)};
$warn: ${pal(scenario.warn)};
${level}$theme: ${ns}.${m2Prefix}define-${scenario.type}-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: ${typography},
  density: ${scenario.density}
));
`;
}

export function peerIdentity(root) {
  const require = createRequire(path.join(root, 'package.json'));
  const pkgJson = require.resolve(`${PEER_PACKAGE}/package.json`);
  const materialRoot = realpathSync(path.dirname(pkgJson));
  const pkgBytes = readFileSync(path.join(materialRoot, 'package.json'));
  const cdkRoot = realpathSync(path.dirname(
    createRequire(path.join(materialRoot, 'package.json')).resolve('@angular/cdk/package.json'),
  ));
  return {
    package: PEER_PACKAGE,
    version: JSON.parse(pkgBytes).version,
    realpath: materialRoot,
    package_json_sha256: sha256(pkgBytes),
    cdk_realpath: cdkRoot,
  };
}

/** Compile the peer oracle only from the installed peer packages. */
export function compilePeer(root, scenario, identity = peerIdentity(root)) {
  const require = createRequire(path.join(root, 'package.json'));
  const sass = require('sass');
  const entry = path.join(root, `companion-bridge-peer-oracle-${scenario.id}.scss`);
  const body = `@use '@angular/material' as mat;\n${themeSass('mat', scenario, {m2Prefix: 'm2-'})}
.peer { ${COMPANIONS.map((n) => `@include mat.${n}-theme($theme);`).join(' ')} }\n`;
  const result = sass.compileString(body, {
    loadPaths: [path.join(root, 'node_modules')],
    style: 'expanded',
    url: pathToFileURL(entry),
    silenceDeprecations: SILENCE,
  });
  const foreign = result.loadedUrls
    .map((url) => url.pathname)
    .filter((p) => p !== entry)
    .map((p) => (existsSync(p) ? realpathSync(p) : p))
    .filter((p) => !p.startsWith(identity.realpath + path.sep) && !p.startsWith(identity.cdk_realpath + path.sep));
  if (foreign.length) {
    throw new Error(`peer oracle loaded non-peer Sass: ${foreign.slice(0, 5).join(', ')}`);
  }
  return result.css;
}

/** Compile the candidate public bridge aggregate for the same theme. */
export function compileCandidate(root, scenario) {
  const require = createRequire(path.join(root, 'package.json'));
  const sass = require('sass');
  const body = `@use 'projects/ngx-material-legacy' as legacy;\n${themeSass('legacy', scenario, {m2Prefix: ''})}
.bridges { @include legacy.all-current-companion-bridges($theme); }\n`;
  const result = sass.compileString(body, {
    loadPaths: [root, path.join(root, 'node_modules'), path.join(root, 'node_modules/.pnpm/node_modules')],
    style: 'expanded',
    url: pathToFileURL(path.join(root, 'companion-bridge-check.scss')),
    silenceDeprecations: SILENCE,
  });
  return result.css;
}

/** Find the peer M2 token source that defines `<component>-<key>`. */
export function peerSourceFor(materialRoot, component, key) {
  const rel = `${component}/_m2-${component}.scss`;
  const file = path.join(materialRoot, rel);
  if (!existsSync(file)) return null;
  const bytes = readFileSync(file);
  const escaped = `${component}-${key}`.replace(/[-]/g, '\\-');
  if (!new RegExp(`(^|[^a-z0-9-])${escaped}\\s*:`, 'm').test(bytes.toString('utf8'))) return null;
  return {file: rel, sha256: sha256(bytes)};
}

/**
 * Pure comparison. `peer`/`candidate` are maps scenarioId -> parsed custom
 * properties. A case passes only when, in every scenario, the peer emits a
 * non-empty root value, the candidate root (when emitted) equals it, and the
 * selector-scoped (accent/warn variant) declarations of that token are the
 * same set with the same values in peer and candidate. A token must be emitted
 * by the candidate in at least one selector of every scenario.
 */
export function compareTokens({caseIds, peer, candidate, sources}) {
  const cases = [];
  const requiredScenarios = SCENARIOS.map(scenario => scenario.id);
  const complete = [peer, candidate].every(measurements =>
    Object.keys(measurements).length === requiredScenarios.length
      && requiredScenarios.every(id => Object.hasOwn(measurements, id)));
  for (const token of caseIds) {
    const scenarios = [];
    let ok = Boolean(sources[token]) && complete;
    for (const scenarioId of requiredScenarios) {
      const p = peer[scenarioId] || {};
      const c = candidate[scenarioId] || {};
      const selectors = new Set();
      for (const [sel, decls] of Object.entries(p)) if (token in decls) selectors.add(sel);
      for (const [sel, decls] of Object.entries(c)) if (token in decls) selectors.add(sel);
      const checks = [...selectors].sort().map((selector) => {
        const expected = p[selector]?.[token] ?? null;
        const actual = c[selector]?.[token] ?? null;
        const match = typeof expected === 'string' && expected !== '' && expected === actual;
        return {selector, expected_peer: expected, candidate: actual, match};
      });
      const rootPeer = p[':root']?.[token];
      const emitted = checks.some((check) => check.candidate !== null);
      const scenarioOk = typeof rootPeer === 'string' && rootPeer !== '' && emitted
        && checks.length > 0 && checks.every((check) => check.match);
      if (!scenarioOk) ok = false;
      scenarios.push({id: scenarioId, selector_checks: checks, match: scenarioOk});
    }
    const contract = scenarios[0];
    const root = contract?.selector_checks.find((check) => check.selector === ':root');
    cases.push({
      case_id: token,
      token,
      result: ok ? 'pass' : 'fail',
      expected_peer: root?.expected_peer ?? null,
      candidate: root?.candidate ?? null,
      scenarios,
    });
  }
  return cases;
}

/**
 * Token prefixes of other current peer components that share a companion's
 * prefix. `--mat-icon-button-*` belongs to icon-button, not the icon
 * companion; the peer's M2 datepicker density mixin sets two of them on the
 * calendar controls, and the datepicker bridge does the same.
 */
export const FOREIGN_TOKEN_PREFIXES = ['--mat-icon-button-'];

/** Candidate tokens of a companion that are not in any allowed list. */
export function unexpectedCandidateTokens(candidate, caseIds) {
  const allowed = new Set(caseIds);
  const out = new Set();
  for (const parsed of Object.values(candidate)) {
    for (const decls of Object.values(parsed)) {
      for (const token of Object.keys(decls)) {
        if (FOREIGN_TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix))) continue;
        if (COMPANIONS.some((c) => token.startsWith(`--mat-${c}-`)) && !allowed.has(token)) out.add(token);
      }
    }
  }
  return [...out].sort();
}

export function caseFileName(caseId) {
  return `${caseId.replace(/^--/, '')}.json`;
}

/** Run the full in-run peer oracle comparison. */
export function runPeerOracle(root, {bridgeSource, candidateOverride} = {}) {
  const source = bridgeSource ?? readFileSync(
    path.join(root, 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss'), 'utf8');
  const allowed = parseAllowedLists(source);
  const caseIds = rosterCaseIds(allowed);
  if (new Set(caseIds).size !== caseIds.length) throw new Error('duplicate companion bridge case ids');
  const identity = peerIdentity(root);
  const peer = {};
  const candidate = {};
  for (const scenario of SCENARIOS) {
    peer[scenario.id] = parseCustomProperties(compilePeer(root, scenario, identity), '.peer');
    candidate[scenario.id] = parseCustomProperties(
      candidateOverride ? candidateOverride(scenario) : compileCandidate(root, scenario), '.bridges');
  }
  const sources = {};
  for (const component of COMPANIONS) {
    for (const key of allowed[component] || []) {
      sources[`--mat-${component}-${key}`] = peerSourceFor(identity.realpath, component, key);
    }
  }
  const cases = compareTokens({caseIds, peer, candidate, sources});
  for (const entry of cases) {
    const component = COMPANIONS.find((c) => entry.token.startsWith(`--mat-${c}-`));
    entry.component = component;
    entry.allowed_key = entry.token.slice(`--mat-${component}-`.length);
    entry.peer_source_file = sources[entry.token]?.file ?? null;
    entry.peer_source_sha256 = sources[entry.token]?.sha256 ?? null;
  }
  return {
    identity,
    caseIds,
    cases,
    unexpected: unexpectedCandidateTokens(candidate, caseIds),
    scenarios: SCENARIOS,
  };
}

export function writeAssertions(dir, oracle, {runId, invocationId, line = 'main'}) {
  mkdirSync(dir, {recursive: true});
  const written = [];
  for (const entry of oracle.cases) {
    const body = {
      schema_version: 1,
      kind: 'assertion',
      check_id: 'companion-bridge-tokens',
      group: 'compiled-override-tokens',
      line,
      case_id: entry.case_id,
      result: entry.result,
      run_id: runId,
      invocation_id: invocationId,
      token: entry.token,
      component: entry.component,
      allowed_key: entry.allowed_key,
      peer_package: oracle.identity.package,
      peer_version: oracle.identity.version,
      peer_package_json_sha256: oracle.identity.package_json_sha256,
      peer_source_file: entry.peer_source_file,
      peer_source_sha256: entry.peer_source_sha256,
      oracle: 'current-peer m2-define-*-theme + mat.<companion>-theme compiled in this invocation',
      expected_peer: entry.expected_peer,
      candidate: entry.candidate,
      scenarios: entry.scenarios,
    };
    const file = path.join(dir, caseFileName(entry.case_id));
    writeFileSync(file, JSON.stringify(body, null, 2) + '\n');
    written.push(file);
  }
  return written;
}
