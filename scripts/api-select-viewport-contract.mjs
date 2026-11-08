/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Select's intentional viewport replacement; historical token identity is false. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,realpathSync} from 'node:fs';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
import {compilerConstructorContract} from './api-compiler-constructor-contract.mjs';
import {spinnerViewportProof} from './api-spinner-viewport-contract.mjs';
import {selectScrollTokenProof} from './api-select-scroll-token-contract.mjs';
import {qualifyApiV8Archive} from './api-v8-artifact-successor.mjs';
import {exactMenuArtifact} from './api-menu-artifact.mjs';
const require=createRequire(import.meta.url),ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const hash=value=>createHash('sha256').update(value).digest('hex');
const ID='legacy-select/primary/MatLegacySelect';
const SHAPE='a62d7b852bf0191139f73f1de649118c5e6ba80808894a30ab978435bf3c551b';
const D='8631a9313db5c51f3197ba1dc5cd0aafcca40fcee92ff277621799f3758c5015',B='ef9694e8e3aae5ec2170be660c71a322e2240dfd8b62a6ba66a9d89f43e61979';
const COMMON='024a5038754a3beb5ebad9a34cec9aa7e07b2aaf1b2aa9fad2fec7064e41e725';
// Same complete declaration closure already independently owned by the select
// scroll-token contract. The new fixture must reach precisely that old closure.
const PROGRAM={sources:322,sha256:'db4bc7ab37ceb69301a8d32d628cf40be7f003143444f449211215ea75e6d761'};
const expectedProof=()=>({common:COMMON,declaration_sha256:D,bundle_sha256:B,program_sources:PROGRAM.sources,program_closure_sha256:PROGRAM.sha256,historical16_provider_selects_actual:false,minimum22_provider_selects_actual:false,customization:'docs-private; no stable customization guarantee'});

function closure(program,fixture){
 return program.getSourceFiles().filter(file=>file.fileName!==fixture).map(file=>{
  const real=realpathSync(file.fileName);let root=dirname(real);
  while(root!==dirname(root)&&!existsSync(join(root,'package.json')))root=dirname(root);
  const metadata=readFileSync(join(root,'package.json')),pkg=JSON.parse(metadata),path=relative(root,real).split('\\').join('/'),raw=readFileSync(real);
  assert.ok(pkg.name&&pkg.version&&path&&!path.startsWith('../')&&!isAbsolute(path)&&raw.equals(Buffer.from(file.text)));
  return {package:pkg.name,version:pkg.version,package_sha256:hash(metadata),path,bytes:raw.length,sha256:hash(raw)};
 });
}

/** Diagnostic construction, not admission. Expectations originate in the tagged
 * historical viewport model. Every observed program source remains reviewable. */
export function inspectSelectViewportProgram(context){
 const ts=require('typescript');assert.equal(ts.version,'6.0.3');assert.equal(process.versions.node,'24.21.0');
 assert.ok(qualifyApiV8Archive(readFileSync(context.tarball)));assert.ok(exactMenuArtifact(context,context.packageRoot));
 const declaration=join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-select.d.ts'),bundle=readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-select.mjs'));
 assert.equal(hash(readFileSync(declaration)),D);assert.equal(hash(bundle),B);
 const compiler=compilerConstructorContract(bundle.toString(),'MatLegacySelect',{resolveInherited:true});
 assert.equal(compiler.parameters.length,15);assert.deepEqual(compiler.parameters[0],{index:0,token_expression:'@ngx-compat/material-legacy/legacy-core#_LegacyViewport',attribute:null,optional:false,self:false,skipSelf:false,host:false});
 const raw=readFileSync(join(ROOT,'compatibility/rc/legacy-viewport-source-proof.json'));assert.equal(hash(raw),'0d0c4fb8493c3ac8d0890c7d29a006b10af6d721ad949b456db1b8e31e54fc88');
 const model=JSON.parse(raw),entry=Object.values(model).find(value=>value&&typeof value==='object'&&typeof value.positive_fixture==='string');
 const historical=entry?.positive_fixture.match(/declare namespace Subject0\{[\s\S]*?\}\}\n(?=declare const supplied0)/)?.[0];assert.ok(historical);
 const fixture=join(dirname(declaration),'__select_viewport_probe__.ts');
 const text=`import {MatLegacySelect} from './ngx-compat-material-legacy-legacy-select';import {ViewportRuler} from '@angular/cdk/scrolling';import {Platform} from '@angular/cdk/platform';import {NgZone,OnDestroy} from '@angular/core';import {Observable} from 'rxjs';${historical}declare const old:Subject0.ViewportRuler,current:ViewportRuler;let args:ConstructorParameters<typeof MatLegacySelect>;args![0]=old;args![0]=current;`;
 const options={strict:true,skipLibCheck:false,noEmit:true,types:[],module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022};
 const compile=text=>{const host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host);host.getSourceFile=(path,...args)=>path===fixture?ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true):get(path,...args);const program=ts.createProgram([declaration,fixture],options,host);return {program,diagnostics:ts.getPreEmitDiagnostics(program)};};
 const positive=compile(text);assert.deepEqual(positive.diagnostics.map(value=>({code:value.code,message:ts.flattenDiagnosticMessageText(value.messageText,' ')})),[]);
 const negative=compile(text+'\nold.change("slow");');assert.deepEqual(negative.diagnostics.map(value=>value.code),[2345]);
 const sources=closure(positive.program,fixture);
 return {fixture_sha256:hash(text),historical_model_sha256:hash(raw),sources,program_sources:sources.length,program_closure_sha256:inputHarnessClosureFingerprint(sources),compiler,strict:true,skip_lib_check:false,positive_diagnostics:0,negative_diagnostics:[2345]};
}

