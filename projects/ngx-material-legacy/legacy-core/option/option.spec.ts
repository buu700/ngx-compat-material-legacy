/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {waitForAsync, ComponentFixture, TestBed} from '@angular/core/testing';
import {ANIMATION_MODULE_TYPE, Component, DebugElement} from '@angular/core';
import {MatLegacyPseudoCheckbox, LEGACY_ANIMATIONS_TEST_OVERRIDE, MATERIAL_ANIMATIONS} from '@ngx-compat/material-legacy/legacy-core';
import {By} from '@angular/platform-browser';
import {
  dispatchFakeEvent,
  dispatchKeyboardEvent,
  createKeyboardEvent,
  dispatchEvent,
} from '../../../cdk/testing/private';
import {SPACE, ENTER} from '@angular/cdk/keycodes';
import {MatLegacyOption, MatLegacyOptionModule, MAT_LEGACY_OPTION_PARENT_COMPONENT} from './index';

describe('MatLegacyOption component', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatLegacyOptionModule],
      declarations: [BasicOption],
    }).compileComponents();
  }));

  it('should complete the `stateChanges` stream on destroy', () => {
    const fixture = TestBed.createComponent(BasicOption);
    fixture.detectChanges();

    const optionInstance: MatLegacyOption = fixture.debugElement.query(
      By.directive(MatLegacyOption),
    )!.componentInstance;
    const completeSpy = jasmine.createSpy('complete spy');
    const subscription = optionInstance._stateChanges.subscribe({complete: completeSpy});

    fixture.destroy();
    expect(completeSpy).toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('should not emit to `onSelectionChange` if selecting an already-selected option', () => {
    const fixture = TestBed.createComponent(BasicOption);
    fixture.detectChanges();

    const optionInstance: MatLegacyOption = fixture.debugElement.query(
      By.directive(MatLegacyOption),
    )!.componentInstance;

    optionInstance.select();
    expect(optionInstance.selected).toBe(true);

    const spy = jasmine.createSpy('selection change spy');
    const subscription = optionInstance.onSelectionChange.subscribe(spy);

    optionInstance.select();
    fixture.detectChanges();

    expect(optionInstance.selected).toBe(true);
    expect(spy).not.toHaveBeenCalled();

    subscription.unsubscribe();
  });

  it('should not emit to `onSelectionChange` if deselecting an unselected option', () => {
    const fixture = TestBed.createComponent(BasicOption);
    fixture.detectChanges();

    const optionInstance: MatLegacyOption = fixture.debugElement.query(
      By.directive(MatLegacyOption),
    )!.componentInstance;

    optionInstance.deselect();
    expect(optionInstance.selected).toBe(false);

    const spy = jasmine.createSpy('selection change spy');
    const subscription = optionInstance.onSelectionChange.subscribe(spy);

    optionInstance.deselect();
    fixture.detectChanges();

    expect(optionInstance.selected).toBe(false);
    expect(spy).not.toHaveBeenCalled();

    subscription.unsubscribe();
  });

  it('should be able to set a custom id', () => {
    const fixture = TestBed.createComponent(BasicOption);

    fixture.componentInstance.id = 'custom-option';
    fixture.detectChanges();

    const optionInstance = fixture.debugElement.query(
      By.directive(MatLegacyOption),
    )!.componentInstance;

    expect(optionInstance.id).toBe('custom-option');
  });

  it('should select the option when pressing space', () => {
    const fixture = TestBed.createComponent(BasicOption);
    fixture.detectChanges();

    const optionDebugElement = fixture.debugElement.query(By.directive(MatLegacyOption))!;
    const optionNativeElement: HTMLElement = optionDebugElement.nativeElement;
    const optionInstance: MatLegacyOption = optionDebugElement.componentInstance;
    const spy = jasmine.createSpy('selection change spy');
    const subscription = optionInstance.onSelectionChange.subscribe(spy);

    const event = dispatchKeyboardEvent(optionNativeElement, 'keydown', SPACE);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    subscription.unsubscribe();
  });

  it('should select the option when pressing enter', () => {
    const fixture = TestBed.createComponent(BasicOption);
    fixture.detectChanges();

    const optionDebugElement = fixture.debugElement.query(By.directive(MatLegacyOption))!;
    const optionNativeElement: HTMLElement = optionDebugElement.nativeElement;
    const optionInstance: MatLegacyOption = optionDebugElement.componentInstance;
    const spy = jasmine.createSpy('selection change spy');
    const subscription = optionInstance.onSelectionChange.subscribe(spy);

    const event = dispatchKeyboardEvent(optionNativeElement, 'keydown', ENTER);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    subscription.unsubscribe();
  });

  it('should not do anything when pressing the selection keys with a modifier', () => {
    const fixture = TestBed.createComponent(BasicOption);
    fixture.detectChanges();

    const optionDebugElement = fixture.debugElement.query(By.directive(MatLegacyOption))!;
    const optionNativeElement: HTMLElement = optionDebugElement.nativeElement;
    const optionInstance: MatLegacyOption = optionDebugElement.componentInstance;
    const spy = jasmine.createSpy('selection change spy');
    const subscription = optionInstance.onSelectionChange.subscribe(spy);

    [ENTER, SPACE].forEach(key => {
      const event = createKeyboardEvent('keydown', key, undefined, {shift: true});
      dispatchEvent(optionNativeElement, event);
      fixture.detectChanges();

      expect(event.defaultPrevented).toBe(false);
    });

    expect(spy).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  describe('ripples', () => {
    let fixture: ComponentFixture<BasicOption>;
    let optionDebugElement: DebugElement;
    let optionNativeElement: HTMLElement;
    let optionInstance: MatLegacyOption;

    beforeEach(() => {
      fixture = TestBed.createComponent(BasicOption);
      fixture.detectChanges();

      optionDebugElement = fixture.debugElement.query(By.directive(MatLegacyOption))!;
      optionNativeElement = optionDebugElement.nativeElement;
      optionInstance = optionDebugElement.componentInstance;
    });

    it('should show ripples by default', () => {
      expect(optionInstance.disableRipple)
        .withContext('Expected ripples to be enabled by default')
        .toBeFalsy();
      expect(optionNativeElement.querySelectorAll('.mat-ripple-element').length)
        .withContext('Expected no ripples to show up initially')
        .toBe(0);

      dispatchFakeEvent(optionNativeElement, 'mousedown');
      dispatchFakeEvent(optionNativeElement, 'mouseup');

      expect(optionNativeElement.querySelectorAll('.mat-ripple-element').length)
        .withContext('Expected one ripple to show up after a fake click.')
        .toBe(1);
    });

    it('should not show ripples if the option is disabled', () => {
      expect(optionNativeElement.querySelectorAll('.mat-ripple-element').length)
        .withContext('Expected no ripples to show up initially')
        .toBe(0);

      fixture.componentInstance.disabled = true;
      fixture.detectChanges();

      dispatchFakeEvent(optionNativeElement, 'mousedown');
      dispatchFakeEvent(optionNativeElement, 'mouseup');

      expect(optionNativeElement.querySelectorAll('.mat-ripple-element').length)
        .withContext('Expected no ripples to show up after click on a disabled option.')
        .toBe(0);
    });
  });

  it('should have a focus indicator', () => {
    const fixture = TestBed.createComponent(BasicOption);
    const optionNativeElement = fixture.debugElement.query(
      By.directive(MatLegacyOption),
    )!.nativeElement;

    expect(optionNativeElement.classList.contains('mat-focus-indicator')).toBe(true);
  });

  describe('inside inert group', () => {
    let fixture: ComponentFixture<InsideGroup>;

    beforeEach(waitForAsync(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [MatLegacyOptionModule],
        declarations: [InsideGroup],
        providers: [
          {
            provide: MAT_LEGACY_OPTION_PARENT_COMPONENT,
            useValue: {inertGroups: true},
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(InsideGroup);
      fixture.detectChanges();
    }));

    it('should remove all accessibility-related attributes from the group', () => {
      const group: HTMLElement = fixture.nativeElement.querySelector('mat-optgroup');
      expect(group.hasAttribute('role')).toBe(false);
      expect(group.hasAttribute('aria-disabled')).toBe(false);
      expect(group.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('should mirror the group label inside the option', () => {
      const option: HTMLElement = fixture.nativeElement.querySelector('mat-option');
      expect(option.textContent?.trim()).toBe('Option(Group)');
    });
  });
});

@Component({
  template: `<mat-option [id]="id" [disabled]="disabled"></mat-option>`,
})
class BasicOption {
  disabled: boolean;
  id: string;
}

@Component({
  template: `
    <mat-optgroup label="Group">
      <mat-option>Option</mat-option>
    </mat-optgroup>
  `,
})
class InsideGroup {}


describe('owned pseudo-checkbox construction and motion', () => {
  it('preserves the historical optional constructor outside Angular', () => {
    expect(new MatLegacyPseudoCheckbox()._animationMode).toBeUndefined();
    expect(new MatLegacyPseudoCheckbox('NoopAnimations')._animationMode).toBe('NoopAnimations');
  });

  it('keeps historical host classes, mutable mode and independent view lifetimes', () => {
    TestBed.configureTestingModule({imports: [MatLegacyPseudoCheckbox], providers: [
      {provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations'},
      {provide: LEGACY_ANIMATIONS_TEST_OVERRIDE, useValue: 'enabled'},
    ]});
    const first = TestBed.createComponent(MatLegacyPseudoCheckbox);
    const second = TestBed.createComponent(MatLegacyPseudoCheckbox);
    const element = first.nativeElement as HTMLElement;
    first.componentRef.setInput('state', 'checked');
    first.componentRef.setInput('disabled', true);
    first.detectChanges();
    expect(first.componentInstance._animationMode).toBe('NoopAnimations');
    expect(element.classList.contains('mat-pseudo-checkbox')).toBe(true);
    expect(element.classList.contains('mat-pseudo-checkbox-checked')).toBe(true);
    expect(element.classList.contains('mat-pseudo-checkbox-disabled')).toBe(true);
    expect(element.classList.contains('_mat-animation-noopable')).toBe(true);
    first.componentInstance._animationMode = 'BrowserAnimations';
    first.componentRef.setInput('state', 'indeterminate');
    first.componentRef.setInput('disabled', false);
    first.componentRef.setInput('appearance', 'minimal');
    first.detectChanges();
    expect(element.classList.contains('_mat-animation-noopable')).toBe(false);
    expect(element.classList.contains('mat-pseudo-checkbox-checked')).toBe(false);
    expect(element.classList.contains('mat-pseudo-checkbox-disabled')).toBe(false);
    expect(element.classList.contains('mat-pseudo-checkbox-indeterminate')).toBe(true);
    expect(element.classList.contains('mat-pseudo-checkbox-minimal')).toBe(true);
    first.destroy();
    expect(second.componentRef.hostView.destroyed).toBe(false);
    second.detectChanges();
    second.destroy();
  });

  it('retains the existing public Material motion-disable policy', () => {
    TestBed.configureTestingModule({imports: [MatLegacyPseudoCheckbox], providers: [
      {provide: ANIMATION_MODULE_TYPE, useValue: 'BrowserAnimations'},
      {provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}},
    ]});
    const fixture = TestBed.createComponent(MatLegacyPseudoCheckbox);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('_mat-animation-noopable')).toBe(true);
    fixture.destroy();
  });
});
