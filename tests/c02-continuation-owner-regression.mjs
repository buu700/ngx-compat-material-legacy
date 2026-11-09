/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const root=process.argv[2],sourceRoot=process.argv[3];
for(const [file,name] of [['sass-spinner-snack-gate-integration.mjs','createSpinnerSnackGateContext']]){
 const gate=await import(pathToFileURL(sourceRoot+'/scripts/'+file)),make=gate[name];let enabled=false,fired=false,ctx;
 const read=path=>{const b=readFileSync(root+'/'+path);if(enabled&&!fired){fired=true;try{ctx.assertCurrent()}catch{}}return b};
 ctx=make({root,read});enabled=true;let rejected=false;try{ctx.assertCurrent()}catch{rejected=true}if(!fired||!rejected)throw Error(name+' reentry fired='+fired+' rejected='+rejected);enabled=false;ctx.assertCurrent();console.log(name,'caught reentry rejected; recovery passed');
}
