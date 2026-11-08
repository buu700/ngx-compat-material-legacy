/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Targeted packed menu declaration settlement, with source/closure negatives.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {deriveSurface,packedShape,compareSignatures} from '../scripts/api-surface.mjs';
import {menuOwnedDeclarationProof,settleOwnedMenuSignatures} from '../scripts/api-menu-owned-signatures.mjs';
const arg=name=>{const i=process.argv.indexOf(name);assert.ok(i>=0&&process.argv[i+1],name+' required');return resolve(process.argv[i+1]);};
const context={tarball:arg('--tarball'),packageRoot:arg('--package-root'),referenceRoot:arg('--reference-root')};
const ts=createRequire(import.meta.url)('typescript'),path=join(context.packageRoot,'types/ngx-compat-material-legacy-legacy-menu.d.ts'),text=readFileSync(path,'utf8');
const parse=(value,pathName=path)=>ts.createSourceFile(pathName,value,ts.ScriptTarget.Latest,true),file=parse(text),surface=deriveSurface(context.referenceRoot),ids=['MAT_LEGACY_MENU_PANEL','MatLegacyMenuPanel','MatLegacyMenuItem'];
const symbols=ids.map(n=>surface.symbols.find(x=>x.symbol_id==='legacy-menu/primary/'+n));
for(const symbol of symbols){const before=compareSignatures(symbol,packedShape(file,symbol.name),[]);assert.equal(before.blocking.length,2);const after=settleOwnedMenuSignatures(symbol,file,before,context);assert.deepEqual(after.blocking,[]);assert.equal(after.rows.filter(r=>r.status==='intentional-legacy-difference'&&r.proof).length,symbol.name==='MatLegacyMenuItem'?2:1);}
let controls=0;
for(const symbol of symbols){const bad=structuredClone(symbol);bad.shape.signatures.push('public prop counterfeit:any');assert.equal(menuOwnedDeclarationProof(bad,file,context),null);controls++;const altered=parse(text+'\n// altered');assert.equal(menuOwnedDeclarationProof(symbol,altered,context),null);controls++;const row=compareSignatures(symbol,packedShape(file,symbol.name),[]),foreign={...row,rows:row.rows.map((r,i)=>i===row.rows.findIndex(x=>x.status==='mismatch')?{...r,owned:'unexpected'}:r)};assert.deepEqual(settleOwnedMenuSignatures(symbol,file,foreign,context).blocking,row.blocking);controls++;}
const scratch=mkdtempSync(join(tmpdir(),'menu-declaration-negative-'));
try{
 const fake=join(scratch,'types','ngx-compat-material-legacy-legacy-menu.d.ts');mkdirSync(dirname(fake),{recursive:true});writeFileSync(fake,text);assert.equal(menuOwnedDeclarationProof(symbols[0],parse(text,fake),context),null);controls++;
 const invalidTar=join(scratch,'fake.tgz');writeFileSync(invalidTar,readFileSync(context.tarball).subarray(0,1024));assert.equal(menuOwnedDeclarationProof(symbols[0],file,{...context,tarball:invalidTar}),null);controls++;
 for(const name of ['menu/menu-panel.ts','menu/menu-item.ts','legacy-menu/menu-item.ts']){const target=join(scratch,name);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(context.referenceRoot,name),target);}
 const changed=join(scratch,'menu/menu-panel.ts');writeFileSync(changed,readFileSync(changed,'utf8')+'\n// altered');assert.equal(menuOwnedDeclarationProof(symbols[0],file,{...context,referenceRoot:scratch}),null);controls++;
 let changedPeer=false;const mutation=(path,source)=>{if(!changedPeer&&path.includes('/@angular/material/')&&path.endsWith('.d.ts')){changedPeer=true;return source+'\n// changed peer';}return source;};assert.equal(menuOwnedDeclarationProof(symbols[0],file,context,{transformSource:mutation}),null);assert.equal(changedPeer,true);controls++;
}finally{rmSync(scratch,{recursive:true,force:true});}
console.log(JSON.stringify({qualified:ids.length,negative_controls:controls,role:'exact a488 declaration qualification; no runtime or full API claim'}));
