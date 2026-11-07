/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {selectInheritedNativeProfile} from '../scripts/inherited-native-profiles.mjs';
const expected=process.argv[2];if(!expected)throw Error('expected profile id required');
const chosen=selectInheritedNativeProfile(process.cwd());assert.equal(chosen.id,expected);chosen.check();
const savedBrowser=process.env.CHROME_BIN;process.env.CHROME_BIN=process.execPath;assert.throws(()=>selectInheritedNativeProfile(process.cwd()),/unrecognized inherited native profile/);process.env.CHROME_BIN=savedBrowser;
const savedPath=process.env.PATH;process.env.PATH='';assert.throws(()=>selectInheritedNativeProfile(process.cwd()),/unrecognized approved executable python3/);process.env.PATH=savedPath;
console.log('selected exact native profile and rejected wrong browser and missing tool paths:',expected);
