/**
 * Conservative TypeScript module-specifier rewrite for historical legacy-* paths.
 * Only rewrites string module literals that exactly target
 * `@angular/material/legacy-...` (including /testing). Leaves ordinary Material,
 * private paths, computed imports, and non-module strings alone.
 *
 * Ordinary (non-legacy) `@angular/material/...` imports are reported as
 * current-component drift requiring `--acknowledge-current-components` for
 * readiness; acknowledgement does not rewrite those imports.
 */

'use strict';

const FROM_PREFIX = '@angular/material/legacy-';
const TO_PREFIX = '@ngx-compat/material-legacy/legacy-';

/** @typedef {{ok: boolean, content?: string, diagnostics: string[], changed: boolean, acknowledgements?: string[]}} RewriteResult */
/** @typedef {{acknowledgeCompanionBridges?: boolean, acknowledgeAggregates?: boolean, acknowledgeCurrentComponents?: boolean}} RewriteOptions */

/**
 * @param {RewriteOptions|undefined} options
 * @returns {Required<RewriteOptions>}
 */
function normalizeOptions(options) {
  const o = options || {};
  return {
    acknowledgeCompanionBridges: Boolean(o.acknowledgeCompanionBridges),
    acknowledgeAggregates: Boolean(o.acknowledgeAggregates),
    acknowledgeCurrentComponents: Boolean(o.acknowledgeCurrentComponents),
  };
}

/** Historical legacy entry points. `/testing` is the only allowed extra segment. */
const LEGACY_ENTRIES = new Set([
  'legacy-autocomplete',
  'legacy-button',
  'legacy-card',
  'legacy-checkbox',
  'legacy-chips',
  'legacy-dialog',
  'legacy-form-field',
  'legacy-input',
  'legacy-list',
  'legacy-menu',
  'legacy-paginator',
  'legacy-progress-bar',
  'legacy-progress-spinner',
  'legacy-radio',
  'legacy-select',
  'legacy-slide-toggle',
  'legacy-slider',
  'legacy-snack-bar',
  'legacy-table',
  'legacy-tabs',
  'legacy-tooltip',
  'legacy-core',
]);

const RECIPE_NAME = /\bmatLegacy[A-Za-z0-9]*Animations\b/;

/**
 * Blank comments, strings, and template literals so later matches see code only.
 * Newlines stay in place, so indexes still refer to the original source.
 * Template `${...}` interpolations are scanned as code.
 * @param {string} source
 * @returns {string}
 */
function maskNonCode(source, flags = null) {
  const chars = source.split('');
  const n = chars.length;
  let i = 0;

  const blank = (from, to) => {
    for (let k = from; k < to; k++) {
      if (chars[k] !== '\n') {
        chars[k] = ' ';
        if (flags) flags[k] = true;
      }
    }
  };

  while (i < n) {
    const c = chars[i];
    const next = chars[i + 1];
    if (c === '/' && next === '/') {
      const start = i;
      i += 2;
      while (i < n && chars[i] !== '\n') i++;
      blank(start, i);
      continue;
    }
    if (c === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i + 1 < n && !(chars[i] === '*' && chars[i + 1] === '/')) i++;
      i = Math.min(n, i + 2);
      blank(start, i);
      continue;
    }
    if (c === '\'' || c === '"') {
      const quote = c;
      const start = i;
      i++;
      while (i < n) {
        if (chars[i] === '\\') {
          i += 2;
          continue;
        }
        if (chars[i] === quote || chars[i] === '\n') {
          if (chars[i] === quote) i++;
          break;
        }
        i++;
      }
      blank(start, i);
      continue;
    }
    if (c === '`') {
      const start = i;
      i++;
      while (i < n) {
        if (chars[i] === '\\') {
          i += 2;
          continue;
        }
        if (chars[i] === '`') {
          i++;
          break;
        }
        if (chars[i] === '$' && chars[i + 1] === '{') {
          blank(start, i);
          i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            if (chars[i] === '{') depth++;
            else if (chars[i] === '}') depth--;
            if (depth > 0) i++;
            else i++;
          }
          continue;
        }
        i++;
      }
      blank(start, i);
      continue;
    }
    i++;
  }
  return chars.join('');
}

function nonCodeFlags(source) {
  const flags = new Array(source.length).fill(false);
  maskNonCode(source, flags);
  return flags;
}

