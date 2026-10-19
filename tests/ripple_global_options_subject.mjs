/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public token/Injector; complete construction with explicit collaborators. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
await import('@angular/compiler');
const core = await import('@angular/core'), peer = await import('@angular/material/core');
const {Subject} = await import('rxjs');
const payload = JSON.parse(readFileSync(new URL('./ripple-global-options-payload.json', import.meta.url)));
const token = peer.MAT_RIPPLE_GLOBAL_OPTIONS;
assert.ok(token instanceof core.InjectionToken);
assert.equal(token.toString(), 'InjectionToken mat-ripple-global-options');

const samples = [
  ['null', null], ['undefined', undefined], ['empty', {}], ['enabled', {disabled: false}],
  ['disabled', {disabled: true}], ['enter-only', {animation: {enterDuration: 13}}],
  ['exit-only', {animation: {exitDuration: 19}}], ['terminate', {terminateOnPointerUp: true}],
  ['custom', {disabled: false, animation: {enterDuration: 23, exitDuration: 31}, terminateOnPointerUp: true}],
  ['opaque-namespace', {namespace: 'consumer-a', animation: {enterDuration: 7}}],
];
const clone = value => value === undefined ? undefined : structuredClone(value);
const counts = {construction_cases: 0, disabled_gate_cases: 0, default_isolation_cases: 0,
  injector_cases: 0, runtime_mutations_rejected: 0};

function classes(which, mutation) {
  class Parent {
    constructor(elementRef) { this._elementRef = elementRef; this.disabled = false; this.disableRipple = false; }
  }
  const recordings = [];
  class RippleRenderer {
    constructor(target, zone, element, platform) { recordings.push({target, zone, element, platform}); }
    setupTriggerEvents(trigger) { recordings.at(-1).trigger = trigger; }
  }
  const load = (entry, parent) => {
    const source = mutation?.family === entry.family ? mutation.program : entry[which];
    return new Function('Parent', 'RippleRenderer', 'Subject', 'EventEmitter', 'nextUniqueId',
      source + ';return ' + entry.name)(parent, RippleRenderer, Subject, core.EventEmitter, 1);
  };
  const base = payload.find(entry => entry.family === 'base');
  const types = new Map();
  types.set('base', load(base, Parent));
  types.set('link', load(payload.find(entry => entry.family === 'link'), types.get('base')));
  types.set('chip', load(payload.find(entry => entry.family === 'chip'), Parent));
  return {types, recordings};
}

function construct(types, family, options, mode) {
  const node = {tagName: 'MAT-CHIP', classList: {values: [], add(value) { this.values.push(value); }},
    children: [], hasAttribute: () => false, appendChild(child) { this.children.push(child); }};
  const elementRef = new core.ElementRef(node), zone = {boundary: 'zone'}, platform = {isBrowser: true};
  const nav = {disableRipple: false}, focus = {}, cdr = {};
  const document = {createElement(tag) { assert.equal(tag, 'div'); return {classList: {values: [],
    add(value) { this.values.push(value); }}}; }};
  const args = family === 'chip' ? [elementRef, zone, platform, options, cdr, document, mode, '3'] :
    family === 'link' ? [nav, elementRef, zone, platform, options, '3', focus, mode] :
      [nav, elementRef, options, '3', focus, mode];
  return {instance: new (types.get(family))(...args), node, elementRef, zone, platform, nav};
}

function checkConstruction(which, mutation, count = false) {
  const loaded = classes(which, mutation), results = [];
  for (const family of ['chip', 'base', 'link']) {
    for (const [id, sample] of samples) for (const mode of [undefined, 'BrowserAnimations', 'NoopAnimations']) {
      const options = clone(sample), before = clone(options), recordingStart = loaded.recordings.length;
      const value = construct(loaded.types, family, options, mode), instance = value.instance;
      if (options == null) {
        assert.deepEqual(instance.rippleConfig, mode === 'NoopAnimations' && family !== 'chip' ?
          {animation: {enterDuration: 0, exitDuration: 0}} : {}, 'missing options default');
      } else assert.equal(instance.rippleConfig, options, 'caller options object identity');
      if (family !== 'chip' && mode === 'NoopAnimations') {
        assert.deepEqual(instance.rippleConfig.animation, {enterDuration: 0, exitDuration: 0}, 'historical no-op override');
        if (options) assert.deepEqual(options, {...before, animation: {enterDuration: 0, exitDuration: 0}},
          'historical supplied-object mutation');
      } else assert.deepEqual(options, before, 'unexpected supplied-object mutation');
      assert.equal(instance.rippleConfig.namespace, before?.namespace, 'opaque current extension changed');
      assert.equal(instance.rippleConfig.terminateOnPointerUp, before?.terminateOnPointerUp);
      assert.equal(instance.rippleDisabled, mode === 'NoopAnimations' && family === 'chip' || !!options?.disabled,
        'global/no-op disabled gate');
      assert.equal(instance.tabIndex, 3);
      if (family !== 'base') {
        assert.equal(loaded.recordings.length, recordingStart + 1);
        const recording = loaded.recordings.at(-1);
        assert.equal(recording.target, instance); assert.equal(recording.zone, value.zone);
        assert.equal(recording.platform, value.platform);
        assert.equal(recording.element, family === 'chip' ? value.node.children[0] : value.elementRef);
        assert.equal(recording.trigger, family === 'chip' ? value.elementRef : value.node);
        if (family === 'chip') assert.deepEqual(value.node.children[0].classList.values, ['mat-chip-ripple']);
      } else assert.equal(loaded.recordings.length, recordingStart);
      if (count) counts.construction_cases++;
      results.push({family, id, mode: mode || 'unspecified', options: clone(instance.rippleConfig),
        disabled: instance.rippleDisabled, renderer_calls: loaded.recordings.length - recordingStart});
    }
    for (const gate of family === 'chip' ? ['disabled', 'disableRipple'] : ['disabled', 'disableRipple', 'nav']) {
      const value = construct(loaded.types, family, {}, undefined);
      assert.equal(value.instance.rippleDisabled, false);
      if (gate === 'nav') value.nav.disableRipple = true; else value.instance[gate] = true;
      assert.equal(value.instance.rippleDisabled, true, 'local disabled gate: ' + gate);
      if (count) counts.disabled_gate_cases++;
    }
    const a = construct(loaded.types, family, null, undefined).instance;
    const b = construct(loaded.types, family, null, undefined).instance;
    assert.notEqual(a.rippleConfig, b.rippleConfig, 'absent defaults leak across instances');
    a.rippleConfig.disabled = true; assert.equal(b.rippleDisabled, false);
    if (count) counts.default_isolation_cases++;
  }
  return results;
}
const original = checkConstruction('original'), current = checkConstruction('current', undefined, true);
assert.deepEqual(current, original, 'candidate option behavior differs from untouched constructor oracle');

