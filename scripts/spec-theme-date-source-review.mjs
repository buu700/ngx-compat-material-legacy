/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete original M3/date/private fixture reviews, with no product or runtime admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),gitHash=(kind,bytes)=>createHash('sha1').update(kind+' '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
export const THEME_DATE_SHAS=["0499dc00e5c0185086967e64fe6b0655216359fb", "3806c7170e7f88e3546e145d7d27db9fd9e8a8dd", "3e092f10d49a274d79ca73222510eb45de098a6a", "8f7292fb972ce8576f0e680b50ead7840d989729"];
export const THEME_DATE_PATHS=[["src/material/core/theming/tests/m3-theme.spec.ts"], ["src/material-date-fns-adapter/adapter/date-fns-adapter.spec.ts", "src/material-luxon-adapter/adapter/luxon-date-adapter.spec.ts", "src/material-moment-adapter/adapter/moment-date-adapter.spec.ts", "src/material/core/datetime/native-date-adapter.spec.ts"], ["src/material/datepicker/date-range-input.spec.ts", "src/material/datepicker/testing/date-range-input-harness.spec.ts", "src/material/form-field/testing/form-field-harness.spec.ts"], ["src/components-examples/material/datepicker/datepicker-harness/datepicker-harness-example.spec.ts", "src/components-examples/material/timepicker/timepicker-harness/timepicker-harness-example.spec.ts", "src/material/datepicker/calendar-header.spec.ts", "src/material/datepicker/date-range-input.spec.ts", "src/material/datepicker/date-range-selection-strategy.spec.ts", "src/material/datepicker/datepicker.spec.ts", "src/material/datepicker/month-view.spec.ts", "src/material/datepicker/multi-year-view.spec.ts", "src/material/datepicker/testing/calendar-harness.spec.ts", "src/material/datepicker/testing/date-range-input-harness.spec.ts", "src/material/datepicker/testing/datepicker-input-harness.spec.ts", "src/material/datepicker/testing/datepicker-toggle-harness.spec.ts", "src/material/datepicker/year-view.spec.ts", "src/material/form-field/testing/form-field-harness.spec.ts"]];
export const THEME_DATE_CAPSULES={main:{'compatibility/rc/spec-theme-date-source-subjects.json.gz':'26b49659f5dcc1b75a5f2879d963b33acccd18158915231ee45965a5f2008faa','compatibility/rc/spec-theme-date-source-acquisition.json.gz':'4d29b8e9a84f58acd41ca3d1c60caa73cca7253d7cdc63d4b68715106099540e'},'21.x':{'compatibility/rc/spec-theme-date-source-subjects.json.gz':'00763e3eff2e7b37667982760d8bd844f40fb6db457fe2e06f401aa430ab9835','compatibility/rc/spec-theme-date-source-acquisition.json.gz':'a835206a510eee5c96379d99d659f465cb67c6dc7b34e9ef6490195ce7ae665b'}};
const parse=text=>{const file=ts.createSourceFile('source.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const collect=(file,predicate)=>{const rows=[];function visit(n){if(predicate(n))rows.push(n);ts.forEachChild(n,visit);}visit(file);return rows;};
const nodeName=node=>node?.name&&ts.isIdentifier(node.name)?node.name.text:'';
const calls=(file,name)=>collect(file,n=>ts.isCallExpression(n)&&n.expression.getText(file)===name);
const shape=node=>{const children=[];ts.forEachChild(node,n=>{children.push(shape(n));});return {kind:node.kind,...(ts.isIdentifier(node)?{identifier:node.text}:{}),...(ts.isLiteralExpression(node)?{literal:node.text}:{}),...(Object.hasOwn(node,'isTypeOnly')?{isTypeOnly:node.isTypeOnly}:{}),children};};
const nativeNames=new Set(['MatNativeDateModule','NativeDateModule']);
const standaloneImports=new Set(['MatFormFieldModule','MatFormField','MatLabel','MatError','MatHint','MatPrefix','MatSuffix','MatAutocompleteModule','MatAutocomplete','MatAutocompleteTrigger','MatInputModule','MatInput','MatSelectModule','MatSelect','MatDateRangeInput','MatDateRangePicker','MatDatepicker','MatDatepickerInput','MatEndDate','MatStartDate']);
const imports=(file,excluded)=>file.statements.filter(ts.isImportDeclaration).map(n=>({module:n.moduleSpecifier.text,typeOnly:n.importClause?.isTypeOnly??false,default:n.importClause?.name?.text??null,named:n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?n.importClause.namedBindings.elements.filter(e=>!excluded.has((e.propertyName||e.name).text)).map(e=>[(e.propertyName||e.name).text,e.name.text,e.isTypeOnly]):null})).filter(row=>row.named===null||row.named.length||row.default);
const templates=file=>collect(file,n=>ts.isPropertyAssignment(n)&&n.name.getText(file)==='template').map(n=>n.initializer.getText(file));
function normalizedProgram(file,mode,path){
 const datepicker=path==='src/material/datepicker/datepicker.spec.ts',result=ts.transform(file,[context=>{
  const visit=node=>{
   if(ts.isImportDeclaration(node))return undefined;
   if(ts.isFunctionDeclaration(node)&&nodeName(node)==='createComponent'){
    const dropped=mode==='standalone'?'declarations':datepicker?'imports':null;
    const parameters=node.parameters.filter(p=>{if(p.name.getText(file)!==dropped)return true;assert.ok(p.initializer&&ts.isArrayLiteralExpression(p.initializer)&&p.initializer.elements.length===0);return false;});
    node=ts.factory.updateFunctionDeclaration(node,node.modifiers,node.asteriskToken,node.name,node.typeParameters,parameters,node.type,ts.visitNode(node.body,visit));return node;
   }
   if(ts.isCallExpression(node)){
    const name=node.expression.getText(file);
    if(name==='createComponent'){
     let args=[...node.arguments];
     if(mode==='standalone'&&args.length===3){assert.ok(ts.isArrayLiteralExpression(args[1])&&args[1].elements.length===0);args=[args[0],args[2]];}
     if(mode==='providers'&&datepicker){
      if(args.length===3){assert.ok(ts.isArrayLiteralExpression(args[1])&&args[1].elements.every(e=>ts.isIdentifier(e)&&nativeNames.has(e.text)));args=[args[0],args[2]];}
      args=args.map(arg=>ts.visitNode(arg,visit));if(args.length===2&&ts.isArrayLiteralExpression(args[1])&&!args[1].elements.length)args.pop();
     }else args=args.map(arg=>ts.visitNode(arg,visit));
     return ts.factory.updateCallExpression(node,node.expression,node.typeArguments,args);
    }
    if(name==='describe'&&mode==='providers'&&node.arguments[0]?.text==='with MatNativeDateModule')return ts.factory.updateCallExpression(node,node.expression,node.typeArguments,[ts.factory.createStringLiteral('with native adapter'),...node.arguments.slice(1).map(n=>ts.visitNode(n,visit))]);
    if((mode==='standalone'&&['Component','Directive','TestBed.configureTestingModule'].includes(name))||(mode==='providers'&&['Component','TestBed.configureTestingModule'].includes(name))){
     assert.ok(ts.isObjectLiteralExpression(node.arguments[0]));const object=node.arguments[0],properties=[];
     for(let property of object.properties){const key=property.name?.getText(file);
      if(mode==='standalone'&&(['Component','Directive'].includes(name)?['imports','standalone']:['imports','declarations']).includes(key))continue;
      if(mode==='providers'&&datepicker&&name==='TestBed.configureTestingModule'&&key==='imports'&&ts.isShorthandPropertyAssignment(property))continue;
      property=ts.visitNode(property,visit);if(mode==='providers'&&['imports','providers'].includes(key)&&ts.isPropertyAssignment(property)&&ts.isArrayLiteralExpression(property.initializer)&&property.initializer.elements.length===0)continue;properties.push(property);
     }
     return ts.factory.updateCallExpression(node,node.expression,node.typeArguments,[ts.factory.updateObjectLiteralExpression(object,properties),...node.arguments.slice(1).map(n=>ts.visitNode(n,visit))]);
    }
   }
   if(mode==='providers'&&ts.isArrayLiteralExpression(node))return ts.factory.updateArrayLiteralExpression(node,node.elements.filter(e=>!(ts.isIdentifier(e)&&nativeNames.has(e.text))&&!(ts.isCallExpression(e)&&e.expression.getText(file)==='provideNativeDateAdapter'&&e.arguments.length===0)).map(e=>ts.visitNode(e,visit)));
   return ts.visitEachChild(node,visit,context);
  };return node=>ts.visitNode(node,visit);
 }]);try{return shape(result.transformed[0]);}finally{result.dispose();}
}
export function authenticateThemeDatePatch(subject){
 const index=THEME_DATE_SHAS.indexOf(subject.sha);assert.ok(index>=0,'unregistered theme/date source');assert.equal(gitHash('commit',subject.raw_commit),subject.sha);assert.equal(hash(subject.raw_commit),subject.raw_commit_sha256);
 const paths=THEME_DATE_PATHS[index];assert.deepEqual(subject.members.map(row=>row.path),paths);assert.deepEqual(subject.complete_changed_files.map(row=>row.path),paths);assert.equal(hash(subject.diff),subject.diff_sha256);assert.equal(Buffer.byteLength(subject.diff),subject.diff_bytes);
 const parts=subject.diff.split(/(?=^diff --git )/m).filter(Boolean);assert.equal(parts.length,paths.length);const hunks=[];
 for(const [offset,path]of paths.entries()){
  const member=subject.members[offset],identity=subject.complete_changed_files[offset],diff=parts[offset];assert.ok(diff.startsWith(`diff --git a/${path} b/${path}\n`));
  if(index===0){
   assert.equal(identity.status,'A');assert.equal(identity.before_mode,'000000');assert.equal(identity.after_mode,'100644');assert.equal(identity.before_blob,'0'.repeat(40));assert.deepEqual(member.before,{git_blob:'0'.repeat(40),sha256:hash(''),bytes:0,text:''});
   assert.equal(gitHash('blob',member.after.text),member.after.git_blob);assert.equal(identity.after_blob,member.after.git_blob);assert.equal(member.after.git_blob,'fcf151bd4b1b458fc9de84f7dcf73d881c818e78');assert.equal(hash(member.after.text),member.after.sha256);assert.equal(Buffer.byteLength(member.after.text),member.after.bytes);
   const lines=diff.split('\n');assert.deepEqual(lines.slice(0,6),[`diff --git a/${path} b/${path}`,'new file mode 100644',`index ${'0'.repeat(40)}..${member.after.git_blob}`,'--- /dev/null','+++ b/'+path,'@@ -0,0 +1,67 @@']);assert.equal(lines.length,74);assert.equal(lines.at(-1),'');assert.ok(lines.slice(6,-1).every(v=>v.startsWith('+')));assert.equal(lines.slice(6,-1).map(v=>v.slice(1)).join('\n')+'\n',member.after.text);
   const metadata=subject.raw_commit.split('\n\n')[0].split('\n');assert.deepEqual(metadata.filter(row=>row.startsWith('parent ')).map(row=>row.slice(7)),subject.parents);assert.equal(subject.parents.length,1);assert.ok(metadata.includes('tree '+subject.tree));hunks.push({path,header:lines[5],sha256:hash(lines.slice(5,-1).join('\n')+'\n')});
  }else{
   assert.equal(identity.status,'M');assert.equal(identity.before_mode,'100644');assert.equal(identity.after_mode,'100644');hunks.push(...reviewCompleteSingleSpec({...subject,members:[member],complete_changed_files:[identity],diff,diff_sha256:hash(diff),diff_bytes:Buffer.byteLength(diff),original_hunks:(diff.match(/^@@ /gm)||[]).length},THEME_DATE_SHAS));
  }
 }assert.equal(hunks.length,subject.original_hunks);return hunks;
}
const standaloneScopes={
 'src/material/datepicker/date-range-input.spec.ts':{
  StandardRangePicker:['MatDateRangeInput','MatStartDate','MatEndDate','MatFormField','MatLabel','MatDateRangePicker','ReactiveFormsModule'],
  RangePickerNoStart:['MatDateRangeInput','MatStartDate','MatEndDate','MatFormField','MatDateRangePicker'],
  RangePickerNoEnd:['MatDateRangeInput','MatStartDate','MatEndDate','MatFormField','MatDateRangePicker'],
  RangePickerNgModel:['MatDateRangeInput','MatStartDate','MatEndDate','MatFormField','MatDateRangePicker','FormsModule'],
  RangePickerNoLabel:['MatDateRangeInput','MatStartDate','MatEndDate','MatFormField','MatDateRangePicker'],
  CustomValidator:null,
  RangePickerWithCustomValidator:['MatDateRangeInput','MatStartDate','MatEndDate','MatFormField','MatDateRangePicker','CustomValidator','FormsModule'],
  RangePickerErrorStateMatcher:['MatDateRangeInput','MatStartDate','MatEndDate','MatFormField','MatDateRangePicker'],
 },
 'src/material/datepicker/testing/date-range-input-harness.spec.ts':{DateRangeInputHarnessTest:['MatNativeDateModule','MatDateRangeInput','MatStartDate','MatEndDate','MatDateRangePicker','FormsModule']},
 'src/material/form-field/testing/form-field-harness.spec.ts':{FormFieldHarnessTest:['ReactiveFormsModule','MatNativeDateModule','MatAutocomplete','MatAutocompleteTrigger','MatDatepicker','MatDatepickerInput','MatDateRangePicker','MatDateRangeInput','MatEndDate','MatError','MatFormField','MatHint','MatInput','MatLabel','MatPrefix','MatSelect','MatStartDate','MatSuffix']},
};
function checkStandaloneScopes(file,path){
 for(const [name,expected]of Object.entries(standaloneScopes[path])){
  const found=collect(file,n=>ts.isClassDeclaration(n)&&nodeName(n)===name);assert.equal(found.length,1);const decorators=ts.getDecorators(found[0]);assert.equal(decorators.length,1);const object=decorators[0].expression.arguments[0];assert.ok(ts.isObjectLiteralExpression(object));
  const props=new Map(object.properties.map(n=>[n.name?.getText(file),n.initializer]));assert.equal(props.get('standalone')?.kind,ts.SyntaxKind.TrueKeyword);const values=props.get('imports');if(expected===null)assert.equal(values,undefined);else {assert.ok(ts.isArrayLiteralExpression(values));assert.deepEqual(values.elements.map(n=>n.getText(file)),expected,'standalone scope dependencies changed');}
 }
}
export function analyzeThemeDateSemantics(subject){
 const index=THEME_DATE_SHAS.indexOf(subject.sha);assert.ok(index>=0);const rows=[];
 for(const member of subject.members){
  const before=member.before.text,after=member.after.text,old=parse(before),next=parse(after);
  if(index===0){
   assert.equal(before,'');assert.deepEqual(calls(next,'it').map(n=>n.arguments[0].text),['should emit all styles under the given selector','should only emit CSS variables']);assert.ok(after.includes('@use \'../../../../material-experimental/index\' as matx;')&&after.includes('$theme: matx.define-theme();'));
   assert.equal((after.match(/html \{ @include mat\.all-component-themes\(\$theme\); \}/g)||[]).length,2);assert.ok(after.includes("expect(selectors).toEqual(['html']);")&&after.includes("if (!decl.prop.startsWith('--'))")&&after.includes('expect(nonVarProps).toEqual([]);'));rows.push({path:member.path,kind:'added-M3-only-theme-shape-tests',added_lines:67,cases:2,owned_M2_output_cannot_be_assumed_variable_only:true,actual_Sass_executed:false});continue;
  }
  if(index===1){
   const tests=file=>calls(file,'it').filter(n=>n.arguments[0].text==='should compare times');assert.equal(tests(old).length,1);assert.equal(tests(next).length,1);const oldTest=tests(old)[0],newTest=tests(next)[0];assert.equal(before.replace(oldTest.getText(old),newTest.getText(next)),after,'change outside comparison case');
   const declarations=collect(newTest,ts.isVariableDeclaration);assert.equal(declarations.length,2);assert.equal(declarations[0].name.getText(next),'aDate');assert.equal(declarations[0].initializer.getText(next).replace(/\s/g,''),'[2024,JAN,1]asconst');assert.equal(declarations[1].name.getText(next),'bDate');assert.equal(declarations[1].initializer.getText(next).replace(/\s/g,''),'[2024,FEB,7]asconst');
   const comparisons=collect(newTest,n=>ts.isCallExpression(n)&&n.expression.getText(next)==='adapter.compareTime');assert.equal(comparisons.length,6);for(const call of comparisons){assert.equal(call.arguments.length,2);assert.ok(call.arguments[0].getText(next).includes('...aDate')&&call.arguments[1].getText(next).includes('...bDate'));}
   const normalized=(file,node)=>{const result=ts.transform(node,[context=>{const visit=n=>{if(ts.isVariableStatement(n)&&n.declarationList.declarations.every(d=>['base','aDate','bDate'].includes(d.name.getText(file))))return undefined;if(ts.isIdentifier(n)&&['aDate','bDate'].includes(n.text))return ts.factory.createIdentifier('base');return ts.visitEachChild(n,visit,context);};return n=>ts.visitNode(n,visit);}]);try{return shape(result.transformed[0]);}finally{result.dispose();}};assert.deepEqual(normalized(old,oldTest),normalized(next,newTest),'time/expectation or operation changed');rows.push({path:member.path,kind:'compareTime-date-independence-strengthening',existing_cases:1,comparisons:6,a_date:[2024,'JAN',1],b_date:[2024,'FEB',7],times_and_expected_relations_preserved:true,production_parser_or_adapter_changed:false});continue;
  }
  const mode=index===2?'standalone':'providers',excluded=index===2?standaloneImports:new Set([...nativeNames,'provideNativeDateAdapter']);assert.deepEqual(imports(old,excluded),imports(next,excluded),'unreviewed dependency identity change');assert.deepEqual(templates(old),templates(next),'fixture template changed');assert.deepEqual(normalizedProgram(old,mode,member.path),normalizedProgram(next,mode,member.path),'change outside reviewed fixture/provider setup');
  if(index===2){
   checkStandaloneScopes(next,member.path);
   rows.push({path:member.path,kind:'private-standalone-fixture-scope-migration',fixture_templates_preserved:templates(old).length,whole_program_equal_after_only_import_metadata_helper_argument_normalization:true,owned_legacy_module_fixtures_not_converted:true});
  }else{
   assert.ok(before.includes('MatNativeDateModule')&&!after.includes('MatNativeDateModule')&&!after.includes('NativeDateModule')&&after.includes('provideNativeDateAdapter()'));rows.push({path:member.path,kind:'private-native-date-module-to-provider-migration',fixture_templates_preserved:templates(old).length,assertions_operations_and_custom_provider_objects_preserved_by_normalization:true,provider_order_not_claimed_equivalent_for_arbitrary_overrides:true,call_site_helper_and_describe_name_changes_reviewed:member.path==='src/material/datepicker/datepicker.spec.ts'});
  }
 }return rows;
}
export function inspectThemeDatePublicPeers(read){
 const bytes=read('compatibility/rc/material-public-subjects.json');assert.equal(hash(bytes),'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3');const packet=JSON.parse(bytes),rows=[];
 for(const line of ['main','21.x']){
  const subject=packet.subjects.find(row=>row.line===line),version=subject.packages.find(row=>row.name==='@angular/material').version;assert.equal(version,line==='main'?'22.1.7':'21.2.14');
  const content=path=>{const member=subject.members.find(row=>row.package==='@angular/material'&&row.module_path===path);assert.ok(member);const stored=read(member.path);assert.equal(hash(stored),member.stored_sha256);const bytes=member.compression==='gzip'?gunzipSync(stored):stored;assert.equal(bytes.length,member.bytes);assert.equal(hash(bytes),member.sha256);return {member,file:parse(bytes.toString())};};
  const types=content('types/core.d.ts'),runtime=content('fesm2022/core.mjs');const module=collect(types.file,n=>ts.isClassDeclaration(n)&&nodeName(n)==='MatNativeDateModule'),provider=collect(types.file,n=>ts.isFunctionDeclaration(n)&&nodeName(n)==='provideNativeDateAdapter');assert.equal(module.length,1);assert.equal(provider.length,1);
  for(const node of [...module,...provider])assert.ok((node.jsDoc||[]).every(c=>!/@deprecated|@docs-private|@breaking-change/.test(c.getText(types.file))));
  const exports=types.file.statements.filter(ts.isExportDeclaration).flatMap(n=>n.exportClause&&ts.isNamedExports(n.exportClause)?n.exportClause.elements.map(e=>e.name.text):[]);assert.ok(exports.includes('MatNativeDateModule')&&exports.includes('provideNativeDateAdapter'));
  const actual=collect(runtime.file,n=>ts.isClassDeclaration(n)&&nodeName(n)==='MatNativeDateModule');assert.equal(actual.length,1);const injector=actual[0].members.filter(n=>nodeName(n)==='ɵinj');assert.equal(injector.length,1);assert.ok(injector[0].getText(runtime.file).includes('providers: [provideNativeDateAdapter()]'));
  const fn=collect(runtime.file,n=>ts.isFunctionDeclaration(n)&&nodeName(n)==='provideNativeDateAdapter');assert.equal(fn.length,1);assert.equal(fn[0].parameters[0].initializer.getText(runtime.file),'MAT_NATIVE_DATE_FORMATS');assert.ok(fn[0].body.getText(runtime.file).includes('provide: DateAdapter')&&fn[0].body.getText(runtime.file).includes('useClass: NativeDateAdapter')&&fn[0].body.getText(runtime.file).includes('provide: MAT_DATE_FORMATS')&&fn[0].body.getText(runtime.file).includes('useValue: formats'));
  rows.push({line,version,types:{path:types.member.path,sha256:types.member.stored_sha256,uncompressed_sha256:types.member.sha256},runtime:{path:runtime.member.path,sha256:runtime.member.stored_sha256,uncompressed_sha256:runtime.member.sha256},module_and_function_public_nondeprecated:true,module_metadata_uses_same_default_provider_factory:true,actual_DI_lifetime_browser_or_floor_executed:false});
 }return rows;
}
export function inspectThemeDateSources({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;assert.match(version,/^(21|22)\./);const line=version.startsWith('21.')?'21.x':'main';
 const [originals,acquisition]=Object.entries(THEME_DATE_CAPSULES[line]).map(([path,digest])=>{const bytes=read(path);assert.equal(hash(bytes),digest,'theme/date capsule changed');return JSON.parse(gunzipSync(bytes));});
 for(const packet of [originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects,THEME_DATE_SHAS);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256);}assert.deepEqual(originals.subjects.map(row=>row.sha),THEME_DATE_SHAS);assert.deepEqual(acquisition.subjects,THEME_DATE_SHAS);assert.equal(acquisition.private_temporary_object_view_removed,true);assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);
 const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));assert.equal(census.line,line);const subjects=originals.subjects.map(subject=>{const row=census.commits.find(row=>row.sha===subject.sha);assert.ok(row);assert.equal(row.raw_commit,subject.raw_commit);assert.deepEqual(row.complete_changed_files,subject.complete_changed_files);return {sha:subject.sha,subject:subject.subject,hunks:authenticateThemeDatePatch(subject),semantics:analyzeThemeDateSemantics(subject)};});
 const facade=read('projects/ngx-material-legacy/_index.scss').toString(),model=read('projects/ngx-material-legacy/styles/core/theming/_theming.scss').toString(),button=read('projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss').toString();assert.ok(facade.includes("@forward './styles/core/theming/theming' show")&&!/@(?:forward|use)\s+['"]@angular\/material/.test(facade)&&!facade.includes('m2-define-palette'));assert.ok(model.includes('@function define-palette(')&&model.includes('@function define-light-theme(')&&model.includes('@function define-dark-theme('));assert.ok(button.includes('background-color: theming.get-color-from-palette($primary)'));
 const coexist=read('scripts/check-m3-inclusion-order.mjs').toString(),render=read('scripts/m3-rendered-coexistence.mjs').toString();assert.ok(coexist.includes('legacy.define-palette(')&&render.includes("['current-only', 'legacy-only', 'current-then-legacy', 'legacy-then-current']")&&render.includes('unscopedLegacySharedSource'));
 const harness=read('projects/ngx-material-legacy/legacy-form-field/testing/form-field-harness.spec.ts').toString(),shared=read('testing/legacy-runner/shims/harness/form-field/shared.spec.ts').toString();assert.ok(harness.includes("import {MatNativeDateModule} from '@angular/material/core'")&&harness.includes('MatNativeDateModule,')&&harness.includes('MatLegacyFormFieldModule,')&&harness.includes('MatDatepickerModule,')&&harness.includes('isMdcImplementation: false'));assert.ok(shared.includes('declarations: [FormFieldHarnessTest]')&&shared.includes('...modules')&&shared.includes('[matDatepicker]="datepicker"')&&shared.includes('<mat-date-range-input [rangePicker]="rangePicker">'));
 let adapterForks=0;for(const path of candidateProductSourcePaths(root).filter(path=>path.endsWith('.ts')))adapterForks+=collect(parse(read(path).toString()),n=>ts.isClassDeclaration(n)&&['DateFnsAdapter','LuxonDateAdapter','MomentDateAdapter','NativeDateAdapter'].includes(nodeName(n))).length;assert.equal(adapterForks,0);
 return {schema_version:1,line,subjects,complete_original_files:22,complete_original_hunks:subjects.reduce((n,row)=>n+row.hunks.length,0),owned_boundaries:{finite_Material16_M2_facade_preserved:true,real_legacy_style_properties_preserved:true,native_M3_variable_only_contract_not_imposed:true,mixed_M2_M3_both_inclusion_orders_and_contamination_controls_retained:true,legacy_form_field_datepicker_harness_reachable:true,legacy_module_declaration_fixture_kept:true,public_date_adapter_forks:adapterForks,actual_mixed_theme_or_harness_runtime_executed:false},exact_public_peers:inspectThemeDatePublicPeers(read),product_changes:0,actual_Angular_Sass_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectThemeDateSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,subjects:undefined}));
}
