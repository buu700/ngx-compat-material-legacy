import '@angular/compiler';
import {Component, ViewChild, ViewChildren, QueryList, ErrorHandler, provideZonelessChangeDetection} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {BrowserDynamicTestingModule, platformBrowserDynamicTesting} from '@angular/platform-browser-dynamic/testing';
import {CdkTable,CdkCellDef,CdkHeaderCellDef,CdkFooterCellDef,CdkColumnDef,CdkHeaderCell,CdkFooterCell,CdkCell,CdkHeaderRowDef,CdkFooterRowDef,CdkRowDef,CdkCellOutlet,CdkHeaderRow,CdkFooterRow,CdkRow,CdkNoDataRow,CdkRecycleRows,DataRowOutlet,HeaderRowOutlet,FooterRowOutlet,NoDataRowOutlet,CdkTextColumn} from '@angular/cdk/table';
import {MatLegacyTable, MatLegacyTableModule, MatLegacyRowDef} from '@ngx-compat/material-legacy/legacy-table';
interface Row {id:string}
@Component({standalone:true,imports:[MatLegacyTableModule],template:`
<table mat-table [dataSource]="rows"><ng-container matColumnDef="id"><td mat-cell *matCellDef="let row">{{row.id}}</td></ng-container>
<tr mat-row *matRowDef="let row; columns: columns"></tr></table>`})
class GoodTable {rows:Row[]=[{id:'A'},{id:'B'}];columns=['id'];@ViewChild(MatLegacyTable) table!:MatLegacyTable<Row>;@ViewChild(CdkTable) peer!:CdkTable<Row>}
@Component({standalone:true,imports:[MatLegacyTableModule],template:`
<table mat-table [dataSource]="rows" [multiTemplateDataRows]="multi"><ng-container matColumnDef="id"><td mat-cell *matCellDef="let row">{{row.id}}</td></ng-container>
<tr mat-row *matRowDef="let row; columns: columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr></table>`})
class DuplicateRows {rows=[{id:'A'}];columns=['id'];multi=false}
@Component({standalone:true,imports:[MatLegacyTableModule],template:`
<table mat-table [dataSource]="rows"><ng-container matColumnDef="id"><td mat-cell *matCellDef="let row">{{row.id}}</td></ng-container>
<tr mat-row *matRowDef="let row; columns: columns; when: matches"></tr><tr mat-row *matRowDef="let row; columns: columns; when: matchesOther"></tr></table>`})
class MissingRow {rows=[{id:'A'}];columns=['id'];matches=(_index:number,_row:Row)=>false;matchesOther=(_index:number,_row:Row)=>false;@ViewChildren(MatLegacyRowDef) defs!:QueryList<MatLegacyRowDef<Row>>;@ViewChild(MatLegacyTable) table!:MatLegacyTable<Row>}
// AOT verifies that the current public CdkTable is importable as a standalone declaration.
@Component({standalone:true,imports:[CdkTable,CdkCellDef,CdkHeaderCellDef,CdkFooterCellDef,CdkColumnDef,CdkHeaderCell,CdkFooterCell,CdkCell,CdkHeaderRowDef,CdkFooterRowDef,CdkRowDef,CdkCellOutlet,CdkHeaderRow,CdkFooterRow,CdkRow,CdkNoDataRow,CdkRecycleRows,DataRowOutlet,HeaderRowOutlet,FooterRowOutlet,NoDataRowOutlet,CdkTextColumn],template:`<cdk-table [dataSource]="rows"></cdk-table>`})
class StandaloneCdkConsumer {rows:Row[]=[]}
const delivered:{channel:string;message:string}[]=[];
window.addEventListener('error', e=>{delivered.push({channel:'window-error',message:String(e.error??e.message)});e.preventDefault()});
class CaptureErrors implements ErrorHandler {handleError(e:unknown){delivered.push({channel:'angular-error-handler',message:String(e)})}}
async function run() {
 TestBed.initTestEnvironment(BrowserDynamicTestingModule,platformBrowserDynamicTesting());
 TestBed.configureTestingModule({providers:[provideZonelessChangeDetection(),{provide:ErrorHandler,useClass:CaptureErrors}]});
 const f=TestBed.createComponent(GoodTable); f.detectChanges(); await f.whenStable(); f.detectChanges();
 const instance=f.componentInstance, table=instance.table;
 const snapshot=()=>({ids:table.renderedRows.map(x=>x.data.id),indices:table.renderedRows.map(x=>x.dataIndex),dom:Array.from(f.nativeElement.querySelectorAll('tbody tr')).map((x:any)=>x.textContent.trim()),peer_identity:instance.peer===table,owned_identity:table instanceof MatLegacyTable});
 const first=snapshot();table.dataSource=[];table.renderRows();f.detectChanges();const empty=snapshot();table.dataSource=[{id:'C'}];table.renderRows();f.detectChanges();const restored=snapshot(); f.destroy();
 function tryDuplicate(multi:boolean){const x=TestBed.createComponent(DuplicateRows);x.componentInstance.multi=multi;let error=null;try{x.detectChanges()}catch(e){error=String(e)}finally{x.destroy()}return error}
 async function tryMissing(match:boolean){const start=delivered.length;const x=TestBed.createComponent(MissingRow);if(match)x.componentInstance.matches=()=>true;let error=null;try{x.detectChanges();await x.whenStable();x.componentInstance.table.dataSource=[{id:'A'}];x.componentInstance.table.renderRows();x.detectChanges();await new Promise(resolve=>setTimeout(resolve,50))}catch(e){error=String(e)}const delivery=delivered.slice(start).find(e=>e.message.includes('matching row definition'))??null;error=error??delivery?.message??null;const defs=x.componentInstance.defs?.length??0;x.destroy();return {error,defs,delivery}}
 const data={nonce:(window as unknown as {__tableNonce:string}).__tableNonce,first,empty,restored,duplicate_error:tryDuplicate(false),duplicate_multi:tryDuplicate(true),missing_error:await tryMissing(false),missing_match:await tryMissing(true),standalone_compiled:typeof StandaloneCdkConsumer==='function'};
 document.body.innerHTML='<pre id="result"></pre>';document.getElementById('result')!.textContent=JSON.stringify(data);
}
run().catch(e=>{document.body.innerHTML='<pre id="error"></pre>';document.getElementById('error')!.textContent=String(e?.stack??e)});
