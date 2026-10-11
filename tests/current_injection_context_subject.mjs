/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned guard scopes with genuine whole Core; other dependencies are protocols. */
import assert from 'node:assert/strict';
await import('@angular/compiler');
const core = await import('@angular/core');
const [line, mode, bundle] = process.argv.slice(2);
assert.ok(['development', 'production'].includes(mode));
if (mode === 'production') core.enableProdMode();
const scopes = await import(bundle);
const cases = [], check = (id, run) => {run(); cases.push(id);};
const owned = scopes.LEGACY_ANIMATIONS_TEST_OVERRIDE;
const missing = new core.InjectionToken('missing-ambient'), valueToken = new core.InjectionToken('ambient-value');
const value = {origin: 'caller'}, zone = {origin: 'caller-zone'};
const root = core.Injector.create({providers: [
  {provide: owned, useValue: 'di-disabled'}, {provide: valueToken, useValue: value}, {provide: core.NgZone, useValue: zone},
], name: 'guard-caller-protocol'});
const plain = core.Injector.create({providers: [], name: 'guard-missing-protocol'});
try {
  check('outside-context-manual-helper-fallbacks', () => {
    assert.equal(scopes.legacyAnimationsDisabled(), false);
    assert.equal(scopes.dialogAnimationsDisabled(), false);
    assert.equal(scopes.ambientService(valueToken), null);
    assert.equal(scopes.tabHeaderRenderInjector(), null);
    assert.equal(scopes.tabBodyNgZone(), null);
    const checkbox = new scopes.MatLegacyPseudoCheckbox('NoopAnimations');
    assert.equal(checkbox._animationMode, 'NoopAnimations');
    assert.equal(checkbox._diAnimationsDisabled, false);
  });
  check('strict-constructors-reject-outside-before-protocol-parent', () => {
    const before = {...scopes.counts};
    assert.throws(() => new scopes.MatLegacyMenuItem(), /NG0203|injection context/);
    assert.throws(() => new scopes.MatLegacyTable(), /NG0203|injection context/);
    assert.deepEqual(scopes.counts, before);
  });
  check('inside-context-actual-guard-scopes-and-borrowed-identity', () => core.runInInjectionContext(root, () => {
    assert.equal(scopes.legacyAnimationsDisabled(), true);
    assert.equal(scopes.dialogAnimationsDisabled(), true);
    assert.equal(new scopes.MatLegacyPseudoCheckbox()._diAnimationsDisabled, true);
    assert.equal(scopes.ambientService(valueToken), value);
    assert.equal(scopes.tabHeaderRenderInjector(), root);
    assert.equal(scopes.tabBodyNgZone(), zone);
    const item = new scopes.MatLegacyMenuItem();
    assert.ok(item instanceof scopes.MatLegacyMenuItem);
    assert.equal(scopes.counts.menu, 1);
    assert.ok(new scopes.MatLegacyTable() instanceof scopes.MatLegacyTable);
    assert.equal(scopes.counts.table, 1);
  }));
  check('optional-services-are-null-only-when-unprovided', () => core.runInInjectionContext(plain, () => {
    assert.equal(scopes.ambientService(missing), null);
    assert.equal(scopes.tabBodyNgZone(), null);
    assert.equal(scopes.tabHeaderRenderInjector(), plain);
  }));
  check('obsolete-manual-arguments-reject-before-parent', () => core.runInInjectionContext(root, () => {
    const before = {...scopes.counts};
    for (const construct of [() => new scopes.MatLegacyMenuItem(value), () => new scopes.MatLegacyTable(value)])
      assert.throws(construct, /manual dependency arguments/);
    assert.deepEqual(scopes.counts, before);
  }));
  check('provider-factory-errors-are-not-outside-context-fallbacks', () => {
    const error = new Error('controlled ambient provider error');
    for (const call of [() => scopes.ambientService(valueToken), scopes.legacyAnimationsDisabled,
      scopes.dialogAnimationsDisabled, scopes.tabBodyNgZone, () => new scopes.MatLegacyPseudoCheckbox()]) {
      // A failed provider remains under construction in the historical injector;
      // each caller therefore gets its own fresh failure, rather than a later cycle.
      const bad = core.Injector.create({providers: [
        {provide: valueToken, useFactory() {throw error;}}, {provide: owned, useFactory() {throw error;}},
        {provide: core.NgZone, useFactory() {throw error;}},
      ]});
      try {core.runInInjectionContext(bad, () => assert.throws(call, thrown => thrown === error));}
      finally {bad.destroy();}
    }
  });
  check('nested-context-restores-caller-and-throw-restores-outside', () => {
    core.runInInjectionContext(root, () => {
      core.runInInjectionContext(plain, () => assert.equal(scopes.tabHeaderRenderInjector(), plain));
      assert.equal(scopes.tabHeaderRenderInjector(), root);
      assert.throws(() => core.runInInjectionContext(plain, () => {throw Error('nested failure');}), /nested failure/);
      assert.equal(scopes.ambientService(valueToken), value);
    });
    assert.equal(scopes.tabHeaderRenderInjector(), null);
    assert.equal(scopes.ambientService(valueToken), null);
  });
  let later;
  core.runInInjectionContext(root, () => {later = Promise.resolve().then(() => {
    assert.equal(scopes.tabHeaderRenderInjector(), null);
    assert.equal(scopes.ambientService(valueToken), null);
    assert.throws(() => core.inject(valueToken), /NG0203|injection context/);
  });});
  await later; cases.push('context-does-not-leak-across-microtask');
  console.log(JSON.stringify({line, mode, framework: core.VERSION.full, cases,
    actual_owned_guard_scopes: 8, direct_ambient_inject_scopes: 2,
    whole_public_core_executed: true, other_values_tokens_and_parents_are_protocols: true,
    complete_components_or_automatic_node_root_graphs_qualified: false}));
} finally {plain.destroy(); root.destroy();}
