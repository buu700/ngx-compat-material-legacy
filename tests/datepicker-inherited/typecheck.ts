/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {MatCalendar, MatCalendarCell, MatCalendarCellCssClasses, MatDatepickerControl, MatDatepickerInput, MatDateRangeInput, MatMonthView, MatYearView, MatMultiYearView} from '@angular/material/datepicker';
export function publicContracts(calendar:MatCalendar<Date>,month:MatMonthView<Date>,year:MatYearView<Date>,multi:MatMultiYearView<Date>,single:MatDatepickerInput<Date>,range:MatDateRangeInput<Date>,control:MatDatepickerControl<Date>,cell:MatCalendarCell<Date>) {
 for(const f of [null,undefined,(d:Date)=>!!d]) {calendar.dateFilter=f;month.dateFilter=f;year.dateFilter=f;multi.dateFilter=f;}
 for(const f of [null,undefined,(d:Date|null)=>!!d]) {single.dateFilter=f;range.dateFilter=f;control.dateFilter=f;}
 const classes:MatCalendarCellCssClasses[]=['one',['one'],new Set(['one']),{one:true,two:false}];
 const normalized: string|string[]|Record<string,any>|undefined=cell.cssClasses;
 // READONLY_NEGATIVE
 return {classes,normalized};
}
