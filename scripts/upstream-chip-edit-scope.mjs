/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite modern editing applicability; no native, inherited fix, CSS render or floor credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {modernChipSourceContext} from './upstream-modern-chip-scope.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const objectHash=(kind,text)=>createHash('sha1').update(kind+' '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
const printer=ts.createPrinter({removeComments:true}),parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0,'invalid source '+path);return file;};
const print=(node,file)=>printer.printNode(ts.EmitHint.Unspecified,node,file).trim();
const cls=(file,name)=>{const nodes=file.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1,'ambiguous '+name);return nodes[0];};
const member=(owner,name)=>{const nodes=owner.members.filter(n=>n.name?.getText()===name);assert.equal(nodes.length,1,'missing '+name);return nodes[0];};
const base=owner=>owner.heritageClauses?.find(n=>n.token===ts.SyntaxKind.ExtendsKeyword)?.types.map(n=>n.expression.getText())??[];
export const CHIP_EDIT_SHAS=Object.freeze(['68d7ea0351b489bfb9419e1fe28e560ed7280d3f','243845460d3842beee3f58b1bdb0679bd16e81f3','e31d3fd2477348bf9c47b39f05650735e6c4e536']);
export const CHIP_EDIT_ORIGINALS='compatibility/rc/chip-edit-scope-originals.json.gz';
const originalPin='198e08367a0467dd1d134b035dfd6fc8cb1ff9a5d4ec53592b4f33f76ae66d92',originalRawPin='4f0a2a21d323e847c74ba4dc8d7326fb2f7ec108aa67763ad96e48606335d74e';
const priorPins={main:'f91eb288e831aed1bbdd3cb49e9269f616b75d2fe8afc1aaccde26e7452f6eb2','21.x':'dc65d4289bf162a7810719313c744383acc1ad0d8251eb0d688cdd482f140482'};
const taggedChip='reference/material-16.2.14/chips-keyboard-sources/chip.ts',taggedChipPin='a3809031dbb69a835b3766f2af6052073939bab62a70161fe57e39260377fe5a';
const taggedStyles='reference/material-16.2.14/component-structural-sources/legacy-chips/chips.scss',taggedStylesPin='2dad061a250718c7977b726e5378bfa67b508a0e863bff53dee283d1b060f16a';
const editingTokens=/\b(?:Mat(?:Legacy)?ChipEdit(?:Input|edEvent|Harness)?|ChipEditHarnessFilters|MAT_(?:LEGACY_)?CHIP_EDIT)\b|matChipEdit|mat-(?:basic-)?chip-(?:row|edit)|mat-mdc-chip-edit|mdc-evolution-chip--with-leading-action|mdc-evolution-chip__cell--leading|mdc-evolution-chip__action--secondary/;
const mdcTokens=/mat-mdc-chip|mdc-evolution-chip/;
const editingMembers=new Set(['editable','edited','editIcon','_edit','_isEditing','_editStartPending','_startEditing','_getEditInput','_alreadyFocused','contentEditInput','defaultEditInput','_allEditIcons','_hasLeadingActionIcon','geEditButton']);
export function readChipEditPrior(read,line){
 const bytes=read('compatibility/rc/chip-edit-scope-prior.json.gz');assert.equal(hash(bytes),priorPins[line],'changed chip editing prior');const prior=JSON.parse(gunzipSync(bytes));assert.equal(prior.line,line);assert.equal(hash(prior.ledger_text),prior.ledger_sha256);
 assert.deepEqual(prior.entries.map(e=>e.sha),CHIP_EDIT_SHAS);assert.equal(JSON.parse(prior.ledger_text).entries.length,1697);
 for(const m of [...prior.reviews,...prior.owned_sources])assert.equal(hash(m.text),m.sha256);return prior;
}
export function readChipEditOriginals(read){
 const bytes=read(CHIP_EDIT_ORIGINALS);assert.equal(hash(bytes),originalPin,'changed original editing subjects');const raw=gunzipSync(bytes);assert.equal(hash(raw),originalRawPin);const data=JSON.parse(raw);assert.deepEqual(data.subjects.map(s=>s.sha),CHIP_EDIT_SHAS);
 for(const row of data.subjects){
  assert.equal(objectHash('commit',row.raw_commit),row.sha);assert.equal(hash(row.raw_commit),row.raw_commit_sha256);assert.deepEqual(row.raw_commit.split('\n').filter(l=>l.startsWith('parent ')),['parent '+row.parent]);assert.equal(hash(row.diff),row.diff_sha256);
  assert.deepEqual(row.diff.split('\n').filter(l=>l.startsWith('diff --git ')).map(l=>l.split(' b/')[1]),row.members.map(m=>m.path));
  assert.equal(row.hunks,row.diff.split('\n').filter(l=>l.startsWith('@@ ')).length);
  for(const m of row.members)for(const side of ['before','after']){if(m[side]===null){assert.equal(side,'before');assert.equal(m.status,'A');}else{assert.equal(hash(m[side].text),m[side].sha256);assert.equal(objectHash('blob',m[side].text),m[side].git_blob);}}
 }
 return data;
}
export function analyzeChipEditOriginals(read){
 return readChipEditOriginals(read).subjects.map((row,index)=>{
  const get=(path,side='after')=>row.members.find(m=>m.path===path)?.[side]?.text;
  let detail;
  if(index===0){
   assert.equal(row.members.length,3);assert.equal(row.hunks,8);const path='src/material/chips/chip-row.ts',file=parse(path,get(path)),before=parse(path,get(path,'before')),owner=cls(file,'MatChipRow');assert.deepEqual(base(owner),['MatChip']);
   assert.ok(!cls(before,'MatChipRow').members.some(n=>n.name?.getText()==='_handleClick'));const click=member(owner,'_handleClick').body.getText().replace(/\s/g,'');
   for(const text of ['!this.disabled&&this.editable&&!this._isEditing&&this._alreadyFocused','event.preventDefault()','event.stopPropagation()','this._startEditing(event)'])assert.ok(click.includes(text));
   const lifecycle=member(owner,'ngAfterViewInit').body.getText();assert.ok(lifecycle.includes('runOutsideAngular')&&lifecycle.includes("'mousedown'")&&lifecycle.includes('this._hasFocus()'));
   assert.equal(member(owner,'_alreadyFocused').initializer.getText(),'false');assert.ok(member(owner,'_handleFocus'));
   const addedTests=row.diff.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')&&/\bit\('/.test(l));assert.equal(addedTests.length,8);
   detail={owner:'MatChipRow',new_click_edit_gate:'enabled,editable,not-editing,previously-focused-on-mousedown',focus_tracking:'outside-Angular mousedown and blur reset',original_added_tests:8,API_members_added:['_handleClick','ngAfterViewInit']};
  }else if(index===1){
   assert.equal(row.members.length,19);assert.equal(row.hunks,56);const icons=parse('chip-icons.ts',get('src/material/chips/chip-icons.ts')),edit=cls(icons,'MatChipEdit');assert.deepEqual(base(edit),['MatChipAction']);assert.equal(member(edit,'_isLeading').initializer.getText(),'true');assert.ok(member(edit,'_handleClick').body.getText().includes('this._parentChip._edit()'));assert.ok(member(edit,'_handleKeydown').body.getText().includes('SPACE'));
   const action=cls(parse('chip-action.ts',get('src/material/chips/chip-action.ts')),'MatChipAction');assert.equal(member(action,'_isLeading').initializer.getText(),'false');
   const rowFile=parse('chip-row.ts',get('src/material/chips/chip-row.ts')),owner=cls(rowFile,'MatChipRow');assert.ok(member(owner,'_hasLeadingActionIcon').body.getText().includes('!this._isEditing && !!this.editIcon'));assert.ok(member(owner,'_edit').body.getText().includes('markForCheck'));assert.ok(member(owner,'_startEditing').body.getText().includes('setTimeout'));
   const template=get('src/material/chips/chip-row.html');assert.ok(template.includes('[matChipEdit]')&&template.includes('mdc-evolution-chip__cell--leading'));
   const main=cls(parse('chip.ts',get('src/material/chips/chip.ts')),'MatChip');for(const name of ['editIcon','_allEditIcons','_edit','_getActions'])assert.ok(member(main,name));assert.ok(member(main,'_getActions').body.getText().includes('result.push(this.editIcon)'));
   assert.ok(get('src/material/chips/tokens.ts').includes('MAT_CHIP_EDIT'));assert.ok(get('src/material/chips/module.ts').includes('MatChipEdit,'));
   assert.ok(get('src/material/chips/testing/chip-harness.ts').includes('async geEditButton('),'retain original public method spelling');assert.equal(get('src/material/chips/testing/chip-edit-harness.ts','before'),undefined);
   assert.ok(get('src/material/chips/chip.scss').includes('.mdc-evolution-chip__action--secondary'));assert.ok(get('src/material/chips/chip-action.ts').includes("'[class.mdc-evolution-chip__action--trailing]': '!_isPrimary && !_isLeading'"));
   detail={owners:['MatChipRow','MatChip','MatChipAction','MatChipEdit'],new_token:'MAT_CHIP_EDIT',new_selector:'[matChipEdit]',new_row_cell:'mdc-evolution-chip__cell--leading',shared_action_class_change:'trailing-only to secondary, with leading=false by default',timing_change:'edit-start pending cleared in setTimeout/ngZone after render',new_harness:'MatChipEditHarness',original_harness_method_spelling:'geEditButton',production_path_occurrences:8,test_and_harness_path_occurrences:6,API_golden_path_occurrences:2,example_and_dev_path_occurrences:3};
  }else{
   assert.equal(row.members.length,1);assert.equal(row.hunks,1);assert.equal(row.members[0].path,'src/material/chips/chip.scss');const added=row.diff.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')),removed=row.diff.split('\n').filter(l=>l.startsWith('-')&&!l.startsWith('---'));
   assert.equal(added.length,9);assert.equal(removed.length,4);assert.equal(added.filter(l=>l.includes('#{$with-leading}')).length,4);assert.ok(added.some(l=>l.includes("$with-leading: '.mdc-evolution-chip--with-leading-action'")));assert.ok(![...added,...removed].some(l=>/padding-(?:left|right):/.test(l)));
   detail={owner:'MDC secondary chip action CSS',new_state_selector:'.mdc-evolution-chip--with-leading-action',existing_trailing_rule_groups_expanded:4,group_contexts:['standard chip','primary graphic','avatar plus graphic','RTL avatar plus graphic'],padding_values_changed:false};
  }
  const counts=row.diff.split('\n').reduce((state,line)=>{if(line.startsWith('diff --git ')){state.current=line.split(' b/')[1];state.paths.push({path:state.current,hunks:0});}else if(line.startsWith('@@ '))state.paths.at(-1).hunks++;return state;},{paths:[],current:null}).paths;
  return {sha:row.sha,subject:row.subject,diff_sha256:row.diff_sha256,paths:row.members.map(m=>m.path),hunks:row.hunks,existing_blob_occurrences:row.members.flatMap(m=>[m.before,m.after]).filter(Boolean).length,absent_preimages:row.members.filter(m=>m.before===null).length,hunks_by_path:counts,detail};
 });
}
export function normalizedClassicChipStyles(text){
 const bindings=[];
 const normalized=text.replace(/^@use\s+(["'])([^"']+)\1(?:\s+as\s+([\w*-]+))?;/gm,(_,quote,path,explicit)=>{const namespace=explicit??path.split('/').at(-1).replace(/\.scss$/,'').replace(/^_/,'');bindings.push({path,namespace});return '@use "MODULE" as '+namespace+';';});
 return {normalized,bindings};
}
/** Authored source applicability only. Imported peer styles or runtime behavior
 * are separate contracts; source identities below are not rendered goldens. */
export function chipEditSourceContext(read,productPaths){
 const current=modernChipSourceContext(read,productPaths),prior=readChipEditPrior(read,current.line);
 assert.equal(hash(read(taggedChip)),taggedChipPin,'changed tagged click reference');assert.equal(hash(read(taggedStyles)),taggedStylesPin,'changed tagged style reference');
 const facts=[],historicalMdcStyleMembers=[];
 for(const path of productPaths){const bytes=read(path),text=bytes.toString();facts.push({path,sha256:hash(bytes)});
  if(path.endsWith('.ts')){
   const file=parse(path,text);const visit=node=>{
    if(ts.isIdentifier(node))assert.ok(!editingTokens.test(node.text),'authored modern edit symbol '+path);
    if(ts.isStringLiteralLike(node)||ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node))assert.ok(!editingTokens.test(node.text)&&!mdcTokens.test(node.text),'authored modern edit template/style '+path);
    if(path.startsWith('projects/ngx-material-legacy/legacy-chips/')&&node.name&&editingMembers.has(node.name.getText(file)))assert.fail('authored chip editing member '+path);
    ts.forEachChild(node,visit);
   };visit(file);
  }else if(/\.(scss|css|html)$/.test(path)){
   const operational=text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|\n)\s*\/\/[^\n]*/g,'$1').replace(/<!--[\s\S]*?-->/g,'');assert.ok(!editingTokens.test(operational),'authored modern edit resource '+path);if(mdcTokens.test(operational)){assert.ok(path.startsWith('projects/ngx-material-legacy/styles/'),'modern MDC markup in owned legacy resource '+path);historicalMdcStyleMembers.push({path,sha256:hash(bytes)});}assert.ok(!/@(?:use|forward|import)\s+["'][^"']*@angular\/material\/chips/.test(operational),'authored modern chip Sass route '+path);
  }
 }
 // Pin the reviewed ownership surface conservatively. These are source epochs,
 // not behavioral expectations synthesized from candidate output.
 for(const m of prior.owned_sources)assert.equal(hash(read(m.path)),m.sha256,'unreviewed owned chip source '+m.path);
 const chipPath='projects/ngx-material-legacy/legacy-chips/chip.ts',owned=parse(chipPath,read(chipPath).toString()),reference=parse(taggedChip,read(taggedChip).toString());
 for(const [name,methods]of [['MatLegacyChip',['_handleClick','remove']],['MatLegacyChipRemove',['_handleClick']]]){
  const a=cls(owned,name),b=cls(reference,name);for(const method of methods)assert.equal(print(member(a,method),owned),print(member(b,method),reference),'classic interaction differs from tag');
 }
 assert.deepEqual(base(cls(owned,'MatLegacyChipRemove')),[],'legacy remove inherited modern action');
 const source='projects/ngx-material-legacy/legacy-chips/chips.scss',own=normalizedClassicChipStyles(read(source).toString()),old=normalizedClassicChipStyles(read(taggedStyles).toString());assert.equal(own.normalized,old.normalized,'classic structural Sass differs beyond module sources');assert.deepEqual(own.bindings.map(b=>b.namespace),old.bindings.map(b=>b.namespace),'Sass namespaces changed');
 const moduleFile=parse('chips-module.ts',read('projects/ngx-material-legacy/legacy-chips/chips-module.ts').toString()),declarations=moduleFile.statements.filter(ts.isVariableStatement).flatMap(s=>[...s.declarationList.declarations]).filter(d=>d.name.getText(moduleFile)==='CHIP_DECLARATIONS');assert.equal(declarations.length,1);assert.ok(ts.isArrayLiteralExpression(declarations[0].initializer));assert.deepEqual(declarations[0].initializer.elements.map(e=>e.getText(moduleFile)),['MatLegacyChipList','MatLegacyChip','MatLegacyChipInput','MatLegacyChipRemove','MatLegacyChipAvatar','MatLegacyChipTrailingIcon']);
 return {line:current.line,modern_type_boundary:current,authored_TS_and_resource_members:facts,reviewed_owned_sources:prior.owned_sources.map(({path,sha256})=>({path,sha256})),legacy_click_and_remove_methods_match_tag:true,tagged_chip:{path:taggedChip,sha256:taggedChipPin},tagged_structural_styles:{path:taggedStyles,sha256:taggedStylesPin},classic_structural_Sass_equal_after_module_source_normalization:true,preserved_Sass_namespace_bindings:own.bindings.map(b=>b.namespace),candidate_Sass_modules:own.bindings,legacy_module_declarations:6,authored_row_or_editing_surfaces:0,historical_Material16_MDC_style_members:historicalMdcStyleMembers,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
