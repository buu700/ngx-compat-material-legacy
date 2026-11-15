/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Finite source/type review; not positioning, component or G11 admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {reviewPositionTypes} from './position-type-use-review.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=x=>createHash('sha256').update(x).digest('hex'),key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const dir='compatibility/rc/authored-cdk-position-main-38ee-v1/',reviewPath='compatibility/f10/authored-use-reviews/cdk-position-type-main-38ee-v1.json';
const reportHash='a710d34be32e80221d8f5194692dde2c9545ee0a06c7242fabb57051e48e0e29',selectionHash='29f816fc2c3cc9f34fe4e8be6d0828745382873c7e153de65f5a99793fd74243';
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
function contexts(text,row){const f=ts.createSourceFile(row.file,text,ts.ScriptTarget.Latest,true),lines=new Set(row.references.map(x=>x.line)),out=[];assert.equal(f.parseDiagnostics.length,0);
 function visit(n){const line=f.getLineAndCharacterOfPosition(n.getStart(f)).line+1;if(ts.isIdentifier(n)&&n.text===row.local_name&&lines.has(line)&&ts.isTypeReferenceNode(n.parent)){let t=n;while(t.parent&&!ts.isMethodDeclaration(t)&&!ts.isGetAccessorDeclaration(t)&&!ts.isSetAccessorDeclaration(t)&&!ts.isConstructorDeclaration(t)&&!ts.isPropertyDeclaration(t)&&!ts.isFunctionDeclaration(t)&&!ts.isVariableStatement(t))t=t.parent;out.push({line,owner:ts.SyntaxKind[t.kind],text:t.getText(f)});}ts.forEachChild(n,visit)}visit(f);assert.equal(out.length,row.references.length);return out;}
