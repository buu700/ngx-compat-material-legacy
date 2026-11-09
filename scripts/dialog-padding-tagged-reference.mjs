/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Direct zero-argument Sass comparison against the untouched tagged mixin.
 * This is a fixture-only proof; it does not run a browser or admit a matrix cell.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {extractPackageArchive} from './safe-package-extract.mjs';
import {mkdtempSync,readFileSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
const TAG='de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b';
const TAG_SOURCE='be1b8031bb648c17faa413ab0ad5e9521e3a2af9f0ec22dcd407c93212d88e8c';
const silent=['if-function','global-builtin','color-functions','import'];
export function assessZeroArgCss(reference,candidate){return typeof reference==='string'&&reference.length>0&&typeof candidate==='string'&&candidate.length>0&&reference===candidate;}
function inside(path,base){const rel=relative(base,path);return rel!==''&&!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel);}
/** Fresh archive extractions and isolated Sass roots, never workspace replacement of the tagged source. */
export function compileTaggedDialogPadding({sass,tagTar,packedTar,expectedPackedSha,nodeModules}){
 assert.ok(sass?.info?.startsWith('dart-sass\t1.104.1\t'),'unexpected Sass compiler');
 assert.equal(hash(readFileSync(tagTar)),TAG,'wrong tagged archive');assert.match(expectedPackedSha,/^[0-9a-f]{64}$/);assert.equal(hash(readFileSync(packedTar)),expectedPackedSha,'wrong packed archive');
 const material=realpathSync(join(nodeModules,'@angular/material')),cdk=realpathSync(join(nodeModules,'@angular/cdk'));
 assert.equal(JSON.parse(readFileSync(join(material,'package.json'))).version,'22.1.7');assert.equal(JSON.parse(readFileSync(join(cdk,'package.json'))).version,'22.1.7');
 const scratch=mkdtempSync(join(tmpdir(),'dialog-padding-reference-'));
 try{
  const tagged=extractPackageArchive(tagTar,join(scratch,'original')),packed=extractPackageArchive(packedTar,join(scratch,'candidate'));
  assert.equal(hash(readFileSync(join(tagged,'dialog/_dialog-legacy-padding.scss'))),TAG_SOURCE,'tagged mixin identity changed');
  assert.ok(readFileSync(join(tagged,'_index.scss'),'utf8').includes("@forward './dialog/dialog-legacy-padding' as dialog-* show dialog-legacy-padding;"),'tagged public forwarding changed');
  assert.ok(readFileSync(join(packed,'_index.scss'),'utf8').includes("@forward './styles/dialog/dialog-legacy-padding' as dialog-* show dialog-legacy-padding;"),'packed public forwarding changed');
  const originalProgram=`@use ${JSON.stringify(join(tagged,'dialog/dialog-legacy-padding'))} as reference; @include reference.legacy-padding();`;
  const candidateProgram=`@use ${JSON.stringify(packed)} as legacy; @include legacy.dialog-legacy-padding();`;
  const options={loadPaths:[nodeModules],style:'expanded',silenceDeprecations:silent};
  const ref=sass.compileString(originalProgram,options),actual=sass.compileString(candidateProgram,options);
  assert.throws(()=>sass.compileString(originalProgram.replace('legacy-padding();','legacy-padding(1px);'),options),/Only 0 arguments allowed/);
  assert.throws(()=>sass.compileString(candidateProgram.replace('dialog-legacy-padding();','dialog-legacy-padding(1px);'),options),/Only 0 arguments allowed/);
  for(const url of ref.loadedUrls){assert.equal(url.protocol,'file:');assert.ok(inside(realpathSync(fileURLToPath(url)),tagged),'non-tagged reference Sass dependency');}
  for(const url of actual.loadedUrls){assert.equal(url.protocol,'file:');const path=realpathSync(fileURLToPath(url));assert.ok([packed,material,cdk].some(base=>inside(path,base)),'non-packed/non-peer Sass dependency');}
  assert.ok(assessZeroArgCss(ref.css,actual.css),'direct zero-argument CSS differs from untouched tag');
  return {reference_css:ref.css,candidate_css:actual.css,reference_sha256:hash(ref.css),candidate_sha256:hash(actual.css),tag_tar_sha256:TAG,packed_tar_sha256:expectedPackedSha,tag_source_sha256:TAG_SOURCE,peer_material:'22.1.7',peer_cdk:'22.1.7',sass:sass.info,reference_kind:'untouched-16.2.14-direct-exported-target',candidate_kind:'receipt-bound-packed-public-facade',invalid_argument_rejected_by_both:true,browser_observed:false};
 }finally{rmSync(scratch,{recursive:true,force:true});}
}
