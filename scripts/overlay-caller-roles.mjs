/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Forty-eight complete current CDK overlay caller routes; preparation only. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
export const OVERLAY_CALLER_PRIOR='compatibility/rc/overlay-caller-roles-prior.json.gz';
export const OVERLAY_CALLER_REVIEW='compatibility/f10/authored-use-reviews/overlay-callers.json';
const pins={"main":"9aa612d8bbc17f72e36a8391989d30f1a52ffc50deca5584f5f28052e42092ce","21.x":"00ecad74d80a3702648c6836800a4ee3e94864d52161d7ddc67124606c0947ac"};
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),raw=root=>p=>readFileSync(join(root,p)),decoded=new Map(),authenticated=new Set(),programs=new Map(),id=r=>JSON.stringify([r.file,r.module,r.symbol]);
function freeze(v){if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
function original(root,commit,m){assert.equal(hash(m.text),m.sha256);const key=JSON.stringify([root,commit,m.path,m.sha256]);if(authenticated.has(key))return;const b=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',commit+':'+m.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(b),m.sha256);authenticated.add(key);}
export function overlayCallerPrior({root=process.cwd(),read=raw(root)}={}){const b=read(OVERLAY_CALLER_PRIOR),digest=hash(b),line=Object.keys(pins).find(k=>pins[k]===digest);assert.ok(line,'changed overlay caller preimages');if(!decoded.has(digest))decoded.set(digest,freeze(JSON.parse(gunzipSync(b))));const p=decoded.get(digest);assert.equal(p.line,line);assert.equal(p.selected.length,48);assert.equal(p.sources.length,21);assert.equal(p.evidence.length,19);assert.equal(p.ledgers.length,3);assert.equal(p.support.length,33);for(const m of [...p.sources,...p.support,...p.evidence,...p.ledgers])original(root,p.source_parent,m);return p;}
function parse(name,text){const s=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);assert.equal(s.parseDiagnostics.length,0);return s;}
function fullMember(node){let top=node;while(top.parent&&!ts.isSourceFile(top.parent)&&!ts.isClassDeclaration(top.parent)&&!ts.isInterfaceDeclaration(top.parent))top=top.parent;return top;}
export function overlayCallerFacts({root=process.cwd(),read=raw(root)}={}) {
 const prior=overlayCallerPrior({root,read});for(const m of [...prior.sources,...prior.support,...prior.evidence])assert.equal(hash(read(m.path)),m.sha256,'changed overlay source/evidence '+m.path);
 // Lexical binding only; genuine peer compilation is a separate proof. Each
 // invocation freshly rehashes all inputs before an immutable program is reused.
 const key=JSON.stringify([root,prior.source_parent,ts.version,prior.sources.map(m=>m.sha256)]);if(!programs.has(key)){const files=new Map(prior.sources.map(m=>[m.path,parse(m.path,read(m.path).toString())])),options={noResolve:true,noLib:true,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true},host=ts.createCompilerHost(options);host.getSourceFile=path=>files.get(path.startsWith(root+'/')?path.slice(root.length+1):path);const program=ts.createProgram([...files.keys()].map(p=>join(root,p)),options,host);programs.set(key,{files,checker:program.getTypeChecker()});}const {files,checker}=programs.get(key),facts=[];
 for(const selected of prior.selected){const row=selected.original_row,path='projects/ngx-material-legacy/'+row.file,source=files.get(path),imports=source.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===row.module),bindings=imports.flatMap(d=>d.importClause?.namedBindings?.elements?.filter(s=>(s.propertyName??s.name).text===row.symbol).map(specifier=>({declaration:d,specifier}))??[]);assert.equal(bindings.length,1,'ambiguous current overlay binding '+row.file+':'+row.symbol);const {declaration,specifier}=bindings[0],symbol=checker.getSymbolAtLocation(specifier.name);assert.ok(symbol?.declarations?.includes(specifier));const occurrences=[],members=new Map(),bound=new Set(),references=[];
  function member(n){const node=fullMember(n);members.set(node.getStart(source),node);}
  function visit(n){if(ts.isIdentifier(n)&&n!==specifier.name&&n!==specifier.propertyName&&checker.getSymbolAtLocation(n)===symbol){references.push(n);occurrences.push({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,parent_kind:ts.SyntaxKind[n.parent.kind],expression:n.parent.getText(source)});member(n);let owner=n;while(owner&&!ts.isPropertyDeclaration(owner)&&!ts.isPropertySignature(owner)&&!ts.isParameter(owner)&&!ts.isSourceFile(owner))owner=owner.parent;if(owner?.name&&ts.isIdentifier(owner.name))bound.add(owner.name.text);}ts.forEachChild(n,visit);}visit(source);
  function follow(n){if(ts.isPropertyAccessExpression(n)&&n.expression.kind===ts.SyntaxKind.ThisKeyword&&bound.has(n.name.text))member(n);ts.forEachChild(n,follow);}follow(source);
  for(const node of [...members.values()]){let owner=node;while(owner&&!ts.isClassDeclaration(owner)&&!ts.isSourceFile(owner))owner=owner.parent;if(owner&&ts.isClassDeclaration(owner))members.set(owner.getStart(source),owner);}
  const complete=[...members.values()].sort((a,b)=>a.getStart(source)-b.getStart(source)).map(n=>({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,kind:ts.SyntaxKind[n.kind],sha256:hash(n.getText(source)),text:n.getText(source)}));

  facts.push({file:row.file,module:row.module,symbol:row.symbol,ledger:selected.ledger,candidate_source_sha256:hash(source.text),binding:{local_name:specifier.name.text,type_only:!!(specifier.isTypeOnly||declaration.importClause.isTypeOnly),line:source.getLineAndCharacterOfPosition(specifier.getStart(source)).line+1,text:specifier.getText(source)},occurrences,bound_receivers:[...bound],complete_context_members:complete,unused_import:!occurrences.length});
 }
 assert.equal(new Set(facts.map(id)).size,48);return {prior,facts};
}
