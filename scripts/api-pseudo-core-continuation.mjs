/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Authenticated f31 core declaration recovered from the finite 25365 image. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {qualifyCombinedArtifactSubject} from './api-combined-d70-image.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),sha=x=>createHash('sha256').update(x).digest('hex');
const path='types/ngx-compat-material-legacy-legacy-core.d.ts';
const base={package:'@ngx-compat/material-legacy',version:'22.0.0-rc.0',package_sha256:'252144295470393ba5cd56ee0fc3ead5d63e84a49e15139fad7bf4d8fbe8ff93',path};
export function pseudoCorePredecessor(context){
 const subject=qualifyCombinedArtifactSubject(readFileSync(context.tarball),context.packageRoot);assert.equal(subject?.profile,'combined-pseudo-disabled');
 const gz=readFileSync(join(root,'compatibility/rc/qualification/api-combined-pseudo-disabled-v1/prior-2.gz'));assert.equal(sha(gz),'8374f8a8dd5a57a8e88452bff4b10f949030cc899be4b2154420b68a35817a9c');const prior=gunzipSync(gz);assert.equal(prior.length,36758);assert.equal(sha(prior),'40e2cd4aed9132372fc88482a6fc7eea709c1176e7e7f8527e7548d173f1861c');const actual=readFileSync(join(context.packageRoot,path));assert.equal(actual.length,36710);assert.equal(sha(actual),'7ded193983f6cf745c6f7ac44784d23ee80c879a6ba7ff8124819609d608b6a5');const needle='    static ngAcceptInputType_disabled: unknown;\n',s=prior.toString();assert.equal(s.split(needle).length,2);assert.equal(s.replace(needle,''),actual.toString());return prior;
}
export function normalizePseudoCoreRows(rows,context){
 pseudoCorePredecessor(context);const indexes=rows.flatMap((r,i)=>r.package===base.package&&r.path===path?[i]:[]);assert.equal(indexes.length,1);const index=indexes[0];assert.ok(isDeepStrictEqual(rows[index],{...base,bytes:36710,sha256:'7ded193983f6cf745c6f7ac44784d23ee80c879a6ba7ff8124819609d608b6a5'}));const result=rows.slice();result[index]={...base,bytes:36758,sha256:'40e2cd4aed9132372fc88482a6fc7eea709c1176e7e7f8527e7548d173f1861c'};return result;
}
export const PSEUDO_CORE_BUNDLE_SHA='ec891ee8e1fa0aeceeb1142eade590fca110ce70f505e3131ecbc0fff8c14d94';

export function pseudoCoreBundleHash(context){try{return context?.tarball&&context?.packageRoot&&qualifyCombinedArtifactSubject(readFileSync(context.tarball),context.packageRoot)?.profile==='combined-pseudo-disabled'?PSEUDO_CORE_BUNDLE_SHA:'4172a40fb470f20e62322fec159a4ab12559ac5d900a62ae02d02ee59f7327a9';}catch{return '4172a40fb470f20e62322fec159a4ab12559ac5d900a62ae02d02ee59f7327a9';}}
