/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current source continuation for one retained dialog type-use obligation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync,readFileSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
const hash=x=>createHash('sha256').update(x).digest('hex');
const path='projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts';
const oldHash='994576f436b45a1d3d1f132db793a2b3668e581637f06279e2200065cea319a5';
const currentHash='c63b9af0076ce1ae261c0e8529b4c0f496c2b42b3b6edf1e270b3217fdea44e1';
const parent='6597b9319ad7d0047e278046d35f60d3b5d271aa',commit='d2c7f4bda075385d0ca9df0e9251f35cf3a6745a';
const oldProof={path:'compatibility/rc/dialog-caller-config-runtime-main.json',sha256:'b40d95220e7b41ddb39b561cf9d940a46dde8936989a8cc9f990aa01db532839'};
const candidate={path:'compatibility/rc/dialog-caller-config-candidate.json',sha256:'f41b9a5ff0a050a32ef1b29928439c9b4aab9b352d935b9fa1076a9f708df5a9'};
const decision={path:'compatibility/rc/dialog-render-readiness-decision-v5.json',sha256:'01d633d555718f8d57aa80ead47afa0cc48755c3c86f6928cee554a9b3aba725'};
const role={file:'legacy-dialog/internal/dialog-initial-focus.ts',module:'@angular/material/dialog',symbol:'MatDialogConfig'};
const changes=[
 ['  onFocusSettled: () => void;\n','  onFocusSettled: () => void;\n  beforeFallbackFocus?: () => void;\n'],
 ['export function focusLegacyDialogInitially(context: LegacyDialogInitialFocusContext,','/** Check each visible focus host so that a focused open shadow tree within the dialog is contained. */\nexport function legacyDialogContainsComposedFocus(element: HTMLElement): boolean {\n  let active = typeof document !== \'undefined\' && document ? document.activeElement : null;\n  while (active) {\n    if (element === active || element.contains(active)) {\n      return true;\n    }\n    const next = active.shadowRoot?.activeElement;\n    if (!next || next === active) {\n      return false;\n    }\n    active = next;\n  }\n  return false;\n}\n\nexport function focusLegacyDialogInitially(context: LegacyDialogInitialFocusContext,'],
 ['          element.focus(options);\n','          context.beforeFallbackFocus?.();\n          element.focus(options);\n']
];
const activeRoots=new Map();
export function qualifyCurrentDialogRetiredUse(options={}){
 const root=options.root??process.cwd(),real=realpathSync(root),prior=activeRoots.get(real);if(prior){prior.reentered=true;assert.fail('reentrant dialog retirement qualification');}
 const state={reentered:false};activeRoots.set(real,state);try{const result=qualifyCurrentDialogRetiredUseCore({...options,root});assert.equal(state.reentered,false,'reentrant dialog retirement qualification');return result;}finally{activeRoots.delete(real);}
}
function qualifyCurrentDialogRetiredUseCore({root,readMember,current}){
 assert.equal(typeof readMember,'function');
 const realRoot=realpathSync(root),physical=path=>{assert.ok(typeof path==='string'&&!path.includes('\\'));const parts=path.split('/');assert.ok(parts.every(part=>part&&part!=='.'&&part!=='..'));let at=root;for(let i=0;i<parts.length;i++){at=join(at,parts[i]);const st=lstatSync(at);assert.equal(st.isSymbolicLink(),false,'linked dialog retirement input '+path);assert.ok(i===parts.length-1?st.isFile():st.isDirectory());}return readFileSync(at);};
 const checked=ref=>{const bytes=physical(ref.path),provided=readMember(ref.path);assert.ok(Buffer.isBuffer(provided)&&bytes.equals(provided),'nonphysical current dialog retirement input '+ref.path);assert.equal(hash(bytes),ref.sha256,'changed dialog retirement input '+ref.path);assert.ok(bytes.equals(physical(ref.path)),'late dialog retirement input '+ref.path);assert.equal(realpathSync(root),realRoot,'dialog retirement root changed');return bytes;};
 const live=checked({path,sha256:currentHash});
 const env={...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:4*1024*1024});
 assert.equal(git('rev-parse',commit+'^').toString().trim(),parent);git('merge-base','--is-ancestor',commit,'HEAD');const before=git('show',parent+':'+path),after=git('show',commit+':'+path);
 assert.equal(hash(before),oldHash);assert.equal(hash(after),currentHash);let text=before.toString('utf8');
 for(const [prior,next] of changes){assert.equal(text.split(prior).length,2,'ambiguous dialog source edit');text=text.replace(prior,next);}assert.ok(Buffer.from(text).equals(after));assert.ok(live.equals(after));
 const historic=JSON.parse(checked(oldProof)),proposal=JSON.parse(checked(candidate));assert.equal(historic.schema_version,1);assert.equal(historic.line,'main');assert.deepEqual(historic.candidate,candidate);assert.equal(proposal.line,'main');
 const member=proposal.members.find(row=>row.path===path);assert.ok(member);assert.equal(member.after.sha256,oldHash);assert.equal(hash(member.after.text),oldHash);assert.equal(proposal.members.filter(row=>row.path===path).length,1);
 const judgment=JSON.parse(checked(decision));assert.equal(judgment.schema_version,1);assert.equal(judgment.source.candidate_source_sha256[path],currentHash);assert.match(judgment.results,/48 cases\/17 mutants/);assert.match(judgment.results,/motion 20\/6/);assert.match(judgment.results,/raw nonzero status/);
 const evidence=Object.entries(judgment.evidence).map(([path,sha256])=>({path,sha256}));for(const ref of evidence)checked(ref);
 const validateCurrent=()=>{assert.ok(Array.isArray(current?.source_files)&&Array.isArray(current?.symbol_uses));const sourceRows=current.source_files.filter(row=>row.path===path);assert.equal(sourceRows.length,1);assert.equal(sourceRows[0].sha256,currentHash);assert.equal(current.symbol_uses.some(row=>row.file===role.file&&row.module===role.module&&row.symbol===role.symbol),false,'retired peer route returned');};validateCurrent();
 const refs=[{path,sha256:currentHash},oldProof,candidate,decision,...evidence];for(const ref of refs)checked(ref);for(const ref of refs)assert.equal(hash(physical(ref.path)),ref.sha256,'late physical dialog retirement input '+ref.path);assert.equal(realpathSync(root),realRoot,'dialog retirement root changed');validateCurrent();
 return {role:{...role},candidate_source_sha256:currentHash,occurrences:[],qualification:{...oldProof},current_source_evidence:{...decision},scope:'historical retirement evidence remains historical; exact current focus continuation only',native_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
