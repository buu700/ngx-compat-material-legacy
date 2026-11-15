/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {qualifyApiNodeCombinedArchive,API_NODE_COMBINED_SHA,API_NODE_COMBINED_BUNDLES} from '../scripts/api-node-combined-artifact-successor.mjs';
import {qualifyOwnedNodeInjector,assertOwnedNodeInjectorContext,ownedNodeInjectorObservationProblems} from '../scripts/api-owned-node-injector-context.mjs';
import {compilerConstructorContract} from '../scripts/api-compiler-constructor-contract.mjs';
import {loadRuntimeModule} from '../scripts/api-di-observe.mjs';
assert.equal(process.argv.length,4,'usage: node tests/api_node_combined_artifact_probe.mjs <tarball> <extracted-package>');
const archive=readFileSync(resolve(process.argv[2])),root=resolve(process.argv[3]);
assert.ok(qualifyApiNodeCombinedArchive(archive,root));
const bad=Buffer.from(archive);bad[Math.floor(bad.length/2)]^=1;assert.equal(qualifyApiNodeCombinedArchive(bad,root),false);
const temp=mkdtempSync(join(tmpdir(),'api-node-combined-'));
try{const copy=join(temp,'package');cpSync(root,copy,{recursive:true});writeFileSync(join(copy,'README.md'),'changed');assert.equal(qualifyApiNodeCombinedArchive(archive,copy),false);}finally{rmSync(temp,{recursive:true,force:true});}
await import('@angular/compiler');
const rows=JSON.parse(readFileSync('compatibility/rc/api-owned-node-injector-observations-v1.json')).rows,core=await import('@angular/core');
let controls=2;
for(const row of rows){
 const {symbol}=row,api=await loadRuntimeModule(root,symbol.family,'primary'),Type=api[symbol.name],parameterType=symbol.family==='legacy-select'?Object.getPrototypeOf(Type):Type;
 const source=readFileSync(join(root,'fesm2022/ngx-compat-material-legacy-'+symbol.family+'.mjs'),'utf8'),compiler=compilerConstructorContract(source,symbol.name,{resolveInherited:true}),metadata=parameterType.ctorParameters();
 const options={symbol,Type,parameterType,core,source,compiler,metadata,originalParameters:symbol.shape.originalFactoryContext.factory_parameters,context:{tarball:resolve(process.argv[2]),packageRoot:root}};
 const proof=qualifyOwnedNodeInjector(options);assert.equal(proof.artifact_sha256,API_NODE_COMBINED_SHA);assert.equal(proof.bundle_sha256,API_NODE_COMBINED_BUNDLES[symbol.family]);
 const changes=[{source:source+'\n'}, {metadata:metadata.slice(0,-1)}, {metadata:[...metadata.slice(0,-1),{type:core.ElementRef}]},{compiler:{...compiler,parameters:compiler.parameters.slice(0,-1)}},{originalParameters:options.originalParameters.slice(0,-1)},{symbol:{...symbol,shape:{...symbol.shape,forged:true}}}];
 for(const change of changes){assert.throws(()=>qualifyOwnedNodeInjector({...options,...change}));controls++;}
 const receipt={...row.factory_owned_node_injector_context,artifact_sha256:proof.artifact_sha256,bundle_sha256:proof.bundle_sha256};assertOwnedNodeInjectorContext(receipt,symbol.symbol_id);
 const combinedRow={...row,factory_owned_node_injector_context:receipt};assert.deepEqual(ownedNodeInjectorObservationProblems(combinedRow,{tarball:resolve(process.argv[2])}),[]);
 for(const change of [{artifact_sha256:'0'.repeat(64)},{bundle_sha256:'0'.repeat(64)},{stored_input_identical:false},{child_scope_matched:false},{parameter:{...receipt.parameter,optional:true}}]){assert.throws(()=>assertOwnedNodeInjectorContext({...receipt,...change},symbol.symbol_id));controls++;}
}
console.log(JSON.stringify({result:'pass',artifact_sha256:API_NODE_COMBINED_SHA,negative_controls:controls,scope:'finite archive, physical tree, embedded sources and two Injector receipts only'}));
