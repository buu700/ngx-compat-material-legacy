/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Shared enabled-motion fixture; both producers observe the same actual handler. */
export const snackMotionFixture = `
@Component({
  standalone: false,
  selector: 'lab-snack-motion',
  providers: [{provide: LEGACY_ANIMATIONS_TEST_OVERRIDE, useValue: 'enabled'}],
  template: \`
    <button id="snack-motion-open" type="button" (click)="open()">Snack motion</button>
    <output id="snack-motion-state" [attr.data-entered]="entered()" [attr.data-enter-ms]="enterMs()"
      [attr.data-dismissed]="dismissed()" [attr.data-dismissed-at]="dismissedAt()"
      [attr.data-enter-delivery]="enterDelivery()" [attr.data-exit-delivery]="exitDelivery()"
      [attr.data-completed]="completed()" [attr.data-action]="action()"></output>
  \`,
})
export class SnackMotionLab {
  readonly entered = signal(0);
  readonly enterMs = signal(0);
  readonly enterDelivery = signal('none');
  readonly exitDelivery = signal('none');
  readonly dismissed = signal(0);
  readonly dismissedAt = signal(0);
  readonly completed = signal(false);
  readonly action = signal(false);
  private viewContainerRef = inject(ViewContainerRef);
  private snack = inject(MatLegacySnackBar);
  open() {
    this.entered.set(0); this.dismissed.set(0); this.completed.set(false); this.action.set(false);
    const start = performance.now();
    const ref = this.snack.open('Enabled snack motion', 'Dismiss', {duration: 0, viewContainerRef: this.viewContainerRef});
    // Observe the actual owned handler argument without changing event routing or timers.
    const container = ref.containerInstance as MatLegacySnackBarContainer;
    const handle = container.onAnimationEnd.bind(container);
    let depth = 0, delivery = 'none';
    container.onAnimationEnd = event => {
      if (depth === 0) {
        delivery = event instanceof AnimationEvent && event.isTrusted && event.target === event.currentTarget
          ? 'event' : typeof event === 'string' ? 'fallback' : 'other';
      }
      depth++;
      try {handle(event);} finally {depth--;}
    };
    ref.afterOpened().subscribe(() => {this.entered.update(value => value + 1); this.enterMs.set(performance.now() - start); this.enterDelivery.set(delivery);});
    ref.afterDismissed().subscribe({
      next: event => {this.dismissed.update(value => value + 1); this.dismissedAt.set(performance.now()); this.action.set(event.dismissedByAction); this.exitDelivery.set(delivery);},
      complete: () => this.completed.set(true),
    });
  }
}
`;
