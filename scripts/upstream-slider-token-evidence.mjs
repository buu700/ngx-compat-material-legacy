/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bind one individual frozen Sass decision; no native/packed or security clearance. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const SLIDER_TOKEN_SHA='b13c6aa194cf560a304213961ae28725f8d0a4e2';
export const SLIDER_TOKEN_ROLE='C04 individual modern slider token rewrite versus complete frozen Sass export scope';
const patchHash='5745eadda9bcee6dd8ba3863a3875cde57c13746d5670337aca241009b4927eb';
const identityHash='324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe';
// Independently compiled from the authenticated untouched16 source, never the candidate.
const originalCss={
 'legacy-slider-color':['78dd429f69a8c928e4298a3773023dcd39da2a8fa4ccb8dc05d98e7077680b8d','78dd429f69a8c928e4298a3773023dcd39da2a8fa4ccb8dc05d98e7077680b8d'],
 'legacy-slider-theme':['400aa36e3056f1cc457e8c932df414065c2a1f8904bdbd86d10d1381adaa8d82','a57b43962115acb450026b062c26a5403305cef1c78ac7240fecb4e40d366cb7'],
 'legacy-slider-typography':['a445e90a2e7406bef9e287c87d0a8f721969710542bcc28253209d3960096004','a445e90a2e7406bef9e287c87d0a8f721969710542bcc28253209d3960096004'],
 'slider-color':['38488e5aa34f80fa2e4eb60d624be6591a4edc2a32c60be8951c4f9573afd2ed','38488e5aa34f80fa2e4eb60d624be6591a4edc2a32c60be8951c4f9573afd2ed'],
 'slider-density':['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855','e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
 'slider-theme':['4a490bfe6ea5e05d45ec16fcd3cb422b42e3604f71463b3e34da3e8aff160ec0','e82212ad6be755365d48e9dad0ce6663ceef0eb2699c7f097b9fec8268dc1775'],
 'slider-typography':['e8d6ac89a5f4f6599dcac836b336ebb30c257932eb5e757c276abdf5905f21fb','e8d6ac89a5f4f6599dcac836b336ebb30c257932eb5e757c276abdf5905f21fb'],
};
export function sliderTokenEvidenceOk(body,entry,readRepo,line){
 try{
  assert.equal(entry.sha,SLIDER_TOKEN_SHA);assert.equal(body.sha,entry.sha);assert.equal(body.role,SLIDER_TOKEN_ROLE);assert.equal(body.schema_version,1);
  assert.equal(body.line,line);assert.deepEqual(body.affected_branches,['main','21.x']);assert.equal(body.review_depth,'individual-compatibility');
  const product=JSON.parse(readRepo('projects/ngx-material-legacy/package.json'));assert.equal(product.version.startsWith('21.')?'21.x':product.version.startsWith('22.')?'main':null,line);
  assert.equal(body.g11_claim,'not-passed');assert.equal(body.final_disposition,'do-not-adopt');assert.equal(entry.final_disposition,body.final_disposition);assert.equal(entry.reason,body.decision);
  for(const field of ['packed_artifact_used','native_rendering_executed','current_modern_slider_behavior_qualified','full_651_or_498_executed','floor_matrix_executed','production_source_changes','required_consumer_HTML_CSS_SCSS_changes'])assert.equal(body.qualification[field],false);
  assert.equal(body.qualification.source_css_only,true);
  assert.equal(hash(readRepo(entry.evidence_report)),entry.source_check.evidence_report_sha256);
  const patch=readRepo(body.patch_file);assert.equal(hash(patch),patchHash);assert.equal(body.diff_sha256,patchHash);assert.equal(patch.length,body.patch_bytes);
  const paths=patch.toString().split('\n').filter(r=>r.startsWith('diff --git ')).map(r=>r.split(' b/')[1]);assert.equal(paths.length,5);assert.deepEqual(body.patch_paths,paths);assert.deepEqual(entry.files,paths);
  const commit=Buffer.from(body.upstream_commit_object);assert.equal(hash(commit),body.upstream_commit_object_sha256);assert.equal(createHash('sha1').update(Buffer.from('commit '+commit.length+'\0')).update(commit).digest('hex'),entry.sha);
  assert.deepEqual(entry.individual_proof,{diff_sha256:patchHash,review_depth:'individual-compatibility',proof_kind:'individual-frozen-sass-contract',affected_branches:['main','21.x'],decision:body.decision});
  assert.ok(Array.isArray(body.evidence));assert.equal(new Set(body.evidence.map(r=>r.path)).size,body.evidence.length);
  for(const e of body.evidence){const bytes=readRepo(e.path);assert.equal(hash(bytes),e.sha256);assert.equal(bytes.length,e.bytes);}
  for(const p of ['scripts/review-upstream-slider-token-sass.mjs','scripts/upstream-slider-token-evidence.mjs','fixtures/sass/mixin-argument-contracts.json','fixtures/sass/default-companion-contracts.json','compatibility/rc/original16-sass-source-diagnostic-identity.json','compatibility/handoff/codex-closeout/reference/companion-contract.csv'])assert.ok(body.evidence.some(e=>e.path===p));
  const data=JSON.parse(gunzipSync(readRepo('compatibility/rc/slider-token-historical-sass-diagnostic.json.gz')));
  assert.equal(data.producer_sha256,hash(readRepo('scripts/review-upstream-slider-token-sass.mjs')));
  assert.equal(data.line,line);assert.equal(data.source_only,true);assert.equal(data.production_source_changes,false);assert.equal(data.required_consumer_HTML_CSS_SCSS_changes,false);
  assert.equal(data.packed_artifact_used,false);assert.equal(data.native_execution,false);assert.equal(data.full_651_or_498_executed,false);assert.equal(data.g11_claim,'not-passed');assert.equal(data.negative_controls,14);
  const originalBytes=readRepo('compatibility/rc/original16-sass-source-diagnostic-identity.json');assert.equal(hash(originalBytes),identityHash);assert.equal(data.original_identity_sha256,identityHash);
  const original=JSON.parse(originalBytes),knownOriginal=new Map(Object.values(original.loaded_source_sets).flat().map(r=>[r.path,r]));
  const peer=JSON.parse(readRepo('fixtures/sass/default-companion-contracts.json')).peer_inputs[line],knownPeer=new Map(peer.sources.map(r=>[(r.root+1)+'/'+r.path,r]));
  const catalogBytes=readRepo('fixtures/sass/mixin-argument-contracts.json'),catalog=JSON.parse(catalogBytes);assert.equal(data.catalog_sha256,hash(catalogBytes));
  const wanted=catalog.cases.filter(p=>/^(?:legacy-)?slider-(?:color|typography|density|theme)$/.test(p.mixin));assert.equal(wanted.length,14);assert.deepEqual(data.rows.map(r=>r.case_id),wanted.map(r=>r.case_id));
  for(const [key,sources]of Object.entries(data.source_sets)){assert.equal(hash(JSON.stringify(sources)),key);assert.equal(new Set(sources.map(r=>r.root+'/'+r.path)).size,sources.length);}
  for(const [i,row]of data.rows.entries()){
   assert.equal(row.call,wanted[i].call);assert.equal(row.complete_css_matches,true);assert.equal(row.wrong_nonempty_css_rejected,true);
   assert.equal(row.original.css_sha256,originalCss[wanted[i].mixin][i%2]);
   assert.equal(row.original.loaded_sources_sha256,'eada570908021460ed3ea38ab6cde9666b315d1f3dd54c4712b4138c9daf5593');
   const program="@use '__entry__' as m;\n"+catalog.setup+'\n'+wanted[i].call+'\n';
   for(const [role,measurement]of [['original',row.original],['actual',row.actual]]){
    assert.equal(measurement.program_sha256,hash(program));assert.equal(hash(measurement.css),measurement.css_sha256);assert.equal(Buffer.byteLength(measurement.css),measurement.css_bytes);
    const sources=data.source_sets[measurement.loaded_sources_sha256];assert.ok(sources?.length);
    if(role==='actual')assert.equal(hash(JSON.stringify(sources.map(r=>[r.root,r.path]))),line==='main'?'a601d6087ef98db0fe4658a1b54f60eb93e8ad42622dab02eb1a8c23a2849bed':'f38b2579e34d2f96a2240c8b3fd88fb6c63f5456c1635c85fac6360777ac46cb');
    for(const r of sources){
     if(role==='original'){const expected=knownOriginal.get(r.path);assert.ok(expected);assert.equal(r.root,0);assert.equal(r.sha256,expected.sha256);assert.equal(r.bytes,expected.bytes);}
     else if(r.root===0){const bytes=readRepo('projects/ngx-material-legacy/'+r.path);assert.equal(hash(bytes),r.sha256);assert.equal(bytes.length,r.bytes);}
     else {const expected=knownPeer.get(r.root+'/'+r.path);assert.ok(expected);assert.equal(r.sha256,expected.sha256);assert.equal(r.bytes,expected.bytes);}
    }
   }
   assert.equal(row.actual.css,row.original.css);
  }
  assert.deepEqual(data.source_body_proof,body.candidate_style_scope.complete_source_bodies);assert.equal(body.candidate_style_scope.source_css_cases_per_line,14);assert.equal(body.candidate_style_scope.original_density_cases_empty,2);
  assert.equal(data.rows.filter(r=>r.case_id.startsWith('mixin-argument/slider-density/')&&r.original.css==='').length,2);
  for(const e of data.source_body_proof)assert.equal(hash(readRepo(e.path)),e.sha256);
  const modern=readRepo('projects/ngx-material-legacy/styles/slider/_slider-theme.scss').toString();
  assert.equal(hash(modern.replaceAll("'../vendor/mdc/","'@material/")),knownOriginal.get('@angular/material/slider/_slider-theme.scss').sha256);
  assert.equal(hash(readRepo('projects/ngx-material-legacy/styles/legacy-slider/_slider-theme.scss')),knownOriginal.get('@angular/material/legacy-slider/_slider-theme.scss').sha256);
  const companions=readRepo('compatibility/handoff/codex-closeout/reference/companion-contract.csv').toString().trim().split('\n').slice(1).map(r=>r.split(',')[0]);assert.equal(companions.length,13);assert.equal(companions.includes('slider'),false);
  return true;
 }catch{return false;}
}
