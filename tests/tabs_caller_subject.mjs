/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual parent/owned constructors; template/container/CDR/node payloads are protocols. */
import assert from 'node:assert/strict';
const [line, mode] = process.argv.slice(2);
await import('@angular/compiler');
const core = await import('@angular/core'), peer = await import('@angular/material/tabs');
const portal = await import('@angular/cdk/portal');
if (mode === 'production') core.enableProdMode();
const historical = line === 'original' ? await import('@angular/material/legacy-tabs') : null;
const owned = line === 'original' ? null : await import('./projects/ngx-material-legacy/legacy-tabs/public-api.mjs');
const Label = historical?.MatLegacyTabLabel ?? owned.MatLegacyTabLabel;
const Content = historical?.MatLegacyTabContent ?? owned.MatLegacyTabContent;
const Group = historical?.MatLegacyTabGroup ?? owned.MatLegacyTabGroup;
const token = historical?.MAT_LEGACY_TAB ?? owned.MAT_LEGACY_TAB;
const cases = [], observations = {labels: [], content: [], config: []};
let borrowedDestroyed = 0;
const payload = name => ({name, destroy() {borrowedDestroyed++;}});
function labelCase(id, create, closest) {
  const template = payload('template'), container = payload('container');
  const label = create(template, container);
  assert.equal(label.templateRef, template); assert.equal(label.viewContainerRef, container);
  assert.equal(label._closestTab, closest);
  assert.ok(label instanceof Label && label instanceof peer.MatTabLabel && label instanceof portal.CdkPortal && label instanceof portal.TemplatePortal);
  observations.labels.push({id, suppliedTemplate: true, suppliedContainer: true, closestIdentity: true, publicParent: true});
  cases.push(id);
}
const tab = Object.freeze({legacyTab: true});
labelCase('manual-label-supplied-tab', (t,v) => new Label(t,v,tab), tab);
labelCase('manual-label-null-tab', (t,v) => new Label(t,v,null), null);
labelCase('manual-label-undefined-tab', (t,v) => new Label(t,v,undefined), undefined);
const ambient = core.Injector.create({providers: [{provide: core.TemplateRef, useValue: payload('wrongTemplate')}, {provide: core.ViewContainerRef, useValue: payload('wrongContainer')}]});
try {labelCase('manual-label-ignores-ambient', (t,v) => core.runInInjectionContext(ambient, () => new Label(t,v,tab)), tab);}
finally {ambient.destroy();}
for (const [id, providers, closest] of [
  ['factory-label-legacy-token', [{provide: token, useValue: tab}], tab],
  ['factory-label-optional-token', [], null],
  ['factory-label-same-description-token', [{provide: new core.InjectionToken('MAT_TAB'), useValue: tab}], null],
]) {
  const template = payload('template'), container = payload('container');
  const injector = core.Injector.create({providers: [Label, {provide: core.TemplateRef, useValue: template}, {provide: core.ViewContainerRef, useValue: container}, ...providers]});
  try {
    const label = injector.get(Label);
    assert.equal(label.templateRef, template); assert.equal(label.viewContainerRef, container); assert.equal(label._closestTab, closest);
    observations.labels.push({id, suppliedTemplate: true, suppliedContainer: true, closestIdentity: true, publicParent: true}); cases.push(id);
  } finally {injector.destroy();}
}
if (line !== 'original') {
  // A forbidden SDK token is used only as an adversarial provider. It must
  // never become a production dependency or the owned legacy identity.
  assert.notEqual(token, peer.MAT_TAB);
  const injector = core.Injector.create({providers: [Label, {provide: core.TemplateRef, useValue: payload('template')},
    {provide: core.ViewContainerRef, useValue: payload('container')}, {provide: peer.MAT_TAB, useValue: {modern: true}}]});
  try {assert.equal(injector.get(Label)._closestTab, null);} finally {injector.destroy();}
}
for (const [id, template] of [['manual-content-object', payload('template')], ['manual-content-null', null], ['manual-content-undefined', undefined]]) {
  const content = new Content(template); assert.equal(content.template, template);
  assert.ok(content instanceof Content && content instanceof peer.MatTabContent);
  observations.content.push({id, templateIdentity: true, publicParent: true}); cases.push(id);
}
const configs = [undefined, null, {},
  {animationDuration: '100ms', disablePagination: true, dynamicHeight: true, contentTabIndex: -1, preserveContent: true},
  {animationDuration: '', disablePagination: false, dynamicHeight: false, contentTabIndex: 0, preserveContent: false},
  {preserveContent: true},
  {stretchTabs: false, alignTabs: 'end', fitInkBarToContent: true},
];
for (let index = 0; index < configs.length; index++) {
  const classes = new Set();
  const element = new core.ElementRef({classList: {add(...values) {values.forEach(v => classes.add(v));}, remove(...values) {values.forEach(v => classes.delete(v));}},
    getAttribute() {return null;}, setAttribute() {}, removeAttribute() {}});
  const detector = {markForCheck() {}, detectChanges() {}};
  const group = new Group(element, detector, configs[index], 'NoopAnimations');
  observations.config.push({index, animationDuration: group.animationDuration, disablePagination: group.disablePagination,
    dynamicHeight: group.dynamicHeight, contentTabIndex: group.contentTabIndex, preserveContent: group.preserveContent});
  cases.push('manual-group-config-' + index);
}
const aliases = historical ?? owned;
assert.equal(aliases.MAT_LEGACY_TAB_CONTENT, peer.MAT_TAB_CONTENT);
assert.equal(aliases.MAT_LEGACY_TABS_CONFIG, peer.MAT_TABS_CONFIG);
if (owned) assert.equal(owned.MAT_LEGACY_TAB_LABEL, peer.MAT_TAB_LABEL);
assert.equal(borrowedDestroyed, 0);
console.log(JSON.stringify({line, mode, cases, observations, borrowedDestroyed,
  original_published_reference: line === 'original', template_container_node_detector_are_protocols: true,
  owned_label_public_factory_executed: line !== 'original', owned_content_and_group_AOT_factories_executed: false,
  private_current_token_is_adversarial_test_only: line !== 'original',
  actual_native_packed_AOT_or_full_floor_qualified: false}));
