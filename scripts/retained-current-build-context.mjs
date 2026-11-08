/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Main-only applicability context; no runtime, artifact, floor or audit pass. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {retainedCurrentContextIdentity} from './retained-current-context-identity.mjs';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const ts=createRequire(import.meta.url)('typescript');
const SELF='scripts/retained-current-build-context.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const REVIEW={path:'compatibility/rc/main-retained-build-scope-current-review-v1.json',sha256:'5d248bc8b3b90dda544f083c1db3437b6e7aec310eaf600580db638088190a15',bytes:8121};
const proofDigests={
 'compatibility/rc/parent-main-ci-context46-source-v1.json':'b330d049619a767f53695af50539e48f0be7d0d5235e4cf148fe91f626c68db6',
 'compatibility/rc/parent-main-ci-browser-pin-review-v1.json':'d839d418ee7b3caa83a7d9ce6e6adee5f414eddb181bd4adf232e3d0f97ce409',
 'compatibility/rc/parent-main-menu-context46-source-v1.json':'3b69b25f3ae43e0f7285551e180769eec4306a06aa1ff32327e3fefff4ff2264',
 'compatibility/rc/parent-main-menu-item-di-ownership-review-v1.json':'3e541cae50eb7965d26a1d495353c7d994d376e6835717192c9e3e2f8ddc1bee',
};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
export function retainedCurrentBuildContext({root,read,body,currentProductPaths}){
 const physical=path=>readEvidenceMember(root,path),sources=retainedCurrentContextIdentity({root,read});
 const check=(path,digest)=>{const raw=physical(path);assert.equal(sha(raw),digest,path);assert.ok(raw.equals(read(path)),'nonphysical current build scope '+path);assert.ok(raw.equals(physical(path)));return raw;};
 const reviewBytes=check(REVIEW.path,REVIEW.sha256);assert.equal(reviewBytes.length,REVIEW.bytes);
 const review=JSON.parse(reviewBytes);assert.equal(review.schema_version,1);
 assert.equal(review.role,'finite main current-context revalidation of fourteen retained build-scope decisions');
 assert.equal(review.source_commit,'4e6f608402e99da9fb550bb46040aa68a648440a');
 assert.equal(ts.version,'6.0.3');
 assert.deepEqual(sources.bound.find(ref=>ref.path===review.identity_packet.path),review.identity_packet);
 assert.equal(review.historical_reports_rewritten,false);assert.equal(review.new_upstream_dispositions,0);
 assert.equal(review.native_artifact_floor_or_security_qualification,false);assert.equal(review.g11_claim,'not-passed');
 const profile=sources.beforeContexts.find(row=>row.report.path===review.historical_review.path);assert.ok(profile);
 assert.equal(profile.report.sha256,review.historical_review.sha256);
 assert.deepEqual(JSON.parse(check(profile.report.path,profile.report.sha256)),body);
 assert.equal(body.scope_format,'main-source-scope-v1');assert.equal(body.line,'main');
 assert.deepEqual(review.individual_revalidation.map(row=>row.sha).sort(),[...body.scope_sha_ids].sort());
 assert.equal(review.individual_revalidation.length,14);
 for(const row of review.individual_revalidation){assert.equal(row.conclusion,'retained-source-scope-exclusion');assert.ok(row.reason.length>100);}
 const refs=[...sources.products,...sources.inputs],byPath=new Map(refs.map(ref=>[ref.path,ref]));
 const changed=profile.inputs.filter(ref=>byPath.get(ref.path).sha256!==ref.sha256).map(ref=>ref.path).sort();
 assert.deepEqual(changed,review.changed_main_context_inputs);
 assert.deepEqual(sources.products.map(ref=>ref.path),currentProductPaths);
 assert.ok(currentProductPaths.every(path=>!path.endsWith('.bazel')&&!path.endsWith('.bzl')&&!['WORKSPACE','.bazelrc'].includes(path.split('/').at(-1))));
 const pkg=JSON.parse(check('package.json',byPath.get('package.json').sha256));
 assert.equal(pkg.scripts['build:lib'],'node scripts/pack-library.mjs');assert.equal(pkg.pnpm?.patchedDependencies,undefined);
 for(const [name,version]of Object.entries({'@angular/compiler-cli':'22.1.7','ng-packagr':'22.1.1','jasmine-core':'5.6.0','@types/jasmine':'5.1.7'}))assert.equal(pkg.devDependencies[name],version);
 const compiler=JSON.parse(check('projects/ngx-material-legacy/tsconfig.lib.json',byPath.get('projects/ngx-material-legacy/tsconfig.lib.json').sha256));
 assert.equal(compiler.extends,undefined);assert.equal(compiler.compilerOptions.paths,undefined);assert.equal(compiler.angularCompilerOptions.strictTemplates,true);
 const forbidden=/^(?:@angular\/(?:cdk-experimental|material-experimental|components-examples|google-maps|youtube-player)(?:\/|$)|@angular\/localize\/init$|highlight\.js$)/;
 let typedSources=0,imports=0;
 for(const ref of sources.products){
  if(!ref.path.endsWith('.ts'))continue;typedSources++;
  const source=check(ref.path,ref.sha256).toString(),scan=ts.preProcessFile(source,true,true);
  for(const imported of [...scan.importedFiles,...scan.referencedFiles,...scan.typeReferenceDirectives]){imports++;assert.ok(!forbidden.test(imported.fileName),'excluded upstream owner imported by '+ref.path+': '+imported.fileName);}
 }
 // Keep the existing finite CI/menu proof dependencies bound. They remain
 // historical evidence, never a substitute for this complete current snapshot.
 const proofImages=new Map();
 for(const [path,digest]of Object.entries(proofDigests)){assert.ok(digest);proofImages.set(path,check(path,digest));}
 for(const row of body.reviews){
  const patch=check(row.patch_file,row.diff_sha256);assert.equal(patch.length,row.patch_bytes);
  proofImages.set(row.patch_file,patch);
  const paths=patch.toString().split('\n').filter(line=>line.startsWith('diff --git ')).map(line=>line.split(' b/')[1]);
  assert.deepEqual(paths,row.patch_paths);assert.deepEqual(paths.filter(path=>!path.endsWith('.bazel')&&!path.endsWith('.bzl')&&path!=='.bazelrc'),row.other_paths);
 }
 const assertCurrent=()=>{
  assert.ok(physical(SELF).equals(image));assert.ok(image.equals(read(SELF)));
  check(REVIEW.path,REVIEW.sha256);for(const [path,raw]of proofImages)assert.ok(check(path,sha(raw)).equals(raw));
  sources.assertCurrent();
  // Final callback-free close covers proofs a later source callback could alter.
  assert.equal(sha(physical(REVIEW.path)),REVIEW.sha256);
  for(const [path,raw]of proofImages)assert.ok(physical(path).equals(raw));
  assert.ok(physical(SELF).equals(image));
 };
 assertCurrent();
 return Object.freeze({
  get records(){return structuredClone(refs);},
  resolveReference:sources.resolveReference,assertCurrent,
  typed_sources:typedSources,import_references:imports,
  original_dispositions_changed:false,runtime_artifact_floor_or_audit_pass:false,g11_claim:'not-passed',
 });
}
