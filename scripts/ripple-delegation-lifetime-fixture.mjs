/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** The child document loads the same packed consumer; only this owned renderer lab is created. */
export const rippleDelegationLifetimeFixture = `
interface RippleChildAPI {
  prepareRippleDelegation(): Promise<void>;
  finishRippleDelegation(): Promise<unknown>;
  rippleDelegationTarget(): HTMLElement;
  disposeRippleDelegation(): void;
}
interface RippleTraceRow {
  trigger: string; phase: string; inside_angular: boolean; enter_ms: number;
  transition_properties: string[]; transition_durations_ms: number[];
  ref: LegacyRippleRef; ends: {property: string; seconds: number; trusted: boolean}[];
}

@Component({standalone: false, selector: 'lab-ripple-delegation',
  template: \`<ng-template #probe><div class="mat-ripple" style="width:200px;height:80px">
    <button class="mat-ripple" type="button" style="width:120px;height:48px">Nested ripple</button>
    </div></ng-template><output>{{result()}}</output>\`})
export class RippleDelegationLab {
  @ViewChild('probe', {read: TemplateRef, static: true}) template!: TemplateRef<unknown>;
  @ViewChild('probe', {read: ViewContainerRef, static: true}) outlet!: ViewContainerRef;
  readonly result = signal('');
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  private readonly platform = inject(Platform);
  private view?: ReturnType<ViewContainerRef['createEmbeddedView']>;
  private inner?: HTMLElement;
  private outer?: HTMLElement;
  private render?: {destroy(): void};
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly cleanup: (() => void)[] = [];
  private renderers: LegacyRippleRenderer[] = [];
  private rows: RippleTraceRow[] = [];
  private errors: string[] = [];
  private trustedDown = 0;
  private listenerAdds = 0;
  private listenerRemoves = 0;
  private listenerBalance = new Map<string, Set<EventListenerOrEventListenerObject>>();
  private phase = 'trusted';
  private running = false;
  private sleep(ms: number) {return new Promise<void>(resolve => {
    const timer = setTimeout(() => {this.timers.delete(timer); resolve();}, ms); this.timers.add(timer);
  });}
  target(): HTMLElement {if (!this.inner?.isConnected) throw new Error('ripple target missing'); return this.inner;}
  async prepare() {
    if (this.running) throw new Error('ripple delegation fixture already running');
    this.running = true; this.phase = 'trusted'; this.rows = []; this.errors = []; this.trustedDown = 0;
    this.listenerAdds = 0; this.listenerRemoves = 0; this.listenerBalance.clear();
    try {
      this.view = this.outlet.createEmbeddedView(this.template);
      const rendered = new Promise<void>((resolve, reject) => {
        const deadline = setTimeout(() => reject(new Error('ripple view render deadline exceeded')), 500);
        this.timers.add(deadline);
        this.render = afterNextRender(() => {clearTimeout(deadline); this.timers.delete(deadline); resolve();}, {injector: this.injector});
      });
      this.result.set('initializing ripple delegation'); await rendered;
      this.outer = this.view.rootNodes.find(node => node instanceof HTMLElement) as HTMLElement | undefined;
      this.inner = this.outer?.querySelector<HTMLElement>('button') ?? undefined;
      if (!this.outer?.isConnected || !this.inner?.isConnected || !this.platform.isBrowser) {
        throw new Error('actual ripple host view did not initialize');
      }
      const down = (event: MouseEvent) => {if (event.isTrusted) this.trustedDown++;};
      this.inner.addEventListener('mousedown', down as EventListener);
      this.cleanup.push(() => this.inner?.removeEventListener('mousedown', down as EventListener));
      const errored = (event: ErrorEvent) => this.errors.push(event.message);
      window.addEventListener('error', errored);
      this.cleanup.push(() => window.removeEventListener('error', errored));
      const add = document.addEventListener, remove = document.removeEventListener;
      document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
        if (listener && (type === 'mousedown' || type === 'touchstart')) {
          this.listenerAdds++;
          const handlers = this.listenerBalance.get(type) ?? new Set<EventListenerOrEventListenerObject>();
          handlers.add(listener); this.listenerBalance.set(type, handlers);
        }
        if (listener) add.call(document, type, listener, options);
      }) as Document['addEventListener'];
      document.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => {
        if (listener && this.listenerBalance.get(type)?.delete(listener)) this.listenerRemoves++;
        if (listener) remove.call(document, type, listener, options);
      }) as Document['removeEventListener'];
      this.cleanup.push(() => {document.addEventListener = add; document.removeEventListener = remove;});
      for (const [trigger, node] of [['outer', this.outer], ['inner', this.inner]] as const) {
        const renderer = new LegacyRippleRenderer({rippleConfig: {}, rippleDisabled: false}, this.zone, node, this.platform);
        this.renderers.push(renderer);
        const original = renderer.fadeInRipple;
        renderer.fadeInRipple = (...args: Parameters<LegacyRippleRenderer['fadeInRipple']>) => {
          const ref = original.apply(renderer, args), css = getComputedStyle(ref.element);
          const row: RippleTraceRow = {trigger, phase: this.phase, inside_angular: NgZone.isInAngularZone(),
            enter_ms: parseFloat(ref.element.style.transitionDuration) * (ref.element.style.transitionDuration.endsWith('ms') ? 1 : 1000), ref, ends: [],
            transition_properties: css.transitionProperty.split(',').map(value => value.trim()),
            transition_durations_ms: css.transitionDuration.split(',').map(value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000))};
          const ended = (event: TransitionEvent) => {
            if (event.target === ref.element) row.ends.push({property: event.propertyName, seconds: event.elapsedTime, trusted: event.isTrusted});
          };
          ref.element.addEventListener('transitionend', ended as EventListener);
          this.cleanup.push(() => ref.element.removeEventListener('transitionend', ended as EventListener));
          if (this.phase === 'held-missing-transition') {
            const suppress = (event: Event) => event.stopImmediatePropagation();
            ref.element.addEventListener('transitionend', suppress, true);
            this.cleanup.push(() => ref.element.removeEventListener('transitionend', suppress, true));
          }
          this.rows.push(row); return ref;
        };
        this.cleanup.push(() => {renderer.fadeInRipple = original;});
        renderer.setupTriggerEvents(node);
      }
      this.result.set('ready for trusted ripple pointer');
    } catch (error) {this.dispose(); throw error;}
  }
  async finish() {
    if (!this.running || !this.view || !this.inner || !this.outer) throw new Error('ripple fixture was not prepared');
    try {
      await this.sleep(600);
      const trusted = this.rows.filter(row => row.phase === 'trusted');
      const native_motion = trusted.map(row => ({trigger: row.trigger, inside_angular: row.inside_angular,
        enter_ms: row.enter_ms, transition_properties: row.transition_properties, transition_durations_ms: row.transition_durations_ms,
        ends: row.ends, hidden: row.ref.state === LegacyRippleState.HIDDEN, removed: !row.ref.element.isConnected}));
      const box = this.inner.getBoundingClientRect();
      for (const phase of ['missing-path', 'throwing-path']) {
        this.phase = phase;
        const event = new MouseEvent('mousedown', {bubbles: true, composed: true, detail: 1, buttons: 1,
          clientX: box.x + box.width / 2, clientY: box.y + box.height / 2});
        Object.defineProperty(event, 'composedPath', {value: phase === 'missing-path' ? undefined : () => {throw new Error('controlled replay path unavailable');}});
        this.inner.dispatchEvent(event);
        this.inner.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, composed: true, detail: 1}));
      }
      const missing_path_order = this.rows.filter(row => row.phase === 'missing-path').map(row => row.trigger);
      const throwing_path_order = this.rows.filter(row => row.phase === 'throwing-path').map(row => row.trigger);
      this.renderers.forEach(renderer => renderer.fadeOutAll());
      await this.sleep(300);
      this.phase = 'held-missing-transition';
      this.inner.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, composed: true, detail: 1, buttons: 1,
        clientX: box.x + box.width / 2, clientY: box.y + box.height / 2}));
      await this.sleep(400);
      const held = this.rows.filter(row => row.phase === 'held-missing-transition');
      const held_past_enter_fallback = held.length === 2 && held.every(row => row.ref.state === LegacyRippleState.VISIBLE && row.ref.element.isConnected);
      this.inner.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, composed: true, detail: 1}));
      await this.sleep(300);
      const missing_exit_fallback_removed = held.length === 2 && held.every(row => row.ref.state === LegacyRippleState.HIDDEN && !row.ref.element.isConnected);
      this.renderers.forEach(renderer => renderer._removeTriggerEvents());
      const callsBefore = this.rows.length;
      this.phase = 'removed';
      this.inner.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, composed: true, detail: 1, buttons: 1,
        clientX: box.x + box.width / 2, clientY: box.y + box.height / 2}));
      const calls_after_removal = this.rows.length - callsBefore;
      this.renderers.forEach(renderer => renderer.fadeOutAll());
      await this.sleep(600);
      const controlled_ripples_removed = this.rows.every(row => row.ref.state === LegacyRippleState.HIDDEN && !row.ref.element.isConnected);
      this.view.destroy();
      const observation = {actual_owned_renderers: this.renderers.length, actual_view_created: true,
        trusted_mousedown_events: this.trustedDown, owned_listener_adds: this.listenerAdds,
        owned_listener_removes: this.listenerRemoves, owned_listener_balance: Array.from(this.listenerBalance.values()).reduce((sum, handlers) => sum + handlers.size, 0), trusted_order: trusted.map(row => row.trigger), native_motion,
        missing_path_order, throwing_path_order, held_past_enter_fallback, missing_exit_fallback_removed,
        calls_after_removal, controlled_ripples_removed,
        view_destroyed: this.view.destroyed, host_removed: !this.outer.isConnected,
        uncaught_window_errors: this.errors.length, actual_angular_hydration_replay_executed: false};
      this.result.set(JSON.stringify(observation)); return observation;
    } finally {this.dispose();}
  }
  dispose() {
    this.renderers.forEach(renderer => {renderer._removeTriggerEvents(); renderer.fadeOutAll();});
    this.cleanup.splice(0).forEach(cleanup => cleanup());
    this.render?.destroy(); this.render = undefined;
    this.timers.forEach(timer => clearTimeout(timer)); this.timers.clear();
    if (this.view && !this.view.destroyed) this.view.destroy();
    this.view = undefined; this.inner = undefined; this.outer = undefined; this.renderers = []; this.running = false;
  }
  ngOnDestroy() {this.dispose();}
}

@Component({standalone: false, selector: 'lab-ripple-frame', template: '<div #mount></div><output>{{result()}}</output>'})
export class RippleDelegationFrameLab {
  @ViewChild('mount', {read: ElementRef, static: true}) mount!: ElementRef<HTMLElement>;
  readonly result = signal('');
  private frame?: HTMLIFrameElement;
  private child?: RippleChildAPI;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private running = false;
  async prepare() {
    if (this.running) throw new Error('ripple frame already running');
    this.running = true;
    try {
      const url = new URL(location.href); url.searchParams.set('legacyRippleOnly', '1');
      const frame = document.createElement('iframe'); frame.title = 'Owned ripple native fixture';
      frame.style.width = '320px'; frame.style.height = '180px'; frame.style.border = '0'; frame.src = url.href;
      this.frame = frame; this.mount.nativeElement.appendChild(frame);
      this.child = await new Promise<RippleChildAPI>((resolve, reject) => {
        const deadline = performance.now() + 2000;
        const poll = () => {
          const child = frame.contentWindow as (Window & {__lab?: RippleChildAPI}) | null;
          if (child?.document.querySelector('#bootstrap-error')) {reject(new Error('ripple child bootstrap failed')); return;}
          if (child?.document.documentElement.dataset.labReady === '1' && child.__lab) {resolve(child.__lab); return;}
          if (performance.now() >= deadline) {reject(new Error('ripple child bootstrap deadline exceeded')); return;}
          const timer = setTimeout(() => {this.timers.delete(timer); poll();}, 20); this.timers.add(timer);
        };
        poll();
      });
      await this.child.prepareRippleDelegation(); this.result.set('ready');
    } catch (error) {this.dispose(); throw error;}
  }
  scrollIntoView() {this.frame?.scrollIntoView({block: 'center'});}
  targetBox() {
    if (!this.frame?.isConnected || !this.child) throw new Error('ripple child unavailable');
    const frame = this.frame.getBoundingClientRect(), box = this.child.rippleDelegationTarget().getBoundingClientRect();
    return {x: frame.x + this.frame.clientLeft + box.x, y: frame.y + this.frame.clientTop + box.y,
      width: box.width, height: box.height};
  }
  async finish() {
    if (!this.child) throw new Error('ripple child unavailable');
    try {const observation = await this.child.finishRippleDelegation(); this.result.set(JSON.stringify(observation)); return observation;}
    finally {this.dispose();}
  }
  dispose() {this.child?.disposeRippleDelegation(); this.frame?.remove(); this.frame = undefined; this.child = undefined;
    this.timers.forEach(timer => clearTimeout(timer)); this.timers.clear(); this.running = false;}
  ngOnDestroy() {this.dispose();}
}
`;

