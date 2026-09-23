/**
 * Conservative TypeScript module-specifier rewrite for historical legacy-* paths.
 * Only rewrites string module literals that exactly target
 * `@angular/material/legacy-...` (including /testing). Leaves ordinary Material,
 * private paths, computed imports, and non-module strings alone.
 */

'use strict';

const FROM_PREFIX = '@angular/material/legacy-';
const TO_PREFIX = '@ngx-compat/material-legacy/legacy-';

/** @typedef {{ok: boolean, content?: string, diagnostics: string[], changed: boolean}} RewriteResult */

/**
 * @param {string} content
 * @returns {RewriteResult}
 */
function rewriteLegacyTypescriptImports(content) {
  const diagnostics = [];

  if (/@angular\/material\/legacy-[\w-]+\/private\b/.test(content)) {
    diagnostics.push(
      'private-typescript: import of `@angular/material/legacy-*/private` is unsupported; refusing rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }

  // Computed / concatenated dynamic import — refuse whole file.
  if (/import\s*\(\s*(['"])@angular\/material\/\1\s*\+/.test(content)) {
    diagnostics.push('computed-import: dynamic import uses concatenation; refusing rewrite.');
    return {ok: false, content, diagnostics, changed: false};
  }

  // Namespace import of legacy entry that references removed recipes — diagnostic only.
  if (
    /import\s*\*\s*as\s+\w+\s+from\s+(['"])@angular\/material\/legacy-[\w/-]+\1/.test(content) &&
    /matLegacy\w+Animations/.test(content)
  ) {
    diagnostics.push(
      'namespace-recipe: namespace import references removed animation recipes; provide a binding-aware migration example instead of guessing.',
    );
    return {ok: false, content, diagnostics, changed: false};
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

  return {ok: true, content: next, diagnostics, changed};
}

/**
 * @param {{before: string, expected_after: string|null, outcome: string, id: string}} testCase
 */
function applyFixtureCase(testCase) {
  const result = rewriteLegacyTypescriptImports(testCase.before);
  if (testCase.expected_after == null) {
    const pass = result.changed === false;
    return {
      pass,
      detail: pass
        ? `unchanged as required (${testCase.outcome})`
        : 'expected no edit but content changed',
      result,
    };
  }
  const pass = result.ok && result.changed && result.content === testCase.expected_after;
  return {
    pass,
    detail: pass
      ? 'safe edit matched expected_after'
      : `mismatch: ok=${result.ok} changed=${result.changed} diagnostics=${JSON.stringify(result.diagnostics)}`,
    result,
  };
}

module.exports = {
  FROM_PREFIX,
  TO_PREFIX,
  rewriteLegacyTypescriptImports,
  applyFixtureCase,
};
