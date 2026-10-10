/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned container/portal/view lifecycle; announcement timers stay native. */
export const snackAnnouncementLifetimeFixture = `
@Component({
  standalone: false,
  selector: 'lab-snack-announcement-lifetime',
  providers: [{provide: MatSnackBarConfig, useFactory: () => new MatLegacySnackBarConfig()}],
  template: \`
    <ng-template #probe><snack-bar-container labCaptureSnackAnnouncement></snack-bar-container></ng-template>
    <ng-template #message><span data-lifetime-message>Announcement lifetime text</span></ng-template>
    <output>{{result()}}</output>
  \`,
})
export class SnackAnnouncementLifetimeLab {
  @ViewChild('probe', {read: TemplateRef, static: true}) template!: TemplateRef<unknown>;
  @ViewChild('probe', {read: ViewContainerRef, static: true}) outlet!: ViewContainerRef;
  @ViewChild('message', {read: TemplateRef, static: true}) message!: TemplateRef<unknown>;
  readonly result = signal('');
  private readonly injector = inject(Injector);
  private captured?: {container: MatLegacySnackBarContainer; initialized: boolean};
  private running = false;
  register(container: MatLegacySnackBarContainer) {
    const captured = {container, initialized: false};
    this.captured = captured;
    return () => {captured.initialized = true;};
  }
  async run() {
    if (this.running) throw new Error('snack announcement fixture already running');
    this.running = true;
    let view: ReturnType<ViewContainerRef['createEmbeddedView']> | undefined;
    let render: {destroy(): void} | undefined;
    let renderDeadline: ReturnType<typeof setTimeout> | undefined;
    const subscriptions: {unsubscribe(): void}[] = [];
    const injectors: {destroy(): void}[] = [];
    const observations = [];
    const waitForAnnouncement = () => new Promise<void>(resolve => setTimeout(resolve, 225));
    try {
      for (const mode of ['enabled', 'disabled'] as const) {
        const initialize = async (phase: string) => {
          this.captured = undefined;
          const injector = Injector.create({parent: this.injector,
            providers: [{provide: LEGACY_ANIMATIONS_TEST_OVERRIDE, useValue: mode === 'enabled' ? 'enabled' : 'di-disabled'}]});
          injectors.push(injector);
          view = this.outlet.createEmbeddedView(this.template, undefined, {injector});
          const rendered = new Promise<void>((resolve, reject) => {
            renderDeadline = setTimeout(() => reject(new Error('snack view render deadline exceeded')), 500);
            render = afterNextRender(() => {clearTimeout(renderDeadline); resolve();}, {injector: this.injector});
          });
          this.result.set('initializing announcement ' + mode + '/' + phase);
          await rendered;
          const captured = this.captured as {container: MatLegacySnackBarContainer; initialized: boolean} | undefined;
          const host = view.rootNodes.find(node => node instanceof HTMLElement) as HTMLElement | undefined;
          const inert = host?.querySelector<HTMLElement>('[aria-hidden]');
          const live = host?.querySelector<HTMLElement>('[aria-live]');
          if (!captured?.initialized || !host?.isConnected || !inert || !live || live.contains(inert)) {
            throw new Error('actual snack view/inert/live regions did not initialize');
          }
          captured.container.attachTemplatePortal(new TemplatePortal(this.message, this.outlet));
          if (inert.querySelector('[data-lifetime-message]')?.textContent !== 'Announcement lifetime text') {
            throw new Error('actual snack portal content missing');
          }
          return {captured, host, inert, live};
        };
        const living = await initialize('live');
        let liveAnnouncements = 0, liveCompleted = false;
        subscriptions.push(living.captured.container._onAnnounce.subscribe({
          next: () => liveAnnouncements++, complete: () => {liveCompleted = true;},
        }));
        living.captured.container.enter();
        await waitForAnnouncement();
        const liveState = {live_announcements: liveAnnouncements, live_completed: liveCompleted,
          live_content_moved: living.live.contains(living.inert),
          live_inert_hidden_removed: !living.inert.hasAttribute('aria-hidden')};
        if (liveAnnouncements !== 1 || !liveCompleted || !liveState.live_content_moved || !liveState.live_inert_hidden_removed) {
          throw new Error('live announcement did not complete and move portal content');
        }
        view!.destroy();
        const pending = await initialize('destroy');
        let announcements = 0, completed = false;
        subscriptions.push(pending.captured.container._onAnnounce.subscribe({
          next: () => announcements++, complete: () => {completed = true;},
        }));
        pending.captured.container.enter();
        const before = {queued_announcements_before_destroy: announcements,
          portal_content_present: !!pending.inert.querySelector('[data-lifetime-message]'),
          queued_inert_hidden: pending.inert.hasAttribute('aria-hidden'),
          entered_state: pending.captured.container._animationState === 'visible'};
        view!.destroy();
        const destroyed = view!.destroyed;
        await waitForAnnouncement();
        observations.push({mode, actual_container_created: true, initialized: pending.captured.initialized,
          ...liveState, ...before,
          direct_view_destroyed: destroyed, host_removed: !pending.host.isConnected,
          retained_inert_and_live_nodes: pending.host.contains(pending.inert) && pending.host.contains(pending.live),
          late_announcements: announcements, late_completion: completed,
          late_content_moved: pending.live.contains(pending.inert),
          late_inert_hidden_removed: !pending.inert.hasAttribute('aria-hidden')});
      }
      const observation = {observations};
      this.result.set(JSON.stringify(observation));
      return observation;
    } catch (error) {
      const observation = {error: String(error)};
      this.result.set(JSON.stringify(observation));
      return observation;
    } finally {
      render?.destroy(); clearTimeout(renderDeadline);
      if (view && !view.destroyed) view.destroy();
      subscriptions.forEach(subscription => subscription.unsubscribe());
      injectors.forEach(injector => injector.destroy());
      this.captured = undefined;
      this.running = false;
    }
  }
}

@Directive({selector: '[labCaptureSnackAnnouncement]', standalone: false})
export class CaptureSnackAnnouncementLifetime {
  private readonly initialized = inject(SnackAnnouncementLifetimeLab).register(
    inject(MatLegacySnackBarContainer, {self: true}));
  ngAfterViewInit() {this.initialized();}
}
`;

export function legacySnackAnnouncementLifetimeNativeOkay(o) {
  return !!o && !o.error && Array.isArray(o.observations) && o.observations.length === 2 &&
    o.observations.every((row, index) => !!row && row.mode === ['enabled', 'disabled'][index] &&
      row.actual_container_created === true && row.initialized === true &&
      row.portal_content_present === true && row.live_announcements === 1 && row.live_completed === true &&
      row.live_content_moved === true && row.live_inert_hidden_removed === true &&
      row.queued_announcements_before_destroy === 0 && row.queued_inert_hidden === true && row.entered_state === true &&
      row.direct_view_destroyed === true && row.host_removed === true && row.retained_inert_and_live_nodes === true &&
      row.late_announcements === 0 && row.late_completion === false && row.late_content_moved === false &&
      row.late_inert_hidden_removed === false);
}
