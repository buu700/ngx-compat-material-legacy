/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four individually reviewed test-environment changes; no product/runtime admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const RENDER_SETUP_SHAS=['c5f9a60e524466a4f6098df9f081bc3c8d63ea3b','14479d47cbf77c52fe52b5e5fd8511a8d7f18c82','d33deadf7ab3abc61eae1ea524def317120503d7','2f4a2b4c003594f64f6e9b17bf38b929739fd535'];
export const RENDER_SETUP_PATHS=[['src/material/menu/menu.spec.ts'],['src/cdk/overlay/position/flexible-connected-position-strategy.spec.ts','src/material/autocomplete/autocomplete.spec.ts','src/material/select/select.spec.ts'],['src/material/bottom-sheet/bottom-sheet.spec.ts','src/material/dialog/dialog.spec.ts'],['src/cdk/table/table.spec.ts']];
export const RENDER_SETUP_CAPSULES={main:{
 'compatibility/rc/spec-render-setup-source-subjects.json.gz':'790eee4edcd29a7d0d6e84002ddcf99398de9d8259f4b1fba9e514406ee2d5cf',
 'compatibility/rc/spec-render-setup-source-acquisition.json.gz':'72dd57980b92c1094273deff03b4c73140317391bf2740bd3442301c9f53ddca'},'21.x':{
 'compatibility/rc/spec-render-setup-source-subjects.json.gz':'c8f172f1a452d9a0a7db086cad1e304916e0b0c322637e94bd4ec78ee05e35a7',
 'compatibility/rc/spec-render-setup-source-acquisition.json.gz':'b10ffb29f37997babdbd53ca0742b463ef1cc1fa819ab278b7c7e1afbfe51a95'}};