/**
 * @param {string} spec
 * @returns {'rewrite'|'private'|'unknown'|'deep'|'ignore'}
 */
function classifyLegacySpecifier(spec) {
  if (!spec.startsWith(FROM_PREFIX)) return 'ignore';
  const rest = spec.slice(FROM_PREFIX.length);
  const parts = rest.split('/');
  const entry = `legacy-${parts[0]}`;
  if (!LEGACY_ENTRIES.has(entry)) return 'unknown';
  if (parts.length === 1) return 'rewrite';
  if (parts.length === 2 && parts[1] === 'testing') return 'rewrite';
  if (parts.indexOf('private') !== -1) return 'private';
  return 'deep';
}

/**
 * @param {string} masked
 * @returns {{spec: string, specStart: number, specEnd: number, clause: string}[]}
 */
function keywordInCode(match, flags) {
  const kw = match[0].search(/[A-Za-z]/);
  const idx = match.index + (kw < 0 ? 0 : kw);
  return !flags[idx];
}

function collectLegacyImports(source, flags) {
  /** @type {{spec: string, specStart: number, specEnd: number, clause: string}[]} */
  const found = [];
  const seen = new Set();
  const record = (match, spec, clause) => {
    if (!keywordInCode(match, flags)) return;
    const specStart = match.index + match[0].lastIndexOf(spec);
    const key = `${specStart}:${spec}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({spec, specStart, specEnd: specStart + spec.length, clause: clause || ''});
  };

  const fromRe =
    /(?:^|[^.\w$])(?:import|export)\s+(?:type\s+)?([\s\S]*?)\s+from\s+(['"])(@angular\/material\/legacy-[^'"]+)\2/g;
  const sideRe =
    /(?:^|[^.\w$])import\s+(['"])(@angular\/material\/legacy-[^'"]+)\1/g;
  const dynamicRe =
    /import\s*\(\s*(['"])(@angular\/material\/legacy-[^'"]+)\1\s*\)/g;
  const requireRe =
    /require\s*\(\s*(['"])(@angular\/material\/legacy-[^'"]+)\1\s*\)/g;

  const requireIsShadowed =
    /(?:function\s+[A-Za-z_$][\w$]*\s*\([^)]*\brequire\b|\(\s*require\s*[:,)]|\b(?:const|let|var|function|class)\s+require\b|\brequire\s*=>)/.test(
      source,
    );
  for (const match of source.matchAll(fromRe)) record(match, match[3], match[1]);
  for (const match of source.matchAll(sideRe)) record(match, match[2], '');
  for (const match of source.matchAll(dynamicRe)) record(match, match[2], '');
  if (!requireIsShadowed) {
    for (const match of source.matchAll(requireRe)) record(match, match[2], '');
  }
  return found;
}

/**
 * Detect ordinary (non-legacy) Material module specifiers in import/export/from forms.
 * @param {string} content
 * @returns {boolean}
 */
function hasOrdinaryMaterialModuleSpecifiers(content) {
  const flags = nonCodeFlags(content);
  const fromRe =
    /(?:from\s+|import\s*\(\s*)(['"])(@angular\/material\/(?!legacy-)[^'"]+)\1/g;
  for (const match of content.matchAll(fromRe)) {
    if (keywordInCode(match, flags)) return true;
  }
  return false;
}

/**
 * @param {string} content
 * @param {RewriteOptions} [options]
 * @returns {RewriteResult}
 */
function rewriteLegacyTypescriptImports(content, options) {
  const opts = normalizeOptions(options);
  const diagnostics = [];
  /** @type {string[]} */
  const acknowledgements = [];
  const flags = nonCodeFlags(content);
  const masked = maskNonCode(content);
  const found = collectLegacyImports(content, flags);

  if (/import\s*\(\s*(['"])@angular\/material\/\1\s*\+/.test(masked)) {
    diagnostics.push('computed-import: dynamic import uses concatenation; refusing rewrite.');
  }

  for (const item of found) {
    const kind = classifyLegacySpecifier(item.spec);
    if (kind === 'private') {
      diagnostics.push(
        'private-typescript: import of `@angular/material/legacy-*/private` is unsupported; refusing rewrite.',
      );
    } else if (kind === 'unknown') {
      diagnostics.push(
        `unknown-entry: \`${item.spec}\` is not a historical legacy entry point; refusing rewrite.`,
      );
    } else if (kind === 'deep') {
      diagnostics.push(
        `unsupported-path: \`${item.spec}\` is not a supported legacy or /testing path; refusing rewrite.`,
      );
    } else if (item.clause && RECIPE_NAME.test(item.clause)) {
      diagnostics.push(
        `engine-recipe: \`${item.spec}\` imports a removed animation recipe; refusing rewrite. ` +
          'Use the native motion API instead of /animations metadata.',
      );
    } else if (
      item.clause &&
      /^\s*\*\s+as\s+[A-Za-z_$][\w$]*\s*$/.test(item.clause) &&
      RECIPE_NAME.test(masked)
    ) {
      diagnostics.push(
        'namespace-recipe: namespace import references removed animation recipes; provide a binding-aware migration example instead of guessing.',
      );
    }
  }

  if (diagnostics.length) {
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }

  if (hasOrdinaryMaterialModuleSpecifiers(content)) {
    if (!opts.acknowledgeCurrentComponents) {
      diagnostics.push(
        'current-component: ordinary `@angular/material/...` (non-legacy) imports present; ' +
          'require --acknowledge-current-components (schematic: acknowledgeCurrentComponents) ' +
          'before readiness. No rewrite of ordinary imports.',
      );
      return {ok: false, content, diagnostics, changed: false, acknowledgements};
    }
    acknowledgements.push('current-components');
    diagnostics.push(
      'current-component-acknowledged: ordinary Material imports left unchanged; ' +
        'recorded acknowledgement that current-component drift is accepted for readiness (not visual approval).',
    );
  }

  let next = content;
  let changed = false;
  const rewrites = found
    .filter((item) => classifyLegacySpecifier(item.spec) === 'rewrite')
    .sort((a, b) => b.specStart - a.specStart);
  for (const item of rewrites) {
    const replacement = TO_PREFIX + item.spec.slice(FROM_PREFIX.length);
    if (replacement === item.spec) continue;
    next = next.slice(0, item.specStart) + replacement + next.slice(item.specEnd);
    changed = true;
  }

  return {ok: true, content: next, diagnostics, changed, acknowledgements};
}

