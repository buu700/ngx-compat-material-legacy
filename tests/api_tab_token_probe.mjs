/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Run with: node tests/api_tab_token_probe.mjs <extracted-package> <tagged-material-source>
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync,mkdtempSync,cpSync,mkdirSync,symlinkSync,readdirSync,realpathSync,appendFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {deriveSurface,readDts,observeDeclarations,loadDifferences} from '../scripts/api-surface.mjs';
import {settleTabToken,tabTokenProof} from '../scripts/api-tab-token-contract.mjs';
const [root,ref,tarball]=process.argv.slice(2);assert.ok(root&&ref&&tarball,'supply extracted package, reference source and actual tarball');
const context={packageRoot:root,referenceRoot:ref,tarball};
const surface=deriveSurface(ref),symbol=surface.symbols.find(s=>s.symbol_id==='legacy-tabs/primary/MAT_LEGACY_TAB');assert.ok(symbol);
const file=readDts(root).get('ngx-compat-material-legacy-legacy-tabs.d.ts');assert.ok(file);
const allow=JSON.parse(readFileSync(new URL('../compatibility/rc/api/export-name-allowlist.json',import.meta.url)));
const observations=observeDeclarations(surface,readDts(root),loadDifferences(),allow,context).observations;
const observed=observations.find(o=>o.symbol.symbol_id===symbol.symbol_id);
assert.ok(observed.signature.tab_token_proof,'actual comparison qualifies the exact token');
assert.deepEqual(observed.signature.rows.map(r=>r.status),['intentional-legacy-difference','intentional-legacy-difference']);
const raw={...observed.signature,tab_token_proof:undefined,blocking:["token MAT_TAB 'MAT_TAB'",'const MAT_LEGACY_TAB:InjectionToken<any>'],rows:observed.signature.rows.map(r=>({...r,status:'mismatch'}))};
assert.ok(tabTokenProof(symbol,file,context));
assert.equal(tabTokenProof(symbol,file),null);
assert.equal(tabTokenProof({...symbol,shape:{kind:'token'}},file,context),null);
assert.equal(tabTokenProof(symbol,file,{...context,tarball:join(root,'package.json')}),null);
assert.equal(tabTokenProof(symbol,file,{...context,referenceRoot:root}),null);
assert.equal(tabTokenProof({...symbol,symbol_id:'legacy-tabs/primary/MAT_LEGACY_TAB_GROUP'},file,context),null);
assert.equal(tabTokenProof(symbol,{...file,text:file.text+'\n// drift'},context),null);
assert.equal(settleTabToken(symbol,file,{...raw,blocking:[...raw.blocking,'unexpected']},context).blocking.length,3);
assert.equal(settleTabToken(symbol,file,{...raw,rows:[...raw.rows,{status:'mismatch',historical:'other',owned:null}]},context).rows.at(-1).status,'mismatch');
// Reproduce the independent reviewer's copied-image and same-version peer faults.
const tmp=mkdtempSync(join(tmpdir(),'tab-token-provenance-'));
try {
 const copy=join(tmp,'package');cpSync(root,copy,{recursive:true});
 const fake=join(tmp,'node_modules'),angular=join(fake,'@angular');mkdirSync(fake);mkdirSync(angular);
 const actualModules=realpathSync(join(root,'../../../node_modules'));
 for(const e of readdirSync(actualModules))if(e!=='@angular')symlinkSync(join(actualModules,e),join(fake,e),'dir');
 for(const e of readdirSync(join(actualModules,'@angular')))if(e!=='material')symlinkSync(join(actualModules,'@angular',e),join(angular,e),'dir');
 cpSync(realpathSync(join(actualModules,'@angular/material')),join(angular,'material'),{recursive:true});
 const copied=readDts(copy).get('ngx-compat-material-legacy-legacy-tabs.d.ts');
 assert.equal(tabTokenProof(symbol,copied),null,'complete copied declarations without context fail closed');
 const copiedContext={...context,packageRoot:copy};
 assert.ok(tabTokenProof(symbol,copied,copiedContext),'complete copied image with valid tar and peers qualifies before mutations');
 appendFileSync(join(copy,'README.md'),'\nmutation');
 assert.equal(tabTokenProof(symbol,copied,copiedContext),null,'modified full extracted image rejected');
 cpSync(join(root,'README.md'),join(copy,'README.md'));
 appendFileSync(join(angular,'material/types/tabs.d.ts'),'\n// same-version peer drift');
 assert.equal(tabTokenProof(symbol,copied,copiedContext),null,'same-version public peer byte drift rejected');
} finally {rmSync(tmp,{recursive:true,force:true});}

const bundle=join(root,'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs');
const req=createRequire(bundle),imp=async spec=>import(pathToFileURL(req.resolve(spec)).href);
assert.equal(req('@angular/core/package.json').version,'22.1.7');assert.equal(req('@angular/material/package.json').version,'22.1.7');
await imp('@angular/compiler');
const {Injector}=await imp('@angular/core');const {MAT_TAB:modern}=await imp('@angular/material/tabs');
const {MAT_LEGACY_TAB:legacy,MatLegacyTab}=await import(pathToFileURL(bundle).href);
assert.notEqual(legacy,modern);assert.equal(legacy.toString(),'InjectionToken MAT_TAB');assert.equal(modern.toString(),legacy.toString());
const providers=MatLegacyTab.decorators.flatMap(d=>d.args||[]).flatMap(x=>x.providers||[]);
assert.equal(providers.length,1);const provider=providers[0];assert.equal(provider.provide,legacy);assert.equal(provider.useExisting,MatLegacyTab);assert.notEqual(provider.provide,modern);
const instance={marker:'tab'},injector=Injector.create({providers:[{provide:MatLegacyTab,useValue:instance},provider]});
assert.equal(injector.get(legacy),instance);assert.equal(injector.get(modern,null),null);injector.destroy();
const wrong=Injector.create({providers:[{provide:MatLegacyTab,useValue:instance},{...provider,provide:modern}]});
assert.equal(wrong.get(legacy,null),null);assert.equal(wrong.get(modern),instance);wrong.destroy();
console.log(JSON.stringify({result:'pass',rows:2,identity:'distinct',provider:'actual decorator useExisting',wrong_modern_token:'rejected',scope:'strict declaration and injector protocol; native Angular node lifecycle remains separate'}));
