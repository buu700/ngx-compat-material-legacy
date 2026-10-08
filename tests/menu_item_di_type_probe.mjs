/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Strict source/nominal boundary diagnostic; no Angular/native/packed qualification. */
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT || root;
const req=createRequire(import.meta.url),ts=req('typescript'),base='projects/ngx-material-legacy/legacy-menu/';
const argv=process.argv.slice(2),at=argv.indexOf('--report'),out=at<0?null:argv[at+1];
const leaf=resolve(root,base+'menu-item.ts'),token=resolve(root,base+'internal/menu-panel-token.ts'),panel=resolve(root,base+'internal/menu-panel.ts');
const fixture=resolve(root,'__menu_di_source_diagnostic__.ts');
const positive=`import {MatMenuItem} from '@angular/material/menu';
import {InjectionToken} from '@angular/core';
import {MatLegacyMenuItem} from '${leaf}';
import {MAT_MENU_PANEL} from '${token}';
import type {MatMenuPanel} from '${panel}';
declare const item:MatLegacyMenuItem;
const peer:MatMenuItem=item;
const owned:InjectionToken<MatMenuPanel>=MAT_MENU_PANEL;
class Derived extends MatLegacyMenuItem {value='consumer';}
new MatLegacyMenuItem(); new Derived();`;
const negative=`import {MatLegacyMenuItem} from '${leaf}';
new MatLegacyMenuItem({}); new MatLegacyMenuItem({}, {}, {}, {}, {});`;
const options={strict:true,strictPropertyInitialization:false,noEmit:true,noImplicitOverride:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,allowImportingTsExtensions:true};
function compile(text,withoutLanguageAcknowledgement=false){const host=ts.createCompilerHost(options),read=host.readFile.bind(host),exists=host.fileExists.bind(host);host.readFile=p=>p===fixture?text:p===leaf&&withoutLanguageAcknowledgement?read(p).replace('// @ts-expect-error TS2377: the returned genuine parent instance initializes this.',''):read(p);host.fileExists=p=>p===fixture||exists(p);
 host.resolveModuleNames=(names,from)=>names.map(name=>ts.resolveModuleName(name,name.startsWith('.')||name.startsWith('/')?from:runtime+'/source.ts',options,host).resolvedModule);
 const program=ts.createProgram([fixture],options,host);return {diagnostics:ts.getPreEmitDiagnostics(program).map(d=>({path:d.file?.fileName,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')})),sources:program.getSourceFiles().filter(f=>f.fileName.startsWith(root+'/projects/')).map(f=>({path:f.fileName.slice(root.length+1),sha256:createHash('sha256').update(readFileSync(f.fileName)).digest('hex')}))};}
const naked=compile(positive,true);assert.equal(naked.diagnostics.length,1);assert.equal(naked.diagnostics[0].code,2377);assert.equal(naked.diagnostics[0].path,leaf);
const good=compile(positive),bad=compile(negative);assert.deepEqual(good.diagnostics,[]);assert.equal(bad.diagnostics.length,2);assert.deepEqual(bad.diagnostics.map(d=>d.code),[2554,2554]);
const api=await import(pathToFileURL(root+'/scripts/api-surface.mjs').href),source=ts.createSourceFile(leaf,readFileSync(leaf,'utf8'),ts.ScriptTarget.Latest,true);
const shape=api.packedShape(source,'MatLegacyMenuItem'),declaration=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyMenuItem');
const original=api.originalInheritedConstructor('/original/src/material/legacy-menu/menu-item.ts','MatLegacyMenuItem');
assert.equal(original.signatures.length,2);assert.equal(api.diParamsOf(declaration,source).length,0);
const specPath=base+'menu.spec.ts',spec=ts.createSourceFile(specPath,readFileSync(resolve(root,specPath),'utf8'),ts.ScriptTarget.Latest,true);assert.equal(spec.parseDiagnostics.length,0);
const report={role:'Accepted zero-argument DI constructor/real parent nominal typing and owned panel token source diagnostic',node:process.version,compiler:ts.version,peer:'read-only installed22.1.7',options,positive_fixture:positive,negative_fixture:negative,positive:good,negative:bad,language_boundary:naked,leaf_shape:shape,constructor_di:[],original_inherited_constructor:original,native_spec:{path:specPath,sha256:createHash('sha256').update(readFileSync(resolve(root,specPath))).digest('hex'),syntax_diagnostics:spec.parseDiagnostics.length,prepared:3,executed:0},limits:['Original two manual overloads are intentionally replaced only under the recorded menu-specific owner decision.','Not a native input/query/provider execution, packed factory/AOT, actual21, canonical toolchain or consumer-floor qualification.']};
if(out){assert.equal(existsSync(out),false);writeFileSync(out,JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify({positive_diagnostics:good.diagnostics.length,expected_negative_diagnostics:bad.diagnostics.length,owned_modules:good.sources.length,native_syntax_diagnostics:spec.parseDiagnostics.length,source_shape:shape,language_boundary_diagnostic:naked.diagnostics[0].code}));
