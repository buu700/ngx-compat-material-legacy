/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Shared native fixture source; Angular creates and destroys the real directive. */
export const tooltipAriaLifetimeFixture = `
interface TooltipAriaLifetimeObservation {
  actual_directive_created?: boolean;
  host_removed?: boolean;
  initial_description_absent?: boolean;
  pending_cleanup_clear?: boolean;
  later_request_clear?: boolean;
  error?: string;
}

@Component({
  standalone: false,
  selector: 'lab-tooltip-aria-lifetime',
  template: \`
    <ng-template #probe><button matTooltip="" labCaptureTooltip>Temporary tooltip</button></ng-template>
    <button id="tip-aria-run" type="button" (click)="run()">Tooltip cleanup</button>
    <output id="tip-aria-result" [attr.data-complete]="completed()">{{result()}}</output>
  \`,
})
export class TooltipAriaLifetimeLab {
  @ViewChild('probe', {read: TemplateRef, static: true}) template!: TemplateRef<unknown>;
  @ViewChild('probe', {read: ViewContainerRef, static: true}) outlet!: ViewContainerRef;
  readonly result = signal('');
  readonly completed = signal(false);
  private tooltip?: MatLegacyTooltip;
  register(tooltip: MatLegacyTooltip) {this.tooltip = tooltip; return 'registered';}
  async run(): Promise<TooltipAriaLifetimeObservation> {
    this.completed.set(false);
    this.tooltip = undefined;
    const view = this.outlet.createEmbeddedView(this.template);
    try {
      const host = view.rootNodes.find(node => node instanceof HTMLElement) as HTMLElement | undefined;
      const tooltip = this.tooltip as MatLegacyTooltip | undefined;
      if (!host || !tooltip) throw new Error('missing actual tooltip');
      tooltip.message = 'Tooltip description pending destruction';
      const initial_description_absent = !host.hasAttribute('aria-describedby');
      view.destroy();
      await Promise.resolve();
      const pending_cleanup_clear = !host.hasAttribute('aria-describedby');
      tooltip.message = 'Tooltip description requested after destruction';
      await Promise.resolve();
      const observation = {actual_directive_created: true, host_removed: !host.isConnected,
        initial_description_absent, pending_cleanup_clear,
        later_request_clear: !host.hasAttribute('aria-describedby')};
      this.result.set(JSON.stringify(observation));
      return observation;
    } catch (error) {
      const observation = {error: String(error)};
      this.result.set(JSON.stringify(observation));
      return observation;
    } finally {
      if (!view.destroyed) view.destroy();
      this.tooltip = undefined;
      this.completed.set(true);
    }
  }
}

@Directive({selector: '[labCaptureTooltip]', standalone: false})
export class CaptureTooltipForAriaLifetime {
  constructor() {
    inject(TooltipAriaLifetimeLab).register(inject(MatLegacyTooltip, {self: true}));
  }
}
`;
