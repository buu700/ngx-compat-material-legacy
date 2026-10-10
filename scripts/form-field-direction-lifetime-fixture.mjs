/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Angular owns initialization/destruction; the browser supplies the frame clock. */
export const formFieldDirectionLifetimeFixture = `
@Component({
  standalone: false,
  selector: 'lab-field-direction-lifetime',
  template: \`
    <ng-template #probe><div dir="ltr"><mat-form-field appearance="outline"
      floatLabel="always" labCaptureFieldDirection><mat-label>Direction lifetime</mat-label>
      <input matInput value="Value"></mat-form-field></div></ng-template>
    <output>{{result()}}</output>
  \`,
})
export class FormFieldDirectionLifetimeLab {
  @ViewChild('probe', {read: TemplateRef, static: true}) template!: TemplateRef<unknown>;
  @ViewChild('probe', {read: ViewContainerRef, static: true}) outlet!: ViewContainerRef;
  readonly result = signal('');
  private readonly injector = inject(Injector);
  private captured?: {field: MatLegacyFormField; direction: Directionality; initialized: boolean};
  private running = false;
  register(field: MatLegacyFormField, direction: Directionality) {
    const captured = {field, direction, initialized: false};
    this.captured = captured;
    return () => {captured.initialized = true;};
  }
  async run() {
    if (this.running) throw new Error('field direction fixture already running');
    this.running = true;
    this.captured = undefined;
    let view: ReturnType<ViewContainerRef['createEmbeddedView']> | undefined;
    let restore: (() => void) | undefined;
    let render: {destroy(): void} | undefined;
    const frameIds = new Set<number>();
    const frames = () => new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('native frame deadline exceeded')), 250);
      const first = requestAnimationFrame(() => {
        frameIds.delete(first);
        const second = requestAnimationFrame(() => {
          frameIds.delete(second); clearTimeout(deadline); resolve();
        });
        frameIds.add(second);
      });
      frameIds.add(first);
    });
    let renderDeadline: ReturnType<typeof setTimeout> | undefined;
    try {
      view = this.outlet.createEmbeddedView(this.template);
      const rendered = new Promise<void>((resolve, reject) => {
        renderDeadline = setTimeout(() => reject(new Error('field view render deadline exceeded')), 500);
        render = afterNextRender(() => {clearTimeout(renderDeadline); resolve();}, {injector: this.injector});
      });
      this.result.set('initializing direction lifetime');
      await rendered;
      await frames();
      const captured = this.captured as {field: MatLegacyFormField; direction: Directionality; initialized: boolean} | undefined;
      const host = view.rootNodes.find(node => node instanceof HTMLElement) as HTMLElement | undefined;
      if (!captured?.initialized || !host?.isConnected || !(captured.direction instanceof Dir)) {
        throw new Error('actual field/Dir view did not initialize');
      }
      const {field, direction} = captured;
      const original = field.updateOutlineGap;
      let updates = 0;
      field.updateOutlineGap = (...args: Parameters<MatLegacyFormField['updateOutlineGap']>) => {
        updates++;
        return original.apply(field, args);
      };
      restore = () => {field.updateOutlineGap = original;};
      direction.change.emit('rtl');
      await frames();
      const live_updates = updates;
      if (live_updates < 1) throw new Error('live direction emission did not reach field');
      updates = 0;
      direction.change.emit('ltr');
      direction.change.emit('rtl');
      const queued_updates_before_destroy = updates;
      view.destroy();
      await frames();
      const observation = {actual_field_created: true, actual_directionality_created: true,
        initialized: captured.initialized, live_updates, queued_updates_before_destroy,
        view_destroyed: view.destroyed, host_removed: !host.isConnected, late_updates: updates};
      this.result.set(JSON.stringify(observation));
      return observation;
    } catch (error) {
      const observation = {error: String(error)};
      this.result.set(JSON.stringify(observation));
      return observation;
    } finally {
      render?.destroy();
      clearTimeout(renderDeadline);
      frameIds.forEach(id => cancelAnimationFrame(id));
      frameIds.clear();
      if (view && !view.destroyed) view.destroy();
      restore?.();
      this.captured = undefined;
      this.running = false;
    }
  }
}

@Directive({selector: '[labCaptureFieldDirection]', standalone: false})
export class CaptureFieldDirectionLifetime {
  private readonly initialized = inject(FormFieldDirectionLifetimeLab).register(
    inject(MatLegacyFormField, {self: true}), inject(Directionality));
  ngAfterViewInit() {this.initialized();}
}
`;

export function legacyFormFieldDirectionLifetimeNativeOkay(o) {
  return !!o && !o.error && o.actual_field_created === true && o.actual_directionality_created === true &&
    o.initialized === true && Number.isInteger(o.live_updates) && o.live_updates > 0 &&
    o.queued_updates_before_destroy === 0 && o.view_destroyed === true && o.host_removed === true && o.late_updates === 0;
}
