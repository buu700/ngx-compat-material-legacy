/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {DOCUMENT, NgZone} from '@angular/core';
import {fakeAsync, flush, TestBed, tick} from '@angular/core/testing';
import {Platform} from '@angular/cdk/platform';
import {_LegacyViewport} from './legacy-viewport';

describe('owned legacy viewport', () => {
  let target: EventTarget & {innerWidth: number; innerHeight: number; scrollX: number; scrollY: number};
  let registrations: boolean[];

  beforeEach(() => {
    target = Object.assign(new EventTarget(), {innerWidth: 640, innerHeight: 480, scrollX: 1, scrollY: 2});
    registrations = [];
    const listen = target.addEventListener.bind(target);
    spyOn(target, 'addEventListener').and.callFake((type, callback, options) => {
      registrations.push(NgZone.isInAngularZone());
      listen(type, callback, options);
    });
    TestBed.configureTestingModule({providers: [
      {provide: Platform, useValue: {isBrowser: true}},
      {provide: DOCUMENT, useValue: {defaultView: target, body: {scrollTop: 3, scrollLeft: 4},
        documentElement: {getBoundingClientRect: () => ({top: -11.5, left: -17.25})}}},
    ]});
  });

  it('shares one root owner and registers both events outside Angular', () => {
    const viewport = TestBed.inject(_LegacyViewport);
    expect(TestBed.inject(_LegacyViewport)).toBe(viewport);
    expect(registrations).toEqual([false, false]);
  });

  it('preserves audited cache invalidation and geometry', fakeAsync(() => {
    const viewport = TestBed.inject(_LegacyViewport);
    expect(viewport.getViewportRect()).toEqual({top: 11.5, left: 17.25,
      bottom: 491.5, right: 657.25, height: 480, width: 640});
    target.innerWidth = 900;
    target.dispatchEvent(new Event('orientationchange'));
    tick(19);
    expect(viewport.getViewportSize().width).toBe(640);
    tick(1);
    expect(viewport.getViewportSize().width).toBe(900);
  }));

  it('removes listeners and completes its stream when the root is destroyed', fakeAsync(() => {
    const viewport = TestBed.inject(_LegacyViewport), remove = spyOn(target, 'removeEventListener').and.callThrough();
    const events: Event[] = [];
    let completed = 0;
    viewport.change(0).subscribe({next: event => events.push(event), complete: () => completed++});
    const event = new Event('resize');
    target.dispatchEvent(event);
    TestBed.resetTestingModule();
    target.dispatchEvent(new Event('orientationchange'));
    flush();
    expect(events).toEqual([event]);
    expect(completed).toBe(1);
    expect(remove.calls.allArgs().map(args => args[0])).toEqual(['resize', 'orientationchange']);
  }));
});
