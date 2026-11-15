/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Complete strict-menu program transition from the authenticated 877c8b image. */
import {isDeepStrictEqual} from 'node:util';
import {menuHarnessClosureFingerprint} from './api-menu-harness-contract.mjs';
const base=Object.freeze({package:'@ngx-compat/material-legacy',version:'22.0.0-rc.0',package_sha256:'252144295470393ba5cd56ee0fc3ead5d63e84a49e15139fad7bf4d8fbe8ff93',path:'types/ngx-compat-material-legacy-legacy-core.d.ts'});
const prior=Object.freeze({...base,bytes:36343,sha256:'8fe7acf0ab671aa9155edc40f54b4a9ea435575565b23c01c5a95196c8b2abcf'});
const current=Object.freeze({...base,bytes:36758,sha256:'40e2cd4aed9132372fc88482a6fc7eea709c1176e7e7f8527e7548d173f1861c'});
export const MENU_SIGNATURE_PREDECESSOR_SHA='d1b38ebece42f6e11e89723071fac699f3ce268105134b26cf43709652522b68';
export function qualifyMenuCombinedClosure(rows){try{
 if(!Array.isArray(rows)||rows.length!==312)return false;
 const matched=rows.filter(r=>r.package===base.package&&r.version===base.version&&r.path===base.path);
 if(matched.length!==1||!isDeepStrictEqual(matched[0],current))return false;
 return menuHarnessClosureFingerprint(rows.map(r=>r===matched[0]?prior:r))===MENU_SIGNATURE_PREDECESSOR_SHA;
 }catch{return false;}}
