/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current source qualification beside an explicitly historical probe subject. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {snackDomSourceContext,snackDomRawCurrentRead} from './snack-dom-source-context.mjs';
import {chipRepairPair,CHIP_SOURCE,CHIP_SPEC,CHIP_EMPTY_CASE} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const ts=createRequire(import.meta.url)('typescript');
const name='MatChipList > should clear a destroyed active chip when the list becomes empty';
const caseId='historical-legacy-artifact/original-and-shared-cases/src/material/legacy-chips/chip-list.spec.ts#87';
const sourcePaths=['scripts/historical-chip-current-subject.mjs','scripts/historical-chip-reference-fixture.py',
  'scripts/snack-dom-source-context.mjs','scripts/packed-upstream-ledger-epoch.mjs',
  'scripts/historical-case-roster.mjs','scripts/spec-stability-chip-repair.mjs',
  'testing/legacy-runner/historical-inventory.json','testing/legacy-runner/historical-specs.json',
  'compatibility/rc/matrices/full-verify.json','compatibility/f10/disposition-ledger/ledger.json','package.json','toolchain-lock.json'];

function method(text){
  const source=ts.createSourceFile('chip.ts',text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
  const found=[];function visit(node){if(ts.isMethodDeclaration(node)&&node.name?.getText(source)==='_updateFocusForDestroyedChips')found.push(node);ts.forEachChild(node,visit);}visit(source);
  assert.equal(found.length,1);return found[0].getText(source);
}
export function historicalChipCurrentSubject({root,read}={}){
  const supplied=read!==undefined;read??=p=>readFileSync(join(root,p));
  read=snackDomRawCurrentRead({root,read});const rawRead=read;
  const currentRead=path=>{
    assert.ok(typeof path==='string'&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));
    const raw=Buffer.from(rawRead(path));
    if(supplied){
      // Custom readers may carry old source. Genuine private peer links are
      // qualified by the owner's package/declaration checks; owned paths stay regular.
      const actual=path.split('/').includes('node_modules')?readFileSync(join(root,path)):readEvidenceMember(root,path);
      assert.equal(raw.equals(actual),true,'historical source presented as current '+path);
    }
    return raw;
  };
  const qualified=snackDomSourceContext({root,read:currentRead});assert.equal(qualified.raw,currentRead);
  const pair=chipRepairPair({root});assert.equal(qualified.line,pair.line);
  const chip=currentRead(CHIP_SOURCE).toString(),spec=currentRead(CHIP_SPEC).toString();
  const reference=pair.rows.find(row=>row.path===CHIP_SOURCE);
  assert.equal(method(chip),method(reference.after),'current chip-empty reset method differs from its authenticated repair');
  assert.equal(spec.split(CHIP_EMPTY_CASE).length,2,'current named chip-empty regression body differs');
  const roster=deriveHistoricalRoster(root),named=roster.cases.filter(row=>row.case_id===caseId);
  assert.equal(named.length,1);assert.equal(named[0].full_name,name);assert.equal(named[0].candidate,CHIP_SPEC);
  const matrix=JSON.parse(currentRead('compatibility/rc/matrices/full-verify.json'));
  const expected=Object.values(matrix.checks.find(row=>row.check_id==='historical-legacy-artifact').acceptance.cases_by_line[pair.line]).flat();
  const actual=[...roster.ids,...roster.discovery_negative_ids];
  assert.equal(expected.length,2236);assert.equal(new Set(expected).size,2236);
  assert.deepEqual([...actual].sort(),[...expected].sort());assert.ok(expected.includes(caseId));
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
  const paths=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','ls-files','--cached','--others','--exclude-standard','--','projects/ngx-material-legacy'],
    {cwd:root,env,encoding:'utf8'}).trim().split('\n').sort();
  assert.equal(paths.length,1142);assert.equal(new Set(paths).size,1142);
  // Acceptance of this full current population belongs to snackDomSourceContext.
  // This map only retains its actual observed bytes for late-change detection.
  const bound=new Map();for(const path of [...paths,...sourcePaths]){
    const raw=currentRead(path);assert.equal(raw.equals(readEvidenceMember(root,path)),true);bound.set(path,{path,sha256:hash(raw),bytes:raw.length});
  }
  const assertCurrent=()=>{
    const again=snackDomSourceContext({root,read:currentRead});assert.equal(again.line,pair.line);
    for(const ref of bound.values()){const bytes=readEvidenceMember(root,ref.path);assert.equal(hash(bytes),ref.sha256,'late current chip inspection subject '+ref.path);assert.equal(bytes.length,ref.bytes);}
  };
  return {line:pair.line,assertCurrent,bound:structuredClone([...bound.values()]),report:{
    role:'Actual current source qualified by the shared owner; no old source bytes are substituted.',
    line:pair.line,product_members:paths.length,owned_case_identities:roster.ids.length,
    discovery_negative_case_ids:roster.discovery_negative_ids.length,required_full_case_ids:actual.length,
    empty_query_reset_method_sha256:hash(method(chip)),authenticated_historical_reset_method_equal:true,
    required_empty_query_regression:{case_id:caseId,full_name:name,complete_case_body_sha256:hash(CHIP_EMPTY_CASE),complete_case_body_unchanged:true},
    source_owner:bound.get('scripts/snack-dom-source-context.mjs'),
    source_coordinator:bound.get('scripts/packed-upstream-ledger-epoch.mjs'),
    actual_chip_source:bound.get(CHIP_SOURCE),actual_chip_spec:bound.get(CHIP_SPEC),
    historical_read_used_for_current_subject:false,product_TS_HTML_CSS_SCSS_changes_required:0,
    actual_Angular_native_artifact_rendered_or_floor_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'}};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);assert.ok(args.length===0||args.length===2);
  if(args.length)assert.equal(args[0],'--out');
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),subject=historicalChipCurrentSubject({root});
  subject.assertCurrent();
  const report={schema_version:1,line:subject.line,current_subject:subject.report,
    observed_owned_members:subject.bound.length,observed_owned_members_sha256:hash(JSON.stringify(subject.bound)),
    producer:{path:'scripts/historical-chip-current-subject.mjs',sha256:hash(readFileSync(join(root,'scripts/historical-chip-current-subject.mjs')))},
    actual_Angular_native_artifact_rendered_or_floor_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
  if(args.length)writeFileSync(args[1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:subject.line,product_members:subject.report.product_members,
    owned_case_identities:subject.report.owned_case_identities,full_case_ids:subject.report.required_full_case_ids,
    named_empty_query_regression_preserved:true,historical_source_substituted:false,native_or_G13_qualified:false}));
}
