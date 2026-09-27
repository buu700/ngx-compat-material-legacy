/**
 * Browser TestBed bootstrap for historical legacy specs.
 * Uses public Angular testing APIs only (no Bazel).
 */
import '@angular/compiler';
import 'zone.js';
import 'zone.js/testing';

import {NgModule, provideZoneChangeDetection} from '@angular/core';
import {getTestBed} from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

// Angular 21+ test platforms are zoneless unless zone change detection is
// provided. Historical specs mutate plain fields and call detectChanges().
@NgModule({
  imports: [BrowserTestingModule],
  providers: [provideZoneChangeDetection()],
})
class LegacyZoneTestingModule {}

getTestBed().initTestEnvironment(LegacyZoneTestingModule, platformBrowserTesting());
