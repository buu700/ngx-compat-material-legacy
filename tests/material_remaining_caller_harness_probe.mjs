/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine SDK harnesses and unchanged owned graph; explicit public test ports. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const requested=process.argv.includes('--subject')?process.argv[process.argv.indexOf('--subject')+1]:null;
const reportPath=process.argv.includes('--report')?process.argv[process.argv.indexOf('--report')+1]:null;
const ledgers=['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json','compatibility/f10/disposition-ledger/ledger.json'];
const before=ledgers.map(path=>hash(readFileSync(join(root,path))));
const {prepareMaterialRemainingPublicSubjects}=await import(pathToFileURL(join(root,'scripts/material-remaining-caller-public-subjects.mjs')));
const {materialRemainingCallerSource}=await import(pathToFileURL(join(root,'scripts/material-remaining-caller-contracts.mjs')));
const {componentConfigGraph}=await import(pathToFileURL(join(root,'scripts/component-config-caller-contracts.mjs')));
const {cdkModuleTypePublicRoute:route}=await import(pathToFileURL(join(root,'scripts/cdk-module-type-public-subjects.mjs')));
const source=materialRemainingCallerSource({root}),subject=requested??source.prior.line;
const loaded=prepareMaterialRemainingPublicSubjects(root);
try {
 const model=loaded.models.find(m=>m.line===subject);assert.ok(model);
 const sdk=spec=>import(pathToFileURL(join(model.root,'node_modules',route(model,spec,'runtime').key)));
 await sdk('@angular/compiler');
 const date=await sdk('@angular/material/datepicker/testing');
 let Field,List,sourceCount=0,emittedPath=null;
 if(subject==='original'){({MatLegacyFormFieldHarness:Field}=await sdk('@angular/material/legacy-form-field/testing'));({MatLegacyListHarness:List}=await sdk('@angular/material/legacy-list/testing'));}
 else {
  const current=materialRemainingCallerSource(),graph=componentConfigGraph({selected:current.prior.selected}),edges=new Map(graph.edges.map(e=>[JSON.stringify([e.from,e.specifier]),e.to]));
  const owned=join(model.root,'owned'),output=join(model.root,'compiled'),dest=p=>join(output,p.replace(/\.ts$/,'.mjs'));
  for(const[path,text]of current.sources){const file=join(owned,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,text,{flag:'wx'});}
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,strict:true,strictPropertyInitialization:false,noImplicitOverride:true,skipLibCheck:false,types:[],rootDir:owned,outDir:output,noEmitOnError:true,paths:Object.fromEntries([...graph.routes].map(([spec,path])=>[spec,[join(owned,path)]]))};
  const program=ts.createProgram(current.prior.sources.map(m=>join(owned,m.path)),options),diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=>String.fromCharCode(10)}));
  const emitted=program.emit(undefined,(file,text)=>{assert.ok(file.startsWith(output+'/'));const target=file.replace(/\.js$/,'.mjs');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,text,{flag:'wx'});},undefined,false,{after:[context=>file=>{
   const path=file.fileName.slice(owned.length+1);
   return ts.visitEachChild(file,node=>{
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
     const spec=node.moduleSpecifier.text,target=edges.get(JSON.stringify([path,spec]));
     if(target){const literal=ts.factory.createStringLiteral(pathToFileURL(dest(target)).href);return ts.isImportDeclaration(node)?ts.factory.updateImportDeclaration(node,node.modifiers,node.importClause,literal,node.attributes):ts.factory.updateExportDeclaration(node,node.modifiers,node.isTypeOnly,node.exportClause,literal,node.attributes);}
    }
    return node;
   },context);
  }]});
  assert.equal(emitted.emitSkipped,false);assert.equal(emitted.diagnostics.length,0);
  sourceCount=current.sources.size;emittedPath=dest;
  ({MatLegacyFormFieldHarness:Field}=await import(pathToFileURL(dest('projects/ngx-material-legacy/legacy-form-field/testing/form-field-harness.ts'))));
  ({MatLegacyListHarnessBase:List}=await import(pathToFileURL(dest('projects/ngx-material-legacy/legacy-list/testing/list-harness-base.ts'))));
 }
 async function observe(Field,List){
 const testing=await sdk('@angular/cdk/testing'),{MatDividerHarness:Divider}=await sdk('@angular/material/divider/testing');
 const observations=[];
 function host({properties={},attributes={},classes=[],text='',selectors=[]}={}){
  const calls=[];
  return {calls,async getProperty(name){calls.push(['property',name]);return properties[name];},async getAttribute(name){calls.push(['attribute',name]);return attributes[name]??null;},async hasClass(name){return classes.includes(name);},async text(){return text;},async matchesSelector(selector){return selectors.includes(selector);}};
 }
 function factory(rootElement,resolve=async()=>[]){
  const f={rootElement,documentRootLocatorFactory(){return f;},locatorForAll(...queries){return ()=>resolve(queries);},locatorForOptional(...queries){return async()=>(await resolve(queries))[0]??null;},locatorFor(...queries){return async()=>{const found=(await resolve(queries))[0];assert.ok(found,'required protocol locator absent');return found;};},async forceStabilize(){},async waitForTasksOutsideAngular(){}};return f;
 }
 async function queryFilter(queries,candidates){
  const matches=[];
  for(const candidate of candidates){for(const query of queries){if(typeof query==='string')continue;const Type=query.harnessType??query;if(candidate instanceof Type&&(!query.harnessType||await query.evaluate(candidate))){matches.push(candidate);break;}}}return matches;
 }
 function field(candidates){return new Field(factory(host(),queries=>queryFilter(queries,candidates)));}
 for(const [id,disabled,attributes]of [['plain-enabled',false,{}],['native-only-disabled',true,{}],['false-attribute-disabled',true,{disabled:'false'}],['aria-only',false,{'aria-disabled':'true'}],['ordinary-disabled',true,{disabled:''}]]){
  const element=host({properties:{disabled,value:'Oct 26'},attributes,selectors:['.picker']}),picker=new date.MatDatepickerInputHarness(factory(element)),control=await field([picker]).getControl();
  assert.equal(control,picker);observations.push({id,returned_genuine_DatepickerInputHarness:control instanceof date.MatDatepickerInputHarness,isDisabled:await control.isDisabled(),calls:element.calls});
 }
 function range({startDisabled=false,endDisabled=false,start='Oct 26',end='Oct 30',required=false,open=false}={}){
  const startHost=host({properties:{disabled:startDisabled,value:start},attributes:{...(open?{'aria-owns':'calendar'}:{}),'aria-disabled':'true'},selectors:['.start']});
  const endHost=host({properties:{disabled:endDisabled,value:end},attributes:{disabled:'false'},selectors:['.end']});
  const first=new date.MatStartDateHarness(factory(startHost)),last=new date.MatEndDateHarness(factory(endHost));
  const value=new date.MatDateRangeInputHarness(factory(host({classes:required?['mat-date-range-input-required']:[],selectors:['.range']}),async queries=>{
   const found=await queryFilter(queries,[first,last]);if(queries.includes('.mat-date-range-input-separator'))found.push(host({text:'–'}));return found;
  }));return {value,first,last,startHost,endHost};
 }
 for(const [startDisabled,endDisabled]of [[false,false],[false,true],[true,false],[true,true]]){
  const r=range({startDisabled,endDisabled}),control=await field([r.value]).getControl();assert.equal(control,r.value);
  observations.push({id:`range-disabled-${startDisabled}-${endDisabled}`,returned_genuine_DateRangeInputHarness:control instanceof date.MatDateRangeInputHarness,start_identity:await control.getStartInput()===r.first,end_identity:await control.getEndInput()===r.last,isDisabled:await control.isDisabled(),start_calls:r.startHost.calls,end_calls:r.endHost.calls});
 }
 for(const options of [{},{end:''},{start:''},{start:'',end:''},{required:true,open:true}]){
  const r=range(options);observations.push({id:'range-values-'+JSON.stringify(options),value:await r.value.getValue(),separator:await r.value.getSeparator(),required:await r.value.isRequired(),calendar_open:await r.value.isCalendarOpen()});
 }
 {
  const picker=new date.MatDatepickerInputHarness(factory(host({properties:{value:'Oct 26'},selectors:['.picker']}))),r=range(),outer=field([r.value,picker]);
  for(const [id,query,expected]of [['picker-constructor',date.MatDatepickerInputHarness,picker],['range-constructor',date.MatDateRangeInputHarness,r.value],['picker-predicate',date.MatDatepickerInputHarness.with({value:'Oct 26',selector:'.picker'}),picker],['range-predicate',date.MatDateRangeInputHarness.with({value:/Oct 26.*Oct 30/,selector:'.range'}),r.value],['picker-value-miss',date.MatDatepickerInputHarness.with({value:'absent'}),null],['range-selector-miss',date.MatDateRangeInputHarness.with({selector:'.absent'}),null]]){
   observations.push({id,matched_expected_identity:await outer.getControl(query)===expected});assert.equal(await outer.getControl(query),expected);
  }
  observations.push({id:'datepicker-priority-over-range',matched_expected_identity:await outer.getControl()===picker});
  observations.push({id:'no-control',is_null:await field([]).getControl()===null});
 }
 class Item extends testing.ComponentHarness{
  static hostSelector='.protocol-item';
  static with(options={}){return new testing.HarnessPredicate(Item,options).addOption('text',options.text,(harness,text)=>testing.HarnessPredicate.stringMatches(harness.getText(),text));}
  async getText(){return(await this.host()).text();}
 }
 class TestList extends List{constructor(locator){super(locator);this._itemHarness=Item;}}
 async function list(records){
  const instances=new Map();
  return new TestList(factory(host(),async queries=>{
   const found=[];
   for(const record of records){for(const query of queries){const Type=query.harnessType??query;assert.equal(typeof Type,'function');
    const kind=Type===Item?'item':Type===Divider?'divider':Type.hostSelector==='.mat-subheader'?'subheader':null;assert.ok(kind,'unrecognized real harness query');if(kind!==record.kind)continue;
    let perType=instances.get(record);if(!perType)instances.set(record,perType=new Map());
    if(!perType.has(Type))perType.set(Type,new Type(factory(host({text:record.text,selectors:record.selectors??[],classes:record.classes??[]}))));
    const value=perType.get(Type);if(!query.harnessType||await query.evaluate(value)){found.push(value);break;}
   }}return found;
  }));
 }
 const item=text=>({kind:'item',text}),header=text=>({kind:'subheader',text}),divider=(selected=false)=>({kind:'divider',text:'',selectors:selected?['.selected']:[]});
 for(const [id,records]of [['empty',[]],['plain',[item('a'),item('b')]],['middle-divider',[item('a'),divider(),item('b')]],['edge-and-adjacent-dividers',[divider(),item('a'),divider(),divider(),item('b'),divider()]],['headers-and-dividers',[item('a'),header('First'),item('b'),divider(),header('Empty'),header('Last'),item('c')]]]){
  const actual=await list(records),all=await actual.getItemsWithSubheadersAndDividers();
  observations.push({id:'list-'+id,ordered_types:all.map(value=>value instanceof Divider?'divider':value instanceof Item?'item':'subheader'),divider_instances:all.filter(value=>value instanceof Divider).length,grouped_dividers:await Promise.all((await actual.getItemsGroupedByDividers()).map(group=>Promise.all(group.map(value=>value.getText())))),grouped_subheaders:await Promise.all((await actual.getItemsGroupedBySubheader()).map(async group=>({...(group.heading===undefined?{}:{heading:group.heading}),items:await Promise.all(group.items.map(value=>value.getText()))})))});
 }
 {
  const actual=await list([item('a'),divider(true),item('b'),divider(),header('Heading')]);
  observations.push({id:'list-filtered-divider',count:(await actual.getItemsWithSubheadersAndDividers({item:false,subheader:false,divider:{selector:'.selected'}})).length});
  observations.push({id:'list-all-excluded',count:(await actual.getItemsWithSubheadersAndDividers({item:false,subheader:false,divider:false})).length});
  observations.push({id:'list-filtered-item',items:await Promise.all((await actual.getItems({text:'b'})).map(value=>value.getText()))});
 }
 return observations;
 }

 const originalModel=loaded.models.find(model=>model.line==='original');
 const originalSdk=spec=>import(pathToFileURL(join(originalModel.root,'node_modules',route(originalModel,spec,'runtime').key)));
 await originalSdk('@angular/compiler');
 const originalDate=await originalSdk('@angular/material/datepicker/testing');
 const originalDivider=await originalSdk('@angular/material/divider/testing');
 const originalField=await originalSdk('@angular/material/legacy-form-field/testing');
 const selectorFacts=(field,date,divider)=>({field:field.hostSelector,datepicker:date.MatDatepickerInputHarness.hostSelector,
  range:date.MatDateRangeInputHarness.hostSelector,start:date.MatStartDateHarness.hostSelector,
  end:date.MatEndDateHarness.hostSelector,divider:divider.MatDividerHarness.hostSelector});
 const selectors=selectorFacts(Field,date,await sdk('@angular/material/divider/testing'));
 assert.deepEqual(selectors,selectorFacts(originalField.MatLegacyFormFieldHarness,originalDate,originalDivider));
 const observations=await observe(Field,List);
 const oraclePath='compatibility/rc/material-remaining-caller-harness-tagged16.json',oracleBytes=readFileSync(join(root,oraclePath));
 assert.equal(hash(oracleBytes),'5e8a144f0f1eeca23b6a5363353ccd2eb7127397ba729f3022b7a12718c185bf','tagged harness observations changed');
 const oracle=JSON.parse(oracleBytes);assert.equal(oracle.subject,'original');assert.equal(oracle.observations.length,30);
 assert.deepEqual(observations,oracle.observations,'actual harness behavior differs from untouched16');
 const faults=[];
 if(emittedPath){
  const base=emittedPath('projects/ngx-material-legacy/legacy-form-field/testing/form-field-harness-base.ts');
  const field=emittedPath('projects/ngx-material-legacy/legacy-form-field/testing/form-field-harness.ts');
  const list=emittedPath('projects/ngx-material-legacy/legacy-list/testing/list-harness-base.ts');
  const variants=[
   {id:'range-before-datepicker',path:base,from:'return datepickerInput || dateRangeInput || select || input;',to:'return dateRangeInput || datepickerInput || select || input;'},
   {id:'ignore-explicit-control-query',path:base,from:'if (type)',to:'if (false)'},
   {id:'divider-query-omitted',path:list,from:'if (filters.divider !== false)',to:'if (false)'},
   {id:'overbroad-divider-instanceof',path:list,from:'itemOrDivider instanceof MatDividerHarness',to:'itemOrDivider instanceof ComponentHarness'},
   {id:'drop-initial-empty-divider-group',path:list,from:'const listSections = [[]];',to:'const listSections = [];'},
   {id:'range-control-omitted',path:field,from:'this.locatorForOptional(MatDateRangeInputHarness)',to:'(() => Promise.resolve(null))'},
  ];
  for(const [index,variant]of variants.entries()){
   const original=readFileSync(variant.path,'utf8');assert.equal(original.split(variant.from).length,2,'fault target absent/ambiguous: '+variant.id);
   const changed=original.replace(variant.from,variant.to),dest=variant.path.replace(/\.mjs$/,'.fault-'+index+'.mjs');
   writeFileSync(dest,changed,{flag:'wx'});let SubjectList=List,SubjectField=Field;
   if(variant.path===list)({MatLegacyListHarnessBase:SubjectList}=await import(pathToFileURL(dest)));
   else{
    let fieldDest=dest;
    if(variant.path===base){fieldDest=field.replace(/\.mjs$/,'.fault-'+index+'.mjs');const text=readFileSync(field,'utf8'),from=JSON.stringify(pathToFileURL(base).href);assert.equal(text.split(from).length,2);writeFileSync(fieldDest,text.replace(from,JSON.stringify(pathToFileURL(dest).href)),{flag:'wx'});}
    ({MatLegacyFormFieldHarness:SubjectField}=await import(pathToFileURL(fieldDest)));
   }
   let rejected=false;
   try{assert.deepEqual(await observe(SubjectField,SubjectList),oracle.observations);}catch(error){rejected=true;assert.ok(error instanceof Error);}
   assert.equal(rejected,true,'behavior fault escaped: '+variant.id);faults.push({id:variant.id,rejected:true,emitted_fault_sha256:hash(changed)});
  }
 }
 assert.deepEqual(ledgers.map(path=>hash(readFileSync(join(root,path)))),before);
 const report={schema_version:1,subject,node:process.version,typescript:ts.version,
  source:source.ref,SDK:loaded.material_remaining_capsule,tagged_oracle:{path:oraclePath,sha256:hash(oracleBytes)},
  actual_owned_harness_source_files:sourceCount,genuine_public_SDK_classes:true,
  explicit_TestElement_LocatorFactory_protocol:true,generic_list_item_is_fixture:true,
  observations,consumed_host_selectors:selectors,behavior_faults:faults,canonical_ledgers_unchanged:true,product_changes:0,
  source_closures:0,native_or_packed:false,actual_Angular_view_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};
 if(reportPath)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({subject,cases:observations.length,source_files:sourceCount,behavior_faults_rejected:faults.length,source_closures:0}));
}finally{loaded.dispose();}
