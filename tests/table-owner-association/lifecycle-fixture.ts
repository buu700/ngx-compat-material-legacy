/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import 'zone.js';
import {ChangeDetectorRef, Component, NgModule, NgZone} from '@angular/core';
import {DataSource} from '@angular/cdk/collections';
import {BehaviorSubject, Observable} from 'rxjs';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MatLegacyTableModule} from '@ngx-compat/material-legacy/legacy-table';

class TrackedSource extends DataSource<string>{
 private rows=new BehaviorSubject<string[]>([]);
 connects=0;disconnects=0;subscriptions=0;
 connect(){this.connects++;return new Observable<string[]>(observer=>{this.subscriptions++;const subscription=this.rows.subscribe(observer);return()=>{subscription.unsubscribe();this.subscriptions--;};});}
 disconnect(){this.disconnects++;}
 set(rows:string[]){this.rows.next(rows);}
}

@Component({standalone:false,selector:'lab-root',template:`
 <ng-container *ngIf="visible">
  <table mat-table id="native" [dataSource]="nativeSource">
   <ng-container matColumnDef="value">
    <th mat-header-cell *matHeaderCellDef>Header</th>
    <td mat-cell *matCellDef="let row">{{row}}</td>
    <td mat-footer-cell *matFooterCellDef>Footer</td>
   </ng-container>
   <tr mat-header-row *matHeaderRowDef="columns"></tr>
   <tr mat-row *matRowDef="let row; columns: columns"></tr>
   <tr mat-footer-row *matFooterRowDef="columns"></tr>
   <ng-template matNoDataRow>
    <tr class="authored cdk-no-data-row"><td data-plain>Empty</td><td class="authored-cell cdk-no-data-cell">Authored</td></tr>
   </ng-template>
  </table>
  <mat-table id="flex" [dataSource]="flexSource">
   <ng-container matColumnDef="value">
    <mat-header-cell *matHeaderCellDef>Header</mat-header-cell>
    <mat-cell *matCellDef="let row">{{row}}</mat-cell>
    <mat-footer-cell *matFooterCellDef>Footer</mat-footer-cell>
   </ng-container>
   <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
   <mat-row *matRowDef="let row; columns: columns"></mat-row>
   <mat-footer-row *matFooterRowDef="columns"></mat-footer-row>
   <ng-template matNoDataRow>
    <div class="authored cdk-no-data-row"><span data-plain>Empty</span><span class="authored-cell cdk-no-data-cell">Authored</span></div>
   </ng-template>
  </mat-table>
 </ng-container>
`})
export class App {
 visible=true;columns=['value'];nativeSource=new TrackedSource();flexSource=new TrackedSource();
 constructor(private cd:ChangeDetectorRef,private zone:NgZone){}
 ngAfterViewInit(){(window as any).lab=this;}
 sourceCounts(){return [this.nativeSource,this.flexSource].map(source=>({connects:source.connects,disconnects:source.disconnects,subscriptions:source.subscriptions}));}
 step(rows:string[],visible=true){this.zone.run(()=>{this.nativeSource.set(rows);this.flexSource.set(rows);this.visible=visible;this.cd.detectChanges();});}
}
@NgModule({imports:[BrowserModule,MatLegacyTableModule],declarations:[App],bootstrap:[App]})export class AppModule{}
platformBrowserDynamic().bootstrapModule(AppModule).catch(error=>{const node=document.createElement('pre');node.id='bootstrap-error';node.textContent=String(error);document.body.appendChild(node);});
