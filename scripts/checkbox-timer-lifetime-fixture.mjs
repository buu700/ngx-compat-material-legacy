/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual Angular view/input handlers and native CSS/timers; no private member access. */
export const checkboxTimerLifetimeFixture = `
@Component({
  standalone: false,
  selector: 'lab-checkbox-timer-lifetime',
  template: \`<ng-template #probe><mat-checkbox labCaptureCheckboxTimer>Timer lifetime</mat-checkbox></ng-template>
    <output>{{result()}}</output>\`,
})
export class CheckboxTimerLifetimeLab {
  @ViewChild('probe', {read: TemplateRef, static: true}) template!: TemplateRef<unknown>;
  @ViewChild('probe', {read: ViewContainerRef, static: true}) outlet!: ViewContainerRef;
  readonly result = signal('');
  private readonly injector = inject(Injector);
  private captured?: {checkbox: MatLegacyCheckbox; initialized: boolean};
  private running = false;
  register(checkbox: MatLegacyCheckbox) {
    const captured = {checkbox, initialized: false};
    this.captured = captured;
    return () => {captured.initialized = true;};
  }
  async run() {
    if (this.running) throw new Error('checkbox timer fixture already running');
    this.running = true;
    const views: ReturnType<ViewContainerRef['createEmbeddedView']>[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const renders: {destroy(): void}[] = [];
    let observer: MutationObserver | undefined;
    let removeAnimationListener: (() => void) | undefined;
    const sleep = (ms: number) => new Promise<void>(resolve => {
      const timer = setTimeout(() => {timers.delete(timer); resolve();}, ms);
      timers.add(timer);
    });
    const animationClass = 'mat-checkbox-anim-unchecked-checked';
    const create = async () => {
      this.captured = undefined;
      const view = this.outlet.createEmbeddedView(this.template);
      views.push(view);
      const rendered = new Promise<void>((resolve, reject) => {
        const deadline = setTimeout(() => reject(new Error('checkbox view render deadline exceeded')), 500);
        timers.add(deadline);
        renders.push(afterNextRender(() => {clearTimeout(deadline); timers.delete(deadline); resolve();}, {injector: this.injector}));
      });
      this.result.set('initializing checkbox ' + views.length);
      await rendered;
      const captured = this.captured as {checkbox: MatLegacyCheckbox; initialized: boolean} | undefined;
      const host = view.rootNodes.find(node => node instanceof HTMLElement) as HTMLElement | undefined;
      const input = host?.querySelector<HTMLInputElement>('input.mat-checkbox-input');
      if (!captured?.initialized || !host?.isConnected || !input || captured.checkbox.checked) {
        throw new Error('actual unchecked checkbox view did not initialize');
      }
      return {view, host, input, captured};
    };
    try {
      const live = await create();
      live.input.click();
      const first = performance.now();
      if (!live.captured.checkbox.checked || !live.host.classList.contains(animationClass)) {
        throw new Error('first input click did not start the historical checked transition');
      }
      await sleep(850);
      live.input.click();
      const unchecked = !live.captured.checkbox.checked;
      await sleep(50);
      const path = live.host.querySelector<SVGPathElement>('.mat-checkbox-checkmark-path');
      if (!path) throw new Error('historical checkmark path missing');
      let trustedEnds = 0;
      let animationElapsed = 0;
      const ended = (event: AnimationEvent) => {
        if (event.target === path && event.isTrusted && event.animationName === 'mat-checkbox-unchecked-checked-checkmark-path') {
          trustedEnds++; animationElapsed = event.elapsedTime;
        }
      };
      path.addEventListener('animationend', ended as EventListener);
      removeAnimationListener = () => path.removeEventListener('animationend', ended as EventListener);
      live.input.click();
      const latest = performance.now();
      const css = getComputedStyle(path);
      const animationName = css.animationName;
      const duration = css.animationDuration;
      const durationMs = parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000);
      if (!unchecked || !live.captured.checkbox.checked || latest - first >= 1000) {
        throw new Error('native clock missed the class-reuse race window');
      }
      await sleep(250);
      const sampled = performance.now();
      const survivesOldCleanup = live.host.classList.contains(animationClass);
      await sleep(850);
      const cleaned = performance.now();
      const latestCleanup = !live.host.classList.contains(animationClass);
      removeAnimationListener(); removeAnimationListener = undefined;
      live.view.destroy();

      const dying = await create();
      dying.input.click();
      const pendingClass = dying.host.classList.contains(animationClass);
      dying.view.destroy();
      const classesCleared = !Array.from(dying.host.classList).some(name => name.startsWith('mat-checkbox-anim-'));
      let lateClassWrites = 0;
      observer = new MutationObserver(records => {lateClassWrites += records.filter(record => record.attributeName === 'class').length;});
      observer.observe(dying.host, {attributes: true, attributeFilter: ['class']});
      await sleep(1100);
      lateClassWrites += observer.takeRecords().filter(record => record.attributeName === 'class').length;
      const observation = {actual_checkbox_created: true, initialized: live.captured.initialized && dying.captured.initialized,
        unchecked_between_clicks: unchecked, live_checked: live.captured.checkbox.checked,
        old_cleanup_elapsed_ms: sampled - first, newest_cleanup_elapsed_at_sample_ms: sampled - latest,
        survives_old_cleanup: survivesOldCleanup, latest_cleanup_elapsed_ms: cleaned - latest, latest_cleanup: latestCleanup,
        animation_name: animationName, animation_duration_ms: durationMs,
        trusted_animation_ends: trustedEnds, animation_elapsed_seconds: animationElapsed,
        pending_class_before_destroy: pendingClass, view_destroyed: dying.view.destroyed,
        host_removed: !dying.host.isConnected, classes_cleared_on_destroy: classesCleared, late_class_writes: lateClassWrites};
      this.result.set(JSON.stringify(observation));
      return observation;
    } catch (error) {
      const observation = {error: String(error)};
      this.result.set(JSON.stringify(observation));
      return observation;
    } finally {
      observer?.disconnect(); removeAnimationListener?.();
      renders.forEach(render => render.destroy());
      timers.forEach(timer => clearTimeout(timer)); timers.clear();
      views.forEach(view => {if (!view.destroyed) view.destroy();});
      this.captured = undefined; this.running = false;
    }
  }
}

@Directive({selector: '[labCaptureCheckboxTimer]', standalone: false})
export class CaptureCheckboxTimerLifetime {
  private readonly initialized = inject(CheckboxTimerLifetimeLab).register(inject(MatLegacyCheckbox, {self: true}));
  ngAfterViewInit() {this.initialized();}
}
`;

export function legacyCheckboxTimerLifetimeNativeOkay(o) {
  return !!o && !o.error && o.actual_checkbox_created === true && o.initialized === true &&
    o.unchecked_between_clicks === true && o.live_checked === true &&
    Number.isFinite(o.old_cleanup_elapsed_ms) && o.old_cleanup_elapsed_ms >= 1000 &&
    Number.isFinite(o.newest_cleanup_elapsed_at_sample_ms) && o.newest_cleanup_elapsed_at_sample_ms < 1000 &&
    o.survives_old_cleanup === true && Number.isFinite(o.latest_cleanup_elapsed_ms) && o.latest_cleanup_elapsed_ms >= 1000 &&
    o.latest_cleanup === true && o.animation_name === 'mat-checkbox-unchecked-checked-checkmark-path' &&
    Number.isFinite(o.animation_duration_ms) && Math.abs(o.animation_duration_ms - 180) < 0.1 &&
    o.trusted_animation_ends === 1 && Math.abs(o.animation_elapsed_seconds - 0.18) < 0.0001 &&
    o.pending_class_before_destroy === true && o.view_destroyed === true && o.host_removed === true &&
    o.classes_cleared_on_destroy === true && o.late_class_writes === 0;
}
