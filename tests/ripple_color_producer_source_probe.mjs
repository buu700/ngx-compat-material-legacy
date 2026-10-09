/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded source producer paths;no installs or packed/native qualification. */
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,realpathSync} from 'node:fs';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url),sass=require('sass');
const args={};for(let i=2;i<process.argv.length;i+=2){assert.ok(['--peer-root','--reference-root','--line','--report'].includes(process.argv[i])&&process.argv[i+1]);args[process.argv[i].slice(2)]=process.argv[i+1];}
const line=args.line;assert.ok(args['peer-root']&&args['reference-root']&&['main','21.x'].includes(line));
const {runSassApiCss}=await import(root+'/scripts/sass-seal.mjs');const {runOwnedAggregateContracts}=await import(root+'/scripts/sass-owned-aggregates.mjs');const {compareInventory}=await import(root+'/scripts/sass-api-inventory.mjs');const {RIPPLE_COLOR_DEFAULT_CASES}=await import(root+'/scripts/sass-ripple-color-contract.mjs');
const oracle=JSON.parse(readFileSync(root+'/compatibility/rc/oracles/material-16.2.14-sass-api.json')),own=realpathSync(root+'/projects/ngx-material-legacy'),peerRoot=realpathSync(args['peer-root']),roots=[own,peerRoot+'/@angular/material',peerRoot+'/@angular/cdk'].map(p=>realpathSync(p)),original=realpathSync(args['reference-root']);
const finite={members:{mixins:Object.fromEntries(Object.keys(RIPPLE_COLOR_DEFAULT_CASES).map(id=>{const name=id.slice(10);return [name,oracle.members.mixins[name]];}))}};
const css=runSassApiCss({oracle:finite,entryFile:own+'/_index.scss',loadPaths:[peerRoot],allowedRoots:roots,line});const defaults=compareInventory(oracle,oracle.members,css).filter(r=>Object.hasOwn(RIPPLE_COLOR_DEFAULT_CASES,r.case_id));assert.equal(defaults.length,5);
const owned=runOwnedAggregateContracts({sass,entry:own+'/_index.scss',loadPaths:[peerRoot],allowedRoots:roots,line,referenceEntry:original+'/@angular/material/_index.scss',referenceRoot:original,identity:{role:'Focused source producer diagnostic;not packed qualification'}});
const failures=[...defaults,...owned.results].filter(r=>r.result!=='pass');const report={role:'Actual default5 and owned20 producer paths against source roots;not packed/full651/498/native qualification',line,node:process.version,sass:sass.info,defaults,owned,passed:25-failures.length,failed:failures.length};if(args.report)writeFileSync(args.report,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({line,passed:report.passed,failed:report.failed,failures:failures.map(r=>({case_id:r.case_id,error:r.error,expected:r.expected?.css_sha256,actual:r.actual?.css_sha256}))},null,2));if(failures.length)process.exitCode=1;