export function selectViewportProof(symbol,spinner,scrollToken,context){try{
 if(symbol?.symbol_id!==ID||symbol.family!=='legacy-select'||symbol.kind!=='primary'||symbol.name!=='MatLegacySelect'||hash(JSON.stringify(symbol.shape))!==SHAPE)return null;
 const file=join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-progress-spinner.d.ts');
 const common=spinnerViewportProof(spinner,{fileName:file,text:readFileSync(file,'utf8')},context);if(!common||hash(JSON.stringify(common))!==COMMON)return null;
 const declaration=join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-select.d.ts');
 const scroll=selectScrollTokenProof(scrollToken,{fileName:declaration,text:readFileSync(declaration,'utf8')},context);
 if(!scroll||scroll.tarball_sha256!==common.artifact_sha256||scroll.program_sources!==PROGRAM.sources||scroll.program_closure_sha256!==PROGRAM.sha256)return null;
 const result=inspectSelectViewportProgram(context);if(result.program_sources!==PROGRAM.sources||result.program_closure_sha256!==PROGRAM.sha256)return null;
 return expectedProof();
}catch{return null;}}

export function selectViewportTokenCandidate(symbol,param,owned,token,proof){
 return symbol?.symbol_id===ID&&hash(JSON.stringify(symbol.shape))===SHAPE&&isDeepStrictEqual(proof,expectedProof())
  &&param.ident==='ViewportRuler'&&param.imported==='ViewportRuler'&&param.spec==='@angular/cdk/scrolling'
  &&['optional','self','skipSelf','host'].every(flag=>!param[flag])
  &&typeof owned?._LegacyViewport==='function'&&token===owned._LegacyViewport;
}

export function selectViewportObservationProblems(row){
 if(row?.symbol?.symbol_id!==ID)return [];
 const proof=expectedProof();
 const expected={historical:'@angular/cdk/scrolling#ViewportRuler',actual:'@ngx-compat/material-legacy/legacy-core#_LegacyViewport',historical16_provider_selects_actual:false,minimum22_provider_selects_actual:false,customization:'docs-private; no stable customization guarantee',proof,node:{constructor_calls:1,constructor_arity:15,viewport_index:0,actual_node_element:true,owned_input_matches_node_provider:true,owned_metadata_token:true,stored_input_matches:true}};
 return hash(JSON.stringify(row.symbol.shape))===SHAPE&&row.factory_outcome==='returned'&&row.factory_returned_owned_instance===true
  &&row.factory_node_kind==='element'&&isDeepStrictEqual(row.factory_context_modules,['legacy-select/primary/MatLegacySelectModule'])
  &&row.runtime_requests?.length===13&&row.runtime_requests[0].identity_matched===false
  &&row.runtime_requests[0].observed_label==='_LegacyViewport'&&isDeepStrictEqual(row.runtime_requests[0].intentional_token_difference,expected)?[]:['select viewport replacement receipt incomplete'];
}
