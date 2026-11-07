/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import 'zone.js';
import {Component, NgModule, QueryList, ViewChildren, ElementRef, getDebugNode} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {CdkTableModule,CdkTable,CdkColumnDef,CdkHeaderRowDef,CdkFooterRowDef,CdkRowDef} from '@angular/cdk/table';
import {MatLegacyTableModule,_LegacyTableDefinitionOwner} from '@ngx-compat/material-legacy/legacy-table';
const tokens=[CdkColumnDef,CdkHeaderRowDef,CdkFooterRowDef,CdkRowDef] as const;
@Component({standalone:false,selector:'case-legacy',template:`
    <table mat-table id="raw-outer" [dataSource]="[{value:'Outer'}]">
      <ng-container cdkColumnDef="value">
        <th mat-header-cell *cdkHeaderCellDef>Header</th>
        <td mat-cell *cdkCellDef="let row">{{row.value}} <table mat-table id="raw-inner" [dataSource]="[{value:'Inner'}]">
          <ng-container cdkColumnDef="value"><td mat-cell *cdkCellDef="let row">{{row.value}}</td></ng-container>
          <tr mat-row *cdkRowDef="let row; columns:['value']"></tr>
        </table></td>
        <td mat-footer-cell *cdkFooterCellDef>Footer</td>
      </ng-container>
      <tr mat-header-row *cdkHeaderRowDef="['value']"></tr>
      <tr mat-row *cdkRowDef="let row; columns:['value']"></tr>
      <tr mat-footer-row *cdkFooterRowDef="['value']"></tr>
    </table>
  `})
export class Legacy {
 @ViewChildren(_LegacyTableDefinitionOwner) ownerInstances!:QueryList<_LegacyTableDefinitionOwner>;
 @ViewChildren(_LegacyTableDefinitionOwner,{read:ElementRef}) owners!:QueryList<ElementRef>;
 @ViewChildren(CdkColumnDef) columns!:QueryList<CdkColumnDef>;
 @ViewChildren(CdkHeaderRowDef) headers!:QueryList<CdkHeaderRowDef>;
 @ViewChildren(CdkFooterRowDef) footers!:QueryList<CdkFooterRowDef>;
 @ViewChildren(CdkRowDef) rows!:QueryList<CdkRowDef<unknown>>;
 inspect(){const nodes=this.owners.toArray();return {instances:this.ownerInstances.length,owners:nodes.length,counts:[this.columns.length,this.headers.length,this.footers.length,this.rows.length],associations:nodes.map(ref=>{const i=getDebugNode(ref.nativeElement)!.injector;const defs=tokens.map(t=>i.get(t as any,null,{self:true})).filter(Boolean) as Array<{_table:unknown}>;return {count:defs.length,match:defs.length===1 && defs[0]._table===i.get(CdkTable)};})};}
}
@Component({standalone:false,selector:'case-current',template:`
    <table mat-table id="raw-outer" [dataSource]="[{value:'Outer'}]">
      <ng-container cdkColumnDef="value">
        <th mat-header-cell *cdkHeaderCellDef>Header</th>
        <td mat-cell *cdkCellDef="let row">{{row.value}} <table cdk-table id="raw-inner" [dataSource]="[{value:'Inner'}]">
          <ng-container cdkColumnDef="value"><td cdk-cell *cdkCellDef="let row">{{row.value}}</td></ng-container>
          <tr cdk-row *cdkRowDef="let row; columns:['value']"></tr>
        </table></td>
        <td mat-footer-cell *cdkFooterCellDef>Footer</td>
      </ng-container>
      <tr mat-header-row *cdkHeaderRowDef="['value']"></tr>
      <tr mat-row *cdkRowDef="let row; columns:['value']"></tr>
      <tr mat-footer-row *cdkFooterRowDef="['value']"></tr>
    </table>
  `})
export class Current {
 @ViewChildren(_LegacyTableDefinitionOwner) ownerInstances!:QueryList<_LegacyTableDefinitionOwner>;
 @ViewChildren(_LegacyTableDefinitionOwner,{read:ElementRef}) owners!:QueryList<ElementRef>;
 @ViewChildren(CdkColumnDef) columns!:QueryList<CdkColumnDef>;
 @ViewChildren(CdkHeaderRowDef) headers!:QueryList<CdkHeaderRowDef>;
 @ViewChildren(CdkFooterRowDef) footers!:QueryList<CdkFooterRowDef>;
 @ViewChildren(CdkRowDef) rows!:QueryList<CdkRowDef<unknown>>;
 inspect(){const nodes=this.owners.toArray();return {instances:this.ownerInstances.length,owners:nodes.length,counts:[this.columns.length,this.headers.length,this.footers.length,this.rows.length],associations:nodes.map(ref=>{const i=getDebugNode(ref.nativeElement)!.injector;const defs=tokens.map(t=>i.get(t as any,null,{self:true})).filter(Boolean) as Array<{_table:unknown}>;return {count:defs.length,match:defs.length===1 && defs[0]._table===i.get(CdkTable)};})};}
}
@Component({standalone:false,selector:'lab-root',template:'<case-legacy></case-legacy><case-current></case-current>'})
export class App { @ViewChildren(Legacy) legacy!:QueryList<Legacy>; @ViewChildren(Current) current!:QueryList<Current>; ngAfterViewInit(){(window as any).lab=this;} }
@NgModule({imports:[BrowserModule,CdkTableModule,MatLegacyTableModule],declarations:[App,Legacy,Current],bootstrap:[App]}) export class AppModule {}
platformBrowserDynamic().bootstrapModule(AppModule).catch(err=>{const node=document.createElement('pre');node.id='bootstrap-error';node.textContent=String(err);document.body.appendChild(node)});
