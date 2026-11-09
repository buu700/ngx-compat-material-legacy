/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {DOCUMENT} from '@angular/common';
import {Component, NgModule, ViewChild, inject} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {renderModule} from '@angular/platform-server';
import {CdkVirtualScrollableWindow, CdkVirtualScrollViewport, ScrollingModule} from '@angular/cdk/scrolling';
import {MatLegacyTableModule} from '@ngx-compat/material-legacy/legacy-table';

// Narrow window-scrolling legacy-table server fixture, run with the pinned
// consumer compiler and fresh Node processes in this packet.
@Component({
  standalone: false,
  selector: 'lab-root',
  template: `
    <cdk-virtual-scroll-viewport itemSize="20" scrollWindow>
      <table mat-table [dataSource]="rows">
        <ng-container matColumnDef="value">
          <td mat-cell *matCellDef="let row">{{row.value}}</td>
        </ng-container>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </cdk-virtual-scroll-viewport>
  `,
})
class LabRoot {
  readonly rows = [{value: 'SSR-WINDOW-ROW-A'}, {value: 'SSR-WINDOW-ROW-B'}];
  readonly columns = ['value'];
  private readonly doc = inject(DOCUMENT);
  @ViewChild(CdkVirtualScrollableWindow) windowScrollable!: CdkVirtualScrollableWindow;
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  ngAfterViewInit() {
    // A global document would make the old-code control non-discriminating.
    if (typeof globalThis.document !== 'undefined') {
      throw new Error('fixture invalid: global document exists during directive construction');
    }
    if (!(this.windowScrollable instanceof CdkVirtualScrollableWindow)) {
      throw new Error('window directive was not instantiated');
    }
    if (this.viewport.scrollable !== this.windowScrollable) {
      throw new Error('viewport did not select the public window scrollable');
    }
    if (this.windowScrollable.getElementRef().nativeElement !== this.doc.documentElement) {
      throw new Error('window scrollable element is not the injected document element');
    }
  }
}

@NgModule({
  imports: [BrowserModule, ScrollingModule, MatLegacyTableModule],
  declarations: [LabRoot],
  bootstrap: [LabRoot],
})
class LabModule {}

if (typeof globalThis.document !== 'undefined' || typeof globalThis.window !== 'undefined') {
  throw new Error('fixture requires a fresh Node process without global DOM');
}
const html = await renderModule(LabModule, {
  document: '<!doctype html><html><head></head><body><lab-root></lab-root></body></html>',
});
const cells = Array.from(html.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/g), match => match[0]);
if (cells.length !== 2 || !cells[0].includes('SSR-WINDOW-ROW-A') || !cells[1].includes('SSR-WINDOW-ROW-B')) {
  throw new Error('legacy table row cells not present in expected server markup');
}
if (typeof globalThis.document !== 'undefined' || typeof globalThis.window !== 'undefined') {
  throw new Error('global DOM was leaked after server rendering');
}
await new Promise(resolve => setTimeout(resolve, 40));
const proc = (globalThis as unknown as {process:{_getActiveHandles(): Array<{constructor?:{name?:string}}>}}).process;
const timers = proc._getActiveHandles().filter(handle => ['Timeout','Immediate'].includes(handle.constructor?.name || '')).length;
const state = globalThis as unknown as {__cspDocumentBefore?:string; __cspWindowBefore?:string};
console.log('__CSPSSR__' + JSON.stringify({renderedOnServer:true, clientOnly:false, hydration:false, threw:false,
  marker:true, windowScrollable:true, injectedDocument:true, rowMarkers:2, cellMarkup:cells, timers,
  documentBefore:state.__cspDocumentBefore, windowBefore:state.__cspWindowBefore,
  documentAfter:typeof globalThis.document, windowAfter:typeof globalThis.window, exitCode:0}));
