/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One qualified removed live route never deletes its original additional obligation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DIALOG_CONFIG_RETIRED_ROLE} from './dialog-caller-config-boundary.mjs';
import {inspectDialogOwnedContracts} from './dialog-caller-owned-contract-boundary.mjs';
import {qualifiedMenuContentTypeBoundary,MENU_CONTENT_PANEL_SOURCE,MENU_CONTENT_PANEL_BEFORE,MENU_CONTENT_PANEL_AFTER} from './menu-panel-content-boundary.mjs';
import {packedRepairTypeEvidenceRead} from './snack-dom-source-context.mjs';
import {qualifyCurrentDialogRetiredUse} from './current-dialog-retired-use-source.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),key=r=>JSON.stringify([r?.file,r?.module,r?.symbol]);
const originPath='compatibility/rc/menu-caller-prior.json.gz',pins={main:'a6cf639de2151c32bc80b82be63ae4390453dc8c92a309801c1c153de9a82a00','21.x':'2da547a58102ec0a5715ebfdc91a86085d9728a6b6f747e35bf15cf8d0f8fe8e'};
const target={file:'legacy-menu/internal/menu-panel.ts',module:'@angular/material/menu',symbol:'MatMenuContent'};
const noRetained=candidate=>candidate?.retained_removed_additional_uses===undefined||(Array.isArray(candidate.retained_removed_additional_uses)&&candidate.retained_removed_additional_uses.length===0);
export function additionalUseBaseline({root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),current,additions,candidate,line,readMember,provided}){
 const result={valid:false,mode:'repository-source-epoch',entries:[],retired:[],qualification:null,error:null};
 try{
  // Explicit caller-supplied rosters support independent validator fixtures.
  // The shipped checker never takes this argument from candidate metadata.
  if(provided!==undefined){assert.ok(Array.isArray(provided));assert.equal(new Set(provided.map(key)).size,provided.length);assert.ok(provided.every(r=>['file','module','symbol'].every(k=>typeof r?.[k]==='string'&&r[k].length)));assert.ok(noRetained(candidate));return {...result,valid:true,mode:'explicit-original-roster',entries:provided};}
  const bytes=readMember(MENU_CONTENT_PANEL_SOURCE);assert.ok(bytes?.length,'missing mandatory menu panel source');const digest=hash(bytes),source=current.source_files.find(m=>m.path===MENU_CONTENT_PANEL_SOURCE);assert.ok(source,'menu panel missing from current source graph');assert.equal(source.sha256,digest,'mixed current graph and historical source reader');
  if(digest===MENU_CONTENT_PANEL_BEFORE){assert.ok(noRetained(candidate),'retirement metadata supplied before the source edit');return {...result,valid:true,mode:'pre-repair-source-epoch'};}
  assert.equal(digest,MENU_CONTENT_PANEL_AFTER,'unqualified menu panel source');assert.ok(pins[line]);
  const captured=readMember(originPath);assert.equal(hash(captured),pins[line],'changed original additional obligation capsule');const prior=JSON.parse(gunzipSync(captured));assert.equal(prior.line,line);
  const ledger=prior.ledgers.find(m=>m.path==='compatibility/f10/authored-dependency-current-dispositions.json');assert.ok(ledger);assert.equal(hash(ledger.text),ledger.sha256);const rows=JSON.parse(ledger.text).symbol_uses;assert.equal(rows.length,315);assert.equal(new Set(rows.map(key)).size,315);result.entries=rows;result.mode='owned-menu-content-type-removal';
  const live=new Set(additions.map(key)),missing=rows.filter(r=>!live.has(key(r)));const dialogRemoved=missing.some(row=>key(row)===key(DIALOG_CONFIG_RETIRED_ROLE));assert.deepEqual(missing.map(key).sort(),[key(target),...(dialogRemoved?[key(DIALOG_CONFIG_RETIRED_ROLE)]:[])].sort(),'unqualified removed additional route');
  // Keep this expected snapshot even if the qualification/metadata is invalid:
  // the original315 keys must remain in the expected inventory either way.
  result.retired=[{...target,candidate_source_sha256:MENU_CONTENT_PANEL_AFTER,occurrences:[]}];
  // These original type receipts retain their exact source epoch. The current
  // graph above and all current source-use evidence below stay on raw bytes.
  const proofRead=packedRepairTypeEvidenceRead({read:readMember});
  const qualification=qualifiedMenuContentTypeBoundary({line,readMember:proofRead});result.qualification=qualification.ref;
  const expected=[{...target,qualification:qualification.ref}];
  if(dialogRemoved){const path='projects/ngx-material-legacy/'+DIALOG_CONFIG_RETIRED_ROLE.file,source=current.source_files.find(m=>m.path===path);let dialogQualification;
   if(line==='main'&&source?.sha256==='c63b9af0076ce1ae261c0e8529b4c0f496c2b42b3b6edf1e270b3217fdea44e1'){
    const continuation=qualifyCurrentDialogRetiredUse({root,readMember,current});assert.deepEqual(continuation.role,DIALOG_CONFIG_RETIRED_ROLE);result.retired.push({...continuation.role,candidate_source_sha256:continuation.candidate_source_sha256,occurrences:continuation.occurrences});dialogQualification=continuation.qualification;
   }else{result.retired.push({...DIALOG_CONFIG_RETIRED_ROLE,candidate_source_sha256:'994576f436b45a1d3d1f132db793a2b3668e581637f06279e2200065cea319a5',occurrences:[]});const boundary=inspectDialogOwnedContracts({read:proofRead,requireApplied:true}).defaults.configuration;assert.equal(boundary.line,line);const member=boundary.targets.find(m=>m.path===path);assert.equal(member.sha256,result.retired.at(-1).candidate_source_sha256);assert.equal(source?.sha256,member.sha256,'mixed dialog source graph and historical reader');dialogQualification=boundary.qualification;}
   expected.push({...DIALOG_CONFIG_RETIRED_ROLE,qualification:dialogQualification});result.mode='owned-menu-and-dialog-config-type-removals';result.qualification=[qualification.ref,dialogQualification];}assert.ok(isDeepStrictEqual(candidate?.retained_removed_additional_uses,expected),'missing or changed retained-removed obligation qualification');
  return {...result,valid:true};
 }catch(error){return {...result,error:String(error?.message??error).split('\n')[0]};}
}
