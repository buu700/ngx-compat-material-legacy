/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current source judgment; the registered native gate remains mandatory. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {historicalBehaviorRequirements,HISTORICAL_BEHAVIOR_KIND} from './upstream-historical-behavior-evidence.mjs';

export const AUTOCOMPLETE_LANDSCAPE_SHA='008212a9807fd01fd32fe136a075763b7b2c854d';
export const AUTOCOMPLETE_LANDSCAPE_REVIEW='compatibility/f10/disposition-ledger/evidence/closeout-autocomplete-landscape-individual-source-judgment.json';
const prefix='compatibility/rc/autocomplete-landscape-',hash=raw=>createHash('sha256').update(raw).digest('hex');
const ts=createRequire(import.meta.url)('typescript');
const objectHash=(kind,text)=>createHash('sha1').update(kind+' '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
const checkpointPins={main:'7a542de44d39dce6b6c81bfac4bcd4c503452de06f4329fb72a505f8e44b9925',
  '21.x':'4bc5e982d8ca9c65ae8ec6be23fdc9b0e5b19ed3dc4cb50bf4581f59c6747c18'};

export function autocompleteLandscapeSourceJudgment({root,read=path=>readFileSync(join(root,path)),line}={}){
  const bound=new Map(),member=(path,expected)=>{
    const raw=read(path),ref={path,sha256:hash(raw),bytes:raw.length};
    if(expected)assert.equal(ref.sha256,expected,'changed landscape source subject '+path);
    bound.set(path,ref);return raw;
  },ref=path=>{member(path);return bound.get(path);};
  const manifest=JSON.parse(member('projects/ngx-material-legacy/package.json'));
  const actualLine=manifest.version.startsWith('21.')?'21.x':'main';
  line??=actualLine;assert.equal(line,actualLine);
  assert.equal(process.versions.node,JSON.parse(member('toolchain-lock.json')).repository.node);
  assert.equal(ts.version,JSON.parse(member('package.json')).devDependencies.typescript);
  const checkpointPath=prefix+'current-source-review.json';
  const checkpoint=JSON.parse(member(checkpointPath,checkpointPins[line]));
  assert.equal(checkpoint.sha,AUTOCOMPLETE_LANDSCAPE_SHA);assert.equal(checkpoint.line,line);
  assert.equal(checkpoint.original_files,2);assert.equal(checkpoint.original_hunks,6);
  assert.equal(checkpoint.native_contract_registered,false,'the original intake receipt is immutable');
  const originals=JSON.parse(gunzipSync(member(checkpoint.upstream_originals.path,checkpoint.upstream_originals.sha256)));
  assert.equal(objectHash('commit',originals.raw_commit),AUTOCOMPLETE_LANDSCAPE_SHA);
  const patch='compatibility/rc/resource-style-upstream-patches/'+AUTOCOMPLETE_LANDSCAPE_SHA+'.patch';
  assert.equal(member(patch).toString(),originals.diff);
  assert.equal(hash(originals.diff),'6aef092d6a8579b310fbf94242da1a1adf3125f3934ba5d7649d56f49290855b');
  assert.deepEqual(originals.members.map(row=>row.path),['src/material/autocomplete/autocomplete-trigger.ts','src/material/autocomplete/autocomplete.spec.ts']);
  for(const original of originals.members)for(const side of ['before','after']){
    const value=original[side];assert.equal(objectHash('blob',value.text),value.git_blob);
    assert.equal(hash(value.text),value.sha256);assert.equal(Buffer.byteLength(value.text),value.bytes);
  }
  for(const row of checkpoint.current_sources){const raw=member(row.path,row.sha256);assert.equal(raw.length,row.bytes);}
  const diagnostic=JSON.parse(gunzipSync(member(checkpoint.diagnostic.path,checkpoint.diagnostic.sha256)));
  member(checkpoint.diagnostic_producer.path,checkpoint.diagnostic_producer.sha256);
  assert.equal(diagnostic.source.sha256,checkpoint.current_sources[0].sha256);
  assert.equal(diagnostic.node,process.version);assert.equal(diagnostic.typescript,ts.version);assert.equal(diagnostic.line,line);
  assert.equal(diagnostic.floors.length,2);assert.ok(diagnostic.floors.every(row=>row.cases.length===7&&row.cases.every(c=>c.result==='pass')));
  assert.equal(diagnostic.mutants.length,6);assert.ok(diagnostic.mutants.every(row=>row.result==='rejected'&&row.failed_case_ids.length));
  const minimums=JSON.parse(member(prefix+'cdk-sources/identities.json')),minimum=minimums.find(row=>row.line===line);
  assert.ok(minimum);assert.equal(manifest.peerDependencies['@angular/cdk'],'^'+minimum.version);
  const peer=realpathSync(join(root,'node_modules/@angular/cdk')),external=[];
  for(const row of minimum.members){
    const retained=gunzipSync(member(row.retained.path,row.retained.sha256));assert.equal(hash(retained),row.member_sha256);
    external.push({path:join(peer,row.archive_member.replace(/^package\//,'')),sha256:row.member_sha256});
  }
  const externalManifest=readFileSync(join(peer,'package.json'));
  assert.equal(JSON.parse(externalManifest).version,minimum.version);
  external.push({path:join(peer,'package.json'),sha256:hash(externalManifest)});
  const assertExternal=()=>{assert.equal(realpathSync(join(root,'node_modules/@angular/cdk')),peer);
    for(const row of external)assert.equal(hash(readFileSync(row.path)),row.sha256,'changed installed landscape peer member');};
  assertExternal();
  const layout=ts.createSourceFile('layout.d.ts',readFileSync(join(peer,'types/layout.d.ts')).toString(),ts.ScriptTarget.Latest,true);
  const observer=layout.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='BreakpointObserver');assert.ok(observer);
  assert.equal(observer.getFullText(layout).includes('@deprecated'),false);
  assert.ok(observer.members.some(node=>node.name?.getText(layout)==='observe'));
  const exported=layout.statements.filter(ts.isExportDeclaration).flatMap(node=>node.exportClause?.elements?.map(n=>n.name.text)??[]);
  assert.ok(exported.includes('BreakpointObserver')&&exported.includes('Breakpoints'));
  const breakpointDeclaration=layout.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(layout)==='Breakpoints'));
  assert.ok(breakpointDeclaration);assert.equal(breakpointDeclaration.getFullText(layout).includes('@deprecated'),false);
  assert.ok(breakpointDeclaration.getText(layout).includes('HandsetLandscape: string;'));
  const definition=historicalBehaviorRequirements(AUTOCOMPLETE_LANDSCAPE_SHA);assert.ok(definition);
  assert.equal(definition.patch,hash(originals.diff));assert.equal(definition.kind,'autocomplete-landscape-viewport');
  assert.deepEqual(definition.cases,checkpoint.proposed_named_native_requirements.map(({index,...row})=>row));
  const sourceMembers=definition.members.map(path=>{const {sha256}=ref(path);return {path,sha256};});
  const controlsPath=prefix+'native-contract-controls.json',controls=JSON.parse(member(controlsPath));
  member('tests/autocomplete_landscape_admission_probe.mjs',controls.producer_sha256);
  assert.equal(controls.sha,AUTOCOMPLETE_LANDSCAPE_SHA);assert.equal(controls.line,line);
  assert.equal(controls.complete_synthetic_admission_passed,true);assert.equal(controls.prior_scopes_preserved,10);
  assert.equal(controls.prior_validator_and_regression_requirements_unchanged,true);assert.equal(controls.rejected.length,28);
  assert.equal(controls.actual_browser_artifact_or_floor_executed,false);
  const matrix=JSON.parse(member('compatibility/rc/matrices/full-verify.json'));
  const ids=Object.values(matrix.checks.find(row=>row.check_id==='historical-legacy-artifact').acceptance.cases_by_line[line]).flat();
  assert.equal(ids.length,2236);assert.equal(new Set(ids).size,2236);assert.ok(definition.cases.every(row=>ids.includes(row.case_id)));
  const decision='The complete two-file/six-hunk patch is adapted in the owned legacy trigger. Its supplied public view injector resolves the nondeprecated public BreakpointObserver at the advertised CDK '+minimum.version+' minimum while retaining the historical eleven-argument constructor. One fixed HandsetLandscape subscription is created before first overlay attachment and reused across close/reopen. It sets flexible dimensions/growth/margin to true/true/8 in landscape and false/false/0 otherwise, and teardown unsubscribes without completing the borrowed observer. The original comment adds no behavior. The sole upstream MDC spec offset change does not replace the legacy75px selector/geometry assertion. Five exact existing native tests are mandatory in the complete same-run packed/historical suite. Current source-protocol/lifetime diagnostics and corruption controls support this source decision; actual Angular geometry, artifact behavior and runtime/peer floors require their separate executions. No product API, HTML, CSS or SCSS change is required.';
  const body={schema_version:1,line,sha:AUTOCOMPLETE_LANDSCAPE_SHA,status:'reviewed',final_disposition:'already-adapted',
    review_depth:'individual-compatibility',reviewer:'Codex primary implementer; independent complete audit remains separate',
    patch_file:patch,diff_sha256:definition.patch,original_files:2,original_hunks:6,
    hunk_reviews:checkpoint.complete_original_hunk_reviews,decision,
    original_source_intake:bound.get(checkpointPath),original_source_intake_role:'Authenticated pre-registration whole-patch inspection; its native-registration gap is closed by the separately required current contract.',
    current_owned_sources:checkpoint.current_sources,current_public_CDK_minimum:minimum.version,
    private_node:process.version,private_typescript:ts.version,diagnostic:bound.get(checkpoint.diagnostic.path),
    source_diagnostic_cases_per_retained_minimum:7,source_diagnostic_retained_minima:2,source_diagnostic_mutants_rejected:6,
    native_contract_controls:bound.get(controlsPath),required_named_native_cases:definition.cases,complete_historical_case_count:2236,
    public_layout_exports_non_deprecated:true,original_legacy75px_assertion_retained:true,
    consumer_TS_HTML_CSS_SCSS_changes_required:false,actual_native_browser_artifact_or_floor_executed:false,g11_claim:'not-passed'};
  return {body,proof:{proof_kind:HISTORICAL_BEHAVIOR_KIND,review_depth:'individual-compatibility',diff_sha256:definition.patch,
    affected_branches:[line],decision,historical_behavior:{kind:definition.kind,case_ids:definition.cases.map(row=>row.case_id),source_members:sourceMembers}},
    bound:[...bound.values()],assertExternal};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,4);assert.equal(process.argv[2],'--out');
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),{body}=autocompleteLandscapeSourceJudgment({root});
  writeFileSync(process.argv[3],JSON.stringify(body,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:body.line,sha:body.sha,source_review:'complete',original_hunks:body.original_hunks,
    required_named_native_cases:body.required_named_native_cases.length,native_browser_artifact_or_floor_executed:false}));
}
