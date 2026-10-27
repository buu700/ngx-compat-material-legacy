/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Predicate checks on supplied test inputs; source acceptance stays with the shared owner. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {zoneMovesPins} from '../scripts/mixed-zone-moves-source-review.mjs';

const ts=createRequire(import.meta.url)('typescript');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const prefix='projects/ngx-material-legacy/';
export const companionRoutes=['styles/bridges/_companion-overrides.scss','styles/bridges/_form-field-state-overrides.scss',
  'styles/datepicker/_datepicker-theme.scss','styles/progress-bar/_progress-bar-theme.scss'].map(path=>prefix+path).sort();
const forks=new Set(['ContentObserver','CdkObserveContent','CdkStep','CdkStepper','CdkAccordion','CdkAccordionItem',
  'CdkContextMenuTrigger','DragDropRegistry','DragRef','CdkListbox','CdkCombobox','Resizable','EditServices','CdkPopoverEdit',
  'CdkMenuBase','CdkTree','CdkTreeNode']);
const inspectionNames=['get-theme-version','get-theme-type','get-theme-color','get-theme-typography','get-theme-density','theme-has'];
export function nodes(node,predicate){const found=[];function visit(current){if(predicate(current))found.push(current);ts.forEachChild(current,visit);}visit(node);return found;}
export function parse(path,text){const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0,'invalid current source '+path);return file;}
function semantic(node){const children=[];ts.forEachChild(node,child=>{children.push(semantic(child));});
  return [node.kind,ts.isVariableDeclarationList(node)?node.flags&(ts.NodeFlags.Const|ts.NodeFlags.Let):null,
    node.isTypeOnly??null,ts.isIdentifier(node)?node.text:ts.isLiteralExpression(node)?node.text:null,children];}
function classNode(path,text,name){const file=parse(path,text),found=nodes(file,node=>ts.isClassDeclaration(node)&&node.name?.text===name);assert.equal(found.length,1,'missing current fixture '+name);return found[0];}

