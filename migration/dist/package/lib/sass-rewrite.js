/**
 * Conservative Sass @use rewrite for migrate-legacy.
 * Rewrites `@use '@angular/material' ...` → `@use '@ngx-compat/material-legacy' ...`
 * without renaming palette/mixin calls. Ambiguous/mixed/current-generation files
 * produce diagnostics and are left unchanged. Companion/aggregate bridge hits
 * require explicit acknowledgement before the safe module-source rewrite proceeds.
 */

'use strict';

const FROM = '@angular/material';
const TO = '@ngx-compat/material-legacy';

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
 * @param {string} content
 * @param {RewriteOptions} [options]
 * @returns {RewriteResult}
 */
function rewriteSassModuleSource(content, options) {
  const opts = normalizeOptions(options);
  const diagnostics = [];
  /** @type {string[]} */
  const acknowledgements = [];

  // Already migrated and no remaining Angular Material root @use → idempotent.
  const usePattern =
    /@use\s+(['"])@angular\/material\1(\s+as\s+([A-Za-z_][\w-]*|\*))?(\s+with\s*\([^;]*\))?(\s*;)/g;

  const hasAngularMaterialUse = /@use\s+(['"])@angular\/material\1/.test(content);
  if (!hasAngularMaterialUse) {
    return {ok: true, content, diagnostics, changed: false, acknowledgements};
  }

  // Ambiguous / unsupported constructs → diagnostic, no edit.
  if (/@use\s+(['"])@angular\/material\1\s+as\s+\*/.test(content)) {
    diagnostics.push(
      'wildcard-namespace: `@use \'@angular/material\' as *` is ambiguous; no guessed rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }
  if (/@forward\s+(['"])@angular\/material\1/.test(content)) {
    diagnostics.push(
      'forward-hide: `@forward \'@angular/material\'` requires explicit forwarding tests; no rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }
  if (/@import\s+['"]~?@angular\/material/.test(content)) {
    diagnostics.push(
      'old-import: deprecated `@import` of @angular/material is not auto-migrated; no rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
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
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }
  if (hasDefinePalette && hasM2Define) {
    diagnostics.push(
      'mixed-generation: both historical `define-palette` and `m2-define-*` APIs present; refusing rewrite.',
    );
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }

  // Companion / aggregate: require acknowledgement; with ack, allow safe @use rewrite only
  // (no semantic rewrite of expansion-theme / aggregate membership).
  if (hasExpansionTheme) {
    if (!opts.acknowledgeCompanionBridges) {
      diagnostics.push(
        'companion-bridge: `expansion-theme` is an ordinary-current companion; ' +
          'require --acknowledge-companion-bridges (schematic: acknowledgeCompanionBridges) ' +
          'before readiness. No silent rewrite.',
      );
      return {ok: false, content, diagnostics, changed: false, acknowledgements};
    }
    acknowledgements.push('companion-bridges');
    diagnostics.push(
      'companion-bridge-acknowledged: ordinary-current companion (`expansion-theme`) remains ' +
        'consumer responsibility; recorded acknowledgement; applying safe @use module-source edit only.',
    );
  }
  if (hasAllLegacyAggregate) {
    if (!opts.acknowledgeAggregates) {
      diagnostics.push(
        'aggregate-bridge: `all-legacy-component-themes` themes owned legacy plus ordinary companions; ' +
          'require --acknowledge-aggregates (schematic: acknowledgeAggregates) before readiness. ' +
          'Do not substitute an owned-only aggregate silently.',
      );
      return {ok: false, content, diagnostics, changed: false, acknowledgements};
    }
    acknowledgements.push('aggregates');
    diagnostics.push(
      'aggregate-bridge-acknowledged: historical aggregate membership (incl. ordinary companions) ' +
        'remains consumer responsibility; recorded acknowledgement; applying safe @use module-source edit only.',
    );
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
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }

  return {ok: true, content: next, diagnostics, changed: true, acknowledgements};
}

/**
 * Apply fixture-case expectations for helper/CI tests.
 * @param {{before: string, expected_after: string|null, outcome: string, id: string, options?: RewriteOptions, expect_ok?: boolean, expect_acknowledgements?: string[]}} testCase
 * @returns {{pass: boolean, detail: string, result: RewriteResult}}
 */
function applyFixtureCase(testCase) {
  const result = rewriteSassModuleSource(testCase.before, testCase.options);
  if (testCase.expected_after == null) {
    const pass = result.changed === false;
    let detail = pass
      ? `unchanged as required (${testCase.outcome})`
      : `expected no edit but content changed`;
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
  const pass =
    result.ok && result.changed && result.content === testCase.expected_after;
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
  FROM,
  TO,
  normalizeOptions,
  rewriteSassModuleSource,
  applyFixtureCase,
};
