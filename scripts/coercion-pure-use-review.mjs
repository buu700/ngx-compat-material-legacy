/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public boolean/number coercion boundaries only; no component input/lifecycle clearance. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),sha=b=>createHash('sha256').update(b).digest('hex');
const seedHash='3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b',names=['coerceBooleanProperty','coerceNumberProperty'],moduleName='@angular/cdk/coercion';
const pins={original:['16.2.14','a499ba0fee46784441b92587e43b17ec72d9bd383f78ea14954eaa62c781bad7'],main:['22.1.7','225d82389797aefbbb2684461576ef950465546a9d28326483e0b816c8a5a558'],'21.x':['21.2.14','b54868a0f7aefa471203a0fe419370e156cdf0218db9b625aca3ae6e8de25c63']};
const parse=(path,text)=>{const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const printer=ts.createPrinter({removeComments:true}),print=(n,s)=>printer.printNode(ts.EmitHint.Unspecified,n,s).replace(/\s+/g,' ').trim();
function functions(sources){const out=new Map();for(const s of sources)for(const n of s.statements)if(ts.isFunctionDeclaration(n)){const a=out.get(n.name.text)||[];a.push({node:n,source:s});out.set(n.name.text,a);}return out;}
function expectedBody(name,line){if(name==='coerceBooleanProperty')return "function coerceBooleanProperty(value) { return value != null && `${value}` !== 'false'; }";
 if(name==='_isNumberValue')return 'function _isNumberValue(value) { return !isNaN(parseFloat(value)) && !isNaN(Number(value)); }';
 return line==='original'?'function coerceNumberProperty(value, fallbackValue = 0) { return _isNumberValue(value) ? Number(value) : fallbackValue; }':'function coerceNumberProperty(value, fallbackValue = 0) { if (_isNumberValue(value)) { return Number(value); } return arguments.length === 2 ? fallbackValue : 0; }';}
function signature({node:n,source:s}){return {generics:(n.typeParameters||[]).map(t=>t.getText(s)),parameters:n.parameters.map(p=>({type:p.type.getText(s),optional:!!p.questionToken,rest:!!p.dotDotDotToken})),returns:n.type.getText(s)};}
export function coercionBehavior(current,original){
 const simple=[null,undefined,true,false,0,-0,1,-1,NaN,Infinity,-Infinity,'',' ','false','False','0','1','-2.5','1e3','0x10','1px','123hello','Infinity','NaN','\t3\n',0n,12n,Symbol('input'),[],[1],['false'],[1,2],{},new Number(3),new Boolean(false)];
 const factories=simple.map((value,i)=>({id:'literal-'+i,create:()=>({value,reads:[]})}));
 for(const responses of [['false'],['3'],['3','bad'],['3','4','5'],[null],[Symbol('returned')]])factories.push({id:'primitive-'+factories.length,create(){let i=0;const reads=[],value={[Symbol.toPrimitive](hint){reads.push(hint);return responses[Math.min(i++,responses.length-1)];}};return {value,reads};}});
 factories.push({id:'throws',create(){const reads=[],value={[Symbol.toPrimitive](hint){reads.push(hint);throw new RangeError('sentinel');}};return {value,reads};}});
 const fallbacks=[[],[undefined],[null],[0],[-0],[7],['fallback'],[false],[{fallback:true}]];let booleanCases=0,numberCases=0;const receipts=[];
 function observe(fn,value,args){try{return {value:fn(value,...args),error:null};}catch(e){return {value:undefined,error:e.name};}}
 for(const factory of factories)for(const name of names){for(const args of name===names[0]?[[]]:fallbacks){const old=factory.create(),now=factory.create(),a=observe(original[name],old.value,args),b=observe(current[name],now.value,args);assert.equal(b.error,a.error,'coercion thrown type differs');assert.ok(Object.is(b.value,a.value),'coercion result/identity differs');assert.deepEqual(now.reads,old.reads,'coercion conversion order differs');receipts.push([factory.id,name,args.length,a.error,typeof a.value,String(a.value),old.reads]);if(name===names[0])booleanCases++;else numberCases++;}}
 return {boolean_cases:booleanCases,number_cases:numberCases,observable_receipt_sha256:sha(JSON.stringify(receipts)),supported_argument_counts_only:true};
}
export async function reviewPureCoercionUses({root=rootDefault,readSource,subjectData,runtimeOverrides}={}){
 const read=p=>readSource?readSource(p):readFileSync(join(root,p),'utf8'),seed=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(sha(seed),seedHash);const uses=JSON.parse(seed).symbol_uses.filter(u=>u.module===moduleName&&names.includes(u.symbol));assert.equal(uses.length,111);
 const subjects=subjectData||JSON.parse(read('compatibility/rc/coercion-public-subjects.json'));assert.deepEqual(subjects.subjects.map(s=>s.line).sort(),['original','main','21.x'].sort());
 // Pin complete independently acquired declarations and runtime closure, not a mutable self-described manifest.
 const subjectBytes=readFileSync(new URL('../compatibility/rc/coercion-public-subjects.json',import.meta.url));assert.equal(sha(subjectBytes),'be5c12b5d9829221410bb9b1ce490f247cf1992059fcd1893a1a5b7f90b86d86','coercion subject capsule changed');const expected=JSON.parse(subjectBytes);assert.deepEqual(subjects,expected,'coercion subject identity changed');
 const models=[];
 for(const s of subjects.subjects){assert.equal(s.version,pins[s.line][0]);assert.equal(s.archive_sha256,pins[s.line][1]);const sources=[];for(const m of s.members){const b=readFileSync(join(s.runtime_root,m.path));assert.equal(sha(b),m.sha256,'coercion runtime source changed');assert.equal(b.length,m.bytes);if(m.path.endsWith('.mjs'))sources.push(parse(m.path,b.toString()));}
  const pkg=JSON.parse(readFileSync(join(s.runtime_root,'package.json')));assert.equal(pkg.version,s.version);assert.equal(pkg.exports['./coercion'].default,'./'+s.public_entry);assert.equal(pkg.exports['./coercion'].types,'./'+s.public_types);
  const bodies=functions(sources),bodyProof={};for(const name of [...names,'_isNumberValue']){const rows=bodies.get(name);assert.equal(rows.length,1);const actual=print(rows[0].node,rows[0].source),anticipated=parse('expected.js',expectedBody(name,s.line));assert.equal(actual,print(anticipated.statements[0],anticipated),'pure coercion body changed');bodyProof[name]=actual;}
  const declarations=s.declarations.map(d=>{const text=read(d.path);assert.equal(sha(text),d.sha256,'coercion declaration changed');assert.equal(Buffer.byteLength(text),d.bytes);return parse(d.path,text);}),publicDeclarations=functions(declarations),signatures={};
  for(const name of names){const rows=publicDeclarations.get(name);assert.equal(rows.length,name===names[0]?1:2);for(const row of rows)assert.ok(!ts.getJSDocTags(row.node).some(t=>['deprecated','docs-private','breaking-change'].includes(t.tagName.text)));assert.ok(declarations.some(sf=>sf.statements.some(n=>ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause)&&n.exportClause.elements.some(e=>e.name.text===name)))||rows.every(r=>r.node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)),'missing public coercion export');signatures[name]=rows.map(signature);}
  const runtime=runtimeOverrides?.[s.line]||await import(pathToFileURL(join(s.runtime_root,s.public_entry)).href);models.push({...s,bodies:bodyProof,signatures,runtime});
 }
 const original=models.find(m=>m.line==='original');for(const m of models)assert.deepEqual(m.signatures,original.signatures,'coercion signatures changed');const behaviors=models.filter(m=>m!==original).map(m=>({line:m.line,...coercionBehavior(m.runtime,original.runtime)}));
 const src=join(root,'projects/ngx-material-legacy'),paths=[...new Set(uses.map(u=>u.file))],options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,skipLibCheck:true},host=ts.createCompilerHost(options),rawRead=host.readFile.bind(host);host.readFile=p=>p.startsWith(src+'/')?read('projects/ngx-material-legacy/'+p.slice(src.length+1)):rawRead(p);const program=ts.createProgram(paths.map(p=>join(src,p)),options,host),checker=program.getTypeChecker(),cases=[];
 for(const use of uses){const file=program.getSourceFile(join(src,use.file));assert.ok(file);assert.equal(file.parseDiagnostics.length,0);const imports=file.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===moduleName&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(n=>n.importClause.namedBindings.elements.filter(b=>(b.propertyName||b.name).text===use.symbol).map(b=>({node:n,binding:b})));assert.equal(imports.length,1,'missing/ambiguous coercion import');const {node,binding}=imports[0],symbol=checker.getSymbolAtLocation(binding.name),references=[];assert.ok(symbol);
  function visit(n){if(ts.isIdentifier(n)&&n!==binding.name&&n!==binding.propertyName&&checker.getSymbolAtLocation(n)===symbol){const p=n.parent;assert.ok(ts.isCallExpression(p)&&p.expression===n,'non-call coercion reference');assert.ok(p.arguments.length>=1&&p.arguments.length<=(use.symbol===names[0]?1:2),'unsupported coercion argument count');assert.ok(!p.arguments.some(ts.isSpreadElement),'spread coercion argument count unknown');references.push({line:file.getLineAndCharacterOfPosition(n.getStart(file)).line+1,arguments:p.arguments.length,expression:p.getText(file)});}ts.forEachChild(n,visit);}visit(file);assert.ok(references.length,'unused coercion import');cases.push({...use,candidate_source_sha256:sha(file.text),import_line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,local_name:binding.name.text,references});
 }
 const pkg=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=pkg.version.startsWith('21.')?'21.x':'main';assert.equal(pkg.peerDependencies['@angular/cdk'],'^'+pins[line][0]);return {schema_version:1,line,node:process.version,typescript:ts.version,seed_sha256:seedHash,uses:111,files:paths.length,source_override_used:!!readSource,runtime_override_used:!!runtimeOverrides,subjects:models.map(({runtime,...m})=>m),behaviors,cases,limits:'Pure public boolean/number coercion at supported authored argument counts only. _isNumberValue is inspected inside peer implementation, never imported by add-on. Borrowed Angular22 module load has no full minimum runtime credit. Component inputs, lifecycle, security, native/AOT/packed/floor and all upstream SHA audits remain separate.',g11_claim:'not-passed'};
}
