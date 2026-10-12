/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import '@angular/compiler';
import assert from 'node:assert/strict';
import {ReplaySubject, Subject} from 'rxjs';
import {_MatTableDataSource} from './data-source.mjs';
import {MatLegacyTableDataSource} from './legacy-data-source.mjs';
import {DataSource} from '@angular/cdk/collections';

export async function observe() {
  const results = [], record = (name, value) => results.push({name, value});
  const rows = [{id: 'a', value: '10', label: 'Alpha'}, {id: 'b', value: '2', label: 'Beta'},
    {id: 'c', value: null, label: 'Gamma'}, {id: 'd', value: '2', label: 'Delta'}];
  const source = new MatLegacyTableDataSource(rows), emissions = [];
  assert.ok(source instanceof _MatTableDataSource && source instanceof DataSource);
  record('public-facade-identity', true);
  const subscription = source.connect().subscribe(data => emissions.push(data.map(r => r.id)));
  const settle = async () => {await Promise.resolve(); await Promise.resolve();};
  const state = name => record(name, {last: emissions.at(-1), count: emissions.length,
    filtered: source.filteredData.map(r => r.id), original: rows.map(r => r.id)});
  state('connect');
  source.filter = ' ALPHA '; state('trim-and-case');
  source.filter = ''; state('clear-filter');
  record('cross-property-filter', source.filterPredicate({a: 'Flute', b: 'Stop'}, 'Test'));
  assert.equal(results.at(-1).value, false);
  record('accessor', [null, undefined, '', ' ', false, true, '123hello', '0', '-4', '1.5',
    '9007199254740991', '9007199254740992', '-9007199254740992'].map(value => {
    const result = source.sortingDataAccessor({value}, 'value');
    return {input: value === undefined ? '<undefined>' : value, type: typeof result,
      value: result === undefined ? '<undefined>' : result};
  }));
  assert.equal(source.sortingDataAccessor({value: null}, 'value'), null);
  assert.equal(source.sortingDataAccessor({value: '2'}, 'value'), 2);
  const sort = {active: 'value', direction: 'asc', sortChange: new Subject(), initialized: new ReplaySubject(1)};
  source.sort = sort; state('sort-awaits-initialization');
  sort.initialized.next(); state('sort-ascending');
  assert.deepEqual(emissions.at(-1), ['c', 'b', 'd', 'a']);
  assert.deepEqual(rows.map(r => r.id), ['a', 'b', 'c', 'd']);
  sort.direction = 'desc'; sort.sortChange.next({active: 'value', direction: 'desc'}); state('sort-descending');
  sort.direction = ''; sort.sortChange.next({active: 'value', direction: ''}); state('disabled-sort');
  const paginator = {page: new Subject(), initialized: new ReplaySubject(1), pageIndex: 0,
    pageSize: 2, length: 0, firstPage() {}, lastPage() {}};
  source.paginator = paginator; await settle(); state('page-awaits-initialization');
  paginator.initialized.next(); await settle(); state('first-page');
  assert.equal(paginator.length, 4); assert.deepEqual(emissions.at(-1), ['a', 'b']);
  paginator.pageIndex = 1; paginator.page.next({pageIndex: 1, pageSize: 2, length: 4}); state('second-page');
  source.filter = 'alpha'; await settle(); state('filter-clamps-page');
  assert.equal(paginator.pageIndex, 0); assert.equal(paginator.length, 1);
  assert.deepEqual(emissions.at(-1), ['a']);
  source.filter = 'absent'; await settle(); state('empty-filtered-page');
  source.filter = ''; await settle(); state('restore-data');
  source.filterPredicate = (row, filter) => row.id === filter;
  source.filter = 'b'; await settle(); state('custom-filter');
  source.filter = ''; source.sortingDataAccessor = row => -Number(row.value || 0);
  sort.direction = 'asc'; sort.sortChange.next({active: 'value', direction: 'asc'});
  await settle(); state('custom-accessor');
  source.sortData = data => data.reverse(); source.data = [...rows]; await settle(); state('custom-sort');
  const previous = emissions.length;
  source.paginator = null; source.sort = null; await settle(); state('detach-controls');
  const detached = emissions.length; paginator.page.next(); sort.sortChange.next(); await settle();
  assert.equal(emissions.length, detached); state('old-controls-ignored');
  assert.ok(previous < detached);
  source.disconnect(); assert.equal(source._renderChangesSubscription, null);
  const disconnected = emissions.length;
  source.data = [{id: 'e', value: 3, label: 'Epsilon'}]; source.filter = 'e'; await settle();
  assert.equal(emissions.length, disconnected); state('disconnected');
  assert.equal(source.connect(), source.connect()); await settle(); state('reconnect');
  assert.deepEqual(emissions.at(-1), ['e']);
  source.data = null; await settle(); state('invalid-array'); assert.deepEqual(source.data, []);
  subscription.unsubscribe(); source.disconnect(); source.disconnect();
  record('idempotent-disconnect', source._renderChangesSubscription === null);
  return results;
}
observe().then(results => console.log(JSON.stringify({results}))).catch(error => {
  console.error(error.stack); process.exitCode = 1;
});
