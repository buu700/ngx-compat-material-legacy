/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// Read current owned sources and parse historical source data. Execute no upstream code.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,resolve,relative} from 'node:path';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {inspectLegacyRemovalOriginals} from '../../scripts/upstream-legacy-removal-source.mjs';
const root=process.cwd(),base='projects/ngx-material-legacy/',hash=raw=>createHash('sha256').update(raw).digest('hex');
const ts=createRequire(resolve(root,'package.json'))('typescript');
const members=new Map();
function read(path){const raw=readFileSync(resolve(root,path));members.set(path,{path,sha256:hash(raw),bytes:raw.length});return raw;}
const original=inspectLegacyRemovalOriginals({root});
const capsule=JSON.parse(gunzipSync(read('compatibility/rc/21x-legacy-removal-source-originals.json.gz')));
const tag=new Map(capsule.tagged_reference.members.map(row=>[row.path,row]));
const product=execFileSync('git',['ls-files','-z','--',base],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).sort();
assert.equal(new Set(product).size,product.length);for(const path of product){assert.ok(!lstatSync(resolve(root,path)).isSymbolicLink());read(path);}
const source=(path,body)=>ts.createSourceFile(path,body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const exportModifier=node=>node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);
function exportsOf(path,body,seen=new Set()){
 assert.ok(!seen.has(path),'cycle in static export traversal '+path);seen=new Set([...seen,path]);
 const file=source(path,body);assert.equal(file.parseDiagnostics.length,0,'unparsed current or tagged API '+path);const names=new Set();
 for(const node of file.statements){
  if(ts.isExportDeclaration(node)){
   if(node.exportClause&&ts.isNamedExports(node.exportClause)){for(const item of node.exportClause.elements)names.add(item.name.text);}
   else if(node.exportClause&&ts.isNamespaceExport(node.exportClause))names.add(node.exportClause.name.text);
   else if(node.moduleSpecifier){
    const spec=node.moduleSpecifier.text;assert.ok(spec.startsWith('.'),'unbounded external star export '+path);
    const stem=resolve(root,dirname(path),spec),target=[stem+'.ts',stem+'/index.ts',stem+'/public-api.ts'].find(candidate=>product.includes(relative(root,candidate)));
    assert.ok(target,'unresolved owned star export '+path+' '+spec);for(const name of exportsOf(relative(root,target),read(relative(root,target)).toString(),seen))names.add(name);
   }
  }else if(exportModifier(node)){
   if(node.name&&ts.isIdentifier(node.name))names.add(node.name.text);
   else if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations){assert.ok(ts.isIdentifier(declaration.name));names.add(declaration.name.text);}
  }
 }
 return [...names].sort();
}
const api=[];
for(const member of tag.values()){
 if(!member.path.endsWith('/public-api.ts'))continue;
 const path=base+member.path.slice('src/material/'.length),rel=path.slice(base.length).replace('/public-api.ts','').replace('/testing','-testing');
 const golden=tag.get('tools/public_api_guard/material/'+rel+'.md');assert.ok(golden);
 const block=golden.body.match(/```ts\n([\s\S]*?)\n```/);assert.ok(block);
 const historical=exportsOf(golden.path,block[1]),current=exportsOf(path,read(path).toString());
 const config=base+member.path.slice('src/material/'.length).replace('public-api.ts','ng-package.json');assert.equal(JSON.parse(read(config)).lib.entryFile,'public-api.ts');
 api.push({historical_barrel:member.path,historical_barrel_blob:member.blob,historical_golden:golden.path,historical_golden_blob:golden.blob,current_path:path,entry_config:config,historical_names:historical,current_names:current,missing:historical.filter(name=>!current.includes(name)),additional:current.filter(name=>!historical.includes(name))});
}
assert.equal(api.length,44);
const exceptions=JSON.parse(read('compatibility/compatibility-exceptions.json'));
read('compatibility/handoff/codex-closeout/reference/animation-contract.csv');
read('compatibility/handoff/codex-closeout/reference/PRODUCT-CONTRACT.md');
const recipeNames={
 'legacy-dialog':[['matLegacyDialogAnimations','matDialogAnimations']],
 'legacy-form-field':[['matLegacyFormFieldAnimations','matFormFieldAnimations']],
 'legacy-menu':[['fadeInLegacyItems','fadeInItems'],['matLegacyMenuAnimations','matMenuAnimations'],['transformLegacyMenu','transformMenu']],
 'legacy-select':[['matLegacySelectAnimations','matLegacySelectAnimations']],
 'legacy-snack-bar':[['matLegacySnackBarAnimations','matSnackBarAnimations']],
 'legacy-tabs':[['matLegacyTabsAnimations','matTabsAnimations']],
 'legacy-tooltip':[['matLegacyTooltipAnimations','matLegacyTooltipAnimations']],
};
const recipeAliases=[];
for(const[family,pairs]of Object.entries(recipeNames)){
 const member=tag.get('src/material/'+family+'/public-api.ts'),file=source(member.path,member.body);
 const exception=exceptions.exceptions.find(row=>row.id==='F04-recipe-'+family);assert.ok(exception);assert.equal(exception.disposition,'removed-with-native-migration');
 for(const[name,upstreamName]of pairs){
  const declarations=file.statements.filter(ts.isExportDeclaration);
  const declaration=declarations.find(node=>node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.some(item=>item.name.text===name&&(item.propertyName?.text??item.name.text)===upstreamName));
  assert.ok(declaration,'unauthenticated original recipe alias '+name);assert.ok(exception.symbol_or_selector.split(' / ').includes(upstreamName));
  const actual=api.find(row=>row.current_path===base+family+'/public-api.ts');assert.ok(actual.missing.includes(name));
  recipeAliases.push({family,name,original_name:upstreamName,original_module:declaration.moduleSpecifier.text,tagged_barrel_blob:member.blob,existing_exception:exception.id});
 }
}
assert.equal(recipeAliases.length,9);assert.deepEqual(api.flatMap(row=>row.missing).sort(),recipeAliases.map(row=>row.name).sort());
function forwards(text){return [...text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'').matchAll(/@forward\s+['"]([^'"]+)['"]([^;]*);/g)].map(m=>({source:m[1],binding:m[2].replace(/\s+/g,' ').trim()}));}
const oldForwards=forwards(tag.get('src/material/_index.scss').body).filter(row=>row.source.startsWith('./legacy-'));
const currentForwards=forwards(read(base+'_index.scss').toString());
const facade=oldForwards.map(row=>{const current={source:'./styles/'+row.source.slice(2),binding:row.binding};assert.ok(currentForwards.some(item=>item.source===current.source&&item.binding===current.binding),'missing unchanged legacy forward '+row.source);return{tagged:row,current};});
assert.ok(currentForwards.every(row=>row.source.startsWith('./styles/')));
const density=read(base+'styles/core/density/private/_compatibility.scss');
const deletedCompatibility=capsule.sections.find(row=>row.path==='src/material/legacy-core/density/private/_compatibility.scss');assert.ok(density.equals(Buffer.from(deletedCompatibility.before.body)));
const inventory=JSON.parse(read('testing/legacy-runner/historical-inventory.json'));assert.equal(inventory.rows.length,57);
const tests=capsule.sections.filter(row=>row.status==='D'&&row.path.startsWith('src/material/')&&row.path.includes('.spec.'));
assert.equal(tests.length,57);assert.deepEqual(tests.map(row=>row.path).sort(),inventory.rows.map(row=>row.historical_path).sort());
for(const row of inventory.rows){assert.ok(members.has(row.candidate));assert.equal(hash(read(row.candidate)),row.candidate_sha256);}
const packageJson=JSON.parse(read(base+'package.json')),packager=JSON.parse(read(base+'ng-package.json'));
assert.ok(Object.keys(packageJson.exports).every(path=>!path.includes('prebuilt')));
const experimentalImports=[];
for(const path of product.filter(path=>path.endsWith('.ts'))){const file=source(path,read(path).toString());for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&/material-experimental|(?:column-resize|popover-edit|selection)\//.test(node.moduleSpecifier.text))experimentalImports.push({path,specifier:node.moduleSpecifier.text});}
original.assertCurrent();
const report={schema_version:1,line:'21.x',role:'current owned source boundary only; not full API/behavior/native qualification',original_source:original.facts,analysis_runtime:{node:process.version,typescript:ts.version},product_population:product.length,current_members:[...members.values()].sort((a,b)=>a.path.localeCompare(b.path)),api_name_inventory:api,existing_recipe_alias_removals:recipeAliases,legacy_forward_bindings:facade,legacy_density_compatibility_exact_relocation:{before:deletedCompatibility.path,current:base+'styles/core/density/private/_compatibility.scss',sha256:hash(density)},historical_suite:{rows:57,complete_deleted_spec_membership:true,current_candidate_hashes_match:true,execution_credit:false},package_boundary:{peerDependencies:packageJson.peerDependencies,exports:packageJson.exports,packaged_assets:packager.assets,original_prebuilt_CSS_exports_are_not_advertised_by_owned_manifest:true},experimental_imports:experimentalImports,canonical_decisions_changed:0,product_changes:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({product_population:product.length,api_barrels:api.length,missing_names:api.filter(row=>row.missing.length).map(row=>({path:row.current_path,missing:row.missing})),legacy_forwards:facade.length,experimental_imports:experimentalImports.length}));
