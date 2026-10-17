/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Generated consumer calls only actual public exported classes/tokens and TestBed. */
export function nativeDatePackedFixture(){return `
import {inject} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Platform} from '@angular/cdk/platform';
import {DateAdapter,MAT_DATE_LOCALE,MAT_DATE_FORMATS,MAT_NATIVE_DATE_FORMATS} from '@angular/material/core';
import {LegacyNativeDateAdapter,LegacyNativeDateModule,MatLegacyNativeDateModule,LegacyDateAdapter,MAT_LEGACY_DATE_LOCALE,MAT_LEGACY_DATE_FORMATS,MAT_LEGACY_NATIVE_DATE_FORMATS} from '@ngx-compat/material-legacy/legacy-core';
const ymd=(adapter:LegacyNativeDateAdapter,date:Date)=>[adapter.getYear(date),adapter.getMonth(date),adapter.getDate(date)];
const format={year:'numeric',month:'2-digit',day:'2-digit'};
export function observePackedNativeDateManual(){
  let outside=false;
  try{inject(MAT_LEGACY_DATE_LOCALE);}catch(error){outside=String(error).includes('NG0203');}
  class ConsumerDateAdapter extends LegacyNativeDateAdapter{constructor(locale:string){super(locale);}}
  const direct=new LegacyNativeDateAdapter('en-US',undefined),subclass=new ConsumerDateAdapter('en-GB');
  const source=direct.createDate(2024,0,2),clone=direct.clone(source),sameTime=clone.getTime()===source.getTime();
  clone.setDate(3);
  const deserialized=direct.deserialize('2024-02-29');
  const observed={execution:'packed-angular-testbed',error:null,phase:'before-provider-configuration',outside_injection_context:outside,
    direct:{owned_adapter:direct instanceof LegacyNativeDateAdapter,public_base:direct instanceof DateAdapter,
      locale_format:direct.format(source,format),small_year:ymd(direct,direct.createDate(7,1,28)),
      month_clamp:ymd(direct,direct.addCalendarMonths(direct.createDate(2023,0,31),1)),
      leap_year_clamp:ymd(direct,direct.addCalendarYears(direct.createDate(2024,1,29),1)),
      first_weekday:direct.getFirstDayOfWeek(),leap_month_days:direct.getNumDaysInMonth(direct.createDate(2024,1,1)),
      invalid_valid:direct.isValid(direct.invalid()),deserialized_utc:deserialized?[deserialized.getUTCFullYear(),deserialized.getUTCMonth(),deserialized.getUTCDate()]:null,
      clone:{distinct:clone!==source,same_time:sameTime,source_unchanged:direct.getDate(source)===2}},
    subclass:{owned_adapter:subclass instanceof LegacyNativeDateAdapter,consumer_subclass:subclass instanceof ConsumerDateAdapter,
      public_base:subclass instanceof DateAdapter,locale_format:subclass.format(subclass.createDate(2024,0,2),format),
      leap_date:ymd(subclass,subclass.createDate(2024,1,29))}};
  return {direct,subclass,observed};
}
export function observePackedNativeDateProviders(manual:LegacyNativeDateAdapter){
  const scopes:any[]=[],instances:LegacyNativeDateAdapter[]=[];let resets=0;
  for(const [name,locale,module] of [['legacy-only','en-US',LegacyNativeDateModule],['legacy-formats','en-GB',MatLegacyNativeDateModule],['formats-override','en-GB',MatLegacyNativeDateModule]] as const){
    let localeReads=0,platformReads=0;
    const customFormats={...MAT_LEGACY_NATIVE_DATE_FORMATS,display:{...MAT_LEGACY_NATIVE_DATE_FORMATS.display,dateInput:{year:'numeric'}}};
    try{
      TestBed.configureTestingModule({imports:[module],providers:[
        {provide:MAT_LEGACY_DATE_LOCALE,useFactory:()=>{localeReads++;return locale;}},
        {provide:Platform,useFactory:()=>{platformReads++;return {} as Platform;}},
        ...(name==='formats-override'?[{provide:MAT_LEGACY_DATE_FORMATS,useValue:customFormats}]:[]),
      ]});
      const adapter=TestBed.inject(LegacyDateAdapter) as LegacyNativeDateAdapter;
      // Capture counts before any explicit Platform or locale injection could
      // manufacture a read missing from the actual artifact factory.
      const localeCount=localeReads,platformCount=platformReads;
      const formats=TestBed.inject(MAT_LEGACY_DATE_FORMATS,null);
      scopes.push({scope:name,requested_locale:locale,owned_adapter:adapter instanceof LegacyNativeDateAdapter,
        public_base:adapter instanceof DateAdapter,singleton:TestBed.inject(LegacyDateAdapter)===adapter,
        distinct_from_manual:adapter!==manual,locale_reads:localeCount,platform_reads:platformCount,
        formats:formats===null?'absent':formats===MAT_LEGACY_NATIVE_DATE_FORMATS?'native':formats===customFormats?'custom':'foreign',
        formatted:adapter.format(adapter.createDate(2024,0,2),format),leap_date:ymd(adapter,adapter.createDate(2024,1,29))});
      instances.push(adapter);
    }finally{TestBed.resetTestingModule();resets++;}
  }
  return {execution:'packed-angular-testbed',error:null,reset_count:resets,isolated_adapters_distinct:new Set(instances).size===3,
    token_identity:{date_adapter:LegacyDateAdapter===DateAdapter,locale:MAT_LEGACY_DATE_LOCALE===MAT_DATE_LOCALE,
      formats:MAT_LEGACY_DATE_FORMATS===MAT_DATE_FORMATS,native_formats:MAT_LEGACY_NATIVE_DATE_FORMATS===MAT_NATIVE_DATE_FORMATS},scopes};
}
`;}
