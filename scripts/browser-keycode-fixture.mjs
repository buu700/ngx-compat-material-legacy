/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Fixture source for existing browser-matrix default cells. KeyboardEvents are synthetic;
 * click navigation is cancelled. Does not exercise enabled motion or trusted OS input. */
export const browserKeycodeFixture = `
@Component({standalone:false,selector:'lab-keycode-fixture',template:\`
 <ng-container *ngIf="visible() === 'tooltip'"><button id="key-tip" matTooltip="Key tooltip" [matTooltipShowDelay]="0" [matTooltipHideDelay]="0">Tip</button><div id="key-under">Underlying</div></ng-container>
 <ng-container *ngIf="visible() === 'select'"><mat-select id="key-select"><mat-option value="a">A</mat-option></mat-select></ng-container>
 <ng-container *ngIf="visible() === 'tabs'"><nav mat-tab-nav-bar [tabPanel]="keyPanel"><a id="key-enabled" mat-tab-link [active]="active()" (click)="clicked($event)">Enabled</a><a id="key-disabled" mat-tab-link disabled (click)="clicked($event)">Disabled</a></nav><mat-tab-nav-panel #keyPanel>Panel</mat-tab-nav-panel><nav mat-tab-nav-bar><a id="key-no-panel" mat-tab-link (click)="clicked($event)">No panel</a></nav></ng-container>
\`})
export class BrowserKeycodeLab {
 readonly visible=signal(''); private overlay=inject(Overlay);
 @ViewChild(MatLegacyTooltip) tip?:MatLegacyTooltip;
 @ViewChild(MatLegacySelect) select?:MatLegacySelect;
 readonly active=signal(false); clicks=0; keys:number[]=[];
 clicked(event:Event){this.clicks++;this.active.set(true);event.preventDefault();}
 private pause(ms=100){return new Promise<void>(resolve=>setTimeout(resolve,ms));}
 private key(target:Element,code:number,modifier?:string){
  const flags:Record<string,boolean>={};if(modifier)flags[modifier+'Key']=true;
  const event=new KeyboardEvent('keydown',{key:code===27?'Escape':code===13?'Enter':code===32?' ':'x',keyCode:code,which:code,bubbles:true,cancelable:true,...flags});target.dispatchEvent(event);return event.defaultPrevented;
 }
 async run(kind:string):Promise<any>{
  this.visible.set(kind);await this.pause(150);
  try {
   if(kind==='tabs'){
    const cases:Record<string,unknown>={};
    for(const code of [13,32])for(const name of ['enabled','disabled','no-panel']){
     this.active.set(false);this.clicks=0;await this.pause(30);const node=document.getElementById('key-'+name);if(!node)throw Error('tab link missing');
     const prevented=this.key(node,code);await this.pause(30);cases[name+'-'+code]={prevented,clicks:this.clicks,active:this.active()};
    }
    return {cases};
   }
   if(kind==='select'){
    const select=this.select,host=document.getElementById('key-select');if(!select||!host)throw Error('select missing');const trigger=host.querySelector<HTMLElement>('.mat-select-trigger');if(!trigger)throw Error('select trigger missing');trigger.click();await this.pause(200);
    const opened=select.panelOpen,modified:Record<string,unknown>={};
    for(const mod of ['alt','ctrl','shift','meta']){const prevented=this.key(host,27,mod);await this.pause(20);modified[mod]={prevented,open:select.panelOpen};}
    const prevented=this.key(host,27);await this.pause(200);const closed=!select.panelOpen&&!document.querySelector('.mat-select-panel');
    trigger.click();await this.pause(200);const reopened=select.panelOpen;
    this.visible.set('');await this.pause(200);const destroyed=!host.isConnected&&!document.querySelector('.mat-select-panel');
    return {opened,modified,prevented,closed,reopened,destroyed};
   }
   if(kind==='tooltip'){
    const tip=this.tip,host=document.getElementById('key-tip'),under=document.getElementById('key-under');if(!tip||!host||!under)throw Error('tooltip missing');
    const overlay=this.overlay.create();overlay.attach(new DomPortal(under));this.keys=[];const sub=overlay.keydownEvents().subscribe(event=>this.keys.push(event.keyCode));
    try{
     host.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));await this.pause(200);const opened=!!document.querySelector('.mat-tooltip');this.key(document.body,65);
     const modified:Record<string,unknown>={};for(const mod of ['alt','ctrl','shift','meta']){const prevented=this.key(document.body,27,mod);await this.pause(20);modified[mod]={prevented,open:!!document.querySelector('.mat-tooltip')};}
     const prevented=this.key(document.body,27);await this.pause(200);const closed=!document.querySelector('.mat-tooltip'),keysBeforeDestroy=this.keys.slice();
     host.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));await this.pause(200);const reopened=!!document.querySelector('.mat-tooltip');
     this.visible.set('');await this.pause(200);const destroyed=!host.isConnected&&!document.querySelector('.mat-tooltip');this.key(document.body,66);const keysAfterDestroy=this.keys.slice();
     return {opened,modified,prevented,closed,reopened,destroyed,keysBeforeDestroy,keysAfterDestroy};
    }finally{sub.unsubscribe();overlay.dispose();}
   }
   throw Error('unknown keycode family');
  }finally{this.visible.set('');}
 }
}
`;
