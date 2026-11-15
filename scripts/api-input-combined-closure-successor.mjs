/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Exact predecessor-to-combined transition for the input strict consumer closure. */
import {isDeepStrictEqual} from 'node:util';
import {inputHarnessClosureFingerprint} from './api-input-harness-contract.mjs';
const base=Object.freeze({package:'@ngx-compat/material-legacy',version:'22.0.0-rc.0',package_sha256:'252144295470393ba5cd56ee0fc3ead5d63e84a49e15139fad7bf4d8fbe8ff93',path:'types/ngx-compat-material-legacy-legacy-core.d.ts'});
const prior=Object.freeze({...base,bytes:36343,sha256:'8fe7acf0ab671aa9155edc40f54b4a9ea435575565b23c01c5a95196c8b2abcf'});
const current=Object.freeze({...base,bytes:36758,sha256:'40e2cd4aed9132372fc88482a6fc7eea709c1176e7e7f8527e7548d173f1861c'});
export const INPUT_PREDECESSOR_ARCHIVE_SHA='877c8b62e1ea9b134d838043dda436abb4ccf9515041640fdb05dc6113727b0b';
export const INPUT_PREDECESSOR_CLOSURE_SHA='2647a33d15a914c6e9b3bbfddbb29cbac74892b5f053aba6dfb45840318ce914';
/** Reconstruct the old closure by replacing precisely one fully identified row. */
export function qualifyInputCombinedClosure(rows){try{
 if(!Array.isArray(rows)||rows.length!==312)return false;
 const candidates=rows.filter(r=>r.package===base.package&&r.version===base.version&&r.path===base.path);
 if(candidates.length!==1||!isDeepStrictEqual(candidates[0],current))return false;
 const reconstructed=rows.map(r=>r===candidates[0]?prior:r);
 return inputHarnessClosureFingerprint(reconstructed)===INPUT_PREDECESSOR_CLOSURE_SHA;
 }catch{return false;}}
