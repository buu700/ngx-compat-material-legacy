/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Distinguish an installed literal declaration from a cross-file TS source import. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd(),hash=raw=>createHash('sha256').update(raw).digest('hex');
const sourcePath='compatibility/rc/21x-table-local-compilation-source-compiler.json';
const raw=readFileSync(join(root,sourcePath)),source=JSON.parse(raw);
const cache=join(root,'.cache');mkdirSync(cache,{recursive:true});
const temporary=mkdtempSync(join(cache,'table-local-control-')),cells=[];
try{
  for(const mode of ['partial','experimental-local']){
    const before=source.cells.find(c=>c.mode===mode&&c.variant==='before');assert.ok(before);
    assert.equal(before.exit_code,0);assert.equal((before.fixture.match(/CDK_ROW_TEMPLATE,CdkHeaderRow/g)??[]).length,1);
    const fixture=before.fixture.replace('CDK_ROW_TEMPLATE,CdkHeaderRow','CdkHeaderRow')+"\nimport {ROW_TEMPLATE as CDK_ROW_TEMPLATE} from './template-source';\n";
    const template_source='export const ROW_TEMPLATE = '+JSON.stringify(source.row_template)+';\n';
    const cell=join(temporary,mode);mkdirSync(cell);
    writeFileSync(join(cell,'rows.ts'),fixture);writeFileSync(join(cell,'template-source.ts'),template_source);
    writeFileSync(join(cell,'tsconfig.json'),JSON.stringify(before.config,null,2)+'\n');
    const start=performance.now();
    const execution=spawnSync(process.execPath,[join(root,source.compiler_entry.path),'-p',join(cell,'tsconfig.json'),'--pretty','false'],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024,env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'}});
    assert.equal(execution.error,undefined,String(execution.error));assert.equal(execution.signal,null);
    const outputs=[];
    function collect(path){for(const entry of readdirSync(path,{withFileTypes:true})){
      const absolute=join(path,entry.name);if(entry.isDirectory())collect(absolute);else if(entry.isFile()){
        const bytes=readFileSync(absolute);outputs.push({path:relative(cell,absolute),sha256:hash(bytes),bytes:bytes.length,body:bytes.toString()});
      }
    }}
    if(execution.status===0)collect(join(cell,'out'));
    cells.push({mode,variant:'cross-file-source-control',strictTemplates:true,fixture,fixture_sha256:hash(fixture),template_source,template_source_sha256:hash(template_source),config:before.config,exit_code:execution.status,seconds:Math.round((performance.now()-start)*1000)/1000000,stdout:execution.stdout,stderr:execution.stderr,outputs});
    console.log(JSON.stringify({mode,variant:'cross-file-source-control',exit_code:execution.status,outputs:outputs.length,seconds:cells.at(-1).seconds}));
  }
  const producerPath=relative(root,new URL(import.meta.url).pathname);
  const report={schema_version:1,line:'21.x',role:'Actual compiler mode differential control; no product repair or full consumer acceptance',node:process.version,producer:{path:producerPath,sha256:hash(readFileSync(join(root,producerPath)))},prior_compiler:{path:sourcePath,sha256:hash(raw),bytes:raw.length},packages:source.packages,compiler_entry:source.compiler_entry,cells,product_changes:0,workspace_build_executed:false,consumer_build_executed:false,native_or_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
  assert.equal(process.argv.length,3);writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}finally{rmSync(temporary,{recursive:true,force:true});}
