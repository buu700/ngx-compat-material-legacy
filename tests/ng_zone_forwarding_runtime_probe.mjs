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
import {reviewNgZoneForwarding} from '../scripts/ng-zone-forwarding-use-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const reviewed=reviewNgZoneForwarding({root}),printer=ts.createPrinter({removeComments:true});
function mutate(row,kind) {
  const source=ts.createSourceFile('constructor.js',row.current,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const transformed=ts.transform(source,[context=>node=>ts.visitNode(node,function visit(n) {
    if((ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.SuperKeyword&&row.target==='super')||
        (ts.isNewExpression(n)&&n.expression.getText(source)===row.target)) {
      const args=[...n.arguments],name=args[row.parentZoneIndex];
      if(kind==='drop-zone')args.splice(row.parentZoneIndex,1);
      if(kind==='clone-zone')args[row.parentZoneIndex]=ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('Object'),'create'),undefined,[name]);
      if(kind==='wrong-zone')args[row.parentZoneIndex]=ts.factory.createObjectLiteralExpression();
      return ts.isNewExpression(n)?ts.factory.updateNewExpression(n,n.expression,n.typeArguments,args):
        ts.factory.updateCallExpression(n,n.expression,n.typeArguments,args);
    }
    return ts.visitEachChild(n,visit,context);
  })]);
  try{return printer.printFile(transformed.transformed[0]);}finally{transformed.dispose();}
}
const payload=reviewed.payload.map(row=>({...row,mutations:Object.fromEntries(
  ['drop-zone','clone-zone','wrong-zone'].map(kind=>[kind,mutate(row,kind)]))}));
const sourceControls=[];
for(const row of [...new Map(reviewed.cases.map(row=>[row.file,row])).values()]) {
  const file='projects/ngx-material-legacy/'+row.file,raw=readFileSync(join(root,file),'utf8');
  const altered=raw.replace(/\bngZone:\s*NgZone\b/g,'ngZone: any');assert.notEqual(altered,raw);
  assert.throws(()=>reviewNgZoneForwarding({root,readSource:path=>path===file?altered:readFileSync(join(root,path),'utf8')}));
  sourceControls.push({file:row.file,id:'wrong-constructor-type-rejected',result:'pass'});
}
const checkbox='projects/ngx-material-legacy/legacy-checkbox/checkbox.ts';
const checkboxSource=readFileSync(join(root,checkbox),'utf8');
const changedPrefix=checkboxSource.replace("'mat-checkbox-'", "'mat-checkbox- '");
assert.notEqual(changedPrefix,checkboxSource);
assert.throws(()=>reviewNgZoneForwarding({root,readSource:path=>path===checkbox?changedPrefix:readFileSync(join(root,path),'utf8')}),
  error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('complete constructor and field initialization differ'));
sourceControls.push({file:'legacy-checkbox/checkbox.ts',id:'literal-whitespace-change-cannot-match-original',result:'pass'});
const loaded=prepareMaterialPublicSubjects(root),results=[],declarations=[];
try {
  const worker=readFileSync(join(root,'tests/ng_zone_forwarding_runtime_subject.mjs'),'utf8');
  for(const model of loaded.models) {
    const matches=[];
    for(const[path,text]of model.sources)if(path.startsWith('@angular/core/')&&path.endsWith('.d.ts')) {
      const source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
      const node=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='NgZone');
      if(node){assert.ok(!ts.getJSDocTags(node).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)));
        matches.push({path,source_sha256:hash(text),public_class_markers:[]});}
    }
    assert.equal(matches.length,1);declarations.push({line:model.line,...matches[0]});
    const subject=installNgZonePublicSubject(model,root);
    writeFileSync(join(model.root,'ng-zone-forwarding-payload.json'),JSON.stringify(payload));
    const path=join(model.root,'ng-zone-forwarding-subject.mjs');writeFileSync(path,worker);
    for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of[false,true]) {
      const output=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path,model.line,mode,String(production)],
        {cwd:model.root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024}));
      results.push({line:model.line,mode,production,zone_subject:subject,borrowed:model.borrowed,...output});
    }
  }
  assert.equal(results.length,10);
  const report={schema_version:1,node:process.version,binding_parser:ts.version,
    producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),
    checker_sha256:hash(readFileSync(join(root,'scripts/ng-zone-forwarding-use-review.mjs'))),
    worker_sha256:hash(worker),original_subject:reviewed.original_subject,
    public_namespace_capsule_sha256:loaded.capsule_hash,cases:reviewed.cases,inventory:reviewed.inventory,
    declarations,results,source_controls:sourceControls,
    scope:reviewed.scope+' Complete construction phases execute with genuine original/minimum public NgZone instances/providers. All other constructor services and parents are recording protocols; methods/decorators/factories and parent scheduling do not execute. No native/packed/runtime-floor qualification.'};
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({forwarding_uses:7,construction_phases:8,subjects:10,construction_cases:80,
    mutation_rejections:240,source_controls:8,native_or_packed_qualified:false}));
}finally{loaded.dispose();}
