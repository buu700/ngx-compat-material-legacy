/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// Focused source/control check; the real complete owner runtime is separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {legacyRemovalOwnerSourceSubject} from '../../scripts/legacy-removal-owner-source.mjs';
import {legacyRemovalOwnerContext} from '../../scripts/legacy-removal-canonical-stage.mjs';
const root=process.cwd(),read=path=>fs.readFileSync(root+'/'+path),hash=raw=>createHash('sha256').update(raw).digest('hex');
const ts=createRequire(import.meta.url)('typescript'),prefix='compatibility/rc/21x-legacy-removal-admission-',packet=JSON.parse(read(prefix+'owner-inputs.json'));
const parse=(path,body)=>{const sf=ts.createSourceFile(path,body.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const norms=text=>text.replaceAll('registry.sourceContractDefinitions.length','beforeDefinitions.length').replaceAll('stageRead(LEDGER).equals(context.browser.after)','beforeLive.equals(context.browser.after)').replaceAll('hash(prepared.browser_reference_stage.after),input.after_ledger.sha256','hash(prepared.canonical_after),input.after_ledger.sha256').replaceAll('epoch.individual_decisions_applied-epoch.legacy_removal_source_decisions_applied','epoch.individual_decisions_applied').replaceAll("original(OWNER).equals(legacyTools.comparisonBytes(ownerBefore)),'public owner before-image changed'","original(OWNER).equals(disk(OWNER)),'public owner code changed'").replaceAll('legacyTools.comparisonBytes(row.after).toString()','after.toString()').replaceAll('legacyTools.comparisonBytes(packet.after_owner).toString()','owner.toString()').replaceAll('legacyTools.qualifyReference(packet.after_owner).sha256','packet.after_owner.sha256').replaceAll('iterationLedger.equals(before)','read(LEDGER).equals(before)').replaceAll("gunzipSync(read(prefix+'registry-before.mjs.gz')).equals(registryBefore)",'read(REGISTRY).equals(registryBefore)');
function calls(sf){const map=new Map();function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(sf)==='assert'){const key=norms(node.getText(sf));map.set(key,(map.get(key)??0)+1);}ts.forEachChild(node,visit);}visit(sf);return map;}
const preserved=[];
for(const row of packet.code_transitions.filter(row=>row.after.path.endsWith('.mjs'))){
 const raw=execFileSync('git',['--no-replace-objects','show',packet.source_parent+':'+row.before.path],{cwd:root,maxBuffer:8*1024*1024}),old=parse(row.before.path,raw),current=parse(row.after.path,read(row.after.path));
 const a=calls(old),b=calls(current);let assertions=0;for(const[key,count]of a){assert.ok((b.get(key)??0)>=count,'old source assertion removed '+row.after.path+' '+key);assertions+=count;}
 const functions=sf=>new Map(sf.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node.body.getText(sf)])),before=functions(old),after=functions(current);
 const renamed={preparePackedUpstreamLedger:'prepareBeforeLegacyRemovalLedger',packedUpstreamLedgerEpoch:'epochBeforeLegacyRemovalLedger',qualifyCanonicalToolReference:'qualifyBeforeLegacyRemovalToolReference'};
 let actualUnchanged=0;const unchanged=[];for(const[name,body]of before){const target=row.after.path.endsWith('packed-upstream-ledger-epoch.mjs')?(renamed[name]??name):name;assert.ok(after.has(target),'missing old function '+name);if(after.get(target)===body)actualUnchanged++;if(after.get(target).replaceAll('currentThemingTools(root,read)','themingTools(root,read)').replace("if(prior.path===THEMING_REGISTRY&&hash(read(prior.path))!==prior.sha256)return legacyRegistryMetadataReference(root,read,prior);",'')===body)unchanged.push(name);}
 if(row.after.path.endsWith('packed-upstream-ledger-epoch.mjs'))assert.equal(unchanged.length,before.size,'old complete owner function body changed');
 if(row.after.path.endsWith('legacy-removal-canonical-stage.mjs'))assert.equal(unchanged.length,before.size,'pure proposal body changed');
 preserved.push({path:row.after.path,old_assertions_preserved:assertions,old_functions:before.size,unchanged_function_bodies:actualUnchanged,original_bodies_preserved_with_finite_metadata_adaptations:unchanged.length});
}
assert.equal(preserved.length,7);
let changed=null,reads=0;const mutable=path=>{reads++;const raw=read(path);return path===changed?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const tools=legacyRemovalOwnerSourceSubject({root,read:mutable}),context=legacyRemovalOwnerContext({root,read:mutable});
for(const row of packet.code_transitions)for(const ref of [row.before,row.after]){assert.equal(hash(tools.comparisonBytes(ref)),ref.sha256);assert.equal(tools.qualifyReference(ref).sha256,row.after.sha256);}
let cold=0,late=0;
for(const path of ['scripts/packed-upstream-ledger-epoch.mjs','scripts/inventory-reference-owner.mjs','scripts/browser-owner-source.mjs','scripts/legacy-removal-canonical-stage.mjs','scripts/legacy-removal-owner-source.mjs',prefix+'owner-inputs.json']){changed=path;assert.throws(()=>legacyRemovalOwnerSourceSubject({root,read:mutable}),undefined,'cold '+path);cold++;changed=null;}
for(const path of ['compatibility/f10/disposition-ledger/ledger.json','scripts/upstream-source-contract-registry.mjs','scripts/packed-upstream-ledger-epoch.mjs','scripts/legacy-removal-owner-source.mjs','scripts/upstream-legacy-removal-source.mjs','scripts/upstream-legacy-removal-admission.cjs',prefix+'owner-inputs.json',prefix+'original-complete.diff','projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts','node_modules/typescript/lib/typescript.js','compatibility/rc/21x-legacy-removal-source-originals.json.gz']){changed=path;assert.throws(()=>context.assertCurrent(),undefined,'late '+path);late++;changed=null;}
context.assertCurrent();const checks=reads;context.bound.length=0;context.before.fill(0);context.after.fill(0);context.assertCurrent();assert.ok(reads>checks);
const ledger='compatibility/f10/disposition-ledger/ledger.json',unknown=Buffer.concat([read(ledger),Buffer.from(' ')]),unknownContext=legacyRemovalOwnerContext({root,read:path=>path===ledger?unknown:read(path)});assert.equal(unknownContext.applied,false);assert.ok(unknownContext.metadataRead(ledger).equals(unknown));
const report={schema_version:1,result:'pass',line:'21.x',preserved_source:preserved,code_transitions:packet.code_transitions.length,cold_owner_code_faults_rejected:cold,late_owner_source_faults_rejected:late,unknown_frame_not_projected:true,public_snapshots_do_not_change_private_guards:true,actual_full_owner_executed:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
