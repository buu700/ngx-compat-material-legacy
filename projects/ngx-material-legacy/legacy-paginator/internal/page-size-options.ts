/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Directive, Input, IterableDiffer, IterableDiffers, inject} from '@angular/core';

/** Internal view-scoped identities for the paginator's possibly repeated page sizes. */
@Directive({
  standalone: false,
  selector: '[matLegacyPaginatorOptions]',
  exportAs: 'matLegacyPaginatorOptions',
})
export class _MatLegacyPaginatorOptions {
  @Input('matLegacyPaginatorOptions') values: readonly number[] | null | undefined;

  private _differs = inject(IterableDiffers);
  private _differ: IterableDiffer<number> | undefined;
  private _items: {value: number}[] = [];

  get items(): readonly {value: number}[] {
    // Reuse the public differ's historical identity and duplicate reconciliation.
    // Unique objects let @for retain those views without duplicate tracking keys.
    this._differ ||= this._differs.find(this.values || []).create<number>();
    const changes = this._differ.diff(this.values || []);
    if (changes) {
      const previous = this._items;
      const next: {value: number}[] = [];
      changes.forEachItem(record => {
        const item = record.previousIndex === null ? {value: record.item} : previous[record.previousIndex];
        item.value = record.item;
        next.push(item);
      });
      this._items = next;
    }
    return this._items;
  }

  ngOnDestroy(): void {
    this._differ = undefined;
    this._items = [];
    this.values = undefined;
  }
}
