/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. */
// Run with: node scripts/api-form-constructor-regressions.mjs <v7-tarball> <extracted-package> <untouched16-material-source>
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,cpSync,mkdtempSync,symlinkSync,rmSync,unlinkSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {deriveSurface,readDts,observeDeclarations,loadDifferences} from './api-surface.mjs';
import {settleFormConstructor} from './api-form-constructor-contract.mjs';
const [tarball,packageRoot,referenceRoot]=process.argv.slice(2);assert.ok(tarball&&packageRoot&&referenceRoot,'three fixture paths required');
const symbolId='legacy-form-field/primary/MatLegacyFormField',surface=deriveSurface(referenceRoot);surface.symbols=surface.symbols.filter(s=>s.symbol_id===symbolId);assert.equal(surface.symbols.length,1);
const dts=readDts(packageRoot),file=dts.get('ngx-compat-material-legacy-legacy-form-field.d.ts'),context={tarball,packageRoot,referenceRoot};
// Capture pre-settlement independently of the installed hook by omitting artifact context.
const {symbol,signature}=observeDeclarations(surface,dts,loadDifferences(),{extras:[]}).observations[0];
assert.equal(signature.blocking.length,2);assert.equal(settleFormConstructor(symbol,file,signature,context).blocking.length,0);
for(const [name,s,f,g,c] of [
 ['wrong symbol',{...symbol,symbol_id:'other'},file,signature,context],
 ['extra row',symbol,file,{...signature,blocking:[...signature.blocking,'unknown'],rows:[...signature.rows,{status:'mismatch',historical:null,owned:'unknown'}]},context],
 ['required eighth',symbol,file,{...signature,blocking:signature.blocking.map(x=>x.replace('Injector?)','Injector)'))},context],
 ['wrong eighth',symbol,file,{...signature,blocking:signature.blocking.map(x=>x.replace('Injector?)','string?)'))},context],
 ['wrong tar',symbol,file,signature,{...context,tarball:join(packageRoot,'package.json')}],
 ['wrong root',symbol,file,signature,{...context,referenceRoot:join(referenceRoot,'missing')}],
 ['changed declaration',symbol,{...file,text:file.text+' '},signature,context],
])assert.equal(settleFormConstructor(s,f,g,c),g,name);
// Use a physical isolated clone so each mutation tests the same otherwise-valid image.
const scratch=mkdtempSync(join(dirname(dirname(packageRoot)),'form-constructor-regression-'));
try {
 const clone=join(scratch,'package');cpSync(packageRoot,clone,{recursive:true});
 const cloneFile=readDts(clone).get('ngx-compat-material-legacy-legacy-form-field.d.ts'),cloneContext={...context,packageRoot:clone};
 assert.equal(settleFormConstructor(symbol,cloneFile,signature,cloneContext).blocking.length,0,'physical cloned image accepted');console.log('physical clone accepted');
 const link=join(scratch,'linked-package');symlinkSync(clone,link,'dir');
 assert.equal(settleFormConstructor(symbol,cloneFile,signature,{...context,packageRoot:link}),signature,'symlink package context rejected');console.log('symlink context rejected');
 for(const path of ['package.json','fesm2022/ngx-compat-material-legacy-legacy-button.mjs']){
  const target=join(clone,path),bytes=readFileSync(target);writeFileSync(target,Buffer.concat([bytes,Buffer.from('\n')]));
  assert.equal(settleFormConstructor(symbol,cloneFile,signature,cloneContext),signature,`${path} drift rejected`);console.log(`${path} drift rejected`);writeFileSync(target,bytes);
 }
 const target=join(clone,'fesm2022/ngx-compat-material-legacy-legacy-button.mjs'),bytes=readFileSync(target),saved=join(scratch,'saved.mjs');writeFileSync(saved,bytes);unlinkSync(target);symlinkSync(saved,target);
 assert.equal(settleFormConstructor(symbol,cloneFile,signature,cloneContext),signature,'symlink member rejected');console.log('symlink member rejected');
} finally {rmSync(scratch,{recursive:true,force:true});}
const require=createRequire(import.meta.url),ts=require('typescript'),fixture=join(dirname(file.fileName),'__consumer_negative__.ts');
const consumer=`import {MatLegacyFormField} from './ngx-compat-material-legacy-legacy-form-field'; import {Injector} from '@angular/core'; type A=ConstructorParameters<typeof MatLegacyFormField>; declare const a:A[0],b:A[1],c:A[2],d:A[3],e:A[4],f:A[5],g:A[6],i:Injector; new MatLegacyFormField(a,b,c,d,e,f,g); new MatLegacyFormField(a,b,c,d,e,f,g,i); class D extends MatLegacyFormField { constructor(){ super(a,b,c,d,e,f,g); } }\n// @ts-expect-error incompatible eighth argument\nnew MatLegacyFormField(a,b,c,d,e,f,g,'wrong'); void D;`;
const options={strict:true,skipLibCheck:false,noEmit:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022};
function diagnostics(replacement){const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);host.getSourceFile=(name,...args)=>name===fixture?ts.createSourceFile(name,consumer,ts.ScriptTarget.Latest,true):name===file.fileName&&replacement?ts.createSourceFile(name,file.text.replace('_injector?: Injector | undefined',replacement),ts.ScriptTarget.Latest,true):original(name,...args);return ts.getPreEmitDiagnostics(ts.createProgram([file.fileName,fixture],options,host)).map(d=>d.code);}
assert.deepEqual(diagnostics(null),[]);assert.deepEqual(diagnostics('_injector: Injector'),[2554,2554]);assert.deepEqual(diagnostics('_injector?: string'),[2345,2578]);
console.log('v7 constructor settlement, strict consumers and negative controls passed');
