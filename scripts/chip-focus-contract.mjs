/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current owned focus contract. This reader never projects historical source. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {DIALOG_PORTAL_SOURCE,SNACK_SOURCE,qualifyIndependentSnackProductDelta} from './snack-dom-source-context.mjs';
import {qualifyIndependentTabProductDelta} from './tab-adapter-product-inventory-context.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),printer=ts.createPrinter({removeComments:true});
export const CHIP_FOCUS_SOURCE='projects/ngx-material-legacy/legacy-chips/chip.ts';
export const CHIP_FOCUS_PRIOR='compatibility/rc/chip-focus-repair-prior.json.gz';
const priorPins={main:'d2a4a33b3ec94c325039a08662912451dc74bab2fb85af1cf0b94fbdb9b48ae5','21.x':'7a17a275a1ba3e261d224077b2e1d410e9d1657b9996e1590b2db4a491b2b348'};
export const CHIP_FOCUS_CHANGED_PRODUCT_PATHS=Object.freeze([CHIP_FOCUS_SOURCE,'projects/ngx-material-legacy/legacy-chips/chip.spec.ts','projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts','testing/legacy-runner/historical-inventory.json']);
const parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0,'invalid focus source '+path);return file;};
const print=(node,file)=>printer.printNode(ts.EmitHint.Unspecified,node,file).trim();
const owner=file=>{const rows=file.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyChip');assert.equal(rows.length,1);return rows[0];};
const method=(file,name)=>{const rows=owner(file).members.filter(n=>n.name?.getText()===name);assert.equal(rows.length,1);return rows[0];};
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
const caches=new Map();
export function readChipFocusRepairPrior({root=process.cwd(),readMember=p=>readFileSync(join(root,p))}={}){
 const bytes=readMember(CHIP_FOCUS_PRIOR),fingerprint=hash(bytes),line=Object.keys(priorPins).find(line=>priorPins[line]===fingerprint);assert.ok(line,'changed focus repair prior');if(caches.has(line))return caches.get(line);
 const data=JSON.parse(gunzipSync(bytes));assert.equal(data.roster.ids.length,2227);assert.equal(data.roster.discovery_negative_ids.length,5);for(const m of data.sources)assert.equal(hash(m.text),m.sha256);assert.equal(new Set(data.sources.map(m=>m.path)).size,data.sources.length);assert.equal(new Set(data.product_members.map(m=>m.path)).size,data.product_members.length);
 caches.set(line,freeze(data));return caches.get(line);
}
export function inspectChipFocusRepair({root=process.cwd(),readMember=p=>readFileSync(join(root,p)),checkProduct=true}={}){
 const prior=readChipFocusRepairPrior({root,readMember}),before=prior.sources.find(m=>m.path===CHIP_FOCUS_SOURCE).text,current=readMember(CHIP_FOCUS_SOURCE).toString(),a=parse(CHIP_FOCUS_SOURCE,before),b=parse(CHIP_FOCUS_SOURCE,current),old=method(a,'focus'),fresh=method(b,'focus');
 assert.equal(current.slice(0,fresh.getStart(b))+old.getText(a)+current.slice(fresh.end),before,'production changes extend beyond complete focus method');assert.equal(fresh.parameters.length,0);assert.equal(fresh.type.kind,ts.SyntaxKind.VoidKeyword);
 const statements=fresh.body.statements;assert.equal(statements.length,4,'focus state sequence changed');assert.equal(print(statements[0],b),'if (this._isDestroyed)\n    return;');
 assert.ok(ts.isVariableStatement(statements[1]));const declarations=statements[1].declarationList.declarations;assert.equal(declarations.length,1);assert.equal(declarations[0].name.getText(),'wasBlurPending');assert.equal(print(declarations[0].initializer,b),'!!this._blurSubscription && !this._blurSubscription.closed');
 assert.equal(print(statements[2],b),'this._blurSubscription?.unsubscribe();');assert.ok(ts.isIfStatement(statements[3]));assert.equal(print(statements[3].expression,b),'!this._hasFocus || wasBlurPending');assert.ok(ts.isBlock(statements[3].thenStatement));assert.equal(statements[3].elseStatement,undefined);
 assert.deepEqual(statements[3].thenStatement.statements.map(n=>print(n,b)),['this._hasFocus = true;','this._elementRef.nativeElement.focus();','this._onFocus.next({ chip: this });']);
 let preserved=0,independentProduct,snackProduct;if(checkProduct){independentProduct=qualifyIndependentTabProductDelta({root,read:readMember});const changed=independentProduct.delta[0],added=independentProduct.delta[1];if(hash(readMember(SNACK_SOURCE))!=='d9ddfcf0a2f5a27a17670b9c4f382b2739c9a4f9ff5baffaef542cd866ecddab')snackProduct=qualifyIndependentSnackProductDelta({root,read:readMember});if(snackProduct){assert.equal(prior.product_members.find(m=>m.path===SNACK_SOURCE)?.sha256,snackProduct.delta.before_sha256);assert.equal(prior.product_members.find(m=>m.path===DIALOG_PORTAL_SOURCE)?.sha256,snackProduct.dialog.delta.before_sha256);}assert.ok(!prior.product_members.some(m=>m.path===added.path));const originalMember=prior.product_members.find(m=>m.path===changed.path);assert.ok(originalMember);assert.equal(originalMember.sha256,changed.before_sha256);const population=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','projects','testing','reference','fixtures'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();assert.deepEqual(population,[...prior.product_members.map(m=>m.path),added.path].sort());for(const m of prior.product_members)if(!CHIP_FOCUS_CHANGED_PRODUCT_PATHS.includes(m.path)){const expected=m.path===changed.path?changed.sha256:snackProduct&&m.path===SNACK_SOURCE?snackProduct.delta.sha256:snackProduct&&m.path===DIALOG_PORTAL_SOURCE?snackProduct.dialog.delta.sha256:snackProduct&&m.path===snackProduct.tooltip.delta.path?snackProduct.tooltip.delta.sha256:m.sha256;assert.equal(hash(readMember(m.path)),expected,'unexpected product/style/reference change '+m.path);if(m.path!==changed.path&&(!snackProduct||![SNACK_SOURCE,DIALOG_PORTAL_SOURCE,snackProduct.tooltip.delta.path].includes(m.path)))preserved++;}}
 return {schema_version:1,line:prior.line,source:CHIP_FOCUS_SOURCE,source_sha256:hash(current),prior_source_sha256:hash(before),prior_source_parent:prior.source_parent,sole_production_member_changed:'MatLegacyChip.focus',public_signature:'focus(): void',constructor_imports_other_members_and_metadata_unchanged:true,pending_blur_captured_before_cancel:true,focus_state_published_before_native_focus:true,notification_after_native_focus:true,all_other_product_reference_fixture_members_preserved:preserved,...(independentProduct?{independent_product_delta:independentProduct}:{}),...(snackProduct?{independent_snack_dom_delta:snackProduct}:{}),required_consumer_HTML_CSS_SCSS_changes:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
export function replayChipFocusSource(source,environment){const file=parse('focus-replay.ts',source),members=['focus','_blur','ngOnDestroy'].map(name=>print(method(file,name),file)),output=ts.transpileModule('class Replay {\n'+members.join('\n')+'\n}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});assert.equal(output.diagnostics?.length??0,0);const names=Object.keys(environment);return new Function(...names,output.outputText+';return Replay;')(...names.map(n=>environment[n]));}
