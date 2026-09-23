/**
 * Conservative Sass @use rewrite for migrate-legacy.
 * Rewrites `@use '@angular/material' ...` → `@use '@ngx-compat/material-legacy' ...`
 * without renaming palette/mixin calls. Ambiguous/mixed/current-generation files
 * produce diagnostics and are left unchanged.
 */

'use strict';

const FROM = '@angular/material';
const TO = '@ngx-compat/material-legacy';

/** @typedef {{ok: boolean, content?: string, diagnostics: string[], changed: boolean}} RewriteResult */

/**
 * @param {string} content
 * @returns {RewriteResult}
 */
function rewriteSassModuleSource(content) {
  const diagnostics = [];

  // Already migrated and no remaining Angular Material root @use → idempotent.
  const usePattern =
    /@use\s+(['"])@angular\/material\1(\s+as\s+([A-Za-z_][\w-]*|\*))?(\s+with\s*\([^;]*\))?(\s*;)/g;

  const hasAngularMaterialUse = /@use\s+(['"])@angular\/material\1/.test(content);
  if (!hasAngularMaterialUse) {
    return {ok: true, content, diagnostics, changed: false};
  }

  // Ambiguous / unsupported constructs → diagnostic, no edit.
  if (/@use\s+(['"])@angular\/material\1\s+as\s+\*/.test(content)) {
    diagnostics.push(
      'wildcard-namespace: `@use \'@angular/material\' as *` is ambiguous; no guessed rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }
  if (/@forward\s+(['"])@angular\/material\1/.test(content)) {
    diagnostics.push(
      'forward-hide: `@forward \'@angular/material\'` requires explicit forwarding tests; no rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }
  if (/@import\s+['"]~?@angular\/material/.test(content)) {
    diagnostics.push(
      'old-import: deprecated `@import` of @angular/material is not auto-migrated; no rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }

  // Generation / companion signals (only when migrating the root module).
  const hasDefineTheme = /\bdefine-theme\s*\(/.test(content);
  const hasAzurePalette = /\$azure-palette\b/.test(content);
  const hasM2Define = /\bm2-define-palette\b|\bm2-define-light-theme\b|\bm2-define-dark-theme\b/.test(
    content,
  );
  const hasDefinePalette = /\bdefine-palette\s*\(/.test(content);
  const hasExpansionTheme = /\bexpansion-theme\s*\(/.test(content);
  const hasAllLegacyAggregate = /\ball-legacy-component-themes\s*\(/.test(content);

  if (hasDefineTheme && hasAzurePalette) {
    diagnostics.push(
      'current-m3: file appears to use current Material M3 `define-theme` / `$azure-palette`; refusing rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }
  if (hasDefinePalette && hasM2Define) {
    diagnostics.push(
      'mixed-generation: both historical `define-palette` and `m2-define-*` APIs present; refusing rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }
  if (hasExpansionTheme) {
    diagnostics.push(
      'companion-bridge: `expansion-theme` is an ordinary-current companion; require explicit acknowledgement before readiness.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }
  if (hasAllLegacyAggregate) {
    diagnostics.push(
      'aggregate-bridge: `all-legacy-component-themes` is not substituted by an owned-only aggregate; report companion responsibility set.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }

  let changed = false;
  const next = content.replace(
    usePattern,
    (match, quote, asClause, alias, withClause, semi) => {
      changed = true;
      if (asClause && alias) {
        // Keep explicit alias (including unusual names).
        return `@use ${quote}${TO}${quote}${asClause}${withClause || ''}${semi}`;
      }
      // Implicit namespace `material` → preserve binding via `as material`.
      return `@use ${quote}${TO}${quote} as material${withClause || ''}${semi}`;
    },
  );

  if (!changed) {
    diagnostics.push(
      'unrecognized-use: found `@angular/material` @use but could not parse a supported form; no rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false};
  }

  return {ok: true, content: next, diagnostics, changed: true};
}

/**
 * Apply fixture-case expectations for helper/CI tests.
 * @param {{before: string, expected_after: string|null, outcome: string, id: string}} testCase
 * @returns {{pass: boolean, detail: string, result: RewriteResult}}
 */
function applyFixtureCase(testCase) {
  const result = rewriteSassModuleSource(testCase.before);
  if (testCase.expected_after == null) {
    const pass = result.changed === false;
    return {
      pass,
      detail: pass
        ? `unchanged as required (${testCase.outcome})`
        : `expected no edit but content changed`,
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
  FROM,
  TO,
  rewriteSassModuleSource,
  applyFixtureCase,
};
