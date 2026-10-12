/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{createRequire}from'node:module';import{dirname,join,resolve}from'node:path';import{fileURLToPath,pathToFileURL}from'node:url';
import{reviewCommonModuleTemplateUses}from'../scripts/common-module-template-use-review.mjs';import{prepareMaterialPublicSubjects}from'../scripts/material-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p),'utf8');
const review=reviewCommonModuleTemplateUses({root}),file='projects/ngx-material-legacy/legacy-paginator/paginator-module.ts',source=read(file),html='projects/ngx-material-legacy/legacy-core/option/option.html';
const controls=[['type-only-module',file,source.replace('{CommonModule}','{type CommonModule}')],['missing-import-use',file,source.replace('    CommonModule,','')],['runtime-instantiation',file,source+'\nconst extra = new CommonModule();\n'],['shadowed-module',file,source+'\nconst CommonModule = class UnexpectedModule {};\n'],['missing-import',file,source.replace("import {CommonModule} from '@angular/common';",'')],['retired-template-directive',html,read(html)+'\n<span *ngIf="multiple"></span>\n']];
for(const[id,path,changed]of controls){assert.notEqual(changed,read(path));assert.throws(()=>reviewCommonModuleTemplateUses({root,readSource:p=>p===path?changed:read(p)}),assert.AssertionError,id);}
const loaded=prepareMaterialPublicSubjects(root),subjects=[];
try{for(const model of loaded.models){const declarations=[];
 for(const name of ['CommonModule','NgClass','NgTemplateOutlet']){const matches=[];for(const[path,text]of model.sources)if(path.startsWith('@angular/common/')&&path.endsWith('.d.ts')){const s=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);for(const n of s.statements)if(ts.isClassDeclaration(n)&&n.name?.text===name)matches.push({path,text,node:n});}assert.equal(matches.length,1,name);const {path,text,node}=matches[0];assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','experimental','docs-private'].includes(t.tagName.text)),name);declarations.push({name,path,sha256:hash(text)});}
 const core=await import(pathToFileURL(join(model.root,'node_modules/@angular/core/fesm2022/core.mjs')));await import(pathToFileURL(join(model.root,'node_modules/@angular/compiler/fesm2022/compiler.mjs')));const common=await import(pathToFileURL(join(model.root,'node_modules/@angular/common/fesm2022/common.mjs')));
 const ref=core.createNgModule(common.CommonModule,core.Injector.create({providers:[]}));assert.ok(ref.instance instanceof common.CommonModule);let destroyed=false;ref.onDestroy(()=>destroyed=true);ref.destroy();assert.ok(destroyed);subjects.push({line:model.line,declarations,genuine_public_module_factory_identity:true,public_destruction_hook:true});
 }
 const report={...review,subjects,negative_controls:controls.map(([id])=>({id,rejected:true})),producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),reviewer_sha256:hash(readFileSync(join(root,'scripts/common-module-template-use-review.mjs'))),public_subject_capsule_sha256:loaded.capsule_hash};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({callers:review.cases.length,subjects:subjects.length,source_negative_controls:controls.length}));
}finally{loaded.dispose();}
