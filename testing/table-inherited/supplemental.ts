/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Component, Directive, inject, QueryList, ViewChildren, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {CDK_VIRTUAL_SCROLL_VIEWPORT,CdkVirtualScrollViewport,ScrollingModule} from '@angular/cdk/scrolling';
import {CdkTableModule} from '@angular/cdk/table';
import {MatLegacyColumnDef,MatLegacyTableModule} from '@ngx-compat/material-legacy/legacy-table';

@Directive({selector:'[tableViewportReader]',standalone:true})
class ViewportReader {viewport=inject(CDK_VIRTUAL_SCROLL_VIEWPORT);}
@Component({standalone:true,imports:[MatLegacyTableModule,ScrollingModule,ViewportReader],template:`
<cdk-virtual-scroll-viewport itemSize="20" style="height:100px;width:300px">
<table mat-table [dataSource]="rows()" id="native"><ng-container matColumnDef="id" [sticky]="sticky()"><th mat-header-cell *matHeaderCellDef>Head</th><td mat-cell *matCellDef="let row" tableViewportReader>{{row}}</td><td mat-footer-cell *matFooterCellDef>Foot</td></ng-container><tr mat-header-row *matHeaderRowDef="cols;sticky:true"></tr><tr mat-row *matRowDef="let row;columns:cols;when:isEven" class="even"></tr><tr mat-row *matRowDef="let row;columns:cols" class="other"></tr><tr mat-footer-row *matFooterRowDef="cols;sticky:true"></tr><tr *matNoDataRow class="consumer-row"><td class="consumer-cell">Empty</td></tr></table>
<mat-table [dataSource]="rows()" id="flex"><ng-container matColumnDef="id" [sticky]="sticky()"><mat-header-cell *matHeaderCellDef>Head</mat-header-cell><mat-cell *matCellDef="let row" tableViewportReader>{{row}}</mat-cell><mat-footer-cell *matFooterCellDef>Foot</mat-footer-cell></ng-container><mat-header-row *matHeaderRowDef="cols;sticky:true"></mat-header-row><mat-row *matRowDef="let row;columns:cols;when:isEven" class="even"></mat-row><mat-row *matRowDef="let row;columns:cols" class="other"></mat-row><mat-footer-row *matFooterRowDef="cols;sticky:true"></mat-footer-row><div *matNoDataRow class="consumer-row"><span class="consumer-cell">Empty</span></div></mat-table>
</cdk-virtual-scroll-viewport>`})
class OwnedViewport {
 rows=signal(Array.from({length:12},(_,i)=>i));cols=['id'];sticky=signal(true);
 isEven=(index:number)=>index%2===0;
 @ViewChildren(ViewportReader) readers!:QueryList<ViewportReader>;
 @ViewChildren(MatLegacyColumnDef) defs!:QueryList<MatLegacyColumnDef>;
}
@Component({standalone:true,imports:[CdkTableModule,ScrollingModule],template:`
<cdk-virtual-scroll-viewport itemSize="20" style="height:100px;width:300px"><table cdk-table [dataSource]="rows"><ng-container cdkColumnDef="id"><td cdk-cell *cdkCellDef="let row">{{row}}</td></ng-container><tr cdk-row *cdkRowDef="let row;columns:cols;when:isEven"></tr><tr cdk-row *cdkRowDef="let row;columns:cols"></tr></table></cdk-virtual-scroll-viewport>`})
class RawViewport {rows=[0,1];cols=['id'];isEven=(index:number)=>index%2===0;}
const settle=async(f:any)=>{f.changeDetectorRef.markForCheck();f.changeDetectorRef.detectChanges();await f.whenStable();await new Promise(r=>setTimeout(r,80));f.changeDetectorRef.detectChanges();};
export async function observeTableSupplemental(){
 const f=TestBed.createComponent(OwnedViewport);
 try{
  await settle(f);const el=f.nativeElement as HTMLElement,viewport=f.debugElement.queryAllNodes(x=>x.providerTokens.includes(CdkVirtualScrollViewport))[0].injector.get(CdkVirtualScrollViewport);
  const layouts=['native','flex'] as const;
  const roots=():Record<'native'|'flex',Element>=>({native:el.querySelector('#native')!,flex:el.querySelector('#flex')!});
  const firstRoots=roots(),initial=Object.fromEntries(layouts.map(id=>{const root=firstRoots[id],rows=Array.from(root.querySelectorAll('.mat-row'));return [id,{rows:rows.map(r=>r.textContent!.trim()),even:rows.map(r=>r.classList.contains('even')),header:(root.querySelector(id==='native'?'.mat-header-cell':'.mat-header-row') as HTMLElement).style.top,footer:(root.querySelector(id==='native'?'.mat-footer-cell':'.mat-footer-row') as HTMLElement).style.bottom,sticky_left:(root.querySelector('.mat-cell') as HTMLElement).style.left,sticky_class:root.querySelector('.mat-cell')!.classList.contains('mat-table-sticky')}]}));
  const readers={count:f.componentInstance.readers.length,all_match:f.componentInstance.readers.toArray().every(x=>x.viewport===viewport)};
  f.componentInstance.sticky.set(false);await settle(f);const unstuck=Object.fromEntries(layouts.map(id=>{const cell=roots()[id].querySelector('.mat-cell') as HTMLElement;return[id,{left:cell.style.left,sticky_class:cell.classList.contains('mat-table-sticky')}]}));
  const d=f.componentInstance.defs.first;d.sticky=true;d.resetStickyChanged();(d as any).sticky='false';const first={value:d.sticky,changed:d.hasStickyChanged()};(d as any).sticky='false';const repeated=d.hasStickyChanged();(d as any).stickyEnd='';const end={value:d.stickyEnd,changed:d.hasStickyChanged()};(d as any).stickyEnd='';const end_repeated=d.hasStickyChanged();
  f.componentInstance.rows.set([]);await settle(f);const empty=Object.fromEntries(layouts.map(id=>{const root=roots()[id],row=root.querySelector('.mat-no-data-row');return[id,{row_class:row?.getAttribute('class')??null,cell_class:row?.querySelector('.consumer-cell')?.getAttribute('class')??null,row_count:root.querySelectorAll('.mat-row').length}]}));
  f.componentInstance.rows.set([2,3]);await settle(f);const restored=Object.fromEntries(layouts.map(id=>{const root=roots()[id];return[id,{empty_present:!!root.querySelector('.mat-no-data-row'),rows:root.querySelectorAll('.mat-row').length}]}));
  const raw=TestBed.createComponent(RawViewport);let raw_error:string|null=null;try{raw.detectChanges()}catch(e){raw_error=String(e)}finally{raw.destroy()}
  return {initial,readers,unstuck,direct:{first,repeated,end,end_repeated},empty,restored,raw_error};
 }finally{f.destroy()}
}
