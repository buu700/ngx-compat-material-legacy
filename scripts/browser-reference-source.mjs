/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Authenticate finite browser-tool transitions; this grants no frame admission. */
import assert from 'node:assert/strict';
import {browserOwnerSourceSubject} from './browser-owner-source.mjs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
const SELF='scripts/browser-reference-source.mjs',INPUT='compatibility/rc/c04-browser-reference-source-inputs.json';
const PINS={"main":"4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c","21.x":"5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae"};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
function original(root,commit,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:8*1024*1024});
}
export function inspectBrowserReferenceSource({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const tools=browserOwnerSourceSubject({root,read});
 const bound=new Map(tools.bound.map(ref=>[ref.path,{...ref}])),member=ref=>{
  if(ref.sha256!==undefined)ref=tools.qualifyReference(ref);
  const raw=read(ref.path),physical=readCheckerOwnerMember(root,ref.path);assert.ok(Buffer.isBuffer(raw));assert.ok(raw.equals(physical),'noncurrent browser source '+ref.path);
  if(ref.sha256)assert.equal(hash(raw),ref.sha256,'changed browser source '+ref.path);
  if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);
  bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;
 };
 const packet=JSON.parse(member({path:INPUT,sha256:PINS[line]}));assert.equal(packet.line,line);assert.equal(packet.schema_version,1);
 assert.equal(packet.canonical_frame_admission_granted,false);assert.equal(packet.canonical_dispositions_changed,0);assert.equal(packet.product_changes,0);
 assert.equal(packet.old_programs_executed,false);assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 member({path:SELF,sha256:hash(image),bytes:image.length});
 for(const ref of packet.source_members)member(ref);
 const authority=JSON.parse(original(root,packet.worksheet_authority.commit,packet.worksheet_authority.path));
 assert.deepEqual(packet.worksheet,authority.next_browser_reference_source_review);
 const priorLedger=original(root,packet.source_parent,packet.protected_ledger.path);assert.equal(hash(priorLedger),packet.protected_ledger.sha256);assert.equal(priorLedger.length,packet.protected_ledger.bytes);
 const currentLedger=member({path:packet.protected_ledger.path}),ledger=JSON.parse(priorLedger);assert.equal(ledger.entries.length,1697);assert.equal(ledger.g11_claim,'not-passed');
 const ts=createRequire(import.meta.url)('typescript');assert.equal(ts.version,JSON.parse(member(packet.package_json)).devDependencies.typescript);
 const parse=(path,text)=>{const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0,path);return sf;};
 const functions=sf=>new Map(sf.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node.getText(sf)]));
 const summaries=[],derived=[];let totalHunks=0;
 assert.equal(packet.transitions.length,4);assert.equal(new Set(packet.transitions.map(row=>row.path)).size,4);
 for(const row of packet.transitions){
  const old=original(root,row.before.commit,row.path);assert.equal(hash(old),row.before.sha256);assert.equal(old.length,row.before.bytes);
  assert.ok(gunzipSync(member(row.before.capture)).equals(old),'capture differs from untouched Git source');
  const current=member(row.after);assert.ok(original(root,packet.source_parent,row.path).equals(current),'current source differs from reviewed parent');
  let expected=old.toString();for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous browser source edit');expected=expected.replace(edit.before,edit.after);}
  assert.equal(current.toString(),expected,'unreviewed browser helper transition');
  assert.equal(hash(row.complete_diff),row.complete_diff_sha256);
  assert.equal(row.complete_diff.split(/(?=^@@ )/m).slice(1).join(''),row.hunk_reviews.map(item=>item.text).join(''));
  assert.equal(row.hunk_reviews.length,row.path.endsWith('browser-required-cells.mjs')?12:row.path.endsWith('browser-required-probe.js')?1:5);
  for(const[index,review]of row.hunk_reviews.entries()){
   assert.equal(review.index,index+1);assert.equal(hash(review.text),review.sha256);assert.ok(review.decision.length>100);assert.equal(review.native_or_security_acceptance_qualified,false);
  }
  totalHunks+=row.hunk_reviews.length;
  const a=parse('old-data.js',old.toString()),b=parse(row.path,current.toString()),af=functions(a),bf=functions(b);let unchangedFunctions=0;
  if(row.path.endsWith('browser-required-cells.mjs')){
   const removed=['exactVersion','readPackedPackage','versionsFor'],changed=['requiredProbeSource','labHtml','labSource','candidateInstallSpec','fixtureQualificationDefects'];
   assert.deepEqual([...bf.keys()].sort(),[...af.keys()].filter(name=>!removed.includes(name)).sort());
   for(const[name,text]of af){if(removed.includes(name))continue;if(!changed.includes(name)){assert.equal(bf.get(name),text,'changed browser predicate '+name);unchangedFunctions++;}}
   assert.equal(bf.get('requiredProbeSource'),af.get('requiredProbeSource').replace('legacySnackAnnouncementLifetimeNativeOkay,','legacySnackAnnouncementLifetimeNativeOkay, legacyDialogTitleLifetimeNativeOkay,'));
   assert.equal(bf.get('labHtml'),af.get('labHtml').replace('Open dialog</button></div>','Open dialog</button><lab-dialog-title-lifetime></lab-dialog-title-lifetime></div>'));
   assert.ok(bf.get('labSource').includes('if (!lab.titleLifetimeLab) return Promise.reject'));
   summaries.push({path:row.path,unchanged_functions:unchangedFunctions,removed_permissive_input_functions:removed,individually_reviewed_changed_functions:changed,other_required_cell_routes_unchanged:true});
  }else if(row.path.endsWith('browser-required-probe.js')){
   const dialog=sf=>{const result=[];function visit(node){if(ts.isIfStatement(node)&&node.expression.getText(sf)==="family === 'dialog'"){let owner=node.parent;while(owner&&!ts.isFunctionDeclaration(owner))owner=owner.parent;if(owner?.name?.text==='runDefault')result.push(node.getText(sf));}ts.forEachChild(node,visit);}visit(sf);assert.equal(result.length,1);return result[0];};
   const before=dialog(a),after=dialog(b);assert.equal(old.toString().replace(before,'REVIEWED_DIALOG_ROUTE'),current.toString().replace(after,'REVIEWED_DIALOG_ROUTE'));
   for(const marker of ['opener.click()','1500','if (!node)','typeof lab.runDialogTitleLifetime','lab.closeTransient()','if (!closed)','window.__status === request','legacyDialogTitleLifetimeNativeOkay(observation)'])assert.ok(after.includes(marker),marker);
   summaries.push({path:row.path,changed_family_routes:['dialog/default'],all_other_program_bytes_unchanged:true});
  }else{
   assert.deepEqual([...bf.keys()],[...af.keys()]);for(const[name,text]of af){assert.equal(bf.get(name),text,'changed mini runtime '+name);unchangedFunctions++;}
   const marker='const ngc =';assert.ok(old.includes(marker));assert.equal(current.toString().slice(current.indexOf(marker)),old.toString().slice(old.indexOf(marker)),'changed browser runtime/assertions/reporting');
   const lab=sf=>{const found=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(sf)==='writeFileSync'&&node.arguments[0]?.getText(sf).includes("'src/main.ts'"))found.push(node.arguments[1].getText(sf));ts.forEachChild(node,visit);}visit(sf);assert.equal(found.length,1);return found[0];};
   assert.equal(lab(a),lab(b),'changed mini generated lab');
   summaries.push({path:row.path,unchanged_functions:unchangedFunctions,generated_lab_byte_identical:true,all_runtime_assertions_and_reporting_byte_identical:true});
  }
  for(const entry of ledger.entries)for(const kind of packet.native_kinds)for(const ref of entry.individual_proof?.[kind]?.source_members??[]){
   if(ref.path===row.path&&ref.sha256===row.before.sha256)derived.push({sha:entry.sha,proof_kind:kind,reference:ref,current_raw:{path:row.path,...row.after},requires_separate_qualification:true});
  }
 }
 const census=JSON.parse(member(packet.raw_source_census));
 assert.deepEqual(derived.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),census.rows.slice().sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
 assert.equal(derived.length,line==='main'?18:16);assert.equal(totalHunks,23);
 const assertCurrent=()=>{tools.assertCurrent();for(const ref of bound.values()){
  const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late browser source '+ref.path);assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(readCheckerOwnerMember(root,ref.path)),'late physical browser source '+ref.path);
 }};
 assertCurrent();return {bound:structuredClone([...bound.values()]),assertCurrent,report:{schema_version:1,line,result:'pass',analysis_node:process.version,analysis_typescript:ts.version,complete_source_transitions:4,individually_reviewed_hunks:totalHunks,selected_references:derived.length,transitions:summaries,current_physical_ledger_sha256:hash(currentLedger),current_physical_ledger_bytes:currentLedger.length,current_ledger_equals_reviewed_cohort:currentLedger.equals(priorLedger),canonical_frame_admission_granted:false,old_programs_executed:false,canonical_dispositions_changed:0,product_changes:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}};
}
