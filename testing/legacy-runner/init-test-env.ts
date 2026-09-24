/**
 * Browser TestBed bootstrap for historical legacy specs.
 * Uses public Angular testing APIs only (no Bazel).
 */
import '@angular/compiler';
import 'zone.js';
import 'zone.js/testing';

import {getTestBed} from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
