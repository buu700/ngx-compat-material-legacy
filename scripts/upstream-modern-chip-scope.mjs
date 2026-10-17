/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source applicability only; no browser, inherited fix or floor credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
const ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitHash=(kind,text)=>createHash('sha1').update(`${kind} ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
export const MODERN_CHIP_SCOPE_ROLE='C04 three individual modern chip option/grid source applicability reviews';
export const MODERN_CHIP_SUBJECTS='compatibility/rc/modern-chip-scope-subjects.json.gz';
export const MODERN_CHIP_SHAS=Object.freeze(['49f6859246bde08ff50c9a19de936227dccd0626','6ef5959afc2a452885e25afba4d311c896693f85','051917432ad18aadd1747c5b6e8d5af0e861cc52']);
const subjectHash='2ea89af65439e6b4093108e449ee248d417914f1ab47772b66759cc270c1c79b',rawHash='144b4be9427f4b55144fd3760b6bbc834d68e699c1589ae90581bb71c10498dc';
const targets=['src/material/chips/chip-option.ts','src/material/chips/chip-grid.ts','src/material/chips/chip-grid.ts'];
const changedPaths=[['src/material/chips/chip-option.ts'],['src/material/chips/chip-grid.ts','tools/public_api_guard/material/chips.md'],['src/material/chips/chip-grid.spec.ts','src/material/chips/chip-grid.ts']];
const forbiddenNames=new Set(['MatChipOption','MatChipGrid','MatChipListbox','MatChipSet','MatChipAction','MatChipRow','MatChipGridChange']);
const parsed=new Map();
function source(path,text){const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0,'invalid TypeScript '+path);return file;}
function classNode(file,name){const rows=file.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.equal(rows.length,1,'missing or duplicate '+name);return rows[0];}
function base(node){return node.heritageClauses?.find(n=>n.token===ts.SyntaxKind.ExtendsKeyword)?.types.map(n=>n.expression.getText())||[];}
function method(node,name){const rows=node.members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText()===name);assert.equal(rows.length,1);return rows[0];}
function parsedFacts(path,bytes){
 const fingerprint=hash(bytes),key=path+'\0'+fingerprint;if(parsed.has(key))return parsed.get(key);
 const file=source(path,bytes.toString()),routes=[],classes=[],selectors=[],unknown=[],namedImports=[];
 const route=(kind,node)=>{if(ts.isStringLiteralLike(node))routes.push({kind,module:node.text});else unknown.push(kind);};
 function visit(node){
  if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){if(node.moduleSpecifier)route(ts.isImportDeclaration(node)?'import':'export',node.moduleSpecifier);}
  if(ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings))for(const item of node.importClause.namedBindings.elements)namedImports.push({module:node.moduleSpecifier.text,imported:(item.propertyName||item.name).text,local:item.name.text});
  if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference)&&node.moduleReference.expression)route('import-equals',node.moduleReference.expression);
  if(ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument))route('import-type',node.argument.literal);
  if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require'))){if(node.arguments.length===1)route('dynamic-import',node.arguments[0]);else unknown.push('dynamic-import');}
  if(ts.isClassDeclaration(node)&&node.name)classes.push({name:node.name.text,base:base(node)});
  if(ts.isDecorator(node)&&ts.isCallExpression(node.expression)&&['Component','Directive'].includes(node.expression.expression.getText())){
   const argument=node.expression.arguments[0];
   if(argument&&ts.isObjectLiteralExpression(argument))for(const prop of argument.properties)if(ts.isPropertyAssignment(prop)&&prop.name.getText().replaceAll("'",'').replaceAll('"','')==='selector'){
    assert.ok(ts.isStringLiteralLike(prop.initializer),'nonliteral selector');selectors.push(prop.initializer.text);
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(file);
 const result={path,sha256:fingerprint,routes,classes,selectors,unknown,namedImports};parsed.set(key,result);return result;
}

/** Both complete original source sides are retained and Git-object authenticated. */
export function analyzeModernChipSubjects(readMember){
 const stored=readMember(MODERN_CHIP_SUBJECTS);assert.equal(hash(stored),subjectHash,'changed original modern chip subjects');
 const raw=gunzipSync(stored);assert.equal(hash(raw),rawHash);const data=JSON.parse(raw);assert.equal(data.schema_version,1);
 assert.deepEqual(data.subjects.map(r=>r.sha),MODERN_CHIP_SHAS);
 return data.subjects.map((row,index)=>{
  assert.equal(hash(row.raw_commit),row.raw_commit_sha256);assert.equal(gitHash('commit',row.raw_commit),row.sha);
  assert.deepEqual(row.raw_commit.split('\n').filter(l=>l.startsWith('parent ')),['parent '+row.parent]);
  assert.equal(hash(row.diff),row.diff_sha256);
  assert.deepEqual(row.members.map(m=>m.path),changedPaths[index]);
  assert.deepEqual(row.diff.split('\n').filter(l=>l.startsWith('diff --git ')).map(l=>l.split(' b/')[1]),changedPaths[index]);
  for(const member of row.members)for(const side of ['before','after']){assert.equal(hash(member[side].text),member[side].sha256);assert.equal(gitHash('blob',member[side].text),member[side].git_blob);}
  const member=row.members.find(m=>m.path===targets[index]),before=source(member.path,member.before.text),after=source(member.path,member.after.text);
  let detail;
  if(index===0){
   const old=method(classNode(before,'MatChipOption'),'_handlePrimaryActionInteraction').body.getText(),fresh=method(classNode(after,'MatChipOption'),'_handlePrimaryActionInteraction').body.getText();
   assert.ok(!old.includes('this.focus()'));assert.ok(fresh.indexOf('this.focus()')<fresh.indexOf('this.toggleSelected(true)'));
   detail={owner:'MatChipOption',changed_method:'_handlePrimaryActionInteraction',focuses_primary_action_before_optional_selection:true};
  }else if(index===1){
   assert.deepEqual(base(classNode(before,'MatChipGrid')),['_MatChipGridMixinBase']);assert.deepEqual(base(classNode(after,'MatChipGrid')),['MatChipSet']);
   assert.ok(after.statements.filter(ts.isImportDeclaration).some(n=>n.moduleSpecifier.text==='@angular/material/core'&&n.importClause?.namedBindings?.elements?.some(e=>(e.propertyName||e.name).text==='_ErrorStateTracker')));
   detail={owner:'MatChipGrid',removed_base:'_MatChipGridMixinBase',new_base:'MatChipSet',new_private_peer_dependency:'_ErrorStateTracker',api_declaration_also_reviewed:true};
  }else{
   const body=method(classNode(after,'MatChipGrid'),'_handleKeydown').body.getText();assert.ok(body.includes('this._chipActions.filter'));assert.ok(body.includes('action._isPrimary === activeItem._isPrimary'));assert.ok(body.includes('UP_ARROW')&&body.includes('DOWN_ARROW'));
   const spec=row.members.find(m=>m.path.endsWith('.spec.ts'));assert.ok(spec);const fresh=spec.after.text;
   for(const text of ['should focus primary action in next row','should focus primary action in previous row','trailing action in next row','trailing action in previous row'])assert.ok(fresh.includes(text));
   detail={owner:'MatChipGrid',changed_method:'_handleKeydown',separate_primary_and_trailing_row_navigation:true,new_up_down_regressions:4,all_spec_formatting_hunks_retained:true};
  }
  return {sha:row.sha,subject:row.subject,diff_sha256:row.diff_sha256,paths:[...changedPaths[index]],original_blobs:row.members.length*2,hunks:row.diff.split('\n').filter(l=>l.startsWith('@@ ')).length,detail};
 });
}

/** Authored source boundary, including local barrels, testing entrypoints and
 * literal dynamic/type imports. This makes no claim about peer transitive
 * execution, Safari behavior or packed-artifact membership. */
export function modernChipSourceContext(readMember,productPaths){
 assert.ok(Array.isArray(productPaths)&&productPaths.length>0);assert.equal(new Set(productPaths).size,productPaths.length);
 assert.deepEqual(productPaths,[...productPaths].sort());
 const paths=productPaths.filter(p=>p.endsWith('.ts'));assert.ok(paths.length>300);
 const facts=paths.map(p=>{assert.ok(p.startsWith('projects/ngx-material-legacy/'));return parsedFacts(p,readMember(p));});
 for(const fact of facts){
  assert.equal(fact.unknown.length,0,'unresolved module route '+fact.path);
  assert.ok(!fact.namedImports.some(r=>r.module==='@angular/material/core'&&r.imported==='_ErrorStateTracker'),'private upstream error tracker '+fact.path);
  assert.ok(fact.routes.every(r=>r.module!=='@angular/material'&&!r.module.startsWith('@angular/material/chips')),'authored current-chip module route '+fact.path);
  assert.ok(fact.classes.every(c=>!forbiddenNames.has(c.name)&&c.base.every(b=>!forbiddenNames.has(b))),'authored current-chip declaration/base '+fact.path);
  assert.ok(fact.selectors.every(s=>!s.split(',').some(v=>/^mat-chip-(?:grid|option|listbox|row|set|action)$/.test(v.trim()))),'authored modern-chip selector '+fact.path);
 }
 const chip='projects/ngx-material-legacy/legacy-chips/chip.ts',list='projects/ngx-material-legacy/legacy-chips/chip-list.ts';
 const chipClass=classNode(source(chip,readMember(chip).toString()),'MatLegacyChip'),listClass=classNode(source(list,readMember(list).toString()),'MatLegacyChipList');
 assert.deepEqual(base(chipClass),['_MatChipMixinBase']);assert.deepEqual(base(listClass),['_MatChipListBase']);
 const allClasses=facts.flatMap(r=>r.classes),ownBase=allClasses.filter(c=>c.name==='MatChipBase');assert.equal(ownBase.length,1);assert.deepEqual(ownBase[0].base,[]);
 const listFile=source(list,readMember(list).toString()),declarations=listFile.statements.filter(ts.isVariableStatement).flatMap(s=>[...s.declarationList.declarations]);
 const mixin=declarations.find(n=>n.name.getText()==='_MatChipListBase')?.initializer;assert.ok(mixin&&ts.isCallExpression(mixin)&&mixin.expression.getText()==='mixinErrorState');
 assert.equal(mixin.arguments.length,1);assert.ok(ts.isClassExpression(mixin.arguments[0]));assert.deepEqual(base(mixin.arguments[0]),[]);
 const listFacts=facts.find(r=>r.path===list),chipFacts=facts.find(r=>r.path===chip);
 assert.ok(listFacts.namedImports.some(r=>r.module==='./internal/common-behaviors'&&r.local==='mixinErrorState'&&r.imported==='mixinErrorState'));
 for(const name of ['mixinTabIndex','mixinColor','mixinDisableRipple'])assert.ok(chipFacts.namedImports.some(r=>r.module==='./internal/common-behaviors'&&r.local===name&&r.imported===name));
 const common='projects/ngx-material-legacy/legacy-chips/internal/common-behaviors/',barrel=source(common+'index.ts',readMember(common+'index.ts').toString());
 const ownedMixins=[['mixinErrorState','error-state'],['mixinTabIndex','tabindex'],['mixinColor','color'],['mixinDisableRipple','disable-ripple']];
 for(const [name,relative]of ownedMixins){
  const exports=barrel.statements.filter(n=>ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause)&&n.exportClause.elements.some(e=>e.name.text===name));
  assert.equal(exports.length,1);assert.equal(exports[0].moduleSpecifier.text,'./'+relative);
  const file=source(common+relative+'.ts',readMember(common+relative+'.ts').toString()),functions=file.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name&&n.body);
  assert.equal(functions.length,1);const body=functions[0],returns=body.body.statements.filter(ts.isReturnStatement);assert.equal(returns.length,1);
  assert.ok(ts.isClassExpression(returns[0].expression));assert.deepEqual(base(returns[0].expression),[body.parameters[0].name.getText()]);
 }
 const chipFile=source(chip,readMember(chip).toString()),chipVariables=chipFile.statements.filter(ts.isVariableStatement).flatMap(s=>[...s.declarationList.declarations]);
 let call=chipVariables.find(n=>n.name.getText()==='_MatChipMixinBase')?.initializer;
 for(const name of ['mixinTabIndex','mixinColor','mixinDisableRipple']){assert.ok(call&&ts.isCallExpression(call));assert.equal(call.expression.getText(),name);call=call.arguments[0];}
 assert.equal(call.getText(),'MatChipBase');
 for(const name of ['_handlePrimaryActionInteraction','_chipActions'])assert.ok(!chipClass.members.some(n=>n.name?.getText()===name)&&!listClass.members.some(n=>n.name?.getText()===name));
 const chipSelectors=facts.find(r=>r.path===chip).selectors;assert.ok(chipSelectors.includes('mat-basic-chip, [mat-basic-chip], mat-chip, [mat-chip]'));
 assert.ok(facts.find(r=>r.path===list).selectors.includes('mat-chip-list'));
 const pkg=JSON.parse(readMember('projects/ngx-material-legacy/package.json')),line=pkg.version.startsWith('21.')?'21.x':pkg.version.startsWith('22.')?'main':null;assert.ok(line);
 const contextPaths=['projects/ngx-material-legacy/package.json','projects/ngx-material-legacy/ng-package.json','projects/ngx-material-legacy/legacy-chips/public-api.ts','projects/ngx-material-legacy/legacy-chips/chips-module.ts'];
 return {line,production_and_test_typescript_members:facts.map(({path,sha256})=>({path,sha256})),context_members:contextPaths.map(path=>({path,sha256:hash(readMember(path))})),
  authored_current_chip_module_routes:0,authored_current_chip_classes:0,authored_current_chip_base_routes:0,unknown_module_routes:0,
  owned_chip_class:'MatLegacyChip',owned_list_class:'MatLegacyChipList',owned_base_expressions:['_MatChipMixinBase','_MatChipListBase'],
  owned_selectors:['mat-basic-chip, [mat-basic-chip], mat-chip, [mat-chip]','mat-chip-list'],local_base_classes:['MatChipBase','anonymous-class-in-_MatChipListBase'],owned_mixin_implementations:ownedMixins.map(([name,relative])=>({name,path:common+relative+'.ts'})),
  source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
