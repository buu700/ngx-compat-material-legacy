#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Original source controls execute only in their immutable historical subject. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const families={surface:'tests/spec_surface_async_source_probe.mjs',form:'tests/spec_form_async_source_probe.mjs',navigation:'tests/spec_navigation_async_source_probe.mjs'};
const args=process.argv.slice(2);assert.ok(args.length===2||args.length===4);
assert.equal(args[0],'--family');const family=args[1];assert.ok(Object.hasOwn(families,family),'unknown historical source family');
if(args.length===4)assert.equal(args[2],'--out');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const version=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version;
const line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
const temporary=mkdtempSync(join(tmpdir(),'ngx-historical-source-'));
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'RC_CHECK_ID','RC_RUN_ID','RC_INVOCATION_ID','RC_EVIDENCE_BINDING','RC_ASSERTION_OUTPUT_DIR'])delete env[key];
function child(command,argv,cwd){
  const result=spawnSync(command,argv,{cwd,env,encoding:'utf8',timeout:40000,maxBuffer:2*1024*1024});
  assert.equal(result.status,0,(result.error?.message??'')+'\n'+result.stderr.slice(-10000));return result.stdout;
}
try{
  const staged=JSON.parse(child('python3',[join(root,'scripts/historical-chip-reference-fixture.py'),root,line,temporary],root));
  const manifestPath=join(temporary,'historical-reference-manifest.json'),manifestRaw=readFileSync(manifestPath),manifest=JSON.parse(manifestRaw);
  assert.equal(manifest.line,line);assert.equal(manifest.reference_commit,staged.reference_commit);
  const output=child(process.execPath,[join(temporary,families[family])],temporary);
  const historical=JSON.parse(output.trim().split('\n').at(-1));assert.equal(historical.line,line);
  assert.equal(historical.g11_claim,'not-passed');assert.equal(historical.actual_Angular_native_artifact_or_floor_qualified,false);
  const producer=manifest.members.find(ref=>ref.path===families[family]);assert.ok(producer);
  assert.equal(historical.producer_sha256,producer.sha256);
  // The original probes are read-only. Rehash the complete selected historical
  // subject after their mutation controls, including all1141 product members.
  for(const ref of manifest.members){
    const path=join(temporary,ref.path);assert.equal(lstatSync(path).isFile(),true);assert.equal(lstatSync(path).isSymbolicLink(),false);
    const raw=readFileSync(path);assert.equal(hash(raw),ref.sha256,'original probe changed its historical subject '+ref.path);assert.equal(raw.length,ref.bytes);
  }
  const report={schema_version:1,line,family,
    role:'Unchanged original-source controls at their historical subject; current source is checked by the separate shared-owner gate.',
    historical_subject:{role:manifest.role,reference_commit:manifest.reference_commit,reference_tree:manifest.reference_tree,
      manifest_sha256:hash(manifestRaw),selected_members:manifest.members.length,selected_bytes:staged.bytes,
      local_module_closure:manifest.local_module_closure,all_selected_members_rehashed:true,original_probe_source_unchanged:true},
    historical_report:historical,current_source_qualified:false,
    producer:{path:'scripts/run-historical-source-inspector.mjs',sha256:hash(readFileSync(join(root,'scripts/run-historical-source-inspector.mjs')))},
    current_product_or_original_Git_objects_written:false,actual_Angular_native_artifact_rendered_or_floor_qualified:false,
    security_clearance:'not-passed',g11_claim:'not-passed',g13_claim:'not-passed'};
  if(args.length===4)writeFileSync(args[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report));
}finally{rmSync(temporary,{recursive:true,force:true});}
