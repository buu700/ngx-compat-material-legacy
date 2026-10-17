/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole input/grid API source applicability only; no native or floor credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {chipEditSourceContext} from './upstream-chip-edit-scope.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const gitHash=(kind,text)=>createHash('sha1').update(kind+' '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
const printer=ts.createPrinter({removeComments:true});
const parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0,'invalid TypeScript '+path);return file;};
const cls=(file,name)=>{const nodes=file.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1,'missing or duplicate '+name);return nodes[0];};
const member=(owner,name,kind)=>{const nodes=owner.members.filter(n=>n.name?.getText()===name&&(kind===undefined||n.kind===kind));assert.equal(nodes.length,1,'missing or duplicate '+name);return nodes[0];};
const canonical=(node,file)=>printer.printNode(ts.EmitHint.Unspecified,node,file).trim();
export const CHIP_INPUT_API_SHAS=Object.freeze(['67191681921550b7e4e0c587880e4db25686c589','29f0bb238a2a327ac6ed69071f6aa555693ab2d4','ef70029820423ff7ba6a5a1a372c24a0583a03f2']);
export const CHIP_INPUT_API_ORIGINALS='compatibility/rc/chip-input-api-scope-originals.json.gz';
const originalPin='8cef1a52320f37eb95f76a649e8f5ca00bc0657268ab1488078bea75f4a19495',originalRawPin='7ec46148f3d9fe0dea34b37d873ee31d737f4f5daecbfb56e0c558dbefa011ad';
const priorPins={main:'654c4982c1d2c8fc3bb3a33def2b8f73cff7e7cd34dfc9033de80f50101aaa78','21.x':'7a9e653215c41c703576c88eb9cad6be75daba59e8265007901ac9da654d75e6'};
const taggedInput='reference/material-16.2.14/chips-keyboard-sources/chip-input.ts',inputPin='8970d734fc5404e9e54341a21bea9753311ed3447f415006ac41234ca9890680';
const taggedList='reference/material-16.2.14/chip-blur-sources/chip-list.ts',listPin='83c17cd61f9ecb8cc4dcc7947a493a78a93a6b880d3c69f9284eb39106662414';
export function readChipInputApiPrior(read,line){
 const bytes=read('compatibility/rc/chip-input-api-scope-prior.json.gz');assert.equal(hash(bytes),priorPins[line],'changed chip input API prior');const prior=JSON.parse(gunzipSync(bytes));assert.equal(prior.line,line);assert.equal(hash(prior.ledger_text),prior.ledger_sha256);assert.deepEqual(prior.entries.map(e=>e.sha),CHIP_INPUT_API_SHAS);assert.equal(JSON.parse(prior.ledger_text).entries.length,1697);
 for(const source of [...prior.reviews,...prior.owned_sources])assert.equal(hash(source.text),source.sha256);return prior;
}
export function readChipInputApiOriginals(read){
 const bytes=read(CHIP_INPUT_API_ORIGINALS);assert.equal(hash(bytes),originalPin,'changed complete chip input API originals');const raw=gunzipSync(bytes);assert.equal(hash(raw),originalRawPin);const data=JSON.parse(raw);assert.deepEqual(data.subjects.map(r=>r.sha),CHIP_INPUT_API_SHAS);
 for(const row of data.subjects){assert.equal(gitHash('commit',row.raw_commit),row.sha);assert.equal(hash(row.raw_commit),row.raw_commit_sha256);assert.deepEqual(row.raw_commit.split('\n').filter(l=>l.startsWith('parent ')),['parent '+row.parent]);assert.equal(hash(row.diff),row.diff_sha256);assert.deepEqual(row.diff.split('\n').filter(l=>l.startsWith('diff --git ')).map(l=>l.split(' b/')[1]),row.members.map(m=>m.path));assert.equal(row.hunks,row.diff.split('\n').filter(l=>l.startsWith('@@ ')).length);
  for(const m of row.members){assert.equal(m.status,'M');for(const side of ['before','after']){assert.equal(hash(m[side].text),m[side].sha256);assert.equal(gitHash('blob',m[side].text),m[side].git_blob);}}
 }return data;
}
export function analyzeChipInputApiOriginals(read){
 return readChipInputApiOriginals(read).subjects.map((row,i)=>{
  const text=(path,side='after')=>row.members.find(m=>m.path===path)[side].text;let detail;
  if(i===0){
   assert.equal(row.members.length,3);assert.equal(row.hunks,4);const path='src/material/chips/chip-input.ts',file=parse(path,text(path)),owner=cls(file,'MatChipInput');assert.equal(member(owner,'chipGrid',ts.SyntaxKind.GetAccessor).body.getText().replace(/\s/g,''),'{returnthis._chipGrid;}');assert.ok(member(owner,'_chipGrid').modifiers.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword));
   const setPath='src/material/chips/chip-set.ts',set=cls(parse(setPath,text(setPath)),'MatChipSet'),before=cls(parse(setPath,text(setPath,'before')),'MatChipSet');assert.ok(member(set,'chipRemovedChanges',ts.SyntaxKind.GetAccessor).body.getText().includes('chip.removed'));assert.equal(member(set,'chipDestroyedChanges',ts.SyntaxKind.GetAccessor).body.getText(),member(before,'chipDestroyedChanges',ts.SyntaxKind.GetAccessor).body.getText());
   detail={owners:['MatChipInput','MatChipSet'],getter_added:'chipGrid',backing_grid_made_private:true,new_stream:'chipRemovedChanges -> chip.removed',existing_destroyed_stream_behavior_changed:false,public_declaration_reviewed:true};
  }else if(i===1){
   assert.equal(row.members.length,5);assert.equal(row.hunks,18);const path='src/material/chips/chip-grid.ts',file=parse(path,text(path)),before=parse(path,text(path,'before')),owner=cls(file,'MatChipGrid');assert.ok(member(owner,'_chipInput').questionToken);assert.ok(member(owner,'_uid').initializer.getText().includes('inject(_IdGenerator)'));assert.ok(!owner.members.some(m=>m.name?.getText()==='ngAfterViewInit'));assert.ok(member(cls(before,'MatChipGrid'),'ngAfterViewInit').body.getText().includes('must be used in combination'));
   for(const name of ['id','focused','describedByIds'])assert.ok(member(owner,name,ts.SyntaxKind.GetAccessor));for(const name of ['registerInput','focus','setDescribedByIds','_allowFocusEscape','_handleKeydown'])assert.ok(member(owner,name));
   detail={owner:'MatChipGrid',input_optional:true,dev_only_input_requirement_removed:true,new_private_peer_dependency:'_IdGenerator',input_fallbacks:['id','focused','focus','describedByIds','setDescribedByIds','_allowFocusEscape','_handleKeydown'],registration_moves_aria_describedby_to_input:true,original_no_input_tests_added:8,API_demo_and_docs_all_reviewed:true};
   assert.equal(row.diff.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')&&/\bit\('/.test(l)).length,8);
  }else{
   assert.equal(row.members.length,4);assert.equal(row.hunks,10);const path='src/material/chips/chip-input.ts',file=parse(path,text(path)),owner=cls(file,'MatChipInput');assert.ok(member(owner,'separatorKeyCodes').type.getText().includes('number | SeparatorKey'));assert.ok(member(owner,'_isSeparatorKey').body.getText().includes('hasModifierKey(event, ...modifiers)'));
   const tokenPath='src/material/chips/tokens.ts',tokens=parse(tokenPath,text(tokenPath)),declaration=tokens.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='SeparatorKey');assert.deepEqual(declaration.members.map(n=>n.name.getText()),['keyCode','modifiers']);assert.equal(declaration.members[1].type.getText(),'readonly ModifierKey[]');
   detail={owner:'MatChipInput',new_public_type:'SeparatorKey {keyCode:number;modifiers:readonly ModifierKey[]}',input_and_defaults_types_broadened:true,original_numeric_and_empty_modifier_behavior_retained:true,modifier_matching:'hasModifierKey disjunction over requested modifiers; not an exact-only modifier set',original_added_tests:2,public_declaration_and_options_reviewed:true};
   assert.equal(row.diff.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')&&/\bit\('/.test(l)).length,2);
  }
  return {sha:row.sha,subject:row.subject,diff_sha256:row.diff_sha256,paths:row.members.map(m=>m.path),hunks:row.hunks,existing_blob_occurrences:row.members.length*2,detail};
 });
}
/** Full input class members match the untouched tag, including its setter and
 * modifier semantics. The list keeps its distinct destroy-stream/optional-input
 * contract. Source equality is not browser, packed or matrix qualification. */