export function inspectSourceMember(path,text){
  const currentMaterial=[],overlay=[];
  if(path.endsWith('.ts')){
    const file=parse(path,text),production=!path.endsWith('.spec.ts');
    for(const node of nodes(file,current=>ts.isImportDeclaration(current)||ts.isExportDeclaration(current)||
      (ts.isCallExpression(current)&&(current.expression.kind===ts.SyntaxKind.ImportKeyword||current.expression.getText(file)==='require')))){
      const specifier=node.moduleSpecifier??node.arguments?.[0];if(!specifier||!ts.isStringLiteral(specifier))continue;
      const route=specifier.text,staticRoute=ts.isImportDeclaration(node)||ts.isExportDeclaration(node);
      assert.ok(!/^@angular\/(?:cdk|material)(?:-experimental)?\/tree(?:\/|$)/.test(route),'owned tree dependency '+path);
      if(staticRoute){
        assert.ok(!/^@angular\/(?:aria(?:\/|$)|cdk\/(?:listbox|schematics)(?:\/|$)|material\/timepicker(?:\/|$))/.test(route),'unowned runtime/schematic dependency '+path);
        assert.ok(!/@angular\/(?:components-examples|dev-app|universal-app)|\/(?:components-examples|dev-app|universal-app)\//.test(route),'owned example/application dependency '+path);
        if(production){
          assert.ok(!['@angular/cdk/stepper','@angular/cdk/accordion','@angular/material/stepper','@angular/material/expansion'].includes(route),'owned stepper/accordion dependency '+path);
          assert.ok(!/^@angular\/(?:cdk(?:-experimental)?\/(?:menu|drag-drop|listbox|column-resize|popover-edit|combobox)|material-experimental\/column-resize)(?:\/|$)/.test(route),'unexpected affected peer dependency '+path);
          if(route==='@angular/cdk/overlay')overlay.push({path,declaration_sha256:hash(node.getText(file))});
        }
      }
    }
    for(const node of nodes(file,ts.isClassDeclaration)){
      const name=node.name?.text??'';assert.ok(!/^(?:Cdk|Mat)(?:Nested)?Tree/.test(name),'ordinary tree fork '+path);
      if(production)assert.ok(!forks.has(name),'ordinary peer fork '+path);
    }
  }
  assert.ok(!/<\s*(?:mat|cdk)-(?:nested-)?tree(?:\s|>|-)/.test(text),'owned tree template '+path);
  if(path.endsWith('.scss')){
    for(const match of text.matchAll(/^\s*@(use|forward)\s+['"]([^'"]+)['"]([^;]*);/gm)){
      assert.ok(!match[2].startsWith('@angular/material-experimental'),'owned experimental M3 dependency '+path);
      if(match[2]==='@angular/material'){
        assert.equal(match[1],'use','current Material wildcard facade');const alias=match[3].match(/\bas\s+([\w-]+)/)?.[1];assert.ok(alias);
        assert.ok(!new RegExp('\\b'+alias+'\\.m2-[\\w-]+\\s*\\(').test(text),'upstream m2 compatibility call-through');currentMaterial.push(path);
      }
    }
    assert.ok(!/(?:\b[\w-]+\.)?(?:get-theme-(?:version|type|color|typography|density)|theme-has)\s*\(/.test(text),'new inspection API entered historical model '+path);
  }
  return {currentMaterial,overlay};
}

export function inspectSupportContracts({root,read,line}){
  const bootstrapPath='testing/legacy-runner/init-test-env.ts',bootstrap=read(bootstrapPath).toString();
  assert.equal(hash(bootstrap),'c74c044e7869eb96e8a704b62e36e4c27a2115cb3e0b4815ebb634035f4de15c','bootstrap preparation changed');
  assert.ok(bootstrap.includes('provideZoneChangeDetection()'));
  for(const name of ['prototype.whenStable','provideExperimentalZonelessChangeDetection','provideCheckNoChangesConfig'])assert.ok(!bootstrap.includes(name),'current fixture preparation '+name);
  const observerModules=['legacy-tabs/tabs-module.ts','legacy-form-field/form-field-module.ts','legacy-checkbox/checkbox-module.ts','legacy-slide-toggle/slide-toggle-module.ts'];
  for(const path of observerModules)assert.ok(read(prefix+path).toString().includes("from '@angular/cdk/observers'"),'public observer route '+path);
  const dialog=read(prefix+'legacy-dialog/dialog-content-directives.ts').toString();assert.equal((dialog.match(/standalone: false/g)||[]).length,4,'legacy dialog directive declarations');
  const tooltipPath=prefix+'legacy-tooltip/tooltip.spec.ts',tooltip=read(tooltipPath).toString();
  const touch=originalEnvironmentCases({members:[{path:tooltipPath,after:{text:tooltip}}]},'after').find(row=>row.name==="'should have a delay when showing on touchstart'");
  assert.ok(touch?.raw.includes('fakeAsync(() =>')&&touch.raw.includes('tick(250)')&&touch.raw.includes('tick(500)')&&touch.raw.includes('finishCurrentTooltipAnimation(overlayContainerElement, true)'),'retained touchstart timing case');
  assert.ok(read(prefix+'legacy-dialog/dialog.spec.ts').toString().includes("'h1[tabindex=\"-1\"]'"),'retained dialog heading query');
  assert.ok(read(prefix+'legacy-chips/chip-input.ts').toString().includes('chipInput: MatLegacyChipInput;'),'retained chip input type');
  for(const family of ['dialog','snack-bar']){
    const text=read('testing/legacy-runner/shims/harness/'+family+'/shared.spec.ts').toString();
    assert.ok(text.includes('LEGACY_NOOP_ANIMATIONS')&&text.includes('declarations: ['),'retained harness preparation '+family);
  }
  const menuPath=prefix+'legacy-menu/menu.spec.ts';
  const recursive=originalEnvironmentCases({members:[{path:menuPath,after:{text:read(menuPath).toString()}}]},'after')
    .find(row=>row.name==="'should throw if assigning a menu that contains the trigger'");
  assert.ok(recursive?.raw.includes('.toThrowError(/menu cannot contain its own trigger/)'),'retained recursive menu case');
  const chipPath=prefix+'legacy-chips/chip-list.spec.ts';
  const empty=originalEnvironmentCases({members:[{path:chipPath,after:{text:read(chipPath).toString()}}]},'after')
    .filter(row=>row.name==="'should clear a destroyed active chip when the list becomes empty'");
  assert.equal(empty.length,1);assert.equal(empty[0].mode,'it');
  for(const operation of ['testComponent.chips = [];','testComponent.chips = [10, 11];','expect(keyManager.activeItem).toBeNull()'])assert.ok(empty[0].raw.includes(operation),'retained empty chip regression '+operation);
  const inputPath=prefix+'legacy-input/input.spec.ts';
  assert.ok(classNode(inputPath,read(inputPath).toString(),'MatInputOnPush').getText().includes('changeDetection: ChangeDetectionStrategy.OnPush'),'explicit current OnPush fixture');
  const pins=zoneMovesPins({root}),zonePath='compatibility/rc/mixed-zone-moves-source-subjects.json.gz',zoneRaw=read(zonePath);
  assert.equal(hash(zoneRaw),pins.capsules[line]['subjects.json.gz']);
  const original=JSON.parse(gunzipSync(zoneRaw)).subjects[0],deleted=original.members.find(row=>row.path.endsWith('/mock-ng-zone.ts'));
  assert.ok(deleted&&deleted.after.text==='');
  const shimPath='testing/legacy-runner/shims/mock-ng-zone.ts';
  assert.deepEqual(semantic(classNode(shimPath,read(shimPath).toString(),'MockNgZone')),semantic(classNode(deleted.path,deleted.before.text,'MockNgZone')),'historical local shim contract changed');
  const ownedPath=prefix+'internal/testing/owned-test-events.ts';classNode(ownedPath,read(ownedPath).toString(),'MockNgZone');
  const oraclePath='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle=JSON.parse(read(oraclePath));
  assert.deepEqual(oracle.counts,{variables:47,functions:25,mixins:286});
  for(const kind of ['variables','functions','mixins'])assert.equal(Object.keys(oracle.members[kind]).length,oracle.counts[kind]);
  for(const name of inspectionNames)assert.equal(Object.hasOwn(oracle.members.functions,name),false,'new API claimed historical');
  const lock=JSON.parse(read('toolchain-lock.json')),workspace=JSON.parse(read('package.json')),library=JSON.parse(read(prefix+'package.json'));
  assert.equal(read('.node-version').toString().trim(),lock.repository.node);assert.equal(read('.npm-version').toString().trim(),lock.release.npm);
  assert.equal(workspace.packageManager,'pnpm@'+lock.repository.pnpm);assert.ok(library.engines.node.includes('||'));assert.notEqual(library.engines.node,workspace.engines.node,'private tools imposed on consumers');
  const configurations=['tsconfig.json',prefix+'tsconfig.lib.json'].map(path=>{
    const raw=read(path),parsed=ts.parseConfigFileTextToJson(path,raw.toString());assert.equal(parsed.error,undefined,'invalid current compiler configuration');
    return {path,sha256:hash(raw),configuration:parsed.config};
  });
  return {bootstrap_sha256:hash(bootstrap),observer_modules:observerModules,oracle_counts:oracle.counts,
    retained_touchstart_case_sha256:hash(touch.raw),retained_recursive_menu_case_sha256:hash(recursive.raw),
    retained_empty_chip_case_sha256:hash(empty[0].raw),compiler_configuration:configurations,
    published_node_engine:library.engines.node,current_private_tools:lock.repository,
    historical_shim_semantics_preserved:true,current_contract_group_count:13,
    source_acceptance_policy:'Existing shared current-source owner; these assertions do not admit source changes.',
    actual_Angular_native_artifact_browser_floor_or_full_audit_qualified:false};
}
