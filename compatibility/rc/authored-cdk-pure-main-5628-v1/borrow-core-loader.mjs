/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Resolve only the authenticated coercion capsules' unrelated Core import. */
import {createRequire,registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),core=pathToFileURL(require.resolve('@angular/core')).href;
registerHooks({resolve(specifier,context,next){
 if(specifier==='@angular/core' && context.parentURL?.includes('/coercion-subjects/'))return {url:core,shortCircuit:true};
 return next(specifier,context);
}});