export function chipInputApiSourceContext(read,productPaths){
 const boundary=chipEditSourceContext(read,productPaths),prior=readChipInputApiPrior(read,boundary.line);
 assert.equal(hash(read(taggedInput)),inputPin,'changed original tagged chip input');assert.equal(hash(read(taggedList)),listPin,'changed original tagged chip list');
 for(const m of prior.owned_sources)assert.equal(hash(read(m.path)),m.sha256,'unreviewed owned input API source '+m.path);
 const inputPath='projects/ngx-material-legacy/legacy-chips/chip-input.ts',listPath='projects/ngx-material-legacy/legacy-chips/chip-list.ts',file=parse(inputPath,read(inputPath).toString()),original=parse(taggedInput,read(taggedInput).toString()),input=cls(file,'MatLegacyChipInput'),old=cls(original,'MatLegacyChipInput');
 assert.deepEqual(input.members.map(n=>canonical(n,file)),old.members.map(n=>canonical(n,original)),'legacy input class members differ from tagged16');assert.ok(!input.heritageClauses?.some(c=>c.token===ts.SyntaxKind.ExtendsKeyword));
 const listFile=parse(listPath,read(listPath).toString()),listOriginal=parse(taggedList,read(taggedList).toString()),list=cls(listFile,'MatLegacyChipList'),oldList=cls(listOriginal,'MatLegacyChipList');
 const selected=[['chipRemoveChanges',ts.SyntaxKind.GetAccessor],['id',ts.SyntaxKind.GetAccessor],['placeholder',ts.SyntaxKind.GetAccessor],['focused',ts.SyntaxKind.GetAccessor],['empty',ts.SyntaxKind.GetAccessor],['registerInput',ts.SyntaxKind.MethodDeclaration],['setDescribedByIds',ts.SyntaxKind.MethodDeclaration],['focus',ts.SyntaxKind.MethodDeclaration],['_focusInput',ts.SyntaxKind.MethodDeclaration],['_uid',ts.SyntaxKind.PropertyDeclaration],['_chipInput',ts.SyntaxKind.PropertyDeclaration]];
 for(const [name,kind]of selected)assert.equal(canonical(member(list,name,kind),listFile),canonical(member(oldList,name,kind),listOriginal),'legacy list member differs from tag: '+name);
 const defaultsPath='projects/ngx-material-legacy/legacy-chips/chip-default-options.ts',defaults=parse(defaultsPath,read(defaultsPath).toString()),options=defaults.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='MatLegacyChipsDefaultOptions');assert.deepEqual(options.members.map(n=>n.name.getText()),['separatorKeyCodes']);assert.equal(options.members[0].type.getText(),'readonly number[] | ReadonlySet<number>');
 const forbidden=/^(?:(?:Mat)?Legacy)?SeparatorKey$|^chipGrid$|^_chipGrid$|^chipRemovedChanges$/;
 for(const path of productPaths.filter(p=>p.startsWith('projects/ngx-material-legacy/legacy-chips/')&&p.endsWith('.ts'))){const source=parse(path,read(path).toString());const visit=node=>{if(ts.isIdentifier(node))assert.ok(!forbidden.test(node.text),'modern input API '+path);ts.forEachChild(node,visit);};visit(source);}
 return {line:boundary.line,current_legacy_owner_boundary:boundary,reviewed_owned_sources:prior.owned_sources.map(({path,sha256})=>({path,sha256})),tagged_references:[{path:taggedInput,sha256:inputPin},{path:taggedList,sha256:listPin}],all_legacy_input_class_members_match_tagged16:true,input_class_members:input.members.length,owned_separator_type:'readonly number[] | ReadonlySet<number>',owned_default_options_separator_type:'readonly number[] | ReadonlySet<number>',legacy_list_members_matching_tag:selected.map(([name,kind])=>({name,kind:ts.SyntaxKind[kind]})),legacy_stream:'chipRemoveChanges merges chip.destroyed',modern_requested_stream:'chipRemovedChanges would merge chip.removed',classic_input_association:'setter chipList -> _chipList; no getter or chipGrid alias',modern_input_API_surfaces:0,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
/** Method-level test extraction only. DI, resources and Angular lifecycle do not run. */
export function replayChipInputSeparator(source,{modern=false}={}){
 const file=parse('chip-input.ts',source),owner=cls(file,modern?'MatChipInput':'MatLegacyChipInput'),method=canonical(member(owner,'_isSeparatorKey'),file);
 const result=ts.transpileModule('class Replay {\n'+method+'\n}\nreturn Replay;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});assert.equal(result.diagnostics?.length??0,0);return hasModifierKey=>new Function('hasModifierKey',result.outputText)(hasModifierKey);
}
export function replayChipInputList(source,merge){
 const file=parse('chip-list.ts',source),owner=cls(file,'MatLegacyChipList'),names=[['chipRemoveChanges',ts.SyntaxKind.GetAccessor],['id',ts.SyntaxKind.GetAccessor],['placeholder',ts.SyntaxKind.GetAccessor],['focused',ts.SyntaxKind.GetAccessor],['empty',ts.SyntaxKind.GetAccessor],['registerInput',ts.SyntaxKind.MethodDeclaration],['setDescribedByIds',ts.SyntaxKind.MethodDeclaration]];
 const result=ts.transpileModule('class Replay {\n'+names.map(([name,kind])=>canonical(member(owner,name,kind),file).replace(/^@[^\n]+\n/gm,'')).join('\n')+'\n}\nreturn Replay;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});assert.equal(result.diagnostics?.length??0,0);return new Function('merge',result.outputText)(merge);
}
