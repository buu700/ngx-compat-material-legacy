/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{runInIsolatedCheckout}from'./isolated-retained-source-probe.mjs';import{retainedCurrentConsolidationContext as make}from'../scripts/retained-current-consolidation-context.mjs';
const discover=read=>{const body=JSON.parse(read('compatibility/rc/c04-main32-consolidation-source-v1.json'));make({root:process.cwd(),read,body}).assertBuildChecker();};
if(runInIsolatedCheckout('build','tests/main_consolidation_program_sweep_probe.mjs',discover))process.exit(0);
const root=process.cwd(),read=p=>readFileSync(p),body=JSON.parse(read('compatibility/rc/c04-main32-consolidation-source-v1.json')),earlier='scripts/upstream-build-scope-evidence.mjs',last='scripts/retained-current-context-identity.mjs',original=read(earlier);let mutate=false;
const callback=p=>{const raw=read(p);if(mutate&&p===last)writeFileSync(earlier,Buffer.concat([original,Buffer.from(' ')]));return raw;};
const scope=make({root,read:callback,body});try{mutate=true;assert.throws(()=>scope.assertBuildChecker());mutate=false;writeFileSync(earlier,original);scope.assertBuildChecker();}finally{writeFileSync(earlier,original);}
console.log(JSON.stringify({result:'pass',standalone_program_sweep_rejected_and_recovered:true,fixture_isolated:true}));
