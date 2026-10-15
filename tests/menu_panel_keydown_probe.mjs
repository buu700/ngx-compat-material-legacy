/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareRemainingIdentitySubjects} from '../scripts/remaining-identity-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),json=p=>JSON.parse(read(p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const line=json('projects/ngx-material-legacy/package.json').version.startsWith('21.')?'21.x':'main',worksheet=json('compatibility/rc/menu-keydown-worksheet.json'),lead=json('compatibility/rc/menu-item-token-packed-keydown-source-lead.json');
const provenance=json('reference/material-16.2.14/menu-keydown-sources/provenance.json');assert.equal(provenance.commit,lead.original.commit);
for(const member of provenance.members){const raw=read(member.path);assert.equal(hash(raw),member.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex'),member.git_blob);}
const original=read('reference/material-16.2.14/menu-keydown-sources/menu.html').toString();assert.equal(hash(original),lead.original.sha256);assert.equal(original,lead.original.source);
const current=read('projects/ngx-material-legacy/legacy-menu/menu.html').toString();assert.equal(current,lead.candidate.source);assert.equal(hash(current),worksheet.subjects[0].before_sha256);
const printer=ts.createPrinter({removeComments:true});
function method(path,text,name,clsName){const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);const cls=sf.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text===clsName);assert.ok(cls);const found=cls.members.filter(node=>ts.isMethodDeclaration(node)&&node.name.getText(sf)===name);assert.equal(found.length,1);return printer.printNode(ts.EmitHint.Unspecified,found[0],sf);}
const oldMethod=method('original-menu.ts',read('reference/material-16.2.14/menu-keydown-sources/material-menu.ts').toString(),'_handleKeydown','_MatMenuBase'),currentMethod=method('owned-menu.ts',read('projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts').toString(),'_handleKeydown','_MatMenuBase');
assert.equal(oldMethod.replace('    event.stopPropagation();\n',''),currentMethod,'current overlay routing removes only the old panel-level propagation stop');
const route=method('owned-trigger.ts',read('projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts').toString(),'_createOverlay','_MatMenuTriggerBase');
assert.equal(route.split('this._overlayRef.keydownEvents().subscribe').length,2);assert.equal(route.split('this.menu._handleKeydown(event);').length,2);
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const createOverlay=emit('class TriggerProtocol {'+route+'}'),handler=emit('class MenuProtocol {'+currentMethod+'}');
const mutants=[
 [createOverlay.replace('this.menu._handleKeydown(event);','void event;'),handler],
 [createOverlay.replace('this.menu._handleKeydown(event);','this.menu._handleKeydown(event);this.menu._handleKeydown(event);'),handler],
 [createOverlay.replace('this.menu._handleKeydown(event);','this.menu._handleKeydown({keyCode:0});'),handler],
 [createOverlay.replace('if (!this._overlayRef)','if (true)'),handler],
 [createOverlay,handler.replace('manager.onKeydown(event);','void event;')],
 [createOverlay,handler.replaceAll("this.closed.emit('keydown');",'void event;')]
];for(const [a,b]of mutants)assert.ok(a!==createOverlay||b!==handler);
const inputs=json('compatibility/rc/menu-keydown-template-source-census.json');assert.equal(inputs.total_owned_templates,30);assert.equal(inputs.templates.length,30);
const payload={original,current,createOverlay,handler,mutants,keycodeNames:['ESCAPE','LEFT_ARROW','RIGHT_ARROW','UP_ARROW','DOWN_ARROW','hasModifierKey'],templates:inputs.templates.map(row=>({...row,current_source:read(row.path).toString()}))};
const loaded=prepareRemainingIdentitySubjects(root),results=[];
try{for(const model of loaded.models){const worker=join(model.root,'menu-keydown-subject.mjs');writeFileSync(worker,read('tests/menu_panel_keydown_subject.mjs'));writeFileSync(join(model.root,'menu-keydown-payload.json'),JSON.stringify(payload));const output=execFileSync(process.execPath,[worker,model.line],{cwd:model.root,encoding:'utf8',timeout:10000});results.push({...JSON.parse(output.trim().split('\n').at(-1)),compiler_version:model.packages.get('@angular/compiler').version,cdk_version:model.packages.get('@angular/cdk').version});}}finally{loaded.dispose();}
const output={schema_version:1,line,source_parent:worksheet.source_parent,node:process.version,typescript:ts.version,role:'Corrected effective keyboard routing: genuine parser/current public dispatcher plus complete owned method protocols only',results,original_handler_sha256:hash(oldMethod),current_handler_sha256:hash(currentMethod),create_overlay_method_sha256:hash(route),earlier_missing_listener_inference:'withdrawn: existing public OverlayRef keydown forwarding was omitted from that caller analysis',product_changed:false,actual_packed_or_native_or_AOT_executed:false,g11_claim:'not-passed',source_inputs:['projects/ngx-material-legacy/legacy-menu/menu.html','projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts','projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts','reference/material-16.2.14/menu-keydown-sources/provenance.json','tests/menu_panel_keydown_probe.mjs','tests/menu_panel_keydown_subject.mjs'].map(path=>({path,sha256:hash(read(path))}))};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line,compiler_contexts:results.length,current_dispatcher_contexts:results.filter(r=>r.dispatcher).length,body_events:results.reduce((n,r)=>n+(r.dispatcher?.events||0),0),mutants_rejected:results.reduce((n,r)=>n+r.mutants_rejected,0),template_mapping:inputs.mapped,ordinary_missing_by_compiler:results.map(row=>({line:row.line,paths:row.template_census.filter(r=>r.original_ordinary_missing?.length).map(r=>r.path)})),product_changed:false,actual_packed_or_native_or_AOT_executed:false}));
