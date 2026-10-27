/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Parse actual module imports; quoted source fixtures are data, not dependencies. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {posix,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ts=createRequire(import.meta.url)('typescript');

export function historicalConsumerModuleGraph({probe,paths,load}){
  const index=new Set(paths),seen=new Set(),inputs=new Set(),queue=[probe];
  assert.ok(index.has(probe));
  while(queue.length){
    const path=queue.pop();if(seen.has(path))continue;seen.add(path);
    const file=ts.createSourceFile(path,load(path),ts.ScriptTarget.Latest,true);
    assert.equal(file.parseDiagnostics.length,0,'invalid historical module '+path);
    const dependency=name=>{
      if(!name.startsWith('.'))return;
      const next=posix.normalize(posix.join(posix.dirname(path),name));
      assert.ok(index.has(next),'missing actual historical local module '+next);
      inputs.add(next);if(/\.(?:mjs|cjs|js)$/.test(next))queue.push(next);
    };
    for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
      assert.ok(ts.isStringLiteral(node.moduleSpecifier));dependency(node.moduleSpecifier.text);
    }
    const visit=node=>{
      if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||
        (ts.isIdentifier(node.expression)&&node.expression.text==='require'))&&node.arguments.length&&ts.isStringLiteral(node.arguments[0]))dependency(node.arguments[0].text);
      if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){
        const value=node.text;if(index.has(value))inputs.add(value);
        if(/^(?:compatibility|scripts|tests|testing|projects)\/.+-$/.test(value))for(const candidate of index)if(candidate.startsWith(value))inputs.add(candidate);
      }
      ts.forEachChild(node,visit);
    };visit(file);
  }
  return {modules:[...seen].sort(),inputs:[...inputs].sort(),parser:{node:process.version,typescript:ts.version}};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const input=JSON.parse(readFileSync(0,'utf8'));assert.match(input.reference,/^[0-9a-f]{40}$/);
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
  const result=historicalConsumerModuleGraph({probe:input.probe,paths:input.paths,load:path=>execFileSync('git',
    ['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',input.reference+':'+path],{cwd:process.cwd(),env,encoding:'utf8',maxBuffer:8*1024*1024})});
  console.log(JSON.stringify(result));
}