/**
 * @param {{before: string, expected_after: string|null, outcome: string, id: string, options?: RewriteOptions, expect_ok?: boolean, expect_acknowledgements?: string[]}} testCase
 */
function applyFixtureCase(testCase) {
  const result = rewriteLegacyTypescriptImports(testCase.before, testCase.options);
  if (testCase.expected_after == null) {
    const pass = result.changed === false;
    let detail = pass
      ? `unchanged as required (${testCase.outcome})`
      : 'expected no edit but content changed';
    if (pass && testCase.expect_ok === false && result.ok !== false) {
      return {
        pass: false,
        detail: `expected ok:false (blocking/ack-required) but ok=${result.ok}`,
        result,
      };
    }
    if (
      pass &&
      Array.isArray(testCase.expect_acknowledgements) &&
      JSON.stringify(result.acknowledgements || []) !==
        JSON.stringify(testCase.expect_acknowledgements)
    ) {
      return {
        pass: false,
        detail: `acknowledgements mismatch: ${JSON.stringify(result.acknowledgements)}`,
        result,
      };
    }
    return {pass, detail, result};
  }
  const pass = result.ok && result.changed && result.content === testCase.expected_after;
  let detail = pass
    ? 'safe edit matched expected_after'
    : `mismatch: ok=${result.ok} changed=${result.changed} diagnostics=${JSON.stringify(result.diagnostics)}`;
  if (
    pass &&
    Array.isArray(testCase.expect_acknowledgements) &&
    JSON.stringify(result.acknowledgements || []) !==
      JSON.stringify(testCase.expect_acknowledgements)
  ) {
    return {
      pass: false,
      detail: `acknowledgements mismatch: ${JSON.stringify(result.acknowledgements)}`,
      result,
    };
  }
  return {pass, detail, result};
}

module.exports = {
  FROM_PREFIX,
  TO_PREFIX,
  normalizeOptions,
  hasOrdinaryMaterialModuleSpecifiers,
  rewriteLegacyTypescriptImports,
  applyFixtureCase,
};
