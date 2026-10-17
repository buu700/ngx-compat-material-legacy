/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const CONTENT_OBSERVER_SHA = 'd8a6c3edd8d406b3f1b1c26805612eac8856b745';
export const CONTENT_OBSERVER_STAGES = Object.freeze([
  'comment-add', 'comment-edit', 'comment-remove', 'text-add', 'text-edit', 'text-same', 'text-remove',
  'mixed-add', 'mixed-remove', 'shared-after-unsubscribe', 'destroyed-owner', 'reobserve-detached', 'final-unsubscribe',
]);

/** Browser-only forwarding spy. It retains native constructors, records and
 * platform methods; no observation or mutation notification is synthesized. */
export function installContentObserverNativeTrace(scope = globalThis) {
  if (scope.__closeoutNativeObserverTrace) return;
  const proto = scope.MutationObserver.prototype;
  const observe = Object.getOwnPropertyDescriptor(proto, 'observe');
  const disconnect = Object.getOwnPropertyDescriptor(proto, 'disconnect');
  const records = [], identities = new WeakMap();
  function observed(target, options) {
    const result = observe.value.call(this, target, options);
    let row = identities.get(this);
    if (!row) {row = {id: records.length + 1, targets: [], observes: 0, disconnects: 0, active: false}; identities.set(this, row); records.push(row);}
    if (!row.targets.includes(target)) row.targets.push(target);
    row.observes++; row.active = true;
    return result;
  }
  function disconnected() {
    const result = disconnect.value.call(this), row = identities.get(this);
    if (row) {row.disconnects++; row.active = false;}
    return result;
  }
  Object.defineProperty(proto, 'observe', {...observe, value: observed});
  Object.defineProperty(proto, 'disconnect', {...disconnect, value: disconnected});
  scope.__closeoutNativeObserverTrace = {
    forTarget: target => records.filter(row => row.targets.includes(target)).map(({targets, ...row}) => ({...row})),
    restore: () => {
      if (proto.observe === observed) Object.defineProperty(proto, 'observe', observe);
      if (proto.disconnect === disconnected) Object.defineProperty(proto, 'disconnect', disconnect);
      return proto.observe === observe.value && proto.disconnect === disconnect.value;
    },
  };
}