export function legacyRippleDelegationLifetimeNativeOkay(o) {
  const order = rows => Array.isArray(rows) && rows.length === 2 && rows[0] === 'outer' && rows[1] === 'inner';
  const motion = row => !!row && row.inside_angular === false && row.enter_ms === 225 &&
    Array.isArray(row.transition_properties) && row.transition_properties.includes('opacity') && row.transition_properties.includes('transform') &&
    Array.isArray(row.transition_durations_ms) && row.transition_durations_ms.length > 0 && row.transition_durations_ms.every(ms => Math.abs(ms - 225) < 0.1) &&
    Array.isArray(row.ends) && row.ends.some(event => event.trusted === true && event.property === 'transform' && Math.abs(event.seconds - 0.225) < 0.0001) &&
    row.ends.some(event => event.trusted === true && event.property === 'opacity' && Math.abs(event.seconds - 0.15) < 0.0001) &&
    row.hidden === true && row.removed === true;
  return !!o && !o.error && o.actual_owned_renderers === 2 && o.actual_view_created === true && o.trusted_mousedown_events === 1 &&
    o.owned_listener_adds === 2 && o.owned_listener_removes === 2 && o.owned_listener_balance === 0 &&
    order(o.trusted_order) && order(o.missing_path_order) && order(o.throwing_path_order) &&
    o.held_past_enter_fallback === true && o.missing_exit_fallback_removed === true &&
    Array.isArray(o.native_motion) && o.native_motion.length === 2 && order(o.native_motion.map(row => row.trigger)) && o.native_motion.every(motion) &&
    o.calls_after_removal === 0 && o.controlled_ripples_removed === true && o.view_destroyed === true && o.host_removed === true &&
    o.uncaught_window_errors === 0 && o.actual_angular_hydration_replay_executed === false;
}