function exactSourceTransition(root,read,member,base){
 const old=gunzipSync(read(member.before.path)),cur=read(member.path);assert.equal(hash(read(member.before.path)),member.before.sha256);assert.equal(hash(old),member.before_sha256);assert.equal(hash(cur),member.current_sha256);assert.equal(hash(read(member.diff.path)),member.diff.sha256);
 execFileSync('git',['merge-base','--is-ancestor',member.before_commit,base],{cwd:root,env});
 assert.deepEqual(old,execFileSync('git',['--no-replace-objects','show',member.before_commit+':'+member.path],{cwd:root,env,maxBuffer:8*1024*1024}));assert.deepEqual(cur,execFileSync('git',['--no-replace-objects','show',base+':'+member.path],{cwd:root,env,maxBuffer:8*1024*1024}));
 const py="import sys,json,difflib;d=json.load(sys.stdin);s=''.join(difflib.unified_diff(d['old'].splitlines(keepends=True),d['current'].splitlines(keepends=True),fromfile='before/'+d['path'],tofile='after/'+d['path']));sys.stdout.write(s or '(byte-identical)\\n')";
 const expected=execFileSync('python3',['-c',py],{input:JSON.stringify({old:old.toString(),current:cur.toString(),path:member.path}),encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(gunzipSync(read(member.diff.path)).toString(),expected,'complete transition differs');return {old:old.toString(),current:cur.toString()};
}
function packageBlock(text,name){const marker=`  '${name}':`,start=text.indexOf(marker);assert.ok(start>=0);const end=text.indexOf("\n  '@",start+2);assert.ok(end>start);return text.slice(start,end);}
function validateCore({root,read}){
 const selBytes=read(dir+'selection.json'),reportBytes=read(reviewPath);assert.equal(hash(selBytes),selectionHash);assert.equal(hash(reportBytes),reportHash);const sel=JSON.parse(selBytes),report=JSON.parse(reportBytes);
 assert.equal(report.line,'main');assert.equal(report.status,'reviewed');assert.equal(report.g11_claim,'not-passed');assert.equal(report.reviews.length,7);assert.deepEqual(report.reviews.map(key),sel.selected.map(key));assert.equal(new Set(sel.selected.map(key)).size,7);assert.equal(sel.holds.length,44);
 const manifest=JSON.parse(read(dir+'transitions.json'));assert.equal(manifest.base_commit,'38ee8359c688c039c6ae1db858f11282241d53ff');const source=new Map();for(const [file,m] of Object.entries(manifest.source_files)){assert.equal(m.path,'projects/ngx-material-legacy/'+file);source.set(file,exactSourceTransition(root,read,m,manifest.base_commit));assert.equal(execFileSync('git',['rev-parse',m.before_commit+':'+m.path],{cwd:root,env,encoding:'utf8'}).trim(),m.before_blob)}
 const lock=exactSourceTransition(root,read,manifest.lock,manifest.base_commit);for(const name of manifest.lock.verified_unchanged_package_blocks)assert.equal(packageBlock(lock.old,name),packageBlock(lock.current,name));
 const installed=JSON.parse(read(dir+'installed-peer-identity.json'));assert.equal(installed.line,'main');assert.equal(installed.members.length,7);for(const m of installed.members){const b=read(m.path);assert.equal(b.length,m.bytes);assert.equal(hash(b),m.sha256)}
 // Rerun the existing semantic producer with only its authenticated earlier lock projected.
 // The actual current lock was independently and completely compared above.
 const live=reviewPositionTypes({root,readSource:p=>p==='pnpm-lock.yaml'?lock.old:read(p).toString()});assert.equal(live.line,'main');assert.equal(live.node,'v24.21.0');assert.equal(live.strict_assignments,24);assert.equal(live.strict_equalities,12);assert.equal(live.strict_positive_assignments,285);assert.equal(live.strict_negative_assignments,69);
 const current=JSON.parse(gunzipSync(read(dir+'producer/current.json.gz'))),old=JSON.parse(gunzipSync(read(dir+'producer/old.json.gz')));
 for(const r of report.reviews){assert.equal(r.module,'@angular/cdk/overlay');assert.ok(['ConnectedPosition','HorizontalConnectionPos','VerticalConnectionPos'].includes(r.symbol));assert.equal(r.conclusion,'stable-public-peer');assert.equal(r.candidate_source_sha256,manifest.source_files[r.file].current_sha256);for(const ev of r.independent_evidence)assert.equal(hash(read(ev.path)),ev.sha256);
  const previous=JSON.parse(read(r.previous_source_review.path)).reviews.filter(x=>key(x)===key(r));assert.equal(previous.length,1);assert.deepEqual(previous[0],r.preserved_prior_review);assert.deepEqual(r.preserved_prior_row.source_review,r.previous_source_review);
  const from=(report)=>{const a=report.cases.filter(x=>key(x)===key(r));assert.equal(a.length,1);return a[0]},a=from(old),b=from(current),z=from(live);assert.deepEqual(b,z);
  const files=source.get(r.file),before=contexts(files.old,a),after=contexts(files.current,b);assert.deepEqual(before,r.prior_complete_enclosing_members);assert.deepEqual(after,r.current_complete_enclosing_members);const strip=x=>x.map(({owner,text})=>({owner,text}));assert.deepEqual(strip(before),strip(after));
 }
 return {line:'main',rows:7,source_files:4,unreviewed:44,g11_claim:'not-passed'};
}

// Physical snapshot is independent of the caller-supplied reader. npm/pnpm
// package symlinks are allowed only up to the actual package root; source and
// every member below that root must be regular, non-symlink files/directories.
function physical(root,path){
 assert.equal(typeof path,'string');assert.ok(path&&!path.includes('\\'));
 const parts=path.split('/');assert.ok(parts.every(p=>p&&p!=='.'&&p!=='..'));
 let base=root, rest=parts, packageRoot=null;
 if(parts[0]==='node_modules'){
  assert.ok(parts.length>3&&parts[1]==='@angular'&&['cdk','material'].includes(parts[2]),'unexpected installed peer');
  const pkg=join(root,...parts.slice(0,3));packageRoot=realpathSync(pkg);base=packageRoot;rest=parts.slice(3);
 }
 let current=base;const chain=[];for(let i=0;i<rest.length;i++){
  current=join(current,rest[i]);const stat=lstatSync(current);assert.ok(!stat.isSymbolicLink(),'symlink in evidence member');
  assert.ok(i===rest.length-1?stat.isFile():stat.isDirectory(),'invalid physical evidence path');chain.push([stat.dev,stat.ino,stat.mode]);
 }
 const real=realpathSync(current);if(packageRoot){const r=relative(packageRoot,real);assert.ok(r&&!isAbsolute(r)&&r!=='..'&&!r.startsWith('../'),'peer member escapes package')}
 return {bytes:readFileSync(current),chain,real,packageRoot};
}
let active=false,reentered=false;
export function validateCdkPositionMainReview({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 if(active){reentered=true;throw Error('reentrant CDK position source review')}
 active=true;reentered=false;
 try {
  root=resolve(root);assert.equal(realpathSync(root),root,'linked source root');const rootStat=lstatSync(root),seen=new Map();
  const tracked=path=>{
   const provided=read(path),physicalNow=physical(root,path);assert.deepEqual(Buffer.from(provided),physicalNow.bytes,'reader/physical mismatch: '+path);
   const old=seen.get(path);if(old){assert.deepEqual(physicalNow,old,'physical source changed during read: '+path)}else seen.set(path,physicalNow);
   return physicalNow.bytes;
  };
  // Capture trusted subjects BEFORE invoking any user-supplied callback. A
  // reader must not repair a pre-existing physical defect before inspection.
  const prime=path=>{const item=physical(root,path),old=seen.get(path);if(old)assert.deepEqual(item,old);else seen.set(path,item);return item.bytes;};
  const rb=prime(reviewPath),sb=prime(dir+'selection.json');assert.equal(hash(rb),reportHash);assert.equal(hash(sb),selectionHash);const trusted=JSON.parse(rb);
  const expected=path=>{const refs=trusted.reviews.flatMap(r=>r.independent_evidence).filter(e=>e.path===path);assert.ok(refs.length);assert.ok(refs.every(r=>r.sha256===refs[0].sha256));return refs[0].sha256;};
  const mb=prime(dir+'transitions.json'),ib=prime(dir+'installed-peer-identity.json');assert.equal(hash(mb),expected(dir+'transitions.json'));assert.equal(hash(ib),expected(dir+'installed-peer-identity.json'));
  const manifest=JSON.parse(mb),installed=JSON.parse(ib);for(const m of Object.values(manifest.source_files)){assert.equal(hash(prime(m.path)),m.current_sha256);assert.equal(hash(prime(m.before.path)),m.before.sha256);assert.equal(hash(prime(m.diff.path)),m.diff.sha256);}
  const lock=manifest.lock;assert.equal(hash(prime(lock.path)),lock.current_sha256);assert.equal(hash(prime(lock.before.path)),lock.before.sha256);assert.equal(hash(prime(lock.diff.path)),lock.diff.sha256);
  for(const m of installed.members){const b=prime(m.path);assert.equal(b.length,m.bytes);assert.equal(hash(b),m.sha256)}
  for(const row of trusted.reviews)for(const e of row.independent_evidence)assert.equal(hash(prime(e.path)),e.sha256);
  const recorded=JSON.parse(gunzipSync(prime(dir+'producer/current.json.gz')));for(const cap of recorded.sources)prime(cap.path);
  for(const model of recorded.models){for(const k of ['package_manifest','entry','source'])prime(model[k].path);if(model.line==='original'||model.line==='main')prime(model.lock_path);}
  // These inputs are loaded/read by the producer outside readSource.
  assert.equal(hash(prime('scripts/position-type-use-review.mjs')),'9f5a04e314529fac86b66f60eb67a42b8c8b79e72e374379b4aa3c6c6151206b');
  prime('compatibility/f10/authored-dependency-inventory-seed.json');
  const result=validateCore({root,read:tracked});
  for(const [path,initial] of seen)assert.deepEqual(physical(root,path),initial,'physical source changed after read: '+path);
  const final=lstatSync(root);assert.equal(realpathSync(root),root);assert.equal(final.dev,rootStat.dev);assert.equal(final.ino,rootStat.ino);assert.equal(reentered,false,'reentrant physical source review');
  return result;
 }finally{active=false;}
}