/** Supplemental protocol observations earn no browser-matrix cell credit. */
export function contentObserverNativeOkay(raw, zoneless) {
  try {
    if (typeof zoneless !== 'boolean' || raw?.execution !== 'packed-native-content-observer-legacy-header'
      || raw.error !== null || raw.zoneless !== zoneless || raw.mutations_outside_angular !== true
      || !raw.identity?.public_content_observer || !raw.identity?.owned_legacy_header || !raw.identity?.legacy_structure
      || !raw.identity?.shared_native_observer || raw.initial_native_generations !== 1
      || raw.calibration?.text_add_notified !== true || raw.calibration?.text_remove_notified !== true
      || !raw.cleanup?.owned_header_destroyed || !raw.cleanup?.direct_subscription_closed
      || !raw.cleanup?.fresh_subscription_closed || !raw.cleanup?.control_disconnected || !raw.cleanup?.trace_restored
      || raw.native_generations?.length !== 2 || !raw.native_generations.every(row => Number.isSafeInteger(row.id)
        && row.observes === 1 && row.disconnects >= 1 && row.active === false)
      || new Set(raw.native_generations.map(row => row.id)).size !== 2
      || raw.stages?.length !== CONTENT_OBSERVER_STAGES.length) return false;
    for (const [index, id] of CONTENT_OBSERVER_STAGES.entries()) {
      const row = raw.stages[index];
      if (row.id !== id || row.raw_records?.length < 1 || !Array.isArray(row.raw_records)
        || !row.raw_records.every(record => record.native === true && ['childList', 'characterData'].includes(record.type))
        || !Array.isArray(row.delivered_records) || !row.delivered_records.every(record => record.native === true)
        || !Array.isArray(row.public_zones) || !row.public_zones.every(zone => zone === !zoneless)
        || !Array.isArray(row.owned_zones) || !row.owned_zones.every(zone => zone === !zoneless)) return false;
      const comment = id.startsWith('comment-'), destroyed = ['destroyed-owner', 'reobserve-detached', 'final-unsubscribe'].includes(id);
      const publicEvents = comment || ['shared-after-unsubscribe', 'destroyed-owner', 'final-unsubscribe'].includes(id) ? 0 : 1;
      const owned = comment || destroyed ? 0 : 1;
      if (row.public_events !== publicEvents || row.public_zones.length !== publicEvents || row.owned_callbacks !== owned
        || row.owned_zones.length !== owned || row.pagination_calls !== (owned && id !== 'text-same' ? 1 : 0)
        || row.owner_destroyed !== destroyed || row.owner_connected !== !destroyed
        || (publicEvents === 0 ? row.delivered_records.length !== 0 : row.delivered_records.length < 1)) return false;
      if (!destroyed && row.cache_matches_text !== true) return false;
      if (!row.delivered_records.every(record => row.raw_records.some(rawRecord => JSON.stringify(rawRecord) === JSON.stringify(record)))) return false;
      const has = (records, type, target, field, node) => records.some(record => record.type === type && record.target_type === target
        && (field === null || record[field].includes(node)));
      if (id === 'comment-add' && !has(row.raw_records, 'childList', 1, 'added_types', 8)) return false;
      if (id === 'comment-edit' && !has(row.raw_records, 'characterData', 8, null)) return false;
      if (id === 'comment-remove' && !has(row.raw_records, 'childList', 1, 'removed_types', 8)) return false;
      if (['text-add', 'mixed-add'].includes(id) && !has(row.delivered_records, 'childList', 1, 'added_types', 3)) return false;
      if (['text-remove', 'mixed-remove'].includes(id) && !has(row.delivered_records, 'childList', 1, 'removed_types', 3)) return false;
      if (['shared-after-unsubscribe', 'destroyed-owner'].includes(id) && !has(row.raw_records, 'childList', 1, 'added_types', 3)) return false;
      if (id === 'final-unsubscribe' && !has(row.raw_records, 'characterData', 3, null)) return false;
      if (comment && (!row.raw_records.every(record => record.type === 'characterData' ? record.target_type === 8
        : [...record.added_types, ...record.removed_types].every(type => type === 8)) || row.text_changed !== false)) return false;
      if (!comment && !destroyed && row.text_changed !== (id !== 'text-same')) return false;
      if (['text-edit', 'text-same', 'reobserve-detached'].includes(id)
        && !row.delivered_records.some(record => record.type === 'characterData' && record.target_type === 3)) return false;
      if (id === 'mixed-add' && !row.delivered_records.some(record => record.type === 'childList'
        && record.added_types.includes(8) && record.added_types.includes(3))) return false;
      if (id === 'mixed-remove' && !row.delivered_records.every(record => [...record.added_types, ...record.removed_types].some(type => type !== 8))) return false;
    }
    return true;
  } catch {return false;}
}

/** Full fixture source is compiled with the packed consumer. It invokes only
 * native platform/public peer APIs and instruments methods owned by this add-on. */
