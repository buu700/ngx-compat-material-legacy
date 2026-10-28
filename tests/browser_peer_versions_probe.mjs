/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Check actual source transport, not a parallel install recipe. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserPeerVersions} from '../scripts/browser-peer-versions.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),hash=raw=>createHash('sha256').update(raw).digest('hex');
if(process.argv[2]==='--versions'){
 const pkg=JSON.parse(process.argv[3]),options=JSON.parse(process.argv[4]??'{}');console.log(JSON.stringify(browserPeerVersions(pkg,options)));
}else{
 const line=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main';
 const transition=JSON.parse(readFileSync(join(root,'compatibility/rc/dialog-title-native-peer-input-transition.json')));
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 let miniBodies=0,functions=0;
 for(const row of transition.records.filter(row=>row.line===line)){
  const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',row.source_parent+':'+row.path],{cwd:root,env,maxBuffer:1024*1024}).toString();
  const after=readFileSync(join(root,row.path)).toString();assert.equal(hash(before),row.before_sha256);assert.equal(hash(after),row.after_sha256);
  if(row.literal_edits){let expected=before;for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2);expected=expected.replace(edit.before,edit.after);}assert.equal(after,expected);
   const marker='const ngc =';assert.equal(after.slice(after.indexOf(marker)),before.slice(before.indexOf(marker)),'changed mini runtime assertions');
   const parse=text=>ts.createSourceFile(row.path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
   const lab=file=>{const found=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='writeFileSync'&&node.arguments[0]?.getText(file).includes("'src/main.ts'"))found.push(node.arguments[1].getText(file));ts.forEachChild(node,visit);}visit(file);assert.equal(found.length,1);return found[0];};
   assert.equal(lab(parse(after)),lab(parse(before)),'changed mini lab source');miniBodies++;
  }else{
   const declarations=text=>{const file=ts.createSourceFile(row.path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);return new Map(file.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node.getText(file)]));};
   const a=declarations(before),b=declarations(after),removed=new Set(['exactVersion','readPackedPackage','versionsFor']),inputs=new Set(['candidateInstallSpec','fixtureQualificationDefects']);
   for(const [name,text]of a){if(removed.has(name)){assert.equal(b.has(name),false);continue;}assert.ok(b.has(name));if(!inputs.has(name)){assert.equal(b.get(name),text,'changed required-cell predicate '+name);functions++;}}
   assert.deepEqual([...b.keys()].sort(),[...a.keys()].filter(name=>!removed.has(name)).sort());
  }
 }
 assert.equal(miniBodies,5);assert.ok(functions>10);
 console.log(JSON.stringify({line,unchanged_mini_runtime_and_lab_bodies:miniBodies,unchanged_required_cell_function_bodies:functions,native_or_product_execution:false}));
}
