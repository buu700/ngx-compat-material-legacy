/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Finite independent validation of this main-only source proposal, not G11 admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex'), key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const prefix='compatibility/rc/authored-cdk-pure-main-5628-v1/';
const reviewPath='compatibility/f10/authored-use-reviews/cdk-coercion-keycodes-main-5628-v1.json';
const selectionHash='4ea735f037a76ecdbcb5bce415bb48bb953e85ebe2a3b8fb8e8483eda03c35aa';
const reviewHash='b1ac607135d3ade583895b47ffbfdf036bdb752b54c2ad307902f42467069b89';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
function caseContexts(text,row,kind){
 const sf=ts.createSourceFile(row.file,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);
 const lines=new Set(kind==='input-type'?row.reference_lines:row.references.map(v=>v.line)),found=[];
 function walk(n){
  if(ts.isIdentifier(n)&&n.text===(row.local_name||row.symbol)&&lines.has(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1)){
   let p=n;while(p.parent&&!ts.isMethodDeclaration(p)&&!ts.isGetAccessorDeclaration(p)&&!ts.isSetAccessorDeclaration(p)&&!ts.isConstructorDeclaration(p)&&!ts.isPropertyDeclaration(p)&&!ts.isFunctionDeclaration(p)&&!ts.isVariableStatement(p))p=p.parent;
   found.push({line:sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1,owner:ts.SyntaxKind[p.kind],text:p.getText(sf)});
  }ts.forEachChild(n,walk);
 }walk(sf);assert.equal(found.length,kind==='input-type'?row.reference_lines.length:row.references.length);return found;
}
/** All input reads can be mutated by the test, and all Git subjects stay authentic. */
export function validateCdkPureMainReview({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 const selectedRaw=read(prefix+'selection.json');assert.equal(hash(selectedRaw),selectionHash);const selected=JSON.parse(selectedRaw);
 const reportRaw=read(reviewPath);assert.equal(hash(reportRaw),reviewHash);const report=JSON.parse(reportRaw);
 assert.equal(report.line,'main');assert.equal(report.status,'reviewed');assert.equal(report.g11_claim,'not-passed');assert.equal(report.reviews.length,70);
 assert.deepEqual(report.reviews.map(key),selected.selected.map(key));assert.equal(new Set(selected.selected.map(key)).size,70);
 const transitions=JSON.parse(read(prefix+'source-transitions.json'));assert.equal(transitions.line,'main');assert.equal(transitions.base_commit,'5628e94b86a477d285bf706fc42c67c059387a48');
 const producers={};for(const kind of ['coercion','input-type','keycode'])for(const epoch of ['old','current'])producers[kind+'-'+epoch]=JSON.parse(gunzipSync(read(prefix+'producer/'+kind+'-'+epoch+'.json.gz')));
 const coercion=producers['coercion-current'],types=producers['input-type-current'],keycodes=producers['keycode-current'];
 assert.equal(coercion.line,'main');assert.equal(coercion.node,'v24.21.0');assert.equal(coercion.source_override_used,false);assert.equal(coercion.runtime_override_used,false);assert.equal(coercion.uses,111);
 const bool=coercion.behaviors.find(v=>v.line==='main');assert.equal(bool.boolean_cases,42);assert.equal(bool.number_cases,378);
 assert.equal(types.node,'v24.21.0');assert.equal(types.cases.length,31);assert.deepEqual(types.strict_type_checks,{mutual_assignments:62,valid_literal_groups:31,rejected_values:62});
 assert.equal(keycodes.line,'main');assert.equal(keycodes.node,'v24.21.0');assert.equal(keycodes.source_override_used,false);assert.equal(keycodes.runtime_override_used,false);assert.equal(keycodes.uses,58);
 const modifier=keycodes.behaviors.find(v=>v.line==='main');assert.equal(modifier.cases,1072);assert.equal(modifier.getter_order_and_short_circuit_equal,true);
 for(const data of [coercion,keycodes]){assert.equal(data.subjects.find(v=>v.line==='original').version,'16.2.14');assert.equal(data.subjects.find(v=>v.line==='main').version,'22.1.7');}
 const installed=JSON.parse(read(prefix+'installed-peer-identity.json'));assert.equal(installed.line,'main');assert.equal(installed.name,'@angular/cdk');assert.equal(installed.version,'22.1.7');assert.equal(installed.members.length,10);
 for(const member of installed.members){const actual=read(member.path);assert.equal(actual.length,member.bytes);assert.equal(hash(actual),member.sha256,'installed peer source changed');}
 assert.equal(JSON.parse(read('node_modules/@angular/cdk/package.json')).version,'22.1.7');
 const sources=new Map();for(const [file,member] of Object.entries(transitions.files)){
  assert.equal(member.path,'projects/ngx-material-legacy/'+file);const old=gunzipSync(read(member.before_gzip));assert.equal(hash(old),member.before_sha256);
  assert.equal(hash(read(member.before_gzip)),member.before_gzip_sha256);assert.equal(hash(read(member.transition)),member.transition_sha256);
  execFileSync('git',['merge-base','--is-ancestor',member.before_commit,transitions.base_commit],{cwd:root,env});
  const authentic=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',member.before_commit+':'+member.path],{cwd:root,env,maxBuffer:5*1024*1024});assert.deepEqual(old,authentic);
  assert.equal(execFileSync('git',['rev-parse',member.before_commit+':'+member.path],{cwd:root,env,encoding:'utf8'}).trim(),member.before_blob);
  const current=read(member.path);assert.equal(hash(current),member.current_sha256);
  const currentGit=execFileSync('git',['--no-replace-objects','show',transitions.base_commit+':'+member.path],{cwd:root,env,maxBuffer:5*1024*1024});assert.deepEqual(current,currentGit,'base source differs');
  const diffProgram="import sys,json,difflib; d=json.load(sys.stdin); a=d['old'].splitlines(keepends=True); b=d['current'].splitlines(keepends=True); s=''.join(difflib.unified_diff(a,b,fromfile='before/'+d['path'],tofile='after/'+d['path'])); sys.stdout.write(s or '(byte-identical)\\n')";
  const expected=execFileSync('python3',['-c',diffProgram],{input:JSON.stringify({old:old.toString(),current:current.toString(),path:member.path}),encoding:'utf8',maxBuffer:5*1024*1024});
  assert.equal(gunzipSync(read(member.transition)).toString(),expected,'full source transition differs');sources.set(file,{old:old.toString(),current:current.toString()});
 }
 for(const row of report.reviews){
  assert.ok(['@angular/cdk/coercion','@angular/cdk/keycodes'].includes(row.module));assert.equal(row.candidate_source_sha256,transitions.files[row.file].current_sha256);
  const prev=read(row.previous_source_review.path);assert.equal(hash(prev),row.previous_source_review.sha256);const oldReview=JSON.parse(prev).reviews.filter(r=>key(r)===key(row));assert.equal(oldReview.length,1);assert.deepEqual(row.preserved_prior_review,oldReview[0]);
  assert.equal(row.preserved_prior_row.source_review.path,row.previous_source_review.path);assert.equal(row.preserved_prior_row.source_review.sha256,row.previous_source_review.sha256);
  for(const ev of row.independent_evidence)assert.equal(hash(read(ev.path)),ev.sha256);
  const kind=row.conclusion==='owned-replacement'?'input-type':row.module==='@angular/cdk/keycodes'?'keycode':'coercion';
  const old=producers[kind+'-old'].cases.filter(r=>key(r)===key(row)),current=producers[kind+'-current'].cases.filter(r=>key(r)===key(row));assert.equal(old.length,1);assert.equal(current.length,1);
  assert.equal(old[0].candidate_source_sha256,transitions.files[row.file].before_sha256);assert.equal(current[0].candidate_source_sha256,row.candidate_source_sha256);
  const source=sources.get(row.file),before=caseContexts(source.old,old[0],kind),after=caseContexts(source.current,current[0],kind);
  assert.deepEqual(row.prior_complete_enclosing_members,before);assert.deepEqual(row.unchanged_complete_enclosing_members,after);
  const strip=items=>items.map(({owner,text})=>({owner,text}));assert.deepEqual(strip(before),strip(after));
 }
 return {line:'main',rows:report.reviews.length,source_files:sources.size,g11_claim:'not-passed'};
}
