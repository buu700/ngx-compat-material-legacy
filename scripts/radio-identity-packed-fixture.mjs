/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Compiled with the extracted library and actual public peer modules. */
export function radioIdentityPackedFixture(){
 return `import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {UniqueSelectionDispatcher} from '@angular/cdk/collections';
import {MatRadioModule, MatRadioGroup, MatRadioButton} from '@angular/material/radio';
import {MatLegacyRadioModule, MatLegacyRadioGroup, MatLegacyRadioButton} from '@ngx-compat/material-legacy/legacy-radio';
import {packedRadioIdentityCase} from './radio-identity-contract.mjs';

// The same selectors belong to different generations, so each wrapper owns one scope.
@Component({standalone:true,selector:'packed-legacy-radios',imports:[MatLegacyRadioModule],
 template:\`<mat-radio-group [value]="'a'">
  <mat-radio-button value="a">Legacy A</mat-radio-button>
  <mat-radio-button id="packed-legacy-explicit" value="b">Legacy B</mat-radio-button>
 </mat-radio-group>\`})
class PackedLegacyRadios {}
@Component({standalone:true,selector:'packed-current-radios',imports:[MatRadioModule],
 template:\`<mat-radio-group [value]="'a'">
  <mat-radio-button value="a">Current A</mat-radio-button>
  <mat-radio-button value="b">Current B</mat-radio-button>
  <mat-radio-button value="c">Current C</mat-radio-button>
  <mat-radio-button value="d">Current D</mat-radio-button>
 </mat-radio-group>\`})
class PackedCurrentRadios {}
@Component({standalone:true,imports:[PackedLegacyRadios,PackedCurrentRadios],
 template:'<packed-legacy-radios /><packed-current-radios />'})
export class PackedRadioIdentityHost {}

export async function observePackedRadioIdentity(){
 let fixture:any;
 const observed:any={execution:'packed-angular-testbed-dom',error:null,scopes_separate:false,transitions:[]};
 try{
  fixture=TestBed.createComponent(PackedRadioIdentityHost);
  const settle=async()=>{fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();};
  await settle();
  const legacyScope=fixture.debugElement.query(By.directive(PackedLegacyRadios));
  const peerScope=fixture.debugElement.query(By.directive(PackedCurrentRadios));
  const ownGroup=legacyScope.query(By.directive(MatLegacyRadioGroup)),peerGroup=peerScope.query(By.directive(MatRadioGroup));
  const own=legacyScope.queryAll(By.directive(MatLegacyRadioButton)),peer=peerScope.queryAll(By.directive(MatRadioButton));
  observed.scopes_separate=legacyScope.queryAll(By.directive(MatRadioButton)).length===0&&peerScope.queryAll(By.directive(MatLegacyRadioButton)).length===0;
  const all=[...own,...peer],input=(node:any)=>node.nativeElement.querySelector('input[type="radio"]') as HTMLInputElement;
  const selected=(nodes:any[],native:boolean)=>{const values=nodes.filter(node=>native?input(node).checked:node.componentInstance.checked).map(node=>native?input(node).value:node.componentInstance.value);if(values.length>1)throw Error('Multiple checked radios in one generation');return values[0]??null;};
  const selection=()=>({legacy:selected(own,false),peer:selected(peer,false),legacy_native:selected(own,true),peer_native:selected(peer,true)});
  const names=[ownGroup.componentInstance.name,peerGroup.componentInstance.name];
  const dispatcher=TestBed.inject(UniqueSelectionDispatcher);
  observed.identities={owned_group:ownGroup.componentInstance instanceof MatLegacyRadioGroup,
   owned_buttons:own.length===2&&own.every((node:any)=>node.componentInstance instanceof MatLegacyRadioButton),
   peer_group:peerGroup.componentInstance instanceof MatRadioGroup,
   peer_buttons:peer.length===4&&peer.every((node:any)=>node.componentInstance instanceof MatRadioButton),
   dispatcher_shared:all.every(node=>node.injector.get(UniqueSelectionDispatcher)===dispatcher),
   generations_distinct:MatLegacyRadioGroup!==(MatRadioGroup as any)&&MatLegacyRadioButton!==(MatRadioButton as any)};
  observed.initial={group_names:names,host_ids:all.map(node=>node.nativeElement.id),input_ids:all.map(node=>input(node).id),
   links:all.map(node=>({host_id:node.nativeElement.id,input_id:input(node).id,label_for:node.nativeElement.querySelector('label')?.htmlFor,native_name:input(node).name})),
   legacy_structure:own.map((node:any)=>({label:!!node.nativeElement.querySelector('.mat-radio-label'),container:!!node.nativeElement.querySelector('.mat-radio-container'),outer_circle:!!node.nativeElement.querySelector('.mat-radio-outer-circle'),inner_circle:!!node.nativeElement.querySelector('.mat-radio-inner-circle'),label_content:!!node.nativeElement.querySelector('.mat-radio-label-content'),input_class:input(node).classList.contains('mat-radio-input')})),selection:selection()};
  const click=async(node:any,stage:string)=>{input(node).click();await settle();observed.transitions.push({stage,...selection()});};
  await click(own[1],'legacy-b');await click(peer[2],'peer-c');await click(own[0],'legacy-a');
  ownGroup.componentInstance.name='packed-radio-shared';peerGroup.componentInstance.name='packed-radio-shared';await settle();
  observed.explicit={group_name:ownGroup.componentInstance.name,legacy_names:own.map((node:any)=>input(node).name),peer_names:peer.map((node:any)=>input(node).name),host_id:own[1].nativeElement.id,input_id:input(own[1]).id,label_for:own[1].nativeElement.querySelector('label')?.htmlFor};
  await click(peer[1],'shared-peer-b');await click(own[1],'shared-legacy-b');
  ownGroup.componentInstance.name=names[0];peerGroup.componentInstance.name=names[1];await settle();
  await click(peer[2],'restored-independent');
  const before=all.map(node=>node.componentInstance.checked);
  fixture.destroy();for(const name of new Set(names))dispatcher.notify('destroyed-radio-probe',name);
  observed.destroy={fixture_destroyed:fixture.componentRef.hostView.destroyed,notified_distinct_names:new Set(names).size,checked_before:before,checked_after:all.map(node=>node.componentInstance.checked)};
 }catch(error){observed.error=String(error);}
 finally{if(fixture&&!fixture.componentRef.hostView.destroyed)fixture.destroy();}
 return {observed,okay:packedRadioIdentityCase(observed).result==='pass'};
}
`;
}
