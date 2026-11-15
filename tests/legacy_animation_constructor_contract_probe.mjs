/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const base='1be59db586c17b30d1953dbd081f39a0559b7911';
const names=execFileSync('git',['diff','--name-only',base,'--','projects/ngx-material-legacy'],{encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.ts')&&!p.endsWith('.spec.ts'));
let count=0;const checked=[];
for(const path of names){
 let old;try{old=execFileSync('git',['show',base+':'+path],{encoding:'utf8'});}catch{continue;}
 if(!old.includes('ANIMATION_MODULE_TYPE') || path.endsWith('/legacy-animations.ts'))continue;
 const text=readFileSync(path,'utf8'),parse=raw=>ts.createSourceFile(path,raw,ts.ScriptTarget.Latest,true);
 const before=parse(old),after=parse(text);assert.equal(before.parseDiagnostics.length,0);assert.equal(after.parseDiagnostics.length,0);
 const classes=file=>file.statements.filter(ts.isClassDeclaration);
 for(const a of classes(before)){
  const constructors=a.members.filter(ts.isConstructorDeclaration);
  for(const prior of constructors){
   const oldSlots=prior.parameters.map((p,i)=>({p,i})).filter(({p})=>(ts.getDecorators(p)||[]).some(d=>d.getText(before).includes('ANIMATION_MODULE_TYPE')));
   if(!oldSlots.length)continue;
   const corresponding=classes(after).find(c=>c.name?.text===a.name?.text)?.members.find(ts.isConstructorDeclaration);assert.ok(corresponding,path+':'+a.name?.text);
   const signature=(params,file)=>params.map(p=>({name:p.name.getText(file),type:p.type?.getText(file)||null,optional:!!p.questionToken,rest:!!p.dotDotDotToken,initializer:p.initializer?.getText(file)||null,access:(p.modifiers||[]).filter(m=>!ts.isDecorator(m)).map(m=>m.kind)}));
   assert.deepEqual(signature(corresponding.parameters,after),signature(prior.parameters,before),path+':'+a.name?.text);
   for(const {i} of oldSlots){const p=corresponding.parameters[i],decs=(ts.getDecorators(p)||[]).map(d=>d.getText(after));assert.ok(decs.some(d=>/Inject\(LEGACY_ANIMATION_MODE\)/.test(d)),path+':'+a.name?.text);assert.ok(decs.some(d=>/Optional\(\)/.test(d)),path+':'+a.name?.text);count++;}
   checked.push(path+':'+a.name?.text);
  }
 }
}
assert.equal(count,25);assert.equal(checked.length,25);
const list=JSON.parse(readFileSync('compatibility/rc/api/export-name-allowlist.json','utf8'));
for(const name of ['LEGACY_ANIMATION_MODE','resolveLegacyAnimationMode']){const match=list.extras.filter(x=>x.name===name);assert.equal(match.length,1);assert.equal(match[0].category,'engine-free-motion');assert.deepEqual(match[0].entries,['legacy-core/primary']);assert.ok(match[0].reason);}
assert.equal(list.g02_claim,'not-passed');
if(process.argv[2]){
 const declaration=readFileSync(process.argv[2],'utf8');
 assert.match(declaration,/declare const LEGACY_ANIMATION_MODE: InjectionToken<['"]NoopAnimations['"] \| ['"]BrowserAnimations['"]>/);
 assert.match(declaration,/declare function resolveLegacyAnimationMode<T extends string \| null \| undefined>/);
 const sf=ts.createSourceFile(process.argv[2],declaration,ts.ScriptTarget.Latest,true),names=new Set();
 for(const n of sf.statements)if(ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const e of n.exportClause.elements)names.add(e.name.text);
 for(const name of ['LEGACY_ANIMATION_MODE','resolveLegacyAnimationMode'])assert.ok(names.has(name),'missing packed '+name);
}
console.log(JSON.stringify({result:'pass',constructor_slots:count,allowlisted_owned_extras:2,g02_claim:'not-passed',manual_signatures_checked:true}));
