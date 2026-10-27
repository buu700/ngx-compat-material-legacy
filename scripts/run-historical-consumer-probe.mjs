#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact original-source subjects. Current contracts require their separate live checks. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {historicalConsumerChild} from './historical-consumer-child.mjs';
import {existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath='compatibility/rc/historical-consumer-source-subjects.json';
const stagerPath='scripts/historical-consumer-reference-fixture.py';
const stagerHash='ed6d9abef60885e0e5751043a6145b6d118af7d34052e104307a9261f8edfc3d';
const pins={main:'8a0d7419de3d3ed7e7d0825b5223174f05e34cff86d184bb0632dc16b8d16b36',
  '21.x':'aadca3d619b2f8bd017ee0ee3e90b894de826df57ebaad342501083aa200118e'};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const originalTimeoutSeconds={"historical-roster-reconciliation":60,"mixed-build-harness-source":90,"mixed-cdk-behavior-source":90,"mixed-compiler-build-source":90,"mixed-example-docs-source":90,"mixed-explicit-detection-source":90,"mixed-fixture-build-source":90,"mixed-global-zoneless-source":90,"mixed-peer-async-source":90,"mixed-strict-tests-source":90,"mixed-theming-source":90,"mixed-tree-source":90,"mixed-zone-moves-source":90,"spec-animation-fixture-source":180,"spec-cdk-async-source":60,"spec-date-tooltip-slider-source":60,"spec-final-fixture-source":90,"spec-import-cleanup-source":120,"spec-interaction-async-source":60,"spec-overlay-async-source":60,"spec-stability-source":60,"spec-wide-fixture-adapter":60,"spec-wide-fixture-source":60};

export function historicalConsumerSubject({root=rootDefault,family}={}){
  const version=JSON.parse(readEvidenceMember(root,'projects/ngx-material-legacy/package.json')).version;
  const line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;
  assert.ok(line,'unregistered historical consumer line');
  const raw=readEvidenceMember(root,catalogPath);assert.equal(hash(raw),pins[line],'historical consumer catalog changed');
  const catalog=JSON.parse(raw);assert.equal(catalog.line,line);assert.equal(catalog.entries.length,23);
  const subject=catalog.entries.find(row=>row.id===family);assert.ok(subject,'unknown historical consumer family');
  assert.equal(hash(readEvidenceMember(root,subject.probe)),subject.probe_sha256,'original consumer probe changed');
  assert.equal(hash(readEvidenceMember(root,stagerPath)),stagerHash,'historical consumer staging code changed');
  return {line,subject,catalog_sha256:hash(raw)};
}

export function runHistoricalConsumerProbe({root=rootDefault,family,originalReportPath,reportPath}={}){
  const {line,subject,catalog_sha256}=historicalConsumerSubject({root,family});
  const deadline=Date.now()+originalTimeoutSeconds[family]*1000-5000;
  if(originalReportPath)originalReportPath=resolve(originalReportPath);
  if(reportPath)reportPath=resolve(reportPath);
  for(const path of [originalReportPath,reportPath].filter(Boolean))assert.equal(existsSync(path),false,'report destination must be fresh');
  assert.ok(!originalReportPath||!reportPath||originalReportPath!==reportPath);
  const ownPath='scripts/run-historical-consumer-probe.mjs',ownHash=hash(readEvidenceMember(root,ownPath));
  const temporary=mkdtempSync(join(tmpdir(),'ngx-historical-consumer-'));
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES','RC_CHECK_ID','RC_RUN_ID','RC_INVOCATION_ID','RC_EVIDENCE_BINDING','RC_ASSERTION_OUTPUT_DIR'])delete env[key];
  const child=(command,args,cwd)=>{
    const remaining=deadline-Date.now();assert.ok(remaining>0,'original wrapper execution budget exhausted');
    const result=historicalConsumerChild(command,args,{cwd,env,timeout:remaining});
    assert.equal(result.status,0,(result.error?.message??'')+'\n'+result.stderr.slice(-8000));return result.stdout;
  };
  try{
    const staged=JSON.parse(child('python3',[join(root,stagerPath),root,line,family,temporary],root));
    const manifestRaw=readFileSync(join(temporary,'historical-reference-manifest.json')),manifest=JSON.parse(manifestRaw);
    assert.equal(manifest.reference_commit,subject.reference_commit);assert.equal(manifest.reference_tree,subject.reference_tree);
    assert.equal(manifest.consumer_extension.catalog_sha256,catalog_sha256);assert.equal(staged.family,family);
    assert.equal(staged.selected_members,manifest.members.length);
    const probe=manifest.members.find(row=>row.path===subject.probe);assert.ok(probe);assert.equal(probe.sha256,subject.probe_sha256);
    const args=[join(temporary,subject.probe)];
    if(originalReportPath){if(subject.report_option==='--out')args.push('--out');else assert.equal(subject.report_option,'positional');args.push(originalReportPath);}
    const stdout=child(process.execPath,args,temporary);
    const original=JSON.parse(originalReportPath?readFileSync(originalReportPath,'utf8'):stdout.trim().split('\n').at(-1));
    assert.equal(original.line,line);
    const producer=original.producer_sha256??original.producer?.sha256;
    // Some original reports omit this redundant self-reference. The exact
    // executed probe is authenticated by the Git manifest before and after it.
    if(producer!==undefined)assert.equal(producer,subject.probe_sha256,'original report producer differs');
    for(const ref of manifest.members){
      const raw=readEvidenceMember(temporary,ref.path);assert.equal(hash(raw),ref.sha256,'original consumer changed its subject '+ref.path);assert.equal(raw.length,ref.bytes);
    }
    const again=historicalConsumerSubject({root,family});assert.deepEqual(again.subject,subject);assert.equal(again.catalog_sha256,catalog_sha256);
    assert.equal(hash(readEvidenceMember(root,ownPath)),ownHash,'late historical consumer runner change');
    const report={schema_version:1,line,family,
      role:'Unchanged original-source probe and assertions at their recorded creation commit; no current-source substitution or qualification.',
      historical_subject:{reference_commit:subject.reference_commit,reference_tree:subject.reference_tree,
        manifest_sha256:hash(manifestRaw),members_sha256:manifest.members_sha256,selected_members:staged.selected_members,
        selected_bytes:staged.selected_bytes,local_module_closure:manifest.local_module_closure,
        all_selected_members_rehashed:true,original_probe_source_unchanged:true,
        staging:manifest.consumer_extension},
      original_report:original,original_stdout:stdout,current_source_qualified:false,current_contract_checks_required_separately:true,
      producer:{path:ownPath,sha256:ownHash},catalog:{path:catalogPath,sha256:catalog_sha256},
      current_product_or_original_Git_objects_written:false,actual_native_artifact_browser_rendered_or_floor_qualified:false,
      security_clearance:'not-passed',g11_claim:'not-passed',g13_claim:'not-passed'};
    if(reportPath)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    return report;
  }finally{rmSync(temporary,{recursive:true,force:true});}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),family=args.shift();let originalReportPath,reportPath;
  while(args.length){
    const flag=args.shift(),path=args.shift();assert.ok(path);
    if(flag==='--original-report'){assert.equal(originalReportPath,undefined);originalReportPath=path;}
    else{assert.equal(flag,'--report');assert.equal(reportPath,undefined);reportPath=path;}
  }
  const report=runHistoricalConsumerProbe({family,originalReportPath,reportPath});
  console.error(`Historical consumer subject: ${report.line}/${family} at ${report.historical_subject.reference_commit}; current contracts require separate live checks.`);
  process.stdout.write(report.original_stdout);
}
