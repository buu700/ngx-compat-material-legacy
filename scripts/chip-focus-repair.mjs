/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current spec/roster inspection and a separately named finite old-source view. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
import {CHIP_FOCUS_PRIOR,readChipFocusRepairPrior,inspectChipFocusRepair} from './chip-focus-contract.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),printer=ts.createPrinter({removeComments:true});
const parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0,path);return file;},print=(node,file)=>printer.printNode(ts.EmitHint.Unspecified,node,file).trim();
export const CHIP_FOCUS_NEW_TITLES=Object.freeze(['should restore DOM focus while an earlier blur is pending','should emit one blur for repeated requests and racing stability','should cancel pending blur and notify destruction before ripple cleanup','should notify programmatic focus once during synchronous host reentry']);
const chipSpec='projects/ngx-material-legacy/legacy-chips/chip.spec.ts',listSpec='projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts';
const escapeTitles=['should allow focus to escape when tabbing away','should use user defined tabIndex'];
function calls(file){const found=[];const visit=n=>{if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='it'){assert.ok(n.arguments.length>=2);found.push({title:ts.isStringLiteralLike(n.arguments[0])?n.arguments[0].text:print(n.arguments[0],file),callback:n.arguments[1],text:print(n.arguments[1],file)});}ts.forEachChild(n,visit);};visit(file);return found;}
function normalize(file,{chip=false}={}){
 let removedCases=0,removedAssertions=0,removedImports=0;
 const transform=ts.transform(file,[context=>{
  const callback=n=>{if(ts.isBlock(n)){const statements=n.statements.filter(s=>{const text=print(s,file);if(['expect(chipListNativeElement.tabIndex).toBe(-1);','expect(chipListNativeElement.tabIndex).toBe(0);','expect(chipListNativeElement.tabIndex).toBe(4);','flushMicrotasks();'].includes(text)){removedAssertions++;return false;}return true;});return ts.factory.updateBlock(n,statements.map(s=>ts.visitNode(s,callback)));}return ts.visitEachChild(n,callback,context);};
  const visit=n=>{
   if(ts.isImportDeclaration(n)){
    const module=n.moduleSpecifier.text;if(chip&&module==='../internal/testing/owned-test-events'){assert.equal(n.importClause.namedBindings.elements.length,1);assert.equal(n.importClause.namedBindings.elements[0].name.text,'MockNgZone');removedImports++;return undefined;}
    if(['@angular/core','@angular/core/testing'].includes(module)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)){
     const remove=new Set(module==='@angular/core'?(chip?['NgZone']:[]):(chip?['fakeAsync','flushMicrotasks']:['flushMicrotasks'])),items=n.importClause.namedBindings.elements.filter(e=>!remove.has(e.name.text));removedImports+=n.importClause.namedBindings.elements.length-items.length;
     if(items.length===n.importClause.namedBindings.elements.length)return n;
     return ts.factory.updateImportDeclaration(n,n.modifiers,ts.factory.updateImportClause(n.importClause,n.importClause.isTypeOnly,n.importClause.name,ts.factory.updateNamedImports(n.importClause.namedBindings,items)),n.moduleSpecifier,n.attributes);
    }
   }
   if(ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(file)==='describe'&&n.expression.arguments[0]?.text==='owned blur lifecycle'){assert.ok(chip);removedCases++;return undefined;}
   if(!chip&&ts.isCallExpression(n)&&n.expression.getText(file)==='it'&&escapeTitles.includes(n.arguments[0]?.text))return ts.factory.updateCallExpression(n,n.expression,n.typeArguments,[n.arguments[0],ts.visitNode(n.arguments[1],callback),...n.arguments.slice(2)]);
   return ts.visitEachChild(n,visit,context);
  };return node=>ts.visitNode(node,visit);
 }]);
 try{return {source:printer.printFile(transform.transformed[0]),removedCases,removedAssertions,removedImports};}finally{transform.dispose();}
}
export function inspectChipFocusSpecs({root=process.cwd(),readMember=p=>readFileSync(join(root,p))}={}){
 const prior=readChipFocusRepairPrior({root,readMember}),old=p=>prior.sources.find(m=>m.path===p).text,beforeChip=parse(chipSpec,old(chipSpec)),afterChip=parse(chipSpec,readMember(chipSpec).toString()),beforeList=parse(listSpec,old(listSpec)),afterList=parse(listSpec,readMember(listSpec).toString());
 const epoch=chipFocusRepairInputs({root,readMember});for(const m of epoch.data.current_members.filter(m=>m.path.startsWith('projects/')||m.path==='testing/legacy-runner/historical-inventory.json'))assert.equal(hash(readMember(m.path)),m.sha256,'unregistered current fixture source '+m.path);
 const normalizedChip=normalize(afterChip,{chip:true}),normalizedList=normalize(afterList);assert.equal(hash(normalizedChip.source),hash(printer.printFile(beforeChip)),'old chip spec/fixture/imports changed');assert.equal(normalizedChip.removedCases,1);assert.equal(normalizedChip.removedImports,4);assert.equal(normalizedChip.removedAssertions,0);
 assert.equal(hash(normalizedList.source),hash(printer.printFile(beforeList)),'old list callbacks or fixture changed');assert.equal(normalizedList.removedCases,0);assert.equal(normalizedList.removedImports,1);assert.equal(normalizedList.removedAssertions,8);
 const a=calls(beforeChip),b=calls(afterChip);assert.equal(a.length,34);assert.equal(b.length,38);assert.deepEqual(b.slice(0,34).map(r=>({title:r.title,text:r.text})),a.map(r=>({title:r.title,text:r.text})));assert.deepEqual(b.slice(34).map(r=>r.title),CHIP_FOCUS_NEW_TITLES);
 const newBody=b.slice(34).map(r=>r.callback.getText(afterChip));for(let i=0;i<newBody.length;i++){assert.ok(!/spyOn\(chipInstance,\s*['"]focus/.test(newBody[i]));assert.ok(!/if\s*\(false\)/.test(newBody[i]));if(i<3)assert.ok(newBody[i].startsWith('fakeAsync('));}
 const first=newBody[0],restore=first.indexOf('chipInstance.focus();');assert.ok(first.indexOf('outside.focus();')<restore);assert.ok(restore<first.indexOf('expect(document.activeElement).toBe(chipNativeElement)'));assert.ok(first.indexOf('expect(document.activeElement).toBe(chipNativeElement)')<first.indexOf('lifecycleZone.simulateZoneExit()'));assert.ok(first.includes('expect(blurs).toBe(0)'));
 const second=newBody[1];assert.ok(second.includes("Object.defineProperty(lifecycleZone, 'isStable', {value: true})"));assert.ok(second.indexOf('flushMicrotasks()')<second.indexOf('lifecycleZone.simulateZoneExit()'));assert.ok(second.includes('expect(blurs).toBe(1)')&&second.includes('expect(blurs).toBe(2)'));assert.ok(second.split('chipInstance._blur();').length===5);
 const third=newBody[2];for(const text of ['fixture.componentInstance.shouldShow = false','fixture.detectChanges()','expect(cleanup).not.toHaveBeenCalled()','chipInstance.ngOnDestroy()','expect(cleanup).toHaveBeenCalledTimes(1)',"expect(events).toEqual(['destroyed'])"])assert.ok(third.includes(text),text);
 const fourth=newBody[3];for(const text of ['spyOn(chipNativeElement, \'focus\').and.callThrough()','focused: chipInstance._hasFocus','active: document.activeElement','expect(nativeFocus).toHaveBeenCalledTimes(1)','expect(observations).toEqual([{focused: true, active: chipNativeElement}])'])assert.ok(fourth.includes(text),text);
 for(const [i,title]of escapeTitles.entries()){const c=calls(afterList).find(c=>c.title===title).callback.getText(afterList),first=c.indexOf('expect(chipListNativeElement.tabIndex).toBe(-1)'),micro=c.indexOf('flushMicrotasks()'),second=c.indexOf('expect(chipListNativeElement.tabIndex).toBe(-1)',first+1),macro=c.indexOf('tick()'),last=c.indexOf('expect(chipListNativeElement.tabIndex).toBe('+(i===0?'0':'4')+')');assert.ok(first>=0&&first<micro&&micro<second&&second<macro&&macro<last,'DOM/macrotask assertions misplaced');}
 const roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length,2231);assert.deepEqual(roster.discovery_negative_ids,prior.roster.discovery_negative_ids);const byId=new Map(roster.cases.map(c=>[c.case_id,c]));let changedMetadata=0;
 for(const oldCase of prior.roster.cases){const current=byId.get(oldCase.case_id);assert.ok(current);const expected=structuredClone(oldCase);if(oldCase.candidate===chipSpec){assert.equal(oldCase.adaptation,'identical-to-historical');expected.adaptation='adapted';changedMetadata++;}assert.deepEqual(current,expected);}
 assert.equal(changedMetadata,34);const oldIds=new Set(prior.roster.ids),added=roster.cases.filter(c=>!oldIds.has(c.case_id));assert.deepEqual(added.map(c=>c.index),[34,35,36,37]);assert.deepEqual(added.map(c=>c.full_name),CHIP_FOCUS_NEW_TITLES.map(t=>'MatChip > owned blur lifecycle > '+t));
 const inventory=JSON.parse(readMember('testing/legacy-runner/historical-inventory.json')),oldInventory=JSON.parse(old('testing/legacy-runner/historical-inventory.json'));assert.equal(inventory.rows.length,57);let ownedRows=0;
 for(const [i,row]of inventory.rows.entries()){const previous=oldInventory.rows[i];if(![chipSpec,listSpec].includes(row.candidate)){assert.deepEqual(row,previous);continue;}ownedRows++;const expected=structuredClone(previous);expected.candidate_sha256=hash(readMember(row.candidate));expected.adaptation='adapted';expected.prior_candidate_snapshots=row.prior_candidate_snapshots;expected.source_reconciliation=row.source_reconciliation;assert.deepEqual(row,expected);assert.equal(row.historical_sha256,previous.historical_sha256);assert.deepEqual(row.execution,previous.execution);assert.deepEqual(row.prior_candidate_snapshots.slice(0,-1),previous.prior_candidate_snapshots??[]);assert.equal(row.prior_candidate_snapshots.at(-1).candidate_sha256,previous.candidate_sha256);assert.equal(row.prior_candidate_snapshots.at(-1).source_parent,prior.source_parent);assert.equal(row.source_reconciliation.native_execution,false);}
 assert.equal(ownedRows,2);
 const matrix=JSON.parse(readMember('compatibility/rc/matrices/full-verify.json')),expectedMatrix=JSON.parse(old('compatibility/rc/matrices/full-verify.json')),groups=expectedMatrix.checks.find(c=>c.check_id==='historical-legacy-artifact').acceptance.cases_by_line[prior.line],insert=groups['original-and-shared-cases'].indexOf(added[0].case_id.replace('#34','#33'))+1;assert.ok(insert>0);groups['original-and-shared-cases'].splice(insert,0,...added.map(c=>c.case_id));assert.deepEqual(matrix,expectedMatrix);assert.equal(groups['original-and-shared-cases'].length,roster.ids.length);assert.equal(new Set(groups['original-and-shared-cases']).size,roster.ids.length);assert.deepEqual([...groups['original-and-shared-cases']].sort(),[...roster.ids].sort());assert.deepEqual(groups['discovery-negatives'],roster.discovery_negative_ids);
 const validator=readMember('scripts/upstream-historical-behavior-evidence.mjs').toString();assert.equal(validator.split('const requiredCaseCount = 2236;').length,2,'wrong full native case requirement');let restored=validator.replace('const requiredCaseCount = 2236;','const requiredCaseCount = 2232;');const additions=added.map(c=>"  nativeCase('legacy-chips/chip.spec.ts', "+c.index+', '+JSON.stringify(c.full_name)+'),');for(const line of additions){assert.equal(restored.split(line).length,2);restored=restored.replace('\n'+line,'');}assert.equal(restored,old('scripts/upstream-historical-behavior-evidence.mjs'),'existing native registry or validator changed');
 return {schema_version:1,line:prior.line,old_case_identities_and_names_preserved:2227,old_chip_case_callbacks_preserved:34,old_chip_list_callbacks_preserved:92,old_cases_with_truthful_adaptation_metadata_updated:34,strengthened_case_indices:[27,28],additional_DOM_or_microtask_assertion_statements:8,appended_cases:added,positive_case_count:2231,discovery_negative_case_count:5,full_historical_case_count:2236,inventory_rows_updated:2,existing_native_scope_definitions_unchanged:true,new_cases_retained_by_full_native_validator:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
export const CHIP_FOCUS_REPAIR_INPUTS='compatibility/rc/chip-focus-repair-inputs.json';
const inputPins={"main": "40ef578cc1983d119effd4a99a0dfd2c877489c957be56ae081a961ccfb4dfe4", "21.x": "3b34cbb44b4989236de3cf61b3ea882877957ad6002162cf9735fd15cb74d3ba"};
const oldViews=new WeakMap();
export function chipFocusRepairInputs({root=process.cwd(),readMember=p=>readFileSync(join(root,p))}={}){
 const raw=readMember(CHIP_FOCUS_REPAIR_INPUTS),data=JSON.parse(raw);assert.equal(hash(raw),inputPins[data.line],'changed focus repair stage inputs');assert.equal(hash(readMember(data.current_raw_contract_source.path)),data.current_raw_contract_source.sha256,'changed current focus contract inspector');const prior=readChipFocusRepairPrior({root,readMember});assert.equal(data.line,prior.line);assert.equal(data.source_parent,prior.source_parent);assert.equal(hash(readMember(CHIP_FOCUS_PRIOR)),data.prior.sha256);for(const m of data.current_members)assert.ok(prior.sources.some(s=>s.path===m.path));return {data,prior};
}
/** Explicit pre-repair source characterization only. Unknown bytes are not
 * projected; source/native/product admission uses inspectChipFocusRepair above. */
export function chipFocusBeforeRead(readMember=p=>readFileSync(p),root=process.cwd()){
 if(oldViews.has(readMember))return readMember;
 const {data,prior}=chipFocusRepairInputs({root,readMember}),current=new Map(data.current_members.map(m=>[m.path,m.sha256])),before=new Map(prior.sources.map(m=>[m.path,m]));
 const read=p=>{const bytes=readMember(p),old=before.get(p);return old&&hash(bytes)===current.get(p)?Buffer.from(old.text):bytes;};oldViews.set(read,{data,prior});return read;
}
