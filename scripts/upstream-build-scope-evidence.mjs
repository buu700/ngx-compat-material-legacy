/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Bind fourteen source-scope decisions; this supplies no runtime/security pass.
 */
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export const BUILD_SCOPE_ROLE = 'C04 finite individual source-scope reviews of fourteen upstream build SHAs';
export const BUILD_SCOPE_PATCHES = Object.freeze({
  ff4f9a093715b9552f2c2dfa1cb69656c70db182:'a859168f72a1557ac9925eb7a188ebf8b78dd48dfac04f3d4dffdf8e91a9f103',
  '8c35b62f65ed6cb9f56d9ad32ca558bb482c1e12':'3925d5bfcd468e1c5377efcb32ff4efab7c56ed3c30cd41899a0953fa4368e4c',
  '1c223d9ebff38a9fca38af554b601f121df7d99e':'786b71dfbdab2f96e518fcfadd36b72944a89de68909d75a7aaa019f14b6c051',
  d2e154c60cc124b882d0afd26256034bd3e22489:'e6d263c6964b1966eaafedbc38a916b94340a384af25f8b709765604c8217664',
  b5d4de9794cd6c826a9a2d4fb27e7e9e3cb884ac:'292cbabc2c126d25fd838e0974f5c231165eea98ef90cff7e646971b81662cac',
  ae9678df4b22be90ae27cec25224e364e91963f5:'cf615a0832b8862c79495b5df7579fb330add68830227f5416885ef06ed14cb8',
  '7af0f92fc5dd112933f096c18d3f1dfea4b8f052':'cc7dea61e0b5b62fd859e1b72859eb6c0c9f8cc5be8e58862a711d04228260e1',
  '5d27e7c0b454ef721b7a4dfdf99e18884f690378':'ee6f4ad83dd43cc70acdfdd338356ad30d8a22bbf8a5d95a4af5b78e49d69a1c',
  '207bc6cd48279538c58f6e275f5e758f940dee9e':'f2b9ccdde543bf6d27aa1d221c04d0e98538eb88ce47a7ccbd7f898d9d484709',
  '6fa655c99756abcd7e7c80040cc72e4aa98a4df5':'3df90cbffaf0a290442c22a4bce2c1c35a437dd35d2161ae173913c7a73bf5d2',
  e500a8ea9ad5043dd2775b39e395204b5cbdb78b:'79e53f9deb9008512c43bf1144b61b453b48916136c7d870f5310df1b223b1f3',
  efea6041e057607efbfa4ec7caf0d2952150038f:'d3103e4694618836074a7d897ecaf960be95862f735edab5d095b106c812b41f',
  '5373ced467ba58315abf22bc96c0c24583467776':'93b85efc9b9013ee4e78212ba24de8be6fa89530074c48f71c63f38155ffd819',
  d67ac1f67efab6460f7a9544cb423aac5d6cd325:'1b1603431e9a89deefbe03bfe5606cee9b92603c6b23b6d0685996ec26271439',
});
const contextPaths=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','projects/ngx-material-legacy/package.json',
  'projects/ngx-material-legacy/ng-package.json','projects/ngx-material-legacy/tsconfig.lib.json','scripts/pack-library.mjs',
  'chainman.toml','chainman.lock','flake.nix','.github/workflows/ci.yml'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const isBazel=path=>path.endsWith('.bazel')||path.endsWith('.bzl')||path==='.bazelrc';

