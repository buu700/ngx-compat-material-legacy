/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Written into the isolated consumer and compiled with its actual packed library. */
export function valueAccessorPackedFixture() {
  return `import {Component, Type} from '@angular/core';
import {FormControl, FormControlDirective, NG_VALUE_ACCESSOR, NgControl, ReactiveFormsModule} from '@angular/forms';
import {By} from '@angular/platform-browser';
import {TestBed} from '@angular/core/testing';
import {TestKey} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {MatLegacyAutocompleteModule, MatLegacyAutocompleteTrigger} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {MatLegacyAutocompleteHarness} from '@ngx-compat/material-legacy/legacy-autocomplete/testing';
import {MatLegacyCheckboxModule, MatLegacyCheckbox} from '@ngx-compat/material-legacy/legacy-checkbox';
import {MatLegacyCheckboxHarness} from '@ngx-compat/material-legacy/legacy-checkbox/testing';
import {MatLegacyListModule, MatLegacySelectionList} from '@ngx-compat/material-legacy/legacy-list';
import {MatLegacySelectionListHarness} from '@ngx-compat/material-legacy/legacy-list/testing';
import {MatLegacyRadioModule, MatLegacyRadioGroup} from '@ngx-compat/material-legacy/legacy-radio';
import {MatLegacyRadioGroupHarness} from '@ngx-compat/material-legacy/legacy-radio/testing';
import {MatLegacySlideToggleModule, MatLegacySlideToggle} from '@ngx-compat/material-legacy/legacy-slide-toggle';
import {MatLegacySlideToggleHarness} from '@ngx-compat/material-legacy/legacy-slide-toggle/testing';
import {MatLegacySliderModule, MatLegacySlider} from '@ngx-compat/material-legacy/legacy-slider';
import {MatLegacySliderHarness} from '@ngx-compat/material-legacy/legacy-slider/testing';
import {packedValueAccessorCases} from '../src/value-accessor-contract.mjs';

@Component({standalone:true,
  imports:[ReactiveFormsModule,MatLegacyAutocompleteModule,MatLegacyCheckboxModule,MatLegacyListModule,MatLegacyRadioModule,MatLegacySlideToggleModule,MatLegacySliderModule],
  template:\`
    <input id="cva-autocomplete" [matAutocomplete]="autoPanel" [formControl]="autocomplete">
    <mat-autocomplete #autoPanel="matAutocomplete"><mat-option value="one">One</mat-option><mat-option value="two">Two</mat-option></mat-autocomplete>
    <mat-checkbox id="cva-checkbox" [formControl]="checkbox">Checkbox</mat-checkbox>
    <mat-selection-list id="cva-selection-list" [multiple]="false" [formControl]="selectionList"><mat-list-option value="one">One</mat-list-option><mat-list-option value="two">Two</mat-list-option></mat-selection-list>
    <mat-radio-group id="cva-radio" [formControl]="radio"><mat-radio-button value="one">One</mat-radio-button><mat-radio-button value="two">Two</mat-radio-button></mat-radio-group>
    <mat-slide-toggle id="cva-slide-toggle" [formControl]="slideToggle">Toggle</mat-slide-toggle>
    <mat-slider id="cva-slider" min="0" max="10" step="1" [formControl]="slider"></mat-slider>
  \`})
class ValueAccessorHost {
  autocomplete=new FormControl('',{nonNullable:true});
  checkbox=new FormControl(false,{nonNullable:true});
  selectionList=new FormControl<string[]>([],{nonNullable:true});
  radio=new FormControl('',{nonNullable:true});
  slideToggle=new FormControl(false,{nonNullable:true});
  slider=new FormControl(0,{nonNullable:true});
}

export async function observePackedValueAccessors() {
  const fixture=TestBed.createComponent(ValueAccessorHost),rows:any[]=[],subscriptions:{unsubscribe():void}[]=[];
  const copy=(value:any)=>Array.isArray(value)?value.slice():value;
  const settle=async()=>{fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();};
  const teardownTick=async()=>{await Promise.resolve();await Promise.resolve();};
  try {
    await settle();
    const loader=TestbedHarnessEnvironment.loader(fixture),host=fixture.componentInstance;
    const specs:{family:string;owner:Type<any>;control:FormControl<any>;model:any;after:any;harness:any;read:()=>Promise<any>;retained:()=>any;interact:()=>Promise<void>;touch:()=>Promise<void>;disabled:()=>Promise<boolean>}[]=[];
    const node=(family:string,owner:Type<any>)=>{
      const debug=fixture.debugElement.query(By.css('#cva-'+family));
      if(!debug)throw Error('Missing actual accessor node '+family);
      return {debug,instance:debug.injector.get(owner)};
    };
    const autoNode=node('autocomplete',MatLegacyAutocompleteTrigger);
    const auto=await loader.getHarness(MatLegacyAutocompleteHarness.with({selector:'#cva-autocomplete'}));
    specs.push({family:'autocomplete',owner:MatLegacyAutocompleteTrigger,control:host.autocomplete,model:'one',after:'one',harness:auto,read:()=>auto.getValue(),retained:()=>autoNode.debug.nativeElement.value,
      interact:()=>auto.selectOption({text:'Two'}),touch:async()=>{await auto.focus();await auto.blur();autoNode.instance.closePanel();},disabled:()=>auto.isDisabled()});
    const checkNode=node('checkbox',MatLegacyCheckbox),check=await loader.getHarness(MatLegacyCheckboxHarness.with({selector:'#cva-checkbox'}));
    specs.push({family:'checkbox',owner:MatLegacyCheckbox,control:host.checkbox,model:true,after:true,harness:check,read:()=>check.isChecked(),retained:()=>checkNode.instance.checked,
      interact:()=>check.toggle(),touch:async()=>{await check.focus();await check.blur();},disabled:()=>check.isDisabled()});
    const listNode=node('selection-list',MatLegacySelectionList),list=await loader.getHarness(MatLegacySelectionListHarness.with({selector:'#cva-selection-list'}));
    specs.push({family:'selection-list',owner:MatLegacySelectionList,control:host.selectionList,model:['one'],after:['one'],harness:list,
      read:async()=>{const selected=await list.getItems({selected:true});return Promise.all(selected.map(async(option:any)=>(await option.getText()).trim().toLowerCase()));},retained:()=>listNode.instance.selectedOptions.selected.map((option:any)=>option.value),
      interact:()=>list.selectItems({text:'Two'}),touch:async()=>{const options=await list.getItems({text:'Two'});await options[0].focus();await options[0].blur();},disabled:()=>list.isDisabled()});
    const radioNode=node('radio',MatLegacyRadioGroup),radio=await loader.getHarness(MatLegacyRadioGroupHarness.with({selector:'#cva-radio'}));
    specs.push({family:'radio',owner:MatLegacyRadioGroup,control:host.radio,model:'one',after:'one',harness:radio,read:()=>radio.getCheckedValue(),retained:()=>radioNode.instance.value,
      interact:()=>radio.checkRadioButton({value:'two'}),touch:async()=>{const buttons=await radio.getRadioButtons({value:'two'});await buttons[0].focus();await buttons[0].blur();},
      disabled:async()=>{const buttons=await radio.getRadioButtons();return buttons.length===2&&(await Promise.all(buttons.map((button:any)=>button.isDisabled()))).every(Boolean);}});
    const toggleNode=node('slide-toggle',MatLegacySlideToggle),toggle=await loader.getHarness(MatLegacySlideToggleHarness.with({selector:'#cva-slide-toggle'}));
    specs.push({family:'slide-toggle',owner:MatLegacySlideToggle,control:host.slideToggle,model:true,after:true,harness:toggle,read:()=>toggle.isChecked(),retained:()=>toggleNode.instance.checked,
      interact:()=>toggle.toggle(),touch:async()=>{await toggle.focus();await toggle.blur();},disabled:()=>toggle.isDisabled()});
    const sliderNode=node('slider',MatLegacySlider),slider=await loader.getHarness(MatLegacySliderHarness.with({selector:'#cva-slider'}));
    specs.push({family:'slider',owner:MatLegacySlider,control:host.slider,model:2,after:4,harness:slider,read:()=>slider.getValue(),retained:()=>sliderNode.instance.value,
      interact:async()=>{await slider.focus();await (await slider.host()).sendKeys(TestKey.RIGHT_ARROW);},touch:async()=>{await slider.focus();await slider.blur();},disabled:()=>slider.isDisabled()});
    for(const spec of specs){
      const row:any={family:spec.family,execution:'packed-angular-testbed-dom',target_class:spec.owner.name,error:null};rows.push(row);
      try {
        const {debug,instance}=node(spec.family,spec.owner),directive=debug.injector.get(NgControl,undefined,{self:true});
        const values=debug.injector.get(NG_VALUE_ACCESSOR,undefined,{self:true});
        row.registration={instance_owned:instance instanceof spec.owner,exact_prototype:Object.getPrototypeOf(instance)===spec.owner.prototype,
          directive_is_form_control:directive instanceof FormControlDirective,control_identity:directive.control===spec.control,
          accessor_identity:directive.valueAccessor===instance,owner_occurrences:values.filter(value=>value===instance).length,array_length:values.length};
        const events:any[]=[];subscriptions.push(spec.control.valueChanges.subscribe(value=>events.push(copy(value))));
        spec.control.setValue(copy(spec.model));await settle();
        row.model_write={model:copy(spec.control.value),view:copy(await spec.read()),events:events.map(copy),pristine:spec.control.pristine};
        await spec.interact();await settle();
        row.user_write={model:copy(spec.control.value),view:copy(await spec.read()),events:events.map(copy),dirty:spec.control.dirty};
        spec.control.markAsUntouched();const before=spec.control.touched;await spec.touch();await settle();
        row.touch={before,after:spec.control.touched,events:events.map(copy)};
        spec.control.disable({emitEvent:false});await settle();row.disabled={control:spec.control.disabled,view:await spec.disabled()};
        spec.control.enable({emitEvent:false});await settle();row.reenabled={control:spec.control.disabled,view:await spec.disabled(),value:copy(await spec.read())};
      } catch(error){row.error=String(error);}
    }
    fixture.destroy();await teardownTick();
    for(const [index,spec] of specs.entries()){
      const row=rows[index];if(row.error!==null)continue;
      try {const before=copy(spec.retained());spec.control.setValue(copy(spec.after));await teardownTick();
        row.destroy={fixture_destroyed:fixture.destroyed,retained_before:before,retained_after:copy(spec.retained()),model:copy(spec.control.value)};
      } catch(error){row.error=String(error);}
    }
    return {rows,okay:packedValueAccessorCases(rows).every((row:any)=>row.result==='pass')};
  } finally {if(!fixture.destroyed)fixture.destroy();for(const subscription of subscriptions)subscription.unsubscribe();}
}
`;
}
