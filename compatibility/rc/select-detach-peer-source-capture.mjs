/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {prepareRemainingIdentitySubjects} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/remaining-identity-public-subjects.mjs';
const root='/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy',ts=createRequire(root+'/package.json')('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const loaded=prepareRemainingIdentitySubjects(root),subjects=[];
try{for(const model of loaded.models){
 const selectPath='@angular/material/fesm2022/'+(model.line==='original'?'legacy-select.mjs':'select.mjs'),select=model.sources.get(selectPath),templates=[];
 assert.equal(typeof select,'string');
 const file=ts.createSourceFile(selectPath,select,ts.ScriptTarget.Latest,true);
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(file).endsWith('ɵɵngDeclareComponent')&&node.arguments[0]&&ts.isObjectLiteralExpression(node.arguments[0])){const properties=node.arguments[0].properties;const type=properties.find(p=>p.name?.getText(file)==='type'),template=properties.find(p=>p.name?.getText(file)==='template');if(type?.initializer.getText(file)===(model.line==='original'?'MatLegacySelect':'MatSelect')){assert.ok(ts.isStringLiteral(template.initializer));templates.push(template.initializer.text);}}ts.forEachChild(node,visit);};visit(file);assert.equal(templates.length,1);assert.ok(templates[0].includes('(detach)="close()"'));
 const runtime=[];
 for(const [path,text]of model.sources)if(path.endsWith('.mjs')){
  const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
  for(const node of sf.statements)if(ts.isClassDeclaration(node)&&['CloseScrollStrategy','CdkConnectedOverlay','ScrollDispatcher','CdkScrollable'].includes(node.name?.text)){
   const name=node.name.text,body=node.getText(sf),methods=node.members.filter(m=>ts.isMethodDeclaration(m)||ts.isConstructorDeclaration(m)).filter(m=>['enable','constructor','_detach','_createOverlay','ngOnInit','ngOnDestroy','elementScrolled','register','scrolled'].includes(ts.isConstructorDeclaration(m)?'constructor':m.name.getText(sf))).map(m=>({name:ts.isConstructorDeclaration(m)?'constructor':m.name.getText(sf),line:sf.getLineAndCharacterOfPosition(m.getStart(sf)).line+1,text:m.getText(sf)}));
   runtime.push({path,module_sha256:hash(text),class:name,class_sha256:hash(body),methods});
  }
 }
 assert.ok(runtime.some(r=>r.class==='CloseScrollStrategy'));assert.ok(runtime.some(r=>r.class==='CdkConnectedOverlay'));assert.ok(runtime.some(r=>r.class==='ScrollDispatcher'));assert.ok(runtime.some(r=>r.class==='CdkScrollable'));
 let declarations=[];
 if(model.line!=='original'){
  const archive='/tmp/closeout-configurable-sort-tree-20261015-m02wodg4/peer-sources/'+model.line+'/archives/@angular__cdk.tgz',bytes=readFileSync(archive),pkg=model.subject.packages.find(p=>p.name==='@angular/cdk');assert.equal(hash(bytes),pkg.archive_sha256);assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),pkg.integrity);
  const files=JSON.parse(execFileSync('python3',['-c','import tarfile,json,sys\nwith tarfile.open(sys.argv[1]) as tar:\n print(json.dumps({m.name.removeprefix("package/"):tar.extractfile(m).read().decode() for m in tar if m.isfile() and (m.name.endswith(".d.ts") or m.name=="package/package.json")}))',archive],{encoding:'utf8',maxBuffer:32*1024*1024}));
  const manifest=JSON.parse(files['package.json']);
  for(const route of ['overlay','scrolling']){const path=manifest.exports['./'+route].types.replace(/^\.\//,'');assert.equal(typeof files[path],'string');declarations.push({role:'public-root',route,path,sha256:hash(files[path]),bytes:Buffer.byteLength(files[path]),text:files[path]});}
  for(const [path,text]of Object.entries(files))if(path.endsWith('.d.ts')){
   const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
   for(const node of sf.statements)if(ts.isClassDeclaration(node)&&['Overlay','OverlayRef','CloseScrollStrategy','ScrollStrategyOptions','CdkConnectedOverlay','CdkScrollable','CdkScrollableModule'].includes(node.name?.text)){
    const name=node.name.text,documentation=text.slice(node.getFullStart(),node.getStart(sf));assert.doesNotMatch(documentation,/@deprecated|@experimental|@internal/);
    const used={Overlay:['scrollStrategies'],OverlayRef:['getConfig','hasAttached','detachments'],CloseScrollStrategy:[],ScrollStrategyOptions:['close'],CdkConnectedOverlay:['overlayRef','detach'],CdkScrollable:['getElementRef','elementScrolled'],CdkScrollableModule:[]}[name];
    const usedMembers=used.map(member=>{const found=node.members.filter(m=>m.name?.getText(sf)===member);assert.ok(found.length,'missing public member '+name+'.'+member);return found.map(m=>{const doc=text.slice(m.getFullStart(),m.getStart(sf));assert.doesNotMatch(doc,/@deprecated|@experimental|@internal/);assert.ok(!m.modifiers?.some(flag=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(flag.kind)));return {member,documentation:doc,declaration:m.getText(sf)};});}).flat();
    const publicRoot=declarations.find(d=>d.role==='public-root'&&d.route===(['CdkScrollable','CdkScrollableModule'].includes(name)?'scrolling':'overlay'));
    const rootAst=ts.createSourceFile(publicRoot.path,publicRoot.text,ts.ScriptTarget.Latest,true),exported=rootAst.statements.filter(ts.isExportDeclaration).flatMap(d=>d.exportClause&&ts.isNamedExports(d.exportClause)?d.exportClause.elements.map(e=>e.name.text):[]);assert.ok(exported.includes(name),'not a public-root export '+name);
    declarations.push({role:'public-class-definition',path,sha256:hash(text),class:name,documentation,used_members:usedMembers,public_root_export_verified:true,declaration:node.getText(sf)});
   }
  }
 }
 subjects.push({line:model.line,select:{path:selectPath,module_sha256:hash(select),template_sha256:hash(templates[0]),template:templates[0]},runtime,declarations});
}}finally{loaded.dispose();}
const report={schema_version:1,role:'Exact tagged/minimum source and public-declaration review; source-only, no actual scroll or Angular nodes executed',producer_sha256:hash(readFileSync(import.meta.filename)),runtime_capsule:loaded.runtime_capsule,subjects,limits:['Public roots and complete defining declaration members are retained from the exact SRI archives. Root/member names and no deprecation markers are source evidence; strict consumer compilation and actual node execution remain pending.','Compiler metadata is read as source text only; no runtime private Angular API is imported or invoked.'],actual_packed_or_native_executed:false,g11_claim:'not-passed'};
writeFileSync('/tmp/closeout-select-detach-20261015/peer-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({subjects:subjects.map(s=>({line:s.line,runtime_classes:s.runtime.length,public_declarations:s.declarations.length,tagged_legacy_already_binds_detach:s.line==='original'}))}));
