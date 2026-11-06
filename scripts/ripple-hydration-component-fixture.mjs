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
    <button id="native-peer" matRipple #nativePeer="matRipple">Native peer only</button>
    <button id="replay-native-peer" matRipple #replayNativePeer="matRipple" (mousedown)="nativeReplay($event)"
      (mouseup)="nativeReplay($event)" (click)="nativeReplay($event)">Public replay route</button>
    <div #owned id="replay-owned" class="mat-ripple" style="width:120px;height:48px"></div>\`})
export class RippleHydrationLab {
  @ViewChild(MatLegacyRipple, {static: true}) peer!: MatLegacyRipple;
  @ViewChild('replayNativePeer', {static: true}) replayNativePeer!: MatLegacyRipple;
  @ViewChild('owned', {read: ElementRef, static: true}) ownedHost!: ElementRef<HTMLElement>;
  readonly clicks = signal(0);
  readonly deliveries: {type: string; path_threw: boolean; target_id: string; peer_present: boolean}[] = [];
  readonly nativeReplayDeliveries: {type: string; path_threw: boolean; target_id: string; peer_present: boolean}[] = [];
  private readonly zone = inject(NgZone);
  private readonly platform = inject(Platform);
  private owned?: LegacyRippleRenderer;
  private ownedLaunches = 0;
  private peerLaunches = 0;
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
    if (this.ownedHost.nativeElement.querySelector('.mat-ripple-element')) this.ownedLaunches++;
    const ref = this.peer.launch(event.clientX, event.clientY, {persistent: true, animation: {enterDuration: 0, exitDuration: 0}});
    if (ref.element.isConnected) this.peerLaunches++;
    ref.fadeOut();
  }
  up(event: MouseEvent) {this.owned?.handleEvent(event);}
  clicked(event: MouseEvent) {
    const target = legacyGetEventTarget<HTMLElement>(event);
    let path_threw = false;
    try {event.composedPath();} catch {path_threw = true;}
    this.deliveries.push({type: event.type, path_threw, target_id: target?.id ?? '', peer_present: !!this.peer});
    this.clicks.update(value => value + 1);
  }
  nativeReplay(event: MouseEvent) {
    // Only observe Angular delivery. Public MatRipple owns its native listener;
    // no manual launch or event forwarding is performed for this host.
    let path_threw = false;
    try {event.composedPath();} catch {path_threw = true;}
    this.nativeReplayDeliveries.push({type: event.type, path_threw,
      target_id: event.target instanceof HTMLElement ? event.target.id : '', peer_present: !!this.replayNativePeer});
  }
  snapshot() {return {angular_zone_entered: this.zone.run(() => NgZone.isInAngularZone()), clicks: this.clicks(), deliveries: this.deliveries.map(row => ({...row})),
    native_replay_deliveries: this.nativeReplayDeliveries.map(row => ({...row})),
    actual_native_replay_peer_present: !!this.replayNativePeer,
    actual_peer_directive_present: !!this.peer, actual_owned_renderer_present: !!this.owned,
    owned_ripple_launches: this.ownedLaunches, peer_ripple_launches: this.peerLaunches};}
  ngOnDestroy() {this.owned?._removeTriggerEvents(); this.owned?.fadeOutAll(); this.peer?.fadeOutAll(); this.replayNativePeer?.fadeOutAll();}
}
`;
