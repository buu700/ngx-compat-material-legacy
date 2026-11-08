/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. */
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,mkdirSync,symlinkSync,readdirSync,realpathSync,appendFileSync,rmSync,unlinkSync} from 'node:fs';import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {deriveSurface,readDts} from '../scripts/api-surface.mjs';
import {selectScrollTokenProof,settleSelectScrollToken} from '../scripts/api-select-scroll-token-contract.mjs';
const [root,ref,tarball]=process.argv.slice(2);assert.ok(root&&ref&&tarball);const context={packageRoot:root,referenceRoot:ref,tarball};
const symbol=deriveSurface(ref).symbols.find(s=>s.symbol_id==='legacy-select/primary/MAT_LEGACY_SELECT_SCROLL_STRATEGY');const file=readDts(root).get('ngx-compat-material-legacy-legacy-select.d.ts');
assert.ok(selectScrollTokenProof(symbol,file,context));assert.equal(selectScrollTokenProof(symbol,file),null);assert.equal(selectScrollTokenProof({...symbol,shape:{kind:'token'}},file,context),null);assert.equal(selectScrollTokenProof(symbol,{...file,text:file.text+'\n'},context),null);assert.equal(selectScrollTokenProof(symbol,file,{...context,referenceRoot:root}),null);assert.equal(selectScrollTokenProof(symbol,file,{...context,tarball:join(root,'package.json')}),null);
const raw={blocking:["token MAT_SELECT_SCROLL_STRATEGY 'mat-select-scroll-strategy'",'const MAT_LEGACY_SELECT_SCROLL_STRATEGY:InjectionToken<()=>ScrollStrategy>'],rows:[{status:'mismatch',historical:"token MAT_SELECT_SCROLL_STRATEGY 'mat-select-scroll-strategy'",owned:null},{status:'mismatch',historical:null,owned:'const MAT_LEGACY_SELECT_SCROLL_STRATEGY:InjectionToken<()=>ScrollStrategy>'}]};
assert.equal(settleSelectScrollToken(symbol,file,raw,context).blocking.length,0);assert.equal(settleSelectScrollToken(symbol,file,{...raw,blocking:[...raw.blocking,'other']},context).blocking.length,3);
// Check physical images again after each mutation: no cached proof may survive drift.
const tmp=mkdtempSync(join(tmpdir(),'select-scroll-proof-'));
try {
 const copy=join(tmp,'package');cpSync(root,copy,{recursive:true});const mods=join(tmp,'node_modules'),angular=join(mods,'@angular');mkdirSync(mods);mkdirSync(angular);
 const actual=realpathSync(join(root,'../../../node_modules'));
 for(const e of readdirSync(actual))if(e!=='@angular')symlinkSync(join(actual,e),join(mods,e),'dir');
 for(const e of readdirSync(join(actual,'@angular')))if(e!=='material')symlinkSync(join(actual,'@angular',e),join(angular,e),'dir');
 cpSync(realpathSync(join(actual,'@angular/material')),join(angular,'material'),{recursive:true});
 const copied=readDts(copy).get('ngx-compat-material-legacy-legacy-select.d.ts'),ctx={...context,packageRoot:copy};assert.ok(selectScrollTokenProof(symbol,copied,ctx));
 const sibling=join(copy,'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs');appendFileSync(sibling,'\n// drift');assert.equal(selectScrollTokenProof(symbol,copied,ctx),null);cpSync(join(root,'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs'),sibling);
 unlinkSync(join(copy,'README.md'));assert.equal(selectScrollTokenProof(symbol,copied,ctx),null);cpSync(join(root,'README.md'),join(copy,'README.md'));
 appendFileSync(join(angular,'material/types/select.d.ts'),'\n// same-version drift');assert.equal(selectScrollTokenProof(symbol,copied,ctx),null);
} finally {rmSync(tmp,{recursive:true,force:true});}
const bundle=join(root,'fesm2022/ngx-compat-material-legacy-legacy-select.mjs'),req=createRequire(bundle),imp=async s=>import(pathToFileURL(req.resolve(s)).href);await imp('@angular/compiler');const {Injector}=await imp('@angular/core');const {Overlay}=await imp('@angular/cdk/overlay');const {MAT_SELECT_SCROLL_STRATEGY:modern}=await imp('@angular/material/select');
const {MAT_LEGACY_SELECT_SCROLL_STRATEGY:legacy,MAT_LEGACY_SELECT_SCROLL_STRATEGY_PROVIDER:provider,MAT_LEGACY_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY:factory,MatLegacySelectModule,MatLegacySelect}=await import(pathToFileURL(bundle).href);
assert.notEqual(legacy,modern);assert.equal(provider.provide,legacy);assert.equal(provider.useFactory,factory);assert.deepEqual(provider.deps,[Overlay]);assert.ok(MatLegacySelectModule.decorators.flatMap(x=>x.args||[]).flatMap(x=>x.providers||[]).includes(provider));
const base=Object.getPrototypeOf(MatLegacySelect);const params=base.ctorParameters();assert.ok(params[11].decorators.some(d=>d.args?.[0]===legacy));assert.ok(!params[11].decorators.some(d=>d.args?.[0]===modern));
const strategy={marker:'strategy'},overlay={scrollStrategies:{reposition:()=>strategy}};const decoy=()=>({marker:'decoy'}),override=()=>strategy;
const defaults=Injector.create({providers:[{provide:Overlay,useValue:overlay},provider,{provide:modern,useValue:decoy}]});assert.equal(defaults.get(legacy)(),strategy);assert.equal(defaults.get(modern),decoy);defaults.destroy();
const custom=Injector.create({providers:[{provide:Overlay,useValue:overlay},provider,{provide:modern,useValue:decoy},{provide:legacy,useValue:override}]});assert.equal(custom.get(legacy),override);assert.equal(custom.get(legacy)(),strategy);assert.equal(custom.get(modern),decoy);custom.destroy();
console.log(JSON.stringify({result:'pass',scope:'packed module provider, Angular injector factory and overrides, constructor injection metadata; no native node lifecycle claim'}));