export function contentObserverNativeFixture() {
  return String.raw`
import {Component as ObserverComponent, ViewChild as ObserverViewChild, inject as observerInject,
  NgZone as ObserverNgZone, ElementRef as ObserverElementRef, ChangeDetectorRef as ObserverChangeDetectorRef,
  AfterViewInit as ObserverAfterViewInit} from '@angular/core';
import {ContentObserver as PublicContentObserver} from '@angular/cdk/observers';
import {MatLegacyTabsModule as ObserverLegacyTabsModule, MatLegacyTabGroup as ObserverLegacyTabGroup,
  MatLegacyTabHeader as ObserverLegacyTabHeader} from '@ngx-compat/material-legacy/legacy-tabs';

@ObserverComponent({standalone:false,selector:'closeout-content-observer',template:
  '<section id="content-observer-fixture">@if(alive){<mat-tab-group animationDuration="0ms" [disableRipple]="true"><mat-tab label="Observer first">One</mat-tab><mat-tab label="Observer second">Two</mat-tab></mat-tab-group>}</section>'})
export class ContentObserverNativeProbe implements ObserverAfterViewInit {
  @ObserverViewChild(ObserverLegacyTabGroup) tabs!:ObserverLegacyTabGroup;
  alive=true;
  private zone=observerInject(ObserverNgZone);
  private observer=observerInject(PublicContentObserver);
  private host=observerInject<ObserverElementRef<HTMLElement>>(ObserverElementRef);
  private detector=observerInject(ObserverChangeDetectorRef);
  ngAfterViewInit(){
    (window as any).__closeoutContentObserver=createContentObserverNativeProbe(this.tabs,this.host.nativeElement,this.observer,this.zone,()=>{
      this.alive=false;this.detector.detectChanges();
    });
  }
}
function createContentObserverNativeProbe(group:ObserverLegacyTabGroup,host:HTMLElement,observer:PublicContentObserver,zone:ObserverNgZone,destroyOwned:()=>void){
  const trace=(window as any).__closeoutNativeObserverTrace,header=(group as any)._tabHeader;
  const element=host.querySelector('.mat-tab-list') as HTMLElement;
  const headerElement=host.querySelector('mat-tab-header') as HTMLElement;
  const label=host.querySelector('.mat-tab-label-content') as HTMLElement;
  const settle=async()=>{for(let i=0;i<3;i++)await new Promise<void>(done=>zone.runOutsideAngular(()=>setTimeout(done,0)));};
  const record=(r:MutationRecord)=>({native:r instanceof MutationRecord,type:r.type,target_type:r.target.nodeType,
    added_types:Array.from(r.addedNodes,node=>node.nodeType),removed_types:Array.from(r.removedNodes,node=>node.nodeType)});
  return {exercise:async()=>{
    const result:any={execution:'packed-native-content-observer-legacy-header',error:null,zoneless:typeof (window as any).Zone==='undefined',
      identity:{public_content_observer:observer instanceof PublicContentObserver,owned_legacy_header:header instanceof ObserverLegacyTabHeader,
        legacy_structure:!!element&&!!headerElement&&!!label&&element.getAttribute('role')==='tablist'&&!!element.querySelector('.mat-tab-labels')&&!!element.querySelector('mat-ink-bar'),
        shared_native_observer:false},calibration:{},stages:[],cleanup:{}};
    let control:MutationObserver|null=null,subscription:any=null,fresh:any=null,controlId:number|null=null;
    let raw:MutationRecord[]=[],delivered:MutationRecord[]=[],publicZones:boolean[]=[],ownedZones:boolean[]=[],publicEvents=0,pagination=0,depth=0;
    let oldContent:any,oldPagination:any,wrapped=false;
    const clear=()=>{raw=[];delivered=[];publicZones=[];ownedZones=[];publicEvents=0;pagination=0;};
    const receive=(records:MutationRecord[])=>{publicEvents++;delivered.push(...records);publicZones.push(ObserverNgZone.isInAngularZone());};
    try{
      if(!trace||!element||!label||!headerElement||!header)throw Error('owned observer fixture/trace missing');
      await settle();
      const before=trace.forTarget(element);result.initial_native_generations=before.length;
      oldContent=header._onContentChanges;oldPagination=header.updatePagination;
      header._onContentChanges=function(this:any,...args:any[]){ownedZones.push(ObserverNgZone.isInAngularZone());depth++;try{return oldContent.apply(this,args);}finally{depth--;}};
      header.updatePagination=function(this:any,...args:any[]){if(depth>0)pagination++;return oldPagination.apply(this,args);};wrapped=true;
      control=new MutationObserver(records=>raw.push(...records));
      control.observe(element,{characterData:true,childList:true,subtree:true});
      const controlRows=trace.forTarget(element).filter((row:any)=>!before.some((old:any)=>old.id===row.id));
      if(controlRows.length!==1)throw Error('native control observer identity missing');controlId=controlRows[0].id;
      subscription=observer.observe(element).subscribe(receive);
      result.identity.shared_native_observer=trace.forTarget(element).filter((row:any)=>row.id!==controlId).length===1;
      await settle();
      // Establish the historical text cache with real positive mutations before
      // challenging empty/comment-only batches. No handler is called directly.
      const warmup=document.createTextNode(' calibration');clear();
      zone.runOutsideAngular(()=>label.appendChild(warmup));await settle();
      result.calibration.text_add_notified=publicEvents===1&&ownedZones.length===1&&header._currentTextContent===(headerElement.textContent||'');
      clear();zone.runOutsideAngular(()=>warmup.remove());await settle();
      result.calibration.text_remove_notified=publicEvents===1&&ownedZones.length===1&&header._currentTextContent===(headerElement.textContent||'');
      result.mutations_outside_angular=true;
      const stage=async(id:string,mutate:()=>void)=>{
        clear();const oldText=headerElement.textContent;
        zone.runOutsideAngular(()=>{if(ObserverNgZone.isInAngularZone())result.mutations_outside_angular=false;mutate();});
        await settle();
        result.stages.push({id,raw_records:raw.map(record),delivered_records:delivered.map(record),public_events:publicEvents,
          public_zones:[...publicZones],owned_callbacks:ownedZones.length,owned_zones:[...ownedZones],pagination_calls:pagination,
          text_changed:headerElement.textContent!==oldText,cache_matches_text:header._currentTextContent===(headerElement.textContent||''),
          owner_destroyed:header._isDestroyed===true,owner_connected:headerElement.isConnected});
      };
      const comment=document.createComment('native comment'),text=document.createTextNode(' extra'),mixedComment=document.createComment('mixed'),mixedText=document.createTextNode(' mixed');
      await stage('comment-add',()=>label.appendChild(comment));
      await stage('comment-edit',()=>{comment.data='edited comment';});
      await stage('comment-remove',()=>comment.remove());
      await stage('text-add',()=>label.appendChild(text));
      await stage('text-edit',()=>{text.data=' changed';});
      await stage('text-same',()=>{text.data=' changed';});
      await stage('text-remove',()=>text.remove());
      await stage('mixed-add',()=>label.append(mixedComment,mixedText));
      await stage('mixed-remove',()=>{mixedComment.remove();mixedText.remove();});
      subscription.unsubscribe();result.cleanup.direct_subscription_closed=subscription.closed;
      await stage('shared-after-unsubscribe',()=>label.appendChild(document.createTextNode(' shared')));
      destroyOwned();await settle();result.cleanup.owned_header_destroyed=header._isDestroyed===true&&!headerElement.isConnected;
      const detachedText=document.createTextNode(' detached');
      await stage('destroyed-owner',()=>element.appendChild(detachedText));
      fresh=observer.observe(element).subscribe(receive);
      await stage('reobserve-detached',()=>{detachedText.data=' reobserved';});
      fresh.unsubscribe();result.cleanup.fresh_subscription_closed=fresh.closed;
      await stage('final-unsubscribe',()=>{detachedText.data=' unobserved';});
      result.native_generations=trace.forTarget(element).filter((row:any)=>row.id!==controlId);
    }catch(error){result.error=String(error);}
    finally{
      subscription?.unsubscribe();fresh?.unsubscribe();control?.disconnect();result.cleanup.control_disconnected=control!==null;
      if(wrapped){header._onContentChanges=oldContent;header.updatePagination=oldPagination;}
      result.cleanup.trace_restored=trace?.restore()===true;
    }
    return result;
  }};
}
`;
}
