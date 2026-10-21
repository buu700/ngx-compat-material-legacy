/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Shared input fixtures against independently loaded tagged/owned complete constructors. */
import assert from 'node:assert/strict';

export function configurationConstructorCases({core, port, classes, PaginatorIntl}) {
  const cases = [], observations = {};
  let marks = 0;
  const cdr = {markForCheck() {marks++;}}, intl = new PaginatorIntl();
  const control = new classes.Paginator(intl, cdr, {pageSize: 10, pageSizeOptions: [5, 10, 25],
    hidePageSize: false, showFirstLastButtons: true, formFieldAppearance: 'legacy'});
  control.length = 30;
  control.ngOnInit();
  assert.equal(control._intl, intl);
  assert.equal(control._formFieldAppearance, 'legacy');
  const events = [], subscription = control.page.subscribe(event => events.push(event));
  control.nextPage();
  assert.deepEqual(events, [{previousPageIndex: 0, pageIndex: 1, pageSize: 10, length: 30}],
    'owned-paginator-page-event-shape');
  const before = marks;
  intl.changes.next();
  assert.equal(marks, before + 1, 'owned-paginator-intl-change-marks-view');
  control.ngOnDestroy();
  const stopped = marks;
  intl.changes.next();
  assert.equal(marks, stopped, 'owned-paginator-destroy-unsubscribes-intl');
  subscription.unsubscribe();
  observations.paginator = {ownerIntlIdentity: true, historicalAppearance: 'legacy',
    typedPageEvent: events[0], changeNotification: true, teardown: true};
  cases.push('complete-paginator-constructor-defaults-and-page-event', 'complete-paginator-intl-notification-and-teardown');

  const config = new classes.SnackConfig();
  assert.equal(config.politeness, 'assertive', 'owned-snack-config-retains-assertive');
  observations.snackConfig = Object.fromEntries(['politeness', 'announcementMessage', 'duration',
    'horizontalPosition', 'verticalPosition', 'data'].map(key => [key, config[key]]));
  cases.push('complete-snack-config-constructor-defaults');

  const zone = new core.NgZone({enableLongStackTrace: false});
  const path = {value: '/route(a)?query=x#ignored'};
  const location = {getPathname: () => path.value};
  const bar = new classes.ProgressBar(new core.ElementRef(port.make('mat-progress-bar')), zone,
    'NoopAnimations', location, {color: 'warn', mode: 'buffer'}, cdr);
  assert.equal(bar.color, 'warn', 'owned-progress-bar-default-color');
  assert.equal(bar.mode, 'buffer');
  assert.equal(bar._isNoopAnimation, true);
  assert.equal(bar._rectangleFillValue, `url('/route(a)?query=x#${bar.progressbarId}')`);
  observations.progressBar = {color: bar.color, mode: bar.mode, noop: bar._isNoopAnimation,
    fill: bar._rectangleFillValue.replace(bar.progressbarId, '<id>')};
  bar.ngOnDestroy();
  cases.push('complete-progress-bar-constructor-location-and-defaults');

  const instances = [];
  for (const [name, force] of [['mat-progress-spinner', false], ['mat-spinner', true]]) {
    const spinner = new classes.ProgressSpinner(new core.ElementRef(port.make(name)), {isBrowser: false},
      port.document, 'NoopAnimations', {color: 'warn', diameter: 64, strokeWidth: 3, _forceAnimations: force});
    instances.push(spinner);
    assert.equal(spinner.color, 'warn');
    assert.equal(spinner.diameter, 64);
    assert.equal(spinner.strokeWidth, 3);
    assert.equal(spinner._noopAnimations, !force, 'owned-spinner-force-animation-option');
    assert.equal(spinner.mode, name === 'mat-spinner' ? 'indeterminate' : 'determinate');
  }
  observations.progressSpinner = instances.map(spinner => ({color: spinner.color,
    diameter: spinner.diameter, strokeWidth: spinner.strokeWidth, noop: spinner._noopAnimations, mode: spinner.mode}));
  for (const spinner of instances) spinner.ngOnDestroy();
  cases.push('complete-spinner-constructor-dimensions-and-noop-defaults', 'complete-spinner-alias-and-force-option');
  return {cases, observations};
}
