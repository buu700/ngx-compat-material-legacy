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

/**
 * Detect ordinary (non-legacy) Material module specifiers in import/export/from forms.
 * @param {string} content
 * @returns {boolean}
 */
function hasOrdinaryMaterialModuleSpecifiers(content) {
  // from '...', import('...') — exclude legacy-* and bare @angular/material if any
  const fromRe =
    /(?:from\s+|import\s*\(\s*)(['"])(@angular\/material\/(?!legacy-)[^'"]+)\1/g;
  return fromRe.test(content);
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

  if (/@angular\/material\/legacy-[\w-]+\/private\b/.test(content)) {
    diagnostics.push(
      'private-typescript: import of `@angular/material/legacy-*/private` is unsupported; refusing rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }

  // Computed / concatenated dynamic import — refuse whole file.
  if (/import\s*\(\s*(['"])@angular\/material\/\1\s*\+/.test(content)) {
    diagnostics.push('computed-import: dynamic import uses concatenation; refusing rewrite.');
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }

  // Namespace import of legacy entry that references removed recipes — diagnostic only.
  if (
    /import\s*\*\s*as\s+\w+\s+from\s+(['"])@angular\/material\/legacy-[\w/-]+\1/.test(content) &&
    /matLegacy\w+Animations/.test(content)
  ) {
    diagnostics.push(
      'namespace-recipe: namespace import references removed animation recipes; provide a binding-aware migration example instead of guessing.',
    );
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }

  let changed = false;

  // import / export ... from '...'
  let next = content.replace(
    /(from\s+)(['"])(@angular\/material\/legacy-[\w/-]+)\2/g,
    (match, fromKw, quote, spec) => {
      changed = true;
      return `${fromKw}${quote}${spec.replace(FROM_PREFIX, TO_PREFIX)}${quote}`;
    },
  );

  // dynamic import('...')
  next = next.replace(
    /(import\s*\(\s*)(['"])(@angular\/material\/legacy-[\w/-]+)\2(\s*\))/g,
    (match, lead, quote, spec, trail) => {
      changed = true;
      return `${lead}${quote}${spec.replace(FROM_PREFIX, TO_PREFIX)}${quote}${trail}`;
    },
  );

  // Ordinary current-component module usage: report; acknowledgement records readiness
  // acceptance without rewriting those imports.
  if (hasOrdinaryMaterialModuleSpecifiers(content)) {
    if (!opts.acknowledgeCurrentComponents) {
      diagnostics.push(
        'current-component: ordinary `@angular/material/...` (non-legacy) imports present; ' +
          'require --acknowledge-current-components (schematic: acknowledgeCurrentComponents) ' +
          'before readiness. No rewrite of ordinary imports.',
      );
      // Unacknowledged current-component risk blocks readiness (ok:false) but must not
      // invent edits. If legacy rewrites also applied in the same file, still refuse
      // to stage a half-ready report: leave content unchanged when blocking.
      if (changed) {
        // Transactional: do not apply legacy rewrites alongside unacked current-component risk.
        return {
          ok: false,
          content,
          diagnostics,
          changed: false,
          acknowledgements,
        };
      }
      return {ok: false, content, diagnostics, changed: false, acknowledgements};
    }
    acknowledgements.push('current-components');
    diagnostics.push(
      'current-component-acknowledged: ordinary Material imports left unchanged; ' +
        'recorded acknowledgement that current-component drift is accepted for readiness (not visual approval).',
    );
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