const loaded = classes('current'), dependency = [[new core.Optional(), token]];
for (const family of ['chip', 'base', 'link']) {
  const resultToken = new core.InjectionToken('construction result ' + family);
  const options = {disabled: true, animation: {enterDuration: 43}, namespace: 'shared'};
  const parent = core.Injector.create({providers: [{provide: token, useValue: options}]});
  const make = (providers = [], parent) => core.Injector.create({parent, providers: [...providers,
    {provide: resultToken, useFactory: options => construct(loaded.types, family, options, undefined).instance,
      deps: dependency}]});
  const inherited = make([], parent), overriddenOptions = {terminateOnPointerUp: true};
  const overridden = make([{provide: token, useValue: overriddenOptions}], parent);
  const absent = make(), explicitNull = make([{provide: token, useValue: null}], parent);
  const lookalike = make([{provide: new core.InjectionToken('mat-ripple-global-options'), useValue: options}]);
  try {
    assert.equal(inherited.get(resultToken).rippleConfig, options);
    assert.equal(overridden.get(resultToken).rippleConfig, overriddenOptions);
    assert.deepEqual(absent.get(resultToken).rippleConfig, {});
    assert.deepEqual(explicitNull.get(resultToken).rippleConfig, {});
    assert.deepEqual(lookalike.get(resultToken).rippleConfig, {}, 'same description must not merge tokens');
    assert.notEqual(token, new core.InjectionToken('mat-ripple-global-options'));
    counts.injector_cases += 5;
  } finally { for (const injector of [inherited, overridden, absent, explicitNull, lookalike, parent]) injector.destroy(); }
}

const change = (family, from, to) => {
  const source = payload.find(entry => entry.family === family).current;
  assert.equal(source.split(from).length, 2, 'ambiguous runtime mutation');
  return {family, program: source.replace(from, to)};
};
const mutants = [
  change('chip', 'this.rippleConfig = globalRippleOptions || {};', 'this.rippleConfig = {...globalRippleOptions};'),
  change('base', 'this.rippleConfig = globalRippleOptions || {};', 'this.rippleConfig = {};'),
  change('base', 'this.rippleConfig.animation = { enterDuration: 0, exitDuration: 0 };',
    'this.rippleConfig.animation = { enterDuration: 1, exitDuration: 0 };'),
  change('chip', '!!this.rippleConfig.disabled', 'false'),
  change('base', 'this._tabNavBar.disableRipple', 'false'),
  change('link', 'super(tabNavBar, elementRef, globalRippleOptions, tabIndex, focusMonitor, animationMode);',
    'super(tabNavBar, elementRef, {...globalRippleOptions}, tabIndex, focusMonitor, animationMode);'),
];
for (const mutant of mutants) {
  assert.throws(() => checkConstruction('current', mutant), assert.AssertionError);
  counts.runtime_mutations_rejected++;
}
assert.equal(counts.construction_cases, 90); assert.equal(counts.injector_cases, 15);
console.log(JSON.stringify({...counts, whole_original_and_current_constructors_executed: true,
  genuine_public_token_and_injector: true, historical_noop_tab_supplied_object_mutation_preserved: true,
  namespace_is_opaque_data_only: true, collaborators: 'Base traits, ripple renderer, zone, platform, DOM, focus monitor and change detector are explicit protocols. No methods on zone/platform/focus/CDR are executed.',
  actual_angular_component_factories_or_renderer_or_native_or_packed_or_floor_qualified: false}));