export function buildScopeEvidenceOk(body,entry,readRepo,currentProductPaths) {
  try {
    assert.equal(body.role,BUILD_SCOPE_ROLE);assert.equal(body.g11_claim,'not-passed');
    const mainOnly=body.scope_format==='main-source-scope-v1';
    if(mainOnly){
      assert.equal(body.line,'main');assert.equal(body.sealed,true);
      assert.equal(entry.evidence_report,'compatibility/rc/packed-upstream-source-build-main-e184.json');
      const reportBytes=readRepo(entry.evidence_report);assert.equal(hash(reportBytes),'ffe8ee63051473d9adf28142e30dcbaddb5ed156f71de92a8e1dc2e43efbed6d');
      assert.deepEqual(body,JSON.parse(reportBytes));
      assert.equal(hash(readRepo(body.focus_source_review.path)),body.focus_source_review.sha256);
      for(const record of body.additional_graph_context.files){const bytes=readRepo(record.path);assert.equal(hash(bytes),record.sha256);assert.equal(bytes.length,record.bytes);}
      assert.equal(hash(readRepo('compatibility/rc/packed-upstream-source-build.json')),'6f3aba8e78c495c6e95250736f1b70e87c896938973410a6604dc3ed43678be8');
      assert.equal(hash(readRepo('compatibility/rc/packed-upstream-source-build-main-e184-prior-rows.json')),'2b5cba41846e6685a18a1a130f6ad083251b5e2124e58079047ecd1786145d07');
      const deltaBytes=readRepo('compatibility/rc/packed-upstream-source-build-main-e184-ledger-delta.json');assert.equal(hash(deltaBytes),'964baf4c85bc75e5cd33962482911776e3d7277bc882f7d2921cc76322cd7b62');
      const registered=JSON.parse(deltaBytes).rows.filter(row=>row.sha===entry.sha);
      assert.equal(registered.length,1);assert.deepEqual(entry,registered[0]);
    } else assert.equal(body.scope_format,undefined);
    const branches=mainOnly?['main']:['main','21.x'];
    assert.equal(hash(readRepo(entry.evidence_report)),entry.source_check.evidence_report_sha256);
    assert.deepEqual([...body.scope_sha_ids].sort(),Object.keys(BUILD_SCOPE_PATCHES).sort());
    assert.equal(body.reviews.length,14);assert.equal(new Set(body.reviews.map(r=>r.sha)).size,14);
    assert.deepEqual(body.reviews.map(r=>r.sha).sort(),[...body.scope_sha_ids].sort());
    const context=body.candidate_context;
    const pkg=JSON.parse(readRepo('package.json')),product=JSON.parse(readRepo('projects/ngx-material-legacy/package.json'));
    const line=product.version.startsWith('21.')?'21.x':product.version.startsWith('22.')?'main':null;
    assert.ok(line);assert.equal(body.line,line);assert.equal(context.line,line);
    assert.deepEqual(context.files.map(r=>r.path).sort(),[...contextPaths].sort());
    assert.equal(new Set(context.files.map(r=>r.path)).size,contextPaths.length);
    for(const record of [...context.files,...context.product_members]) {
      const bytes=readRepo(record.path);assert.ok(Buffer.isBuffer(bytes));
      assert.equal(hash(bytes),record.sha256);assert.equal(bytes.length,record.bytes);
    }
    assert.deepEqual(context.tracked_product_paths,currentProductPaths);
    assert.equal(hash(Buffer.from(currentProductPaths.join('\n')+'\n')),context.tracked_product_paths_sha256);
    assert.deepEqual(context.product_members.map(r=>r.path),currentProductPaths);
    assert.ok(currentProductPaths.every(path=>path.startsWith('projects/ngx-material-legacy/')&&!isBazel(path)&&!['WORKSPACE','.bazelrc'].includes(path.split('/').at(-1))));
    assert.deepEqual(context.bazel_product_members,[]);
    assert.equal(pkg.scripts['build:lib'],'node scripts/pack-library.mjs');assert.ok(!pkg.pnpm?.patchedDependencies);
    for(const [field,name]of [['compiler_cli','@angular/compiler-cli'],['ng_packagr','ng-packagr'],['jasmine_core','jasmine-core'],['jasmine_types','@types/jasmine']])assert.equal(context[field],pkg.devDependencies[name]);
    assert.equal(context.pnpm_patched_dependencies,null);
    const review=body.reviews.find(r=>r.sha===entry.sha);assert.ok(review);
    const patch=readRepo(review.patch_file);assert.ok(Buffer.isBuffer(patch));
    assert.equal(hash(patch),BUILD_SCOPE_PATCHES[entry.sha]);assert.equal(review.diff_sha256,BUILD_SCOPE_PATCHES[entry.sha]);
    assert.equal(patch.length,review.patch_bytes);
    const paths=patch.toString().split('\n').filter(row=>row.startsWith('diff --git ')).map(row=>row.split(' b/')[1]);
    assert.ok(paths.length);assert.equal(new Set(paths).size,paths.length);
    assert.deepEqual(review.patch_paths,paths);assert.equal(review.path_count,paths.length);
    assert.deepEqual(review.bazel_graph_paths,paths.filter(isBazel));assert.deepEqual(review.other_paths,paths.filter(path=>!isBazel(path)));
    const commit=Buffer.from(review.upstream_commit_object);
    assert.equal(hash(commit),review.upstream_commit_object_sha256);
    assert.equal(createHash('sha1').update(Buffer.from('commit '+commit.length+'\0')).update(commit).digest('hex'),entry.sha);
    assert.equal(entry.final_disposition,'not-applicable');assert.equal(review.final_disposition,entry.final_disposition);
    assert.deepEqual(entry.files,paths);assert.deepEqual(review.affected_branches,branches);
    assert.deepEqual(entry.individual_proof,{diff_sha256:review.diff_sha256,review_depth:'individual-compatibility',proof_kind:'individual-source-scope',affected_branches:branches,decision:review.decision});
    assert.equal(entry.reason,review.decision);assert.equal(entry.source_check.patch_path,review.patch_file);
    assert.equal(entry.source_check.review_membership,entry.sha);
    return true;
  } catch { return false; }
}
