/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {ChangeDetectorRef, ElementRef} from '@angular/core';
import {fakeAsync, tick} from '@angular/core/testing';
import {CdkPortalOutlet} from '@angular/cdk/portal';
import {_MatTabBodyBase, captureActiveTabBodyTransforms} from './internal/tab-body-base';

class ReversalBody extends _MatTabBodyBase {
  _portalHost = null! as CdkPortalOutlet;
}

describe('legacy tab body transition reversals', () => {
  function setup(duration = '80ms', rtl = false) {
    const wrapper = document.createElement('div');
    const host = document.createElement('div');
    const content = document.createElement('div');
    host.className = 'mat-tab-body';
    content.className = 'mat-tab-body-content';
    host.appendChild(content);
    wrapper.appendChild(host);
    document.body.appendChild(wrapper);
    const detector = {markForCheck() {}} as ChangeDetectorRef;
    const direction = rtl ? {value: 'rtl', change: {subscribe: () => ({unsubscribe() {}})}} as any : null!;
    const body = new ReversalBody(new ElementRef(host), direction, detector);
    spyOn(body as any, '_transitionClock').and.callFake(() => Date.now());
    body._contentElement = new ElementRef(content);
    body.animationDuration = duration;
    body.position = 0;
    body.ngOnInit();
    const events: {fromState: string; toState: string}[] = [];
    body._translateTabComplete.subscribe(event => events.push(event));
    const capture = () => captureActiveTabBodyTransforms(wrapper);
    const end = () => body._onContentTransitionEnd({target: content, propertyName: 'transform'} as any);
    const destroy = () => { body.ngOnDestroy(); wrapper.remove(); };
    return {body, content, events, capture, end, destroy};
  }

  it('ignores an old end after reversal and completes the latest transition once', fakeAsync(() => {
    const x = setup(); tick(20); x.events.length = 0;
    x.body.position = 1; x.capture(); x.body.position = 0; x.end();
    expect(x.events.length).toBe(0);
    tick(90); x.end(); x.end(); tick(20);
    expect(x.events).toEqual([{fromState: 'right', toState: 'center'}]);
    expect(x.content.style.transform).toBe('');
    x.destroy();
  }));

  it('uses the monotonic deadline with a one-frame early-delivery tolerance', fakeAsync(() => {
    const x = setup(); tick(20); x.events.length = 0;
    let clock = 1000;
    (x.body as any)._transitionClock.and.callFake(() => clock);
    x.body.position = 1; x.capture(); x.body.position = 0;
    clock = 1063; x.end();
    expect(x.events.length).toBe(0);
    clock = 1064; x.end();
    expect(x.events).toEqual([{fromState: 'right', toState: 'center'}]);
    x.destroy();
  }));

  it('restarts repeated reversals and hides the departing pane', fakeAsync(() => {
    const x = setup(); tick(20); x.events.length = 0;
    x.body.position = 1; x.capture(); x.body.position = 0; tick(20);
    x.capture(); x.body.position = 1; x.end();
    expect(x.events.length).toBe(0);
    tick(90); x.end(); tick(10);
    expect(x.events).toEqual([{fromState: 'center', toState: 'right'}]);
    expect(x.content.style.visibility).toBe('hidden');
    expect(x.content.style.transform).toBe('');
    x.destroy();
  }));

  for (const rtl of [false, true]) {
    it(`retargets an owned departure across the middle pane in ${rtl ? 'RTL' : 'LTR'}`, fakeAsync(() => {
      const x = setup('80ms', rtl); tick(20); x.events.length = 0;
      let leftCenter = 0;
      x.body._afterLeavingCenter.subscribe(() => leftCenter++);
      x.body.position = 1; x.capture(); x.body.position = 0;
      x.capture(); x.body.position = 1; x.capture(); x.body.position = -1;
      expect(x.content.style.transform).toContain(rtl ? '100%' : '-100%');
      x.end(); expect(x.events.length).toBe(0);
      tick(90); x.end(); tick(20);
      expect(x.events.length).toBe(1);
      expect(x.events[0].fromState).toBe('center');
      expect(x.events[0].toState).toBe(rtl ? 'right' : 'left');
      expect(leftCenter).toBe(1);
      expect(x.content.style.visibility).toBe('hidden');
      expect(x.content.style.transform).toBe('');
      x.destroy();
    }));
  }

  it('releases an owned departure target when direction changes without a capture', fakeAsync(() => {
    const x = setup(); tick(20); x.events.length = 0;
    x.body.position = 1; x.capture(); x.body.position = 0;
    x.capture(); x.body.position = 1;
    expect(x.content.style.transform).toContain('100%');
    (x.body as any)._computePositionAnimationState('rtl');
    expect(x.body._position).toBe('left');
    expect(x.content.style.transform).toBe('');
    x.end();
    expect(x.events.length).toBe(0);
    tick(200);
    expect(x.events.length).toBe(1);
    expect(x.events[0]).toEqual({fromState: 'center', toState: 'left'});
    x.destroy();
  }));

  it('ignores a queued old end when consumer styles prevent the restart', fakeAsync(() => {
    const x = setup(); tick(20); x.events.length = 0;
    x.body.position = 1;
    x.content.style.transitionProperty = 'opacity';
    x.capture(); x.body.position = 0;
    x.end(); expect(x.events.length).toBe(0);
    expect(x.content.style.transitionProperty).toBe('opacity');
    tick(200);
    expect(x.events).toEqual([{fromState: 'right', toState: 'center'}]);
    x.destroy();
  }));

  it('keeps replacement completion immediate when motion is disabled', fakeAsync(() => {
    const x = setup('0ms'); tick(20); x.events.length = 0;
    x.body.position = 1; x.body.position = 0;
    tick(0);
    expect(x.events).toEqual([{fromState: 'right', toState: 'center'}]);
    x.destroy();
  }));

  it('preserves consumer styles installed by a failed layout callback', fakeAsync(() => {
    const x = setup(); tick(20); x.body.position = 1; x.capture(); x.body.position = 0;
    x.capture(); x.body.position = 1; x.capture();
    spyOn(x.content, 'getBoundingClientRect').and.callFake(() => {
      x.content.style.transitionProperty = 'opacity';
      x.content.style.transform = 'scale(0.7)';
      throw new Error('layout failed');
    });
    x.body.position = -1;
    expect(x.content.style.transitionProperty).toBe('opacity');
    expect(x.content.style.transform).toBe('scale(0.7)');
    x.events.length = 0; x.end();
    expect(x.events.length).toBe(0);
    tick(200);
    expect(x.events).toEqual([{fromState: 'center', toState: 'left'}]);
    x.destroy();
    expect(x.content.style.transform).toBe('scale(0.7)');
  }));

  it('does not overwrite consumer styles when layout destroys the body', fakeAsync(() => {
    const x = setup(); tick(20); x.body.position = 1; x.capture();
    spyOn(x.content, 'getBoundingClientRect').and.callFake(() => {
      x.body.ngOnDestroy();
      x.content.style.transitionProperty = 'opacity';
      x.content.style.transform = 'scale(0.7)';
      return {} as DOMRect;
    });
    x.body.position = 0;
    expect(x.content.style.transitionProperty).toBe('opacity');
    expect(x.content.style.transform).toBe('scale(0.7)');
    x.end(); tick(200);
    x.content.parentElement!.parentElement!.remove();
  }));

  it('keeps a newer position and consumer styles after layout reentry', fakeAsync(() => {
    const x = setup(); tick(20); x.body.position = 1; x.capture();
    spyOn(x.content, 'getBoundingClientRect').and.callFake(() => {
      x.body.position = -1;
      x.content.style.transitionProperty = 'opacity';
      x.content.style.transform = 'scale(0.7)';
      return {} as DOMRect;
    });
    x.body.position = 0;
    expect(x.body._position).toBe('left');
    expect(x.content.style.transitionProperty).toBe('opacity');
    expect(x.content.style.transform).toBe('scale(0.7)');
    x.destroy(); tick(200);
  }));

  it('cancels pending completion and restores owned styles on destroy', fakeAsync(() => {
    const x = setup(); tick(20); x.events.length = 0;
    x.body.position = 1; x.capture(); x.body.position = 0;
    expect(x.content.style.transform).not.toBe('');
    x.body.ngOnDestroy(); x.end(); tick(200);
    expect(x.events.length).toBe(0);
    expect(x.content.style.transform).toBe('');
    x.content.parentElement!.parentElement!.remove();
  }));

  it('finishes without a native event and leaves consumer inline styles alone', fakeAsync(() => {
    const x = setup('30ms'); tick(20); x.events.length = 0;
    x.body.position = 1; x.capture(); x.body.position = 0; tick(160);
    expect(x.events).toEqual([{fromState: 'right', toState: 'center'}]);
    expect(x.content.style.transform).toBe('');
    x.body.position = 1; x.content.style.transform = 'scale(0.9)';
    x.capture(); x.body.position = 0;
    expect(x.content.style.transform).toBe('scale(0.9)');
    x.destroy();
  }));

  it('keeps the zero duration completion path', fakeAsync(() => {
    const x = setup('0ms'); tick(20); x.events.length = 0;
    x.body.position = 1; tick(20);
    expect(x.events).toEqual([{fromState: 'center', toState: 'right'}]);
    expect(x.content.style.transform).toBe('');
    x.destroy();
  }));
});
