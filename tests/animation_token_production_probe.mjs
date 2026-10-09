/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {animationTokenSubjects,exerciseAnimationToken} from '../scripts/animation-token-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Set production using the genuine public API in an isolated process. Load a
// fresh authenticated module population afterward so constant initializers run
// in production; never patch Angular globals, prototypes or private hooks.
const setup=await animationTokenSubjects(root);
try{setup.models[0].runtime.enableProdMode();}finally{setup.dispose();}
const subjects=await animationTokenSubjects(root);
try{const cases=[];for(const model of subjects.models){const core=model.runtime,original=model.subject.line==='original';assert.equal(core.isDevMode(),false);assert.equal(core.ANIMATION_MODULE_TYPE.toString(),'InjectionToken '+(original?'AnimationModuleType':''));cases.push({line:model.subject.line,public_production_mode:true,debug_description:core.ANIMATION_MODULE_TYPE.toString(),token_controls:exerciseAnimationToken(core).cases.length,native_application_or_engine:false});}console.log(JSON.stringify({subjects:cases,private_hooks_or_globals_patched:false}));}finally{subjects.dispose();}
