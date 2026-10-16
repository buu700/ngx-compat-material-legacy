/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Compiled in the extracted consumer; its component scope has no modern import. */
export function bidiIsolatedPackedFixture() {
  return `import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Dir, Directionality} from '@angular/cdk/bidi';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {packedLegacyBidiScopeCase} from './bidi-isolated-contract.mjs';
@Component({standalone:true,selector:'packed-legacy-bidi-scope',
 imports:[MatLegacyFormFieldModule,MatLegacyInputModule],
 template:'<section [dir]="direction" (dirChange)="changes.push($event)"><mat-form-field><mat-label>Isolated legacy direction</mat-label><input matInput value="Isolated legacy input"></mat-form-field></section>'})
export class PackedLegacyBidiScope {
 direction:string='rtl';
 changes:string[]=[];
}
export async function observePackedLegacyBidiScope(){
 const observed:any={execution:'packed-angular-testbed-dom',error:null,states:[]};
 const fixture=TestBed.createComponent(PackedLegacyBidiScope);
 let subscription:any,completions=0;
 try{
  fixture.detectChanges();await fixture.whenStable();
  const section=fixture.debugElement.query(By.css('section'));
  const field=fixture.debugElement.query(By.css('mat-form-field'));
  const input=fixture.debugElement.query(By.css('input'));
  const dir=section.injector.get(Dir);
  observed.public_dir_instance=dir instanceof Dir;
  observed.node_instances_distinct_from_root=TestBed.inject(Directionality)!==dir;
  subscription=dir.change.subscribe({complete:()=>completions++});
  const snapshot=(stage:string)=>({stage,bound_value:fixture.componentInstance.direction,
   normalized:dir.value,host_attribute:section.nativeElement.getAttribute('dir'),
   events:[...fixture.componentInstance.changes],same_dir_instance:section.injector.get(Dir)===dir,
   field_provider_is_dir:field.injector.get(Directionality)===dir,
   input_provider_is_dir:input.injector.get(Directionality)===dir,
   legacy_field_structure:field.nativeElement.classList.contains('mat-form-field')
    &&!!field.nativeElement.querySelector('.mat-form-field-wrapper .mat-form-field-infix'),
   legacy_input_structure:input.nativeElement.classList.contains('mat-input-element')});
  observed.states.push(snapshot('initial'));
  for(const [stage,value]of [['ltr','ltr'],['repeat-ltr','ltr'],['uppercase-rtl','RTL'],
   ['invalid','invalid-direction'],['empty',''],['rtl','rtl']]){
   fixture.componentInstance.direction=value;fixture.detectChanges();await fixture.whenStable();
   observed.states.push(snapshot(stage));
  }
 }catch(error){observed.error=String(error);}
 finally{
  fixture.destroy();
  observed.cleanup={view_destroyed:fixture.componentRef.hostView.destroyed,
   output_completions:completions,subscription_closed:subscription?.closed===true};
 }
 return {observed,okay:packedLegacyBidiScopeCase(observed).result==='pass'};
}
`;
}
