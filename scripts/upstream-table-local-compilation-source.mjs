/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One complete source review; importing this module runs no CLI or compiler. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import ts from 'typescript';

export const TABLE_LOCAL_COMPILATION_SHA='3f35b12290ea4dbee4a9d82845c0964b2b4df50d';
export const TABLE_LOCAL_COMPILATION_PREFIX='compatibility/rc/21x-table-local-compilation-source-';
const PREFIX=TABLE_LOCAL_COMPILATION_PREFIX,SELF='scripts/upstream-table-local-compilation-source.mjs';
const image=readFileSync(fileURLToPath(import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const gitHash=(type,raw)=>createHash('sha1').update(type+' '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
const ORIGINAL={path:PREFIX+'originals.json.gz',sha256:'014157272208f6bf74e690f0d32684328b7efded3141d653037c7ac2a65ef137'};
const CENSUS={path:'compatibility/rc/upstream-complete-patch-census.json.gz',sha256:'806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'};
const CURRENT={path:PREFIX+'current.json',sha256:'e6746247cfbc087ca360e78ee950f9770f3f5ea444f9ec455c3c6fceb56ab0cb'};
const COMPILER={path:PREFIX+'compiler.json',sha256:'e2d915d5596015ade4ac95f83bf7071549dd9a3364db8315d2c3d17c518393eb'};
const CONTROLS={path:PREFIX+'compiler-controls.json',sha256:'f141692ed853a4def772a2ab2549e2709d5ee039837339dcadde2fa977b66364'};
const TAG='df60e733c60e572ba538f6ad0ceff3e63e527b53';
const ROW='projects/ngx-material-legacy/legacy-table/row.ts';
const TABLE='projects/ngx-material-legacy/legacy-table/table.ts';
const FAMILY='projects/ngx-material-legacy/legacy-table';
const ROWS=['MatLegacyHeaderRow','MatLegacyFooterRow','MatLegacyRow'];
const TAGGED_PATHS=['src/material/legacy-table/row.ts','src/material/legacy-table/table.ts','src/material/legacy-table/table-module.ts','src/material/legacy-table/cell.ts','src/material/legacy-table/table.scss','src/material/legacy-table/public-api.ts','src/cdk/table/row.ts','src/cdk/table/table.ts','src/cdk/table/table-module.ts','src/cdk/table/public-api.ts','tools/public_api_guard/material/legacy-table.md'];
const JUDGMENTS=[
  ['Removes only the ordinary current Material row import of the CDK template constant. The retained legacy rows still use the public peer constant; the actual installed21.2.14 declaration contains the exact historical literal and its previously reviewed public boundary remains unchanged.',
   'Introduces a same-file constant with the byte-identical historical cell outlet. This is a compiler source-location adaptation, not permission to copy current row classes, MDC hosts or a private cell-outlet implementation.',
   'Changes only the current header-row template reference. The owned legacy header selector,mat-header-row host class,role,provider,exportAs and encapsulation match the tagged legacy component; its existing imported template compiles in both measured modes.',
   'Changes only the current footer-row template reference. Preserve the distinct legacy footer class/provider/exportAs; the measured current imported and same-file template variants emit identical component definitions.',
   'Changes only the current data-row template reference. Preserve the legacy mat-row class,public CdkRow parent and provider. Both measured variants compile and have identical generated public declarations; no source/API/style repair is justified by this hunk.'],
  ['Removes CDK_TABLE_TEMPLATE from the ordinary current Material table import. The owned legacy table already has no such import and uses a source-local template; historical removed scheduler/repeater providers are not restored.',
   'Inlines the historical caption/column-group/four-outlet template for the ordinary MDC table. The retained table already inlines caption-first projection and separately owned native/flex outlets. Copying this six-outlet markup would discard the reviewed native row groups and owned outlet protocol; retain the existing table template and providers.'],
];

const parse=(name,body)=>ts.createSourceFile(name,body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
function classNode(sf,name){const found=sf.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.equal(found.length,1,name);return found[0];}
function expressionValue(node,sf){
  if(ts.isStringLiteralLike(node))return node.text;
  if(ts.isIdentifier(node)||ts.isPropertyAccessExpression(node))return {expression:node.getText(sf)};
  if(node.kind===ts.SyntaxKind.FalseKeyword)return false;
  if(node.kind===ts.SyntaxKind.TrueKeyword)return true;
  if(node.kind===ts.SyntaxKind.NullKeyword)return null;
  if(ts.isArrayLiteralExpression(node))return node.elements.map(n=>expressionValue(n,sf));
  if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(n=>{
    assert.ok(ts.isPropertyAssignment(n));return[n.name.text??n.name.getText(sf),expressionValue(n.initializer,sf)];
  }));
  assert.fail('Unexpected metadata expression '+node.getText(sf));
}
function metadata(sf,name,decorator){
  const node=classNode(sf,name),calls=(ts.getDecorators(node)??[]).map(d=>d.expression).filter(n=>ts.isCallExpression(n)&&n.expression.getText(sf)===decorator);
  assert.equal(calls.length,1);assert.equal(calls[0].arguments.length,1);
  return {node,value:expressionValue(calls[0].arguments[0],sf)};
}
function constant(sf,name){
  const found=[];for(const node of sf.statements)if(ts.isVariableStatement(node))for(const d of node.declarationList.declarations)if(d.name.getText(sf)===name)found.push(d);
  assert.equal(found.length,1,name);assert.ok(found[0].initializer&&ts.isStringLiteralLike(found[0].initializer));return found[0].initializer.text;
}
function blob(member){assert.equal(Buffer.byteLength(member.body),member.bytes);assert.equal(hash(member.body),member.sha256);assert.equal(gitHash('blob',member.body),member.blob);}

/** Authenticate every changed file through both raw trees, and replay all seven hunks. */
export function verifyTableLocalCompilationOriginal(original,census){
  assert.equal(original.sha,TABLE_LOCAL_COMPILATION_SHA);assert.equal(original.original_files,2);assert.equal(original.original_hunks,7);
  assert.equal(census.commits.length,1697);assert.equal(new Set(census.commits.map(r=>r.sha)).size,1697);
  const row=census.commits.find(r=>r.sha===TABLE_LOCAL_COMPILATION_SHA);assert.ok(row);
  const commit=original.original_commit,parent=original.parent_commit,tag=original.tagged_reference;
  for(const c of [commit,parent,tag.commit]){
    assert.equal(gitHash('commit',c.raw),c.sha);assert.equal(hash(c.raw),c.sha256);
    const headers=c.raw.split('\n\n')[0].split('\n');assert.equal(headers.find(s=>s.startsWith('tree '))?.slice(5),c.tree);
    assert.deepEqual(headers.filter(s=>s.startsWith('parent ')).map(s=>s.slice(7)),c.parents);
  }
  assert.equal(commit.sha,TABLE_LOCAL_COMPILATION_SHA);assert.equal(commit.raw,row.raw_commit);
  assert.deepEqual(commit.parents,[parent.sha]);assert.deepEqual(row.parents,commit.parents);assert.equal(tag.tag,'16.2.14');assert.equal(tag.commit.sha,TAG);
  const trees=new Map();for(const entry of original.tree_objects){
    const raw=Buffer.from(entry.raw_base64,'base64');assert.equal(hash(raw),entry.sha256);assert.equal(gitHash('tree',raw),entry.sha);assert.equal(trees.has(entry.sha),false);
    const members=new Map();let at=0;while(at<raw.length){
      const space=raw.indexOf(32,at),end=raw.indexOf(0,space+1);assert.ok(space>at&&end>space&&end+21<=raw.length);
      const name=raw.subarray(space+1,end).toString();assert.equal(members.has(name),false);members.set(name,{mode:raw.subarray(at,space).toString(),sha:raw.subarray(end+1,end+21).toString('hex')});at=end+21;
    }trees.set(entry.sha,members);
  }
  function tree(sha){assert.ok(trees.has(sha),'missing authenticated tree '+sha);return trees.get(sha);}
  function lookup(c,path){let current=c.tree,value;for(const [i,part]of path.split('/').entries()){
    value=tree(current).get(part);assert.ok(value);if(i<path.split('/').length-1){assert.equal(value.mode,'40000');current=value.sha;}
  }return value;}
  function delta(a,b,prefix=''){
    if(a===b)return[];const before=a?tree(a):new Map(),after=b?tree(b):new Map(),out=[];
    for(const name of [...new Set([...before.keys(),...after.keys()])].sort()){
      const x=before.get(name),y=after.get(name);if(x?.mode===y?.mode&&x?.sha===y?.sha)continue;
      if(x?.mode==='40000'||y?.mode==='40000'){
        assert.ok(!x||x.mode==='40000');assert.ok(!y||y.mode==='40000');out.push(...delta(x?.sha,y?.sha,prefix+name+'/'));
      }else out.push({path:prefix+name,status:x&&y?'M':y?'A':'D',before_mode:x?.mode??'000000',after_mode:y?.mode??'000000',before_blob:x?.sha??'0'.repeat(40),after_blob:y?.sha??'0'.repeat(40)});
    }return out;
  }
  const changed=delta(parent.tree,commit.tree);assert.deepEqual(changed,row.complete_changed_files);assert.deepEqual(changed,original.complete_changed_files);
  assert.deepEqual(changed.map(r=>r.path),['src/material/table/row.ts','src/material/table/table.ts']);
  assert.equal(original.diff,original.sections.map(s=>s.patch).join(''));assert.equal(hash(original.diff),'1e71aa817057896402ff67e9b11b7878983f0f7709cd056a47b81a219871ad81');assert.equal(original.diff_sha256,hash(original.diff));
  const hunkReviews=[];
  for(const [sectionIndex,section]of original.sections.entries()){
    const identity=Object.fromEntries(Object.keys(changed[sectionIndex]).map(key=>[key,section[key]]));assert.deepEqual(identity,changed[sectionIndex]);
    for(const [side,c]of [['before',parent],['after',commit]]){blob(section[side]);assert.equal(section[side].path,section.path);assert.deepEqual(lookup(c,section.path),{mode:section[side+'_mode'],sha:section[side].blob});}
    assert.equal(hash(section.patch),section.patch_sha256);assert.ok(section.patch.startsWith('diff --git a/'+section.path+' b/'+section.path+'\n'));
    const before=section.before.body.split('\n');assert.equal(before.pop(),'');const out=[],starts=[...section.patch.matchAll(/^@@ .*$/gm)];let cursor=0;
    assert.equal(starts.length,section.hunks.length);assert.equal(starts.length,JUDGMENTS[sectionIndex].length);
    for(const [i,start]of starts.entries()){
      const text=section.patch.slice(start.index,starts[i+1]?.index??section.patch.length),lines=text.split('\n');assert.equal(lines.pop(),'');
      const header=lines.shift(),range=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/.exec(header);assert.ok(range);
      const oldCount=Number(range[2]??1),newCount=Number(range[4]??1),oldStart=Number(range[1])-(oldCount?1:0),newStart=Number(range[3])-(newCount?1:0);
      assert.ok(oldStart>=cursor&&oldStart<=before.length);out.push(...before.slice(cursor,oldStart));cursor=oldStart;assert.equal(out.length,newStart);let old=0,next=0;
      for(const line of lines){assert.ok([' ','-','+'].includes(line[0]));if(line[0]!=='+'){assert.equal(before[cursor++],line.slice(1));old++;}if(line[0]!=='-'){out.push(line.slice(1));next++;}}
      assert.equal(old,oldCount);assert.equal(next,newCount);assert.deepEqual(section.hunks[i],{index:i+1,header,text,sha256:hash(text)});
      hunkReviews.push({path:section.path,index:i+1,header,sha256:hash(text),technical_judgment:JUDGMENTS[sectionIndex][i]});
    }out.push(...before.slice(cursor));assert.equal(out.join('\n')+'\n',section.after.body);
  }
  assert.equal(hunkReviews.length,7);assert.deepEqual(tag.members.map(m=>m.path),TAGGED_PATHS);
  for(const member of tag.members){blob(member);assert.deepEqual(lookup(tag.commit,member.path),{mode:'100644',sha:member.blob});}
  assert.deepEqual(original.capture_policy,{existing_cache_only:true,lazy_fetch:false,Git_replace_objects:false,shared_cache_modified:false,network_fetches:0,upstream_code_executed:false,credentials_used:false});
  const historicalRowTemplate=constant(parse('tagged-cdk-row.ts',tag.members.find(m=>m.path==='src/cdk/table/row.ts').body),'CDK_ROW_TEMPLATE');
  assert.equal(historicalRowTemplate,constant(parse('original-current-row.ts',original.sections[0].after.body),'ROW_TEMPLATE'));
  return {original_files:2,original_hunks:7,exact_patch_replays:2,tagged_members:11,authenticated_tree_objects:trees.size,historical_row_template:historicalRowTemplate,hunk_reviews:hunkReviews};
}

/** Compare complete generated component initializers rather than output markers alone. */
export function verifyTableLocalCompilationCompiler(compiler,controls,ownedSource,original){
  assert.equal(compiler.line,'21.x');assert.equal(compiler.node,'v24.21.0');assert.deepEqual(compiler.exact_extracted_classes,ROWS);
  assert.equal(compiler.owned_row_source.path,ROW);assert.equal(compiler.owned_row_source.sha256,hash(ownedSource));assert.equal(compiler.owned_row_source.bytes,Buffer.byteLength(ownedSource));
  assert.deepEqual(compiler.packages.map(p=>[p.name,p.version]),[['@angular/compiler-cli','21.2.23'],['@angular/compiler','21.2.23'],['@angular/core','21.2.23'],['@angular/cdk','21.2.14'],['typescript','5.9.2']]);
  const rowTemplate=constant(parse('tagged-row.ts',original.tagged_reference.members.find(m=>m.path==='src/cdk/table/row.ts').body),'CDK_ROW_TEMPLATE');assert.equal(compiler.row_template,rowTemplate);
  assert.deepEqual(compiler.cells.map(c=>[c.mode,c.variant]),[['partial','before'],['partial','after'],['experimental-local','before'],['experimental-local','after']]);
  assert.deepEqual(controls.cells.map(c=>[c.mode,c.variant]),[['partial','cross-file-source-control'],['experimental-local','cross-file-source-control']]);
  assert.deepEqual(controls.packages,compiler.packages);assert.deepEqual(controls.compiler_entry,compiler.compiler_entry);
  assert.equal(controls.prior_compiler.path,COMPILER.path);assert.equal(controls.prior_compiler.sha256,COMPILER.sha256);
  const owned=parse(ROW,ownedSource),declarations=ROWS.map(name=>classNode(owned,name).getText(owned)).join('\n\n');
  const imports="import {Component,ChangeDetectionStrategy,ViewEncapsulation,NgModule} from '@angular/core';\nimport {CDK_ROW_TEMPLATE,CdkHeaderRow,CdkFooterRow,CdkRow,CdkTableModule} from '@angular/cdk/table';\n";
  const moduleDeclaration='\n@NgModule({imports:[CdkTableModule],declarations:['+ROWS.join(',')+'],exports:['+ROWS.join(',')+']})\nexport class ExtractedLegacyRowModule {}\n';
  const before=imports+'\n'+declarations+moduleDeclaration;
  const after=imports.replace('CDK_ROW_TEMPLATE,','')+'\nconst ROW_TEMPLATE = '+JSON.stringify(rowTemplate)+';\n\n'+declarations.replaceAll('template: CDK_ROW_TEMPLATE','template: ROW_TEMPLATE')+moduleDeclaration;
  const definitions=[];
  for(const cell of [...compiler.cells,...controls.cells]){
    assert.equal(cell.exit_code,0);assert.equal(cell.stdout,'');assert.equal(cell.stderr,'');assert.equal(cell.strictTemplates,true);
    assert.equal(cell.config.angularCompilerOptions.compilationMode,cell.mode);assert.equal(cell.config.angularCompilerOptions.strictTemplates,true);assert.equal(cell.config.compilerOptions.strict,true);assert.equal(cell.config.compilerOptions.skipLibCheck,false);
    const fixture=cell.variant==='before'?before:cell.variant==='after'?after:before.replace('CDK_ROW_TEMPLATE,CdkHeaderRow','CdkHeaderRow')+"\nimport {ROW_TEMPLATE as CDK_ROW_TEMPLATE} from './template-source';\n";
    assert.equal(cell.fixture,fixture);assert.equal(cell.fixture_sha256,hash(fixture));
    if(cell.variant==='cross-file-source-control'){assert.equal(cell.template_source,'export const ROW_TEMPLATE = '+JSON.stringify(rowTemplate)+';\n');assert.equal(cell.template_source_sha256,hash(cell.template_source));}
    assert.deepEqual(cell.outputs.map(o=>o.path).sort(),cell.variant==='cross-file-source-control'?['out/rows.d.ts','out/rows.js','out/template-source.d.ts','out/template-source.js']:['out/rows.d.ts','out/rows.js']);
    for(const output of cell.outputs){assert.equal(hash(output.body),output.sha256);assert.equal(Buffer.byteLength(output.body),output.bytes);}
    const js=parse('rows.js',cell.outputs.find(o=>o.path==='out/rows.js').body),dt=cell.outputs.find(o=>o.path==='out/rows.d.ts').body;
    const components=ROWS.map(name=>{
      const node=classNode(js,name),cmp=node.members.filter(n=>n.name?.getText(js)==='ɵcmp');assert.equal(cmp.length,1);
      assert.ok(ts.isPropertyDeclaration(cmp[0])&&ts.isCallExpression(cmp[0].initializer));const call=cmp[0].initializer;
      assert.equal(call.expression.getText(js),cell.mode==='partial'?'i0.ɵɵngDeclareComponent':'i0.ɵɵdefineComponent');
      const fields=call.arguments[0];assert.ok(ts.isObjectLiteralExpression(fields));
      const field=name=>fields.properties.find(n=>ts.isPropertyAssignment(n)&&n.name.getText(js)===name)?.initializer;
      if(cell.mode==='partial'){
        assert.equal(field('template').text,rowTemplate);assert.equal(field('isInline').kind,ts.SyntaxKind.TrueKeyword);
        const dependency=field('dependencies').getText(js);assert.ok(dependency.includes('i1.CdkCellOutlet'));assert.ok(dependency.includes('[cdkCellOutlet]'));
      }else{
        assert.equal(field('decls').getText(js),'1');assert.equal(field('vars').getText(js),'0');
        assert.deepEqual(expressionValue(field('consts'),js),[['cdkCellOutlet','']]);
        assert.equal(field('dependencies').getText(js),'i0.ɵɵgetComponentDepsFactory('+name+')');
        assert.equal(field('template').getText(js).includes('i0.ɵɵelementContainer(0, 0)'),true);
      }
      return {name,initializer:call.getText(js),sha256:hash(call.getText(js))};
    });definitions.push({mode:cell.mode,variant:cell.variant,declaration_sha256:hash(dt),components});
  }
  for(const mode of ['partial','experimental-local']){
    const selected=definitions.filter(d=>d.mode===mode);assert.equal(selected.length,3);
    for(const current of selected.slice(1)){assert.equal(current.declaration_sha256,selected[0].declaration_sha256);assert.deepEqual(current.components,selected[0].components);}
  }
  return {actual_small_compiler_cells:6,compilation_modes:['partial','experimental-local'],strict_template_cells:6,exact_extracted_components_per_cell:3,generated_component_definitions_compared:18,identical_before_after_and_cross_file_component_definitions:true,identical_public_row_declarations_within_each_mode:true,cross_file_source_control_also_compiles:true,original_failure_reproduced_at_minimum:false,definitions};
}

export function inspectTableLocalCompilationOwnedSource(rowBody,tableBody,moduleBody,taggedBody){
  const row=parse(ROW,rowBody),tagged=parse('tagged-legacy-row.ts',taggedBody),contracts=[];
  for(const name of ROWS){
    const current=metadata(row,name,'Component'),historical=metadata(tagged,name,'Component');assert.equal(current.node.members.length,0);
    assert.equal(current.node.heritageClauses[0].getText(row),historical.node.heritageClauses[0].getText(tagged));
    const {standalone,changeDetection,...value}=current.value;assert.equal(standalone,false);assert.deepEqual(changeDetection,{expression:'ChangeDetectionStrategy.Eager'});
    const {changeDetection:oldDetection,...oldValue}=historical.value;assert.deepEqual(oldDetection,{expression:'ChangeDetectionStrategy.Default'});
    assert.deepEqual(value,oldValue);assert.deepEqual(value.template,{expression:'CDK_ROW_TEMPLATE'});contracts.push({name,...value});
  }
  const imports=row.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/cdk/table');assert.equal(imports.length,1);
  assert.ok(imports[0].importClause.namedBindings.elements.some(n=>n.name.text==='CDK_ROW_TEMPLATE'&&!n.propertyName));
  assert.equal(rowBody.includes('CdkCellOutlet'),false,'no direct authored docs-private outlet import');
  const table=parse(TABLE,tableBody),value=metadata(table,'MatLegacyTable','Component').value;assert.equal(typeof value.template,'string');
  assert.equal(tableBody.includes('CDK_TABLE_TEMPLATE'),false);assert.equal(value.selector,'mat-table, table[mat-table]');assert.equal(value.host.class,'mat-table');
  assert.ok(value.template.indexOf('<ng-content select="caption">')<value.template.indexOf('<ng-content select="colgroup, col">'));
  assert.deepEqual([...value.template.matchAll(/legacyTableOutlet="(\w+)"/g)].map(m=>m[1]),['header','data','empty','footer','header','data','empty','footer']);
  for(const group of ['thead','tbody','tfoot'])assert.ok(value.template.includes('<'+group+' role="rowgroup">'));
  assert.deepEqual(value.providers,[{provide:{expression:'CdkTable'},useExisting:{expression:'MatLegacyTable'}},{provide:{expression:'STICKY_POSITIONING_LISTENER'},useValue:null}]);
  const module=parse(FAMILY+'/table-module.ts',moduleBody),moduleValue=metadata(module,'MatLegacyTableModule','NgModule').value;
  assert.deepEqual(moduleValue.imports,[{expression:'CdkTableModule'},{expression:'MatCommonModule'}]);
  assert.deepEqual(moduleValue.declarations,[{expression:'EXPORTED_DECLARATIONS'},{expression:'_LegacyTableOutlet'},{expression:'_LegacyTableDefinitionOwner'},{expression:'_LegacyTableColumnClasses'}]);
  return {complete_row_contracts:contracts,legacy_row_metadata_compared_to_tagged16:true,source_local_table_template_retained:true,owned_table_outlets:8,native_row_groups_retained:3,public_CdkTableModule_template_scope_retained:true,constructor_definition_owner_and_provider_protocols_unchanged:true};
}

function familyPopulation(root){const out=[];function walk(path){for(const entry of readdirSync(join(root,path),{withFileTypes:true})){
  const name=path+'/'+entry.name;if(entry.isDirectory())walk(name);else if(entry.isFile()&&!name.endsWith('.spec.ts'))out.push(name);
}}walk(FAMILY);return out.sort();}

export function reviewTableLocalCompilationSource({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
  root=realpathSync(root);const bound=new Map();
  function member(ref){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed table compilation source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:ref.sha256,bytes:raw.length});return raw;}
  member({path:SELF,sha256:hash(image),bytes:image.length});
  const original=JSON.parse(gunzipSync(member(ORIGINAL))),census=JSON.parse(gunzipSync(member(CENSUS))),current=JSON.parse(member(CURRENT));
  const originalFacts=verifyTableLocalCompilationOriginal(original,census);
  const population=familyPopulation(root);assert.equal(population.length,37);assert.deepEqual(population,current.family_members.map(m=>m.path));
  for(const ref of [...current.family_members,...current.support_members,...current.compiler_members,...current.protected_canonical_members])member(ref);
  assert.deepEqual(current.prior_counts,{closed:425,pending:1272,source_admissions:89,registry_records:68,security_review:1});
  const ownedFacts=inspectTableLocalCompilationOwnedSource(read(ROW).toString(),read(TABLE).toString(),read(FAMILY+'/table-module.ts').toString(),original.tagged_reference.members[0].body);
  const approval=JSON.parse(read('compatibility/f10/authored-use-reviews/table-callers.json')).reviews.filter(r=>r.file==='legacy-table/row.ts'&&r.symbol==='CDK_ROW_TEMPLATE');assert.equal(approval.length,1);assert.equal(approval[0].conclusion,'stable-public-peer');assert.equal(approval[0].candidate_source_sha256,hash(read(ROW)));
  const peer=parse('cdk-table.d.ts',read('node_modules/@angular/cdk/types/table.d.ts').toString());
  assert.equal(constant(peer,'CDK_ROW_TEMPLATE'),originalFacts.historical_row_template);
  const runtime=parse('cdk-table.mjs',read('node_modules/@angular/cdk/fesm2022/table.mjs').toString());assert.equal(constant(runtime,'CDK_ROW_TEMPLATE'),originalFacts.historical_row_template);
  const compiler=JSON.parse(member(COMPILER)),controls=JSON.parse(member(CONTROLS));
  for(const receipt of [compiler,controls]){
    member(receipt.producer);member(receipt.compiler_entry);for(const ref of receipt.packages)member(ref);
    assert.equal(receipt.workspace_build_executed,false);assert.equal(receipt.consumer_build_executed,false);assert.equal(receipt.native_or_packed_or_full_floor_qualified,false);
  }
  const compilerFacts=verifyTableLocalCompilationCompiler(compiler,controls,read(ROW).toString(),original);
  const ledger=JSON.parse(read(current.protected_canonical_members[0].path));assert.equal(ledger.entries.length,1697);
  const selected=ledger.entries.find(r=>r.sha===TABLE_LOCAL_COMPILATION_SHA);assert.equal(selected.final_disposition,'needs-individual-review');
  assert.equal(ledger.entries.filter(r=>r.final_disposition==='security-review').length,1);
  const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late table compilation source change '+ref.path);assert.equal(raw.length,ref.bytes);}assert.deepEqual(familyPopulation(root),population);};
  assertCurrent();return {report:{schema_version:1,line:'21.x',sha:TABLE_LOCAL_COMPILATION_SHA,role:'One complete original source review and six small actual compiler cells; proposal only',originals:ORIGINAL,source_census:CENSUS,current_inputs:CURRENT,compiler:COMPILER,compiler_controls:CONTROLS,...originalFacts,...ownedFacts,...compilerFacts,
    source_review_complete:true,proposed_final_disposition:'do-not-adopt',proposed_reason:'The original fix changes ordinary current Material source template resolution. The retained legacy table already owns its inline table template and outlet protocols; the unchanged legacy rows at the actual supported21.x minimum compile with strict templates in both partial and experimental-local modes. Same-file and cross-file literal variants emit identical component definitions and public declarations. Preserve the already reviewed public peer template binding and historical markup; no product repair is justified by this change.',
    upstream_current_components_copied:0,source_bindings:structuredClone([...bound.values()]),family_members:37,cyph_sanity:current.cyph_sanity,canonical_dispositions_changed:0,source_admissions_changed:0,product_changes:0,protected_canonical_files_unchanged:true,prior_counts:current.prior_counts,scope_limit:'Only complete original source applicability,three exact extracted row declarations and existing source protocols. Experimental local compilation is a diagnostic,not a published requirement. No complete owned-module AOT,consumer build,native rendering,CSS geometry,packed artifact,full floor or independent audit acceptance.',actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'},bound:structuredClone([...bound.values()]),assertCurrent};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);const review=reviewTableLocalCompilationSource();review.assertCurrent();writeFileSync(process.argv[2],JSON.stringify(review.report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({result:'pass',original_files:2,original_hunks:7,actual_small_compiler_cells:6,proposed_individual_source_decisions:1,canonical_dispositions_changed:0,product_changes:0}));
}
