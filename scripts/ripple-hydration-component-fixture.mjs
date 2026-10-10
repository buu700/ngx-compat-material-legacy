/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Shared component for genuine SSR/client hydration. Native bootstrap/capture producer is separate. */
export const rippleHydrationComponentFixture = `
@Component({standalone: true, selector: 'ripple-hydration-lab', imports: [MatLegacyRippleModule],
  template: \`<button id="replay-peer" matRipple (mousedown)="down($event)" (mouseup)="up($event)"
    (click)="clicked($event)">Hydration {{clicks()}}</button>
    <div #owned id="replay-owned" class="mat-ripple" style="width:120px;height:48px"></div>\`})
export class RippleHydrationLab {
  @ViewChild(MatLegacyRipple, {static: true}) peer!: MatLegacyRipple;
  @ViewChild('owned', {read: ElementRef, static: true}) ownedHost!: ElementRef<HTMLElement>;
  readonly clicks = signal(0);
  readonly deliveries: {type: string; path_threw: boolean; target_id: string; peer_present: boolean}[] = [];
  private readonly zone = inject(NgZone);
  private readonly platform = inject(Platform);
  private owned?: LegacyRippleRenderer;
  ngAfterViewInit() {
    if (this.platform.isBrowser) {
      this.owned = new LegacyRippleRenderer({rippleConfig: {animation: {enterDuration: 0, exitDuration: 0}}, rippleDisabled: false},
        this.zone, this.ownedHost, this.platform);
      this.owned.setupTriggerEvents(this.ownedHost);
    }
  }
  down(event: MouseEvent) {
    let path_threw = false;
    try {event.composedPath();} catch {path_threw = true;}
    const target = legacyGetEventTarget<HTMLElement>(event);
    this.deliveries.push({type: event.type, path_threw, target_id: target?.id ?? '', peer_present: !!this.peer});
    this.owned?.handleEvent(event);
    this.peer.launch(event.clientX, event.clientY, {animation: {enterDuration: 0, exitDuration: 0}});
  }
  up(event: MouseEvent) {this.owned?.handleEvent(event);}
  clicked(event: MouseEvent) {
    const target = legacyGetEventTarget<HTMLElement>(event);
    let path_threw = false;
    try {event.composedPath();} catch {path_threw = true;}
    this.deliveries.push({type: event.type, path_threw, target_id: target?.id ?? '', peer_present: !!this.peer});
    this.clicks.update(value => value + 1);
  }
  snapshot() {return {clicks: this.clicks(), deliveries: this.deliveries.map(row => ({...row})),
    actual_peer_directive_present: !!this.peer, actual_owned_renderer_present: !!this.owned};}
  ngOnDestroy() {this.owned?._removeTriggerEvents(); this.owned?.fadeOutAll(); this.peer?.fadeOutAll();}
}
`;
