/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import '@angular/compiler';
import {ElementRef} from '@angular/core';
import {CdkColumnDef, CdkHeaderCell, CdkFooterCell, CdkCell} from '@angular/cdk/table';
import * as owned from './owned-cells.mjs';
import {constructWithPublicDependencies} from './helper.mjs';
import * as classes from './column-classes.mjs';
import {line} from './input.mjs';
const require = (v, message) => {if (!v) throw Error(message);};
const names = ['alpha', 'value_2', 'Upper-Case', 'a.b c', 'ümlaut/column', '0'];
const kinds = [['header', owned.MatLegacyHeaderCell, CdkHeaderCell, 'th'],
  ['footer', owned.MatLegacyFooterCell, CdkFooterCell, 'td'], ['data', owned.MatLegacyCell, CdkCell, 'td']];
const results = [];
const rawColumn = () => line === 'original' ? new CdkColumnDef() :
  constructWithPublicDependencies(CdkColumnDef, CdkColumnDef, []);
const rawCell = (Type, column, ref) => line === 'original' ? new Type(column, ref) :
  constructWithPublicDependencies(Type, Type, [{provide: CdkColumnDef, useValue: column}, {provide: ElementRef, useValue: ref}]);
try {
  for (const name of names) {
    const table = {ngOnDestroy() {throw Error('borrowed-table-destroyed');}};
    require(new owned.MatLegacyColumnDef(table)._table === table, 'supplied-table-identity');
    const column = new owned.MatLegacyColumnDef();
    require(column instanceof owned.MatLegacyColumnDef && column instanceof CdkColumnDef, 'column-prototypes');
    column.name = name;
    for (const [kind, Type, Peer, nativeTag] of kinds) for (const tag of [nativeTag, 'mat-' + (kind === 'data' ? 'cell' : kind + '-cell')]) {
      const element = document.createElement(tag); element.className = 'application-cell';
      const ref = new ElementRef(element), cell = new Type(column, ref);
      require(cell instanceof Type && cell instanceof Peer, 'owned-cell-prototypes');
      results.push({name, kind, mode: 'owned', tag, classes: element.className});
    }
    for (const [kind, , Peer, nativeTag] of kinds) for (const tag of [nativeTag, 'cdk-' + (kind === 'data' ? 'cell' : kind + '-cell')]) {
      const element = document.createElement(tag); element.className = 'application-cell';
      const ref = new ElementRef(element); rawCell(Peer, column, ref);
      if (line !== 'original') new classes._LegacyTableColumnClasses(ref, column);
      results.push({name, kind, mode: 'mixed-cdk', tag, classes: element.className});
    }
    const peer = rawColumn(); peer.name = name;
    for (const [kind, Type, Peer, tag] of kinds) {
      const element = document.createElement(tag); element.className = 'application-cell'; const ref = new ElementRef(element);
      new Type(peer, ref);
      if (line !== 'original') new classes._LegacyTableColumnClasses(ref, peer);
      require(!element.className.includes('mat-column-'), 'raw-peer-column-contaminated');
      results.push({name, kind, mode: 'raw-peer-column', tag, classes: element.className});
    }
    column.name = 'renamed'; column.name = '';
    require(column.name === 'renamed', 'historical-empty-name-ignored');
    const next = document.createElement('td'); new owned.MatLegacyCell(column, new ElementRef(next));
    results.push({name, kind: 'data', mode: 'renamed', tag: 'td', classes: next.className});
  }
  document.getElementById('report').textContent = JSON.stringify({line, results,
    scope: 'Complete actual owned/untouched classes and genuine public parent constructors, real Chromium class lists and explicit ElementRef/table values. Private interop directive is manually constructed; actual Angular node/module/packed application and runtime floors remain separate.'});
} catch (error) {document.getElementById('report').textContent = JSON.stringify({line, error: String(error.stack || error)});}
