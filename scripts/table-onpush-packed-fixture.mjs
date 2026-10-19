/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Compiled in the isolated consumer with the extracted library and its actual peers. */
export function tableOnPushPackedFixture() {
  return `import {ChangeDetectionStrategy, Component, Input, ViewChild} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {CdkNoDataRow, CdkTable} from '@angular/cdk/table';
import {MatLegacyNoDataRow, MatLegacyTable, MatLegacyTableDataSource, MatLegacyTableModule} from '@ngx-compat/material-legacy/legacy-table';
import {packedTableOnPushCase} from './table-onpush-contract.mjs';

interface Row {a:string;b:string;c:string;}
const tableChangeDetection=ChangeDetectionStrategy.OnPush;
@Component({standalone:true,selector:'packed-onpush-table',changeDetection:tableChangeDetection,
  imports:[MatLegacyTableModule],template:\`
    <table mat-table [dataSource]="source">
      <ng-container matColumnDef="a"><td mat-cell *matCellDef="let row">{{row.a}}</td></ng-container>
      <ng-container matColumnDef="b"><td mat-cell *matCellDef="let row">{{row.b}}</td></ng-container>
      <ng-container matColumnDef="c"><td mat-cell *matCellDef="let row">{{row.c}}</td></ng-container>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
      <tr *matNoDataRow><td [attr.colspan]="columns.length">Empty rows: {{columns.length}}</td></tr>
    </table>
  \`})
class PackedOnPushTable {
  @Input() source!:MatLegacyTableDataSource<Row>;
  columns=['a','b','c'];
  @ViewChild(MatLegacyTable) table!:MatLegacyTable<Row>;
  @ViewChild(MatLegacyNoDataRow) noData!:MatLegacyNoDataRow;
  @ViewChild(MatLegacyNoDataRow,{read:CdkNoDataRow}) publicNoData!:CdkNoDataRow;
}
@Component({standalone:true,imports:[PackedOnPushTable],template:'<packed-onpush-table [source]="source" />'})
export class PackedOnPushTableHost {
  source=new MatLegacyTableDataSource<Row>([{a:'A1',b:'B1',c:'C1'}]);
}

export async function observePackedTableOnPush() {
  const fixture=TestBed.createComponent(PackedOnPushTableHost);
  const observed:any={execution:'packed-angular-testbed-dom',error:null,parent_detection_only:true,transitions:[]};
  // Never mark or detect the child: doing so would conceal the upstream regression.
  const settle=async()=>{fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();};
  try {
    await settle();
    const childDebug=fixture.debugElement.query(By.directive(PackedOnPushTable));
    const child=childDebug.componentInstance as PackedOnPushTable;
    const tableDebug=childDebug.query(By.directive(MatLegacyTable));
    const table=tableDebug.nativeElement as HTMLTableElement;
    const source=fixture.componentInstance.source;
    observed.identities={owned_table:child.table instanceof MatLegacyTable,
      public_table_provider:tableDebug.injector.get(CdkTable)===child.table,
      owned_no_data:child.noData instanceof MatLegacyNoDataRow,
      public_no_data_provider:child.publicNoData===child.noData,
      child_on_push:tableChangeDetection===ChangeDetectionStrategy.OnPush};
    const snapshot=(stage:string)=>{
      const noData=table.querySelectorAll('tbody > .mat-no-data-row');
      const row=noData[0]??null,cell=row?.querySelector('td')??null;
      const dataRows=table.querySelectorAll('tbody > .mat-row');
      observed.transitions.push({stage,stable_source:child.source===source && child.table.dataSource===source,
        data_rows:dataRows.length,no_data_rows:noData.length,
        data_cells:Array.from(dataRows[0]?.querySelectorAll('td')??[]).map(node=>node.textContent?.trim()),
        row_class:row?.getAttribute('class')??null,row_role:row?.getAttribute('role')??null,
        cell_class:cell?.getAttribute('class')??null,colspan:cell?.getAttribute('colspan')??null,
        cell_text:cell?.textContent?.trim()??null});
    };
    snapshot('initial');
    source.data=[];await settle();snapshot('empty');
    source.data=[{a:'A2',b:'B2',c:'C2'}];await settle();snapshot('restored');
    source.data=[];await settle();snapshot('empty-again');
    source.data=[];await settle();snapshot('repeated-empty');
    fixture.destroy();const retained=table.innerHTML;
    source.data=[{a:'A3',b:'B3',c:'C3'}];await Promise.resolve();await Promise.resolve();
    observed.destroy={fixture_destroyed:fixture.componentRef.hostView.destroyed,source_rows_after:source.data.length,
      retained_before:retained,retained_after:table.innerHTML};
  } catch(error) {observed.error=String(error);}
  finally {if(!fixture.componentRef.hostView.destroyed)fixture.destroy();}
  return {observed,okay:packedTableOnPushCase(observed).result==='pass'};
}
`;
}
