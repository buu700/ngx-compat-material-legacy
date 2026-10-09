/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite literal/modifier dependency boundary; component keyboard behavior is separate. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const sha=value=>createHash('sha256').update(value).digest('hex'),moduleName='@angular/cdk/keycodes',flags=['altKey','shiftKey','ctrlKey','metaKey'];
export const KEYCODE_SEED_SHA='3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const known={
 original:{version:'16.2.14',archive:'a499ba0fee46784441b92587e43b17ec72d9bd383f78ea14954eaa62c781bad7',declaration:'19ea15b1756836d266dccedd99279f9d633c0f713a048e41d1888182ad327374'},
 main:{version:'22.1.7',archive:'225d82389797aefbbb2684461576ef950465546a9d28326483e0b816c8a5a558',declaration:'351a9bd10d8ff460f6dc4b5c459a4c6d8b98d5f0792e4d0b47e9ef123a4be950'},
 '21.x':{version:'21.2.14',archive:'b54868a0f7aefa471203a0fe419370e156cdf0218db9b625aca3ae6e8de25c63',declaration:'351a9bd10d8ff460f6dc4b5c459a4c6d8b98d5f0792e4d0b47e9ef123a4be950'},
};
const sharedRuntime=[['fesm2022/_keycodes-chunk.mjs','10cf8994eb3d386a63c108ada09be71aed34e66c35fd6efbfa9fbdf2cae6a636',3384],['fesm2022/keycodes.mjs','f64ba3991b14005735e51dd63e780d5eccd10ea1ae42542dbd6d24dc0189f13c',1304],['types/keycodes.d.ts','351a9bd10d8ff460f6dc4b5c459a4c6d8b98d5f0792e4d0b47e9ef123a4be950',4586]];
const runtimeMembers={
 original:[['fesm2022/keycodes.mjs','932699e8db0a1b9ec2035f9339e5b2badaa95476c26995996f82a380c31f77a9',4135],['keycodes/index.d.ts','19ea15b1756836d266dccedd99279f9d633c0f713a048e41d1888182ad327374',4530],['package.json','b7794ad784818253dec6b2aeea7d0b3b5ac7fa6ac0f8d2e440bf9e581fc2bf15',7557]],
 main:[...sharedRuntime,['package.json','ec60a5803a214c9b9d8bcdc2de0b0c294ecdd420d680d0e95e686f7aa4d46933',5084]],
 '21.x':[...sharedRuntime,['package.json','10c398ae1ae4854e4c98b3715f8e0f225e34b7773fa3c582f11d67852a003ea9',5041]],
};
function permutations(items){return [[],...items.flatMap((item,i)=>permutations(items.filter((_,j)=>i!==j)).map(tail=>[item,...tail]))];}
export function modifierBehavior(implementation,reference){
 assert.equal(typeof implementation,'function');assert.equal(typeof reference,'function');const args=[...permutations(flags),['ctrlKey','ctrlKey'],['metaKey','ctrlKey','metaKey']];let cases=0;const receipts=[];
 for(let mask=0;mask<16;mask++)for(const requested of args){
  function event(){const reads=[],value={};for(let i=0;i<flags.length;i++)Object.defineProperty(value,flags[i],{get(){reads.push(flags[i]);return Boolean(mask&(1<<i));}});return {value,reads};}
  const old=event(),current=event(),expected=reference(old.value,...requested),actual=implementation(current.value,...requested);
  assert.equal(typeof actual,'boolean');assert.equal(actual,expected,'modifier result differs');assert.deepEqual(current.reads,old.reads,'modifier getter order/short-circuit differs');
  receipts.push([mask,requested,expected,old.reads]);cases++;
 }
 return {cases,receipt_sha256:sha(JSON.stringify(receipts)),getter_order_and_short_circuit_equal:true};
}
export async function reviewKeycodeUses({root=rootDefault,readSource,subjectData,runtimeOverrides}={}){
 const read=file=>readSource?readSource(file):readFileSync(resolve(root,file),'utf8'),seed=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(sha(seed),KEYCODE_SEED_SHA);
 const uses=JSON.parse(seed).symbol_uses.filter(r=>r.module===moduleName);assert.equal(uses.length,58);
 const names=[...new Set(uses.map(r=>r.symbol))].sort(),subjects=subjectData||JSON.parse(read('compatibility/rc/keycode-declaration-subjects.json')),models=[];
 assert.deepEqual(subjects.subjects.map(s=>s.line).sort(),['original','main','21.x'].sort());
 for(const subject of subjects.subjects){
  const pin=known[subject.line];assert.equal(subject.version,pin.version);assert.equal(subject.archive_sha256,pin.archive);assert.equal(subject.declaration_sha256,pin.declaration);
  const text=read(subject.declaration_path);assert.equal(sha(text),subject.declaration_sha256,'keycode declaration subject changed');
  const source=ts.createSourceFile(subject.declaration_path,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
  const exported=new Set(),declared=new Map();
  for(const n of source.statements){
   if(ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const e of n.exportClause.elements)exported.add(e.name.text);
   if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations){declared.set(d.name.getText(source),{node:n,declaration:d});if(n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))exported.add(d.name.getText(source));}
   if(n.name){declared.set(n.name.text,{node:n,declaration:n});if(n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))exported.add(n.name.text);}
  }
  const values={};for(const name of names){
   assert.ok(exported.has(name),'missing public keycode export');const value=declared.get(name);assert.ok(value,'keycode declaration missing');
   assert.ok(!ts.getJSDocTags(value.node).some(t=>['deprecated','docs-private','breaking-change'].includes(t.tagName.text)),'private/deprecated keycode');
   if(name==='hasModifierKey'){
    const n=value.declaration;assert.ok(ts.isFunctionDeclaration(n)&&!n.typeParameters?.length&&n.parameters.length===2);
    assert.equal(n.parameters[0].type.getText(source),'KeyboardEvent');assert.ok(n.parameters[1].dotDotDotToken);assert.equal(n.parameters[1].type.getText(source),'ModifierKey[]');assert.equal(n.type.getText(source),'boolean');
    const domain=declared.get('ModifierKey').declaration;assert.ok(ts.isTypeAliasDeclaration(domain)&&ts.isUnionTypeNode(domain.type));assert.deepEqual(domain.type.types.map(t=>t.literal.text),flags);
   }else{const n=value.declaration,literal=n.type&&ts.isLiteralTypeNode(n.type)?n.type.literal:n.initializer;assert.ok(ts.isVariableDeclaration(n)&&literal&&ts.isNumericLiteral(literal));values[name]=Number(literal.text);}
  }
  assert.deepEqual(subject.members.map(m=>[m.path,m.sha256,m.bytes]).sort(),[...runtimeMembers[subject.line]].sort(),'runtime keycode member roster changed');
  assert.equal(subject.public_entry,'fesm2022/keycodes.mjs');
  for(const member of subject.members){const bytes=readFileSync(join(subject.runtime_root,member.path));assert.equal(sha(bytes),member.sha256,'runtime keycode member changed');assert.equal(bytes.length,member.bytes);}
  const metadata=JSON.parse(readFileSync(join(subject.runtime_root,'package.json')));assert.equal(metadata.version,pin.version);assert.equal(metadata.exports['./keycodes'].default,'./'+subject.public_entry);
  const runtime=runtimeOverrides?.[subject.line]||await import(pathToFileURL(join(subject.runtime_root,subject.public_entry)).href);
  for(const [name,value]of Object.entries(values))assert.equal(runtime[name],value,'runtime keycode literal differs');
  models.push({...subject,values,runtime});
 }
 const original=models.find(m=>m.line==='original');for(const model of models)assert.deepEqual(model.values,original.values);
 const behaviors=models.filter(m=>m.line!=='original').map(m=>({line:m.line,...modifierBehavior(m.runtime.hasModifierKey,original.runtime.hasModifierKey)}));
 const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';assert.equal(manifest.peerDependencies['@angular/cdk'],'^'+known[line].version);
 const sourceRoot=join(root,'projects/ngx-material-legacy'),paths=[...new Set(uses.map(u=>u.file))],compilerOptions={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,skipLibCheck:true,paths:{'@ngx-compat/material-legacy/*':[join(sourceRoot,'*/public-api.ts')]}};
 const host=ts.createCompilerHost(compilerOptions),originalRead=host.readFile.bind(host);host.readFile=file=>file.startsWith(sourceRoot+'/')?read('projects/ngx-material-legacy/'+file.slice(sourceRoot.length+1)):originalRead(file);
 const program=ts.createProgram(paths.map(p=>join(sourceRoot,p)),compilerOptions,host),checker=program.getTypeChecker(),cases=[];
 for(const use of uses){
  const file=program.getSourceFile(join(sourceRoot,use.file));assert.ok(file);assert.equal(file.parseDiagnostics.length,0);
  const matches=file.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===moduleName&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(n=>n.importClause.namedBindings.elements.filter(b=>(b.propertyName||b.name).text===use.symbol).map(binding=>({node:n,binding})));assert.equal(matches.length,1,'missing/ambiguous authored keycode import');
  const {node,binding}=matches[0],symbol=checker.getSymbolAtLocation(binding.name),references=[];assert.ok(symbol);
  function visit(n){
   if(ts.isIdentifier(n)&&n!==binding.name&&n!==binding.propertyName&&checker.getSymbolAtLocation(n)===symbol){
    const parent=n.parent;let role;
    if(use.symbol==='hasModifierKey'){
     assert.ok(ts.isCallExpression(parent)&&parent.expression===n&&parent.arguments.length>=1,'unsupported modifier helper reference');
     assert.ok(parent.arguments.slice(1).every(a=>ts.isStringLiteral(a)&&flags.includes(a.text)),'nonliteral/unknown modifier selector');role='modifier-call';
    }else if(ts.isCaseClause(parent)&&parent.expression===n)role='switch-case';
    else if(ts.isArrayLiteralExpression(parent))role='keycode-array';
    else if(ts.isBinaryExpression(parent)&&[ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(parent.operatorToken.kind))role='keycode-comparison';
    else assert.fail('unsupported keycode reference '+use.file+':'+n.getText(file));
    references.push({line:file.getLineAndCharacterOfPosition(n.getStart(file)).line+1,role,expression:parent.getText(file)});
   }ts.forEachChild(n,visit);
  }visit(file);assert.ok(references.length,'unused authored keycode import');
  cases.push({...use,candidate_source_sha256:sha(file.text),import_line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,local_name:binding.name.text,references,observed_value:use.symbol==='hasModifierKey'?null:original.values[use.symbol]});
 }
 return {schema_version:1,line,node:process.version,typescript:ts.version,frozen_roster_sha256:KEYCODE_SEED_SHA,uses:58,files:paths.length,names,source_override_used:Boolean(readSource),runtime_override_used:Boolean(runtimeOverrides),subjects:models.map(({runtime,...m})=>m),behaviors,cases,
  scope:'Literal values and complete boolean modifier/getter dependency behavior only; component keyboard routes, DI, lifecycle, browser/AOT/packed/minimum matrix and upstream SHA audits remain separate.',g11_claim:'not-passed'};
}
