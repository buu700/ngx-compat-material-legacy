/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {deriveSurface} from '../scripts/api-surface.mjs';import {observeRuntimeDi} from '../scripts/api-di-observe.mjs';import {settleDi} from '../scripts/api-completeness.mjs';import {dialogServiceModeProblems} from '../scripts/api-dialog-service-mode-context.mjs';
const arg=n=>process.argv[process.argv.indexOf(n)+1],root=resolve(arg('--package-root')),ref=resolve(arg('--reference-root')),artifact={tarball:resolve(arg('--tarball'))},require=createRequire(import.meta.url),load=s=>import(pathToFileURL(require.resolve(s)).href);
const all=deriveSurface(ref).symbols,selected=all.map(s=>({...s,di_id:s.symbol_id==='legacy-dialog/primary/MatLegacyDialog'?s.di_id:null}));
const rows=await observeRuntimeDi(root,selected,[],load,artifact);assert.equal(rows.length,1);const row=rows[0];assert.deepEqual(row.problems,[]);assert.deepEqual(dialogServiceModeProblems(row,artifact),[]);assert.equal(settleDi(row,[],artifact).result,'pass');
const mutants=[
 r=>r.factory_dialog_service_mode_context.stored_raw_mode=false,
 r=>r.factory_dialog_service_mode_context.raw_mode='forged',
 r=>r.factory_dialog_service_mode_context.old_token_requested=true,
 r=>r.factory_dialog_service_mode_context.owned_token_distinct=false,
 r=>r.factory_dialog_service_mode_context.behavior.cases.pop(),
 r=>r.factory_dialog_service_mode_context.behavior.borrowed_alive_after_service_teardown=false,
 r=>r.factory_dialog_service_mode_context.source.file_sha256='0'.repeat(64),
 r=>r.factory_dialog_service_mode_context.source.artifact_sha256='0'.repeat(64),
 r=>r.factory_dialog_service_mode_context.source.artifact_sha256=row.factory_dialog_service_mode_context.source.artifact_sha256==='04092350fea6096cac866268fc295eb390b2670c67366a3195a75c14b319be88'?'d70b977c254d8f06823527def187769dbaf408060b02ec8c0e0bcb68ff01c895':'04092350fea6096cac866268fc295eb390b2670c67366a3195a75c14b319be88',
 r=>r.factory_dialog_service_mode_context.profile.index=6,
 r=>r.factory_returned_owned_instance=false,
 r=>r.factory_node_kind='template',
 r=>r.runtime_requests[0].identity_matched=false,
 r=>r.runtime_requests[7].identity_matched=true,
 r=>r.runtime_requests[7].intentional_token_difference.historical_provider_selects_actual=true,
 r=>r.runtime_requests[7].optional=false,
 r=>r.runtime_requests[0].unresolved=true,
 r=>r.runtime_requests[7].unresolved=true,
 r=>r.runtime_requests[0].observed_label='forged',
 r=>r.runtime_requests[7].observed_label='ANIMATION_MODULE_TYPE',
 ...[0,7].flatMap(i=>['optional','self','skipSelf','host'].flatMap(f=>[
  r=>{r.runtime_requests[i][f]=!r.runtime_requests[i][f];},
  r=>{r.runtime_requests[i]['expected_'+f]=!r.runtime_requests[i]['expected_'+f];},
 ])),
 r=>r.runtime_requests.pop(),
];
for(const mutate of mutants){const copy=structuredClone(row);mutate(copy);assert.ok(dialogServiceModeProblems(copy,artifact).length);assert.equal(settleDi(copy,[],artifact).result,'fail');}
assert.ok(dialogServiceModeProblems(row,{}).length);assert.equal(settleDi(row,[],{}).result,'fail');
const wrongArtifact={tarball:resolve(root,'package.json')};assert.ok(dialogServiceModeProblems(row,wrongArtifact).length);assert.equal(settleDi(row,[],wrongArtifact).result,'fail');
assert.deepEqual(dialogServiceModeProblems({symbol:all.find(s=>s.symbol_id!=='legacy-dialog/primary/MatLegacyDialog'),factory_dialog_service_mode_context:{raw_mode:'forged'}},{}),[]);
console.log(JSON.stringify({observer_to_settlement:'pass',mutants_rejected:mutants.length+2,historical:row.runtime_requests[7].expected_ident,observed:row.runtime_requests[7].observed_label}));