const parse=text=>{const file=ts.createSourceFile('complete-source.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const collect=(file,predicate)=>{const found=[];function visit(n){if(predicate(n))found.push(n);ts.forEachChild(n,visit);}visit(file);return found;};
const cases=file=>collect(file,n=>ts.isCallExpression(n)&&n.expression.getText(file)==='it');
const test=(text,name)=>{const file=parse(text),found=cases(file).filter(n=>n.arguments[0].getText(file)==="'"+name+"'");assert.equal(found.length,1);return found[0].getText(file);};
const replace=(text,needle,value)=>{assert.equal(text.split(needle).length,2,'non-unique source edit '+needle);return text.replace(needle,value);};
/** Authenticate the complete registered multi-file patch before reviewing its individual file slices. */
export function authenticateRenderSetupPatch(subject){
 const index=RENDER_SETUP_SHAS.indexOf(subject.sha);assert.ok(index>=0,'unregistered source subject');const paths=RENDER_SETUP_PATHS[index];
 assert.deepEqual(subject.members.map(row=>row.path),paths);assert.deepEqual(subject.complete_changed_files.map(row=>row.path),paths);assert.equal(hash(subject.diff),subject.diff_sha256);assert.equal(Buffer.byteLength(subject.diff),subject.diff_bytes);
 const pieces=subject.diff.split(/(?=^diff --git )/m).filter(Boolean);assert.equal(pieces.length,paths.length);const hunks=[];
 for(const [offset,path]of paths.entries()){
  const identity=subject.complete_changed_files[offset];assert.equal(identity.status,'M');assert.equal(identity.before_mode,'100644');assert.equal(identity.after_mode,'100644');assert.ok(pieces[offset].startsWith('diff --git a/'+path+' b/'+path+'\n'));
  // This derived view is only a hunk/blob authentication input. The complete
  // original path population above and original capsule/census remain mandatory.
  const view={...subject,members:[subject.members[offset]],complete_changed_files:[identity],diff:pieces[offset],diff_sha256:hash(pieces[offset]),diff_bytes:Buffer.byteLength(pieces[offset]),original_hunks:(pieces[offset].match(/^@@ /gm)||[]).length};
  hunks.push(...reviewCompleteSingleSpec(view,RENDER_SETUP_SHAS));
 }assert.equal(hunks.length,subject.original_hunks);return hunks;
}
export function analyzeRenderSetupSemantics(subject){
 const index=RENDER_SETUP_SHAS.indexOf(subject.sha);assert.ok(index>=0);const results=[];
 for(const [offset,member]of subject.members.entries()){
  const before=member.before.text,after=member.after.text,old=parse(before),next=parse(after);assert.deepEqual(cases(old).map(n=>n.arguments[0].getText(old)),cases(next).map(n=>n.arguments[0].getText(next)));let expected=before;
  if(index===0){
   expected=replace(expected,"import {NoopAnimationsModule} from '@angular/platform-browser/animations';\n",'');
   expected=replace(expected,"    // TODO(crisbeto): figure out why NoopAnimationsModule is necessary\n    // here and our token isn't enough. Likely indicates an issue.\n    TestBed.resetTestingModule().configureTestingModule({imports: [NoopAnimationsModule]});\n    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();\n",'');
   expected=replace(expected,"const items = overlayContainerElement.querySelectorAll(\n      '.mat-mdc-menu-panel .mat-mdc-menu-item',","const items = overlayContainerElement.querySelectorAll<HTMLElement>(\n      '.mat-mdc-menu-panel .mat-mdc-menu-item',");
   expected=replace(expected,'    expect(document.activeElement).toBe(items[0]);',"    // Stub out the `_hasFocus` method since it's hard to move focus reliably within the test.\n    spyOn(fixture.componentInstance.itemInstances.first, '_hasFocus').and.callFake(() => true);\n    const spy = spyOn(items[1], 'focus');");
   expected=replace(expected,'    expect(document.activeElement).toBe(items[1]);','    expect(spy).toHaveBeenCalled();');expected=replace(expected,"  items = ['One', 'Two', 'Three'];","  @ViewChildren(MatMenuItem) itemInstances: QueryList<MatMenuItem>;\n  items = ['One', 'Two', 'Three'];");
   results.push({path:member.path,kind:'replace-real-menu-focus-with-private-state-and-focus-call-spies',actual_active_element_assertions_removed:2,private_focus_state_stub_added:1,focus_call_assertion_added:1,observations_equivalent:false});
  }else if(index===1&&offset===0){
   const guard="      if (!('showPopover' in document.body)) {\n        return;\n      }\n\n";assert.equal(expected.split(guard).length-1,4);expected=expected.replaceAll(guard,'');results.push({path:member.path,kind:'remove-four-browser-feature-early-returns',feature_guards_removed:4,assertions_preserved:true});
  }else if(index===1){
   expected=replace(expected,"import {OverlayContainer, OverlayModule, createCloseScrollStrategy} from '@angular/cdk/overlay';","import {OverlayModule, createCloseScrollStrategy} from '@angular/cdk/overlay';");
   expected=replace(expected,"  const supportsPopover = 'showPopover' in document.body;\n",'');
   if(offset===1){
    expected=replace(expected,'  let overlayContainerElement: HTMLElement;\n\n','');expected=replace(expected,'    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();\n','');
    expected=replace(expected,"    return supportsPopover\n      ? fixture.nativeElement.querySelector('.cdk-overlay-popover')\n      : overlayContainerElement.querySelector('.cdk-overlay-connected-position-bounding-box');","    return fixture.nativeElement.querySelector('.cdk-overlay-popover');");
    expected=replace(expected,"    const selector = '.cdk-overlay-backdrop';\n    return supportsPopover\n      ? getOverlayHost(fixture)?.querySelector(selector) || null\n      : overlayContainerElement.querySelector(selector);","    return (\n      fixture.nativeElement.querySelector('.cdk-overlay-popover .cdk-overlay-backdrop') || null\n    );");
   }else{
    expected=replace(expected,"    return supportsPopover\n      ? fixture.nativeElement.querySelector('.cdk-overlay-popover')\n      : TestBed.inject(OverlayContainer)\n          .getContainerElement()\n          .querySelector('.cdk-overlay-connected-position-bounding-box');","    return fixture.nativeElement.querySelector('.cdk-overlay-popover');");
    expected=replace(expected,"    const parent = supportsPopover\n      ? fixture.nativeElement\n      : TestBed.inject(OverlayContainer).getContainerElement();\n    return parent.querySelector('.cdk-overlay-backdrop');","    return fixture.nativeElement.querySelector('.cdk-overlay-backdrop');");
   }results.push({path:member.path,kind:'modern-inline-popover-only-query-helpers',legacy_overlay_container_fallback_removed:true,production_overlay_creation_changed:false});
  }else if(index===2){
   assert.equal((before.match(/\bcreateNgModuleRef\b/g)||[]).length,2);expected=before.replaceAll('createNgModuleRef','createNgModule');results.push({path:member.path,kind:'deprecated-module-factory-alias-rename',import_and_call_identifier_changes:2,arguments_injector_and_assertions_unchanged:true});
  }else{
   const classes=collect(old,n=>ts.isClassDeclaration(n)&&n.name?.text==='NativeHtmlTableAppOnPush');assert.equal(classes.length,1);const decorators=ts.getDecorators(classes[0]);assert.equal(decorators.length,1);assert.ok(decorators[0].getText(old).includes('changeDetection: ChangeDetectionStrategy.OnPush'));
   const start=decorators[0].getStart(old),end=decorators[0].end,decorator=before.slice(start,end);expected=before.slice(0,start)+replace(decorator,'  changeDetection: ChangeDetectionStrategy.OnPush,\n','')+before.slice(end);
   results.push({path:member.path,kind:'remove-OnPush-from-native-CDK-test-fixture',fixture:'NativeHtmlTableAppOnPush',rendering_mode_change_is_not_production_fix:true,assertion_text_unchanged_but_test_environment_changed:true});
  }assert.equal(expected,after,'additional or different complete-file edit '+member.path);
 }return results;
}
export function inspectRenderSetupPeerSources(read){
 const descriptor=read('compatibility/rc/material-public-subjects.json');assert.equal(hash(descriptor),'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3');const cores=JSON.parse(descriptor),rows=[];
 const overlayDescriptor=read('compatibility/rc/autocomplete-landscape-cdk-sources/identities.json');assert.equal(hash(overlayDescriptor),'6d7675f22f6b93c4a8ed00f9a8de5c814944f5685e965bb7046fa4b957c1aa3d');const overlays=JSON.parse(overlayDescriptor);
 for(const line of ['main','21.x']){
  const core=cores.subjects.find(row=>row.line===line),member=core.members.find(row=>row.package==='@angular/core'&&row.module_path==='types/core.d.ts'),raw=read(member.path);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);const file=parse(raw.toString()),functions=collect(file,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='createNgModule');assert.equal(functions.length,1);const comments=functions[0].jsDoc||[];assert.ok(comments.some(c=>c.getText(file).includes('@publicApi'))&&comments.every(c=>!c.getText(file).includes('@deprecated')));assert.ok(file.statements.filter(ts.isExportDeclaration).some(n=>n.exportClause&&ts.isNamedExports(n.exportClause)&&n.exportClause.elements.some(e=>(e.propertyName||e.name).text==='createNgModule')));
  const overlay=overlays.find(row=>row.line===line);assert.equal(overlay.version,line==='main'?'22.1.7':'21.2.14');const source=overlay.members.find(row=>row.archive_member==='package/fesm2022/_overlay-module-chunk.mjs'),stored=read(source.retained.path);assert.equal(hash(stored),source.retained.sha256);const bytes=gunzipSync(stored);assert.equal(hash(bytes),source.member_sha256);assert.equal(bytes.length,source.member_bytes);const text=bytes.toString();assert.ok(text.includes('})?.usePopover ?? true;')&&text.includes('overlayConfig.usePopover = config?.usePopover ?? defaultUsePopover;')&&text.includes('overlayConfig.usePopover = false;')&&text.includes("'showPopover' in doc.body"));
  rows.push({line,core_version:core.packages.find(row=>row.name==='@angular/core').version,core_types:{path:member.path,sha256:member.sha256},createNgModule_public_and_nondeprecated:true,cdk_version:overlay.version,overlay_runtime:{path:source.retained.path,sha256:source.retained.sha256,uncompressed_sha256:source.member_sha256},default_popover_enabled_when_supported:true,no_body_or_unsupported_browser_falls_back:true,popover_route_is_reachable_not_absent:true,actual_peer_floor_or_browser_executed:false});
 }return rows;
}
export function inspectRenderSetupSources({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;assert.match(version,/^(21|22)\./);const line=version.startsWith('21.')?'21.x':'main';
 const [originals,acquisition]=Object.entries(RENDER_SETUP_CAPSULES[line]).map(([path,digest])=>{const bytes=read(path);assert.equal(hash(bytes),digest,'render-setup capsule changed');return JSON.parse(gunzipSync(bytes));});
 for(const packet of [originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects,RENDER_SETUP_SHAS);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256);}
 assert.deepEqual(originals.subjects.map(row=>row.sha),RENDER_SETUP_SHAS);assert.deepEqual(acquisition.subjects,RENDER_SETUP_SHAS);assert.equal(acquisition.private_temporary_object_view_removed,true);assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);
 const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));assert.equal(census.line,line);const subjects=originals.subjects.map(subject=>{const row=census.commits.find(row=>row.sha===subject.sha);assert.ok(row);assert.equal(row.raw_commit,subject.raw_commit);assert.deepEqual(row.complete_changed_files,subject.complete_changed_files);return {sha:subject.sha,subject:subject.subject,hunks:authenticateRenderSetupPatch(subject),semantics:analyzeRenderSetupSemantics(subject)};});
 const menu=read('projects/ngx-material-legacy/legacy-menu/menu.spec.ts').toString(),focus=test(menu,'should move focus to another item if the active item is destroyed');assert.equal((focus.match(/expect\(document.activeElement\)/g)||[]).length,2);assert.ok(focus.includes('.toBe(items[0]);')&&focus.includes('.toBe(items[1]);')&&!focus.includes('spyOn('));assert.ok(!menu.includes('NoopAnimationsModule'));assert.ok(read('projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts').toString().includes('this._document.activeElement === this._getHostElement()'));
 for(const name of ['legacy-autocomplete/autocomplete.spec.ts','legacy-select/select.spec.ts']){const text=read('projects/ngx-material-legacy/'+name).toString();assert.ok(text.includes('OverlayContainer')&&text.includes('overlayContainerElement.querySelector(')&&!text.includes('supportsPopover'));}
 const auto=read('projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts').toString(),select=read('projects/ngx-material-legacy/legacy-select/select.html').toString();assert.ok(auto.includes('this._overlay.create(this._getOverlayConfig())')&&select.includes('cdk-connected-overlay'));
 const dialog=read('projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts').toString();assert.ok(!dialog.includes('createNgModuleRef')&&dialog.includes('const ngModuleRef = createNgModule(')&&dialog.includes('/* parentInjector */ this._injector,')&&dialog.includes('{injector: ngModuleRef.injector}'));
 const table=read('projects/ngx-material-legacy/legacy-table/table.spec.ts').toString();assert.ok(!table.includes('class NativeHtmlTableAppOnPush')&&table.includes('class NativeHtmlTableApp')&&table.includes('CdkTableModule')&&table.includes('NativeHtmlTableApp,'));
 let deprecatedImports=0;for(const path of candidateProductSourcePaths(root).filter(path=>path.endsWith('.ts')))for(const declaration of parse(read(path).toString()).statements.filter(ts.isImportDeclaration))if(declaration.moduleSpecifier.text==='@angular/core'&&declaration.importClause?.namedBindings&&ts.isNamedImports(declaration.importClause.namedBindings))deprecatedImports+=declaration.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text==='createNgModuleRef').length;assert.equal(deprecatedImports,0);
 return {schema_version:1,line,subjects,complete_original_files:7,complete_original_hunks:subjects.reduce((n,row)=>n+row.hunks.length,0),owned_boundaries:{real_menu_active_element_assertions_retained:2,menu_private_focus_stub_adopted:false,legacy_overlay_container_queries_retained:true,public_overlay_and_popover_route_reachable:true,popover_native_structure_style_focus_and_supported_browser_validation_still_required:true,dialog_public_module_factory_already_present:true,owned_deprecated_module_factory_imports:deprecatedImports,upstream_private_OnPush_table_fixture_absent:true},exact_peer_sources:inspectRenderSetupPeerSources(read),product_changes:0,actual_Angular_browser_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectRenderSetupSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,subjects:undefined}));
}
