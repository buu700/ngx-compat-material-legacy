/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import '@angular/compiler';
import {Component, Directive, Input, ViewChild, ViewContainerRef, inject, createComponent,
  QueryList, NgModule, IterableDiffers, reflectComponentType, NO_ERRORS_SCHEMA, ChangeDetectionStrategy, provideZoneChangeDetection} from '@angular/core';
import {CommonModule} from '@angular/common';
import {bootstrapApplication} from '@angular/platform-browser';
import {templates, line} from './template-input.mjs';
import {_MatLegacyPaginatorOptions} from './template-options.mjs';
import {_MatLegacyPaginatorOptions as OptionsWithoutTeardown} from './template-options-no-teardown.mjs';
class OptionsModule {}
NgModule({declarations:[_MatLegacyPaginatorOptions],exports:[_MatLegacyPaginatorOptions]})(OptionsModule);
class OptionsModuleWithoutTeardown {}
NgModule({declarations:[OptionsWithoutTeardown],exports:[OptionsWithoutTeardown]})(OptionsModuleWithoutTeardown);

const results = [], warnings = [];
const oldWarn = console.warn;
console.warn = (...args) => {warnings.push(args.join(' ')); oldWarn(...args);};
const assert = (test, detail) => {if (!test) throw new Error(detail);};
class Origin {}
Directive({standalone:true,selector:'[cdk-overlay-origin]',exportAs:'cdkOverlayOrigin'})(Origin);
class Portal {
  container = inject(ViewContainerRef);
  set value(template) {this.container.clear(); if (template) this.container.createEmbeddedView(template);}
}
Input('cdkPortalOutlet')(Portal.prototype, 'value');
Directive({standalone:true,selector:'[cdkPortalOutlet]'})(Portal);
class Root {}
Component({standalone:true,selector:'probe-root',template:''})(Root);
function context() {
  const noop=()=>{}, c={multiple:false,selected:true,disabled:false,group:null,
    selectionList:{multiple:false},checkboxPosition:'after',_isRippleDisabled:()=>false,
    _getHostElement:()=>document.body,disableRipple:false,_triggersSubmenu:false,
    data:{message:'message',action:'action'},hasAction:false,action:noop,
    appearance:'legacy',color:'primary',_prefixChildren:[],_suffixChildren:[],
    _control:{id:'control',empty:true,placeholder:'placeholder',required:true,disabled:false,onContainerClick:noop},
    updateOutlineGap:noop,_labelId:'label',_hintLabelId:'hint',hintLabel:'hint label',
    _shouldAlwaysFloat:()=>false,_hasFloatingLabel:()=>true,_hasLabel:()=>false,
    _getDisplayedMessages:()=> 'hint',hideRequiredMarker:false,_animationsEnabled:false,
    _subscriptAnimationState:'enter',_intl:{itemsPerPageLabel:'Items',firstPageLabel:'First',
      previousPageLabel:'Previous',nextPageLabel:'Next',lastPageLabel:'Last',getRangeLabel:()=> 'range'},
    hidePageSize:false,showFirstLastButtons:false,pageSize:10,_displayedPageSizeOptions:[5,10,10,20],
    _pageSizeOptionItems:[],_formFieldAppearance:'legacy',selectConfig:{},pageIndex:0,length:100,
    _changePageSize:noop,firstPage:noop,previousPage:noop,nextPage:noop,lastPage:noop,
    _previousButtonsDisabled:()=>false,_nextButtonsDisabled:()=>false,
    diameter:100,mode:'determinate',_spinnerAnimationLabel:'100',_getViewBox:()=> '0 0 100 100',
    _getCircleRadius:()=>45,_getStrokeDashOffset:()=>100,_getStrokeCircumference:()=>200,
    _getCircleStrokeWidth:()=>10,_getCircleTransformOrigin:()=> '50px 50px',
    empty:true,_valueId:'value',placeholder:'Select',triggerValue:'Chosen',customTrigger:null,
    panelOpen:false,id:'select',open:noop,close:noop,_overlayAttached:false,_positions:[],
    _getOverlayMinWidth:()=>100,_onAttached:noop,_overlayPanelClass:[],_scrollStrategy:{},_offsetY:0,
    selectedIndex:0,disablePagination:false,ariaLabel:'tabs',ariaLabelledby:null,
    _focusChanged:noop,_tabFocusChanged:noop,_handleClick:noop,
    _getTabLabelId:i=>'label-'+i,_getTabContentId:i=>'content-'+i,_getTabIndex:i=>i? -1:0,
    _animationsDisabled:()=>true,contentTabIndex:0,animationDuration:'0ms',preserveContent:true,
    _removeTabBodyWrapperHeight:noop,_setTabBodyWrapperHeight:noop,
  };
  return c;
}
function dom(node) {
  if(node.nodeType===Node.COMMENT_NODE)return [];
  if(node.nodeType===Node.TEXT_NODE){const value=node.textContent.replace(/\s+/g,' ').trim();return value?[{text:value}]:[];}
  return [{tag:node.tagName,namespace:node.namespaceURI,
    attrs:[...node.attributes].filter(a=>!a.name.startsWith('ng-reflect-')).map(a=>[a.name,a.value]).sort(),
    children:[...node.childNodes].flatMap(dom)}];
}
async function run() {
  const providers = line==='original' ? [] : [provideZoneChangeDetection()];
  const app = await bootstrapApplication(Root,{providers});
  for(const record of templates){
    const differLifetime={created:0,destroyed:0};const custom=record.variant.startsWith('custom/')||record.variant==='negative/differ-teardown';
    class Subject {constructor(){Object.defineProperties(this,Object.getOwnPropertyDescriptors(context()));}}
    ViewChild('projectedLabel')(Subject.prototype,'projectedLabel');
    Component({standalone:true,selector:'template-subject',imports:[CommonModule,Origin,Portal,record.variant==='negative/differ-teardown'?OptionsModuleWithoutTeardown:OptionsModule],
      providers:custom?[{provide:IterableDiffers,useFactory:()=>{const parent=inject(IterableDiffers,{skipSelf:true});const factory=parent.find([]);return new IterableDiffers([{supports:items=>Array.isArray(items),create:()=>{differLifetime.created++;const differ=factory.create((index,value)=>Math.floor(value/10));const destroy=differ.onDestroy.bind(differ);differ.onDestroy=()=>{differLifetime.destroyed++;destroy();};return differ;}}]);}}]:[],
      schemas:[NO_ERRORS_SCHEMA],changeDetection:ChangeDetectionStrategy.Eager ?? ChangeDetectionStrategy.Default,template:record.template+'<ng-template #projectedLabel>Template label</ng-template>'})(Subject);
    const host=document.createElement('template-subject');document.body.append(host);
    const projected=reflectComponentType(Subject).ngContentSelectors.map(selector=>{const node=document.createElement('span');node.textContent=selector+' projected';return [node];});
    const ref=createComponent(Subject,{hostElement:host,environmentInjector:app.injector,projectableNodes:projected});
    const s=ref.instance, states=[], ids=new WeakMap();let serial=0;
    const snapshot=(name,selector)=>{ref.changeDetectorRef.markForCheck();ref.changeDetectorRef.detectChanges();const nodes=selector?[...host.querySelectorAll(selector)]:[];
      states.push({name,...(custom?{differLifetime:{...differLifetime}}:{}),dom:[...host.childNodes].flatMap(dom),identities:nodes.map(n=>{if(!ids.has(n))ids.set(n,serial++);return ids.get(n);})});};
    const family=record.family;
    try {
    if(family==='legacy-tabs'){
      const make=label=>({textLabel:label,templateLabel:null,labelClass:'label-'+label,bodyClass:'body-'+label,
        disabled:false,ariaLabel:label,content:null,position:0,origin:null});
      const [a,b,c,d]=['A','B','C','D'].map(make);s._tabs=new QueryList();
      for(const [name,tabs] of [['initial',[a,b,c]],['reorder',[c,a,b]],['insert',[c,a,b,d]],['remove',[b,d]],['empty',[]],['restore',[a,b,c]]]){
        s._tabs.reset(tabs);snapshot(name,'.mat-tab-label,mat-tab-body');}
      a.templateLabel=s.projectedLabel;s._tabs.reset([a,b]);snapshot('template label');
      a.templateLabel=null;snapshot('text fallback');
    }else if(family==='legacy-paginator'){
      for(const [name,options] of [['initial',[5,10,10,20]],['insert',[1,5,10,10,20]],['duplicate',[1,10,10,10,20]],
        ['remove',[10,20]],['signed zero',[-0,0,0,10]],['zero reorder',[0,-0,0,10]],['empty',[]],['restore',[5,10,10,20]]]){
        s._displayedPageSizeOptions=options;snapshot(name,'mat-option');}
      s.hidePageSize=true;s.showFirstLastButtons=true;snapshot('hidden size with end buttons');
      s.hidePageSize=false;s._displayedPageSizeOptions=[10];snapshot('single size');
      if(custom){assert(differLifetime.created===2,'differ view creation count');assert(differLifetime.destroyed===(record.variant.endsWith('/before')?0:2),'differ teardown count');}
    }else if(family==='legacy-progress-spinner'){
      snapshot('determinate','circle');s.mode='indeterminate';snapshot('indeterminate','circle');s.mode='determinate';snapshot('determinate again','circle');
      assert(states.map(x=>x.identities[0]).join(',')==='0,1,2','separate SVG circle lifetimes '+line+' '+JSON.stringify(states.map(x=>x.identities)));
      assert(host.querySelector('circle').namespaceURI==='http://www.w3.org/2000/svg','SVG circle namespace');
    }else if(family==='legacy-select'){
      snapshot('empty');s.empty=false;snapshot('value');s.customTrigger={};snapshot('custom trigger');s.empty=true;snapshot('empty again');
    }else if(family==='legacy-form-field'){
      snapshot('placeholder and hints');s._hasLabel=()=>true;snapshot('label and required');
      assert(host.querySelector('.mat-form-field-required-marker'),'required marker outside label switch');
      s._getDisplayedMessages=()=> 'error';snapshot('errors');s._getDisplayedMessages=()=> 'hint';s.hintLabel='';snapshot('projected hints');
      s.appearance='outline';s._prefixChildren=[{}];s._suffixChildren=[{}];snapshot('outline and affixes');
      s._hasFloatingLabel=()=>false;snapshot('no floating label');
    }else if(family==='legacy-core'){
      snapshot('single');s.multiple=true;s.group={_inert:true,label:'group'};snapshot('multiple inert group');s.group._inert=false;snapshot('active group');
    }else if(family==='legacy-list'){
      snapshot('single');s.selectionList.multiple=true;snapshot('multiple');s.selectionList.multiple=false;snapshot('single again');
    }else if(family==='legacy-menu'){
      snapshot('normal');s._triggersSubmenu=true;snapshot('submenu');s._triggersSubmenu=false;snapshot('normal again');
    }else {snapshot('message');s.hasAction=true;snapshot('action');s.hasAction=false;snapshot('message again');}
    results.push({family,variant:record.variant,states});
    } catch(error) {if(!record.variant.startsWith('negative/'))throw error;results.push({family,variant:record.variant,error:error.message});}
    finally {ref.destroy();host.remove();}
  }
  assert(!warnings.some(w=>w.includes('NG0955')),'duplicate @for tracking keys');app.destroy();
  document.getElementById('report').textContent=JSON.stringify({line,results,warnings});
}
run().catch(error=>{document.getElementById('report').textContent=JSON.stringify({line,error:error.stack});});
