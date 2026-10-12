/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import '@angular/compiler';
import {ElementRef, TemplateRef} from '@angular/core';
import {CdkNoDataRow} from '@angular/cdk/table';
import {MatLegacyNoDataRow} from './no-data-owned.mjs';
import {line, renderSource} from './no-data-input.mjs';
import {constructWithPublicDependencies} from './helper.mjs';
const render = Function('return function render() '+renderSource)();
const fixtures = [
  ['native-cell', '<tr><td>No data</td></tr>'],
  ['native-custom-cell', '<tr class="application-row"><td class="application-cell">No data</td></tr>'],
  ['flex-custom-cell', '<div><span class="cdk-cell">No data</span></div>'],
  ['custom-cdk-selector', '<div><cdk-cell class="application-cell">No data</cdk-cell><span cdk-cell>No data</span></div>'],
  ['legacy-flex-cell', '<div><mat-cell class="mat-cell">No data</mat-cell></div>'],
  ['multiple-roots', '<div>First</div><div>Second</div>'],
  ['text-root', 'No data'],
];
function require(value, message) {if (!value) throw Error(message);}
const observations = [];
try {
  for (const [id, markup] of fixtures) {
    const template = document.createElement('template'); template.innerHTML = markup;
    const roots = [...template.content.childNodes];
    const suppliedTemplate = {elementRef: new ElementRef(template)};
    const peer = () => line === 'original' ? new CdkNoDataRow(suppliedTemplate) :
      constructWithPublicDependencies(CdkNoDataRow, CdkNoDataRow, [{provide: TemplateRef, useValue: suppliedTemplate}]);
    const peerSettings = value => JSON.stringify([value._contentClassName, value._contentClassNames,
      value._cellClassNames, value._cellSelector]);
    const beforePeer = peerSettings(peer());
    const row = new MatLegacyNoDataRow(suppliedTemplate);
    require(peerSettings(peer()) === beforePeer, 'peer-default-settings-mutated');
    require(row instanceof MatLegacyNoDataRow && row instanceof CdkNoDataRow, 'public-parent-or-owned-prototype');
    require(row.templateRef === suppliedTemplate, 'original-template-identity');
    let creations = 0, clears = 0, marks = 0;
    const state = {_customNoDataRow: null, _noDataRow: row, _rowOutlet: {viewContainer: {length: 0}},
      _noDataRowOutlet: {viewContainer: {createEmbeddedView(value) {
        require(value === suppliedTemplate, 'renderer-template-identity'); creations++; return {rootNodes: roots};
      }, clear() {clears++;}}}, _document: document, _isShowingNoDataRow: false,
      _changeDetectorRef: {markForCheck() {marks++;}}};
    render.call(state); render.call(state);
    require(creations === 1 && marks === 1 && state._isShowingNoDataRow, 'single-empty-view');
    const html = roots.map(node => node.nodeType === 1 ? node.outerHTML : node.textContent).join('');
    state._rowOutlet.viewContainer.length = 1; render.call(state); render.call(state);
    require(clears === 1 && marks === 2 && !state._isShowingNoDataRow, 'remove-on-data-and-no-extra-clear');
    state._rowOutlet.viewContainer.length = 0; render.call(state);
    require(creations === 2 && marks === 3 && state._isShowingNoDataRow, 'restore-on-empty');
    observations.push({id, html, creations, clears, marks, manual_template_and_public_parent: true,
      public_peer_defaults_unchanged: true});
  }
  document.getElementById('report').textContent = JSON.stringify({line, observations,
    native_DOM: true, genuine_public_CdkNoDataRow: true, actual_owned_constructor: true,
    renderer_scope: 'Whole authentic CdkTable renderer method replayed with explicit embedded-view/outlet/change-detector protocols; not an actual complete CdkTable or Angular node/AOT/packed instance.'});
} catch (error) {document.getElementById('report').textContent = JSON.stringify({line, error: String(error.stack || error)});}
