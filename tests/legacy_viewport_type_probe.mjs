/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Strict source/actual declaration compatibility diagnostic; no current private runtime dependency. */
import{createRequire}from'node:module';import{readFileSync,writeFileSync}from'node:fs';import{resolve,dirname}from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),runtime=process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||root,req=createRequire(import.meta.url),ts=req('typescript'),argv=process.argv.slice(2),at=argv.indexOf('--report'),out=at<0?null:argv[at+1],sha=b=>createHash('sha256').update(b).digest('hex');
const path='projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts',full=resolve(root,path),model=JSON.parse(readFileSync(root+'/compatibility/rc/legacy-viewport-declaration-subjects.json','utf8'));
const subjects=[{line:'original',...model.original},...model.subjects],chunks=[`import{_LegacyViewport}from '${full}';`,`import{Platform}from '@angular/cdk/platform';`,`import{NgZone,OnDestroy}from '@angular/core';`,`import{Observable}from 'rxjs';`];
const captures=[];
for(const [index,subject] of subjects.entries()){
 const raw=readFileSync(resolve(root,subject.path));assert.equal(sha(raw),subject.sha256);const source=ts.createSourceFile(subject.path,raw.toString(),ts.ScriptTarget.Latest,true);
 const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='ViewportRuler'),position=source.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='ViewportScrollPosition');assert.ok(cls&&position);
 const members=cls.members.filter(m=>!(m.modifiers||[]).some(x=>x.kind===ts.SyntaxKind.StaticKeyword)).map(m=>m.getText(source));
 chunks.push(`declare namespace Subject${index}{ export interface ViewportScrollPosition ${position.members.length?'{'+position.members.map(m=>m.getText(source)).join('\n')+'}':'{}'}export class ViewportRuler implements OnDestroy {${members.join('\n')}}}`);
 chunks.push(`declare const supplied${index}:Subject${index}.ViewportRuler;const accepted${index}:_LegacyViewport=supplied${index};`);
 captures.push({line:subject.line,source_sha256:subject.sha256,members});
}
chunks.push(`declare const platform:Platform,zone:NgZone,document:Document;new _LegacyViewport(platform,zone,document);`,
 `declare const owned:_LegacyViewport;owned.change();owned.change(150);const size:Readonly<{width:number;height:number}>=owned.getViewportSize();const rect:{top:number;left:number;bottom:number;right:number;width:number;height:number}=owned.getViewportRect();`);
const positive=chunks.join('\n'),negative=positive+'\nowned.change("slow");owned.getViewportSize().width=7;owned.getViewportScrollPosition().top="bad";';
const fixture=resolve(root,'__legacy_viewport_structural_diagnostic__.ts'),options={strict:true,noImplicitOverride:true,strictPropertyInitialization:false,noEmit:true,skipLibCheck:true,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,allowImportingTsExtensions:true};
function compile(text){const host=ts.createCompilerHost(options),read=host.readFile.bind(host),exists=host.fileExists.bind(host);host.readFile=p=>p===fixture?text:read(p);host.fileExists=p=>p===fixture||exists(p);host.resolveModuleNames=(names,from)=>names.map(name=>ts.resolveModuleName(name,name.startsWith('.')||name.startsWith('/')?from:runtime+'/source.ts',options,host).resolvedModule);
 const program=ts.createProgram([fixture],options,host);return ts.getPreEmitDiagnostics(program).map(d=>({path:d.file?.fileName,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));}
const good=compile(positive),bad=compile(negative);assert.deepEqual(good,[]);assert.deepEqual(bad.map(d=>d.code).sort(),[2322,2345,2540]);
const source=ts.createSourceFile(path,readFileSync(full,'utf8'),ts.ScriptTarget.Latest,true);const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='_LegacyViewport');assert.equal(cls.members.filter(ts.isPropertyDeclaration).length,0);
const result={role:'Owned actual helper strict source plus original16/min21/min22 full instance declaration compatibility; private peer declarations are data only',node:process.version,compiler:ts.version,options,source:{path,sha256:sha(readFileSync(full))},captured_instances:captures,positive_fixture:positive,positive_diagnostics:good,negative_fixture:negative,expected_negative_diagnostics:bad,limits:['Actualhelper+read-only22public peers compile; original/min21/min22 private ruler declarations are preserved extracted data models for one-way supplied-object assignment.','No source current-private import,private cast or nominal brand requirement on the owned class.','No actual21 compiler/runtime,AOT/packed/root-singleton/native/floor qualification.']};if(out)writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({positive:good.length,expected_negative:bad.length,instance_assignments:captures.length}));
