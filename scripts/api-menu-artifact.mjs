/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Complete image identity for the finite reviewed menu artifact.
 */
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const sha=x=>createHash('sha256').update(x).digest('hex');
// Preserve the original reviewed image and admit only the separately reviewed v7 image.
export const MENU_TAR_SHA='a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2';
export const MENU_V7_TAR_SHA='66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca';
/** Every regular archive member must equal the corresponding physical file. */
export function exactMenuArtifact(context,packageRoot){
 try{
  if(!context?.tarball||!context.packageRoot||realpathSync(context.packageRoot)!==realpathSync(packageRoot))return false;
  const archive=readFileSync(context.tarball);if(![MENU_TAR_SHA, MENU_V7_TAR_SHA].includes(sha(archive)))return false;
  const bytes=gunzipSync(archive,{maxOutputLength:100*1024*1024}),files=new Map();let offset=0;
  const field=(h,a,b)=>h.subarray(a,b).toString('utf8').replace(/\0.*$/s,'');
  while(offset+512<=bytes.length){const h=bytes.subarray(offset,offset+512);offset+=512;if(h.every(x=>x===0))break;
   const name=field(h,0,100),prefix=field(h,345,500),full=prefix?prefix+'/'+name:name,raw=field(h,124,136).trim();
   if(!/^package\/[a-zA-Z0-9_@.\/-]+$/.test(full)||full.split('/').some(x=>x==='.'||x==='..'||!x)||h[156]!==48||! /^[0-7]+$/.test(raw)||files.has(full))return false;
   const size=parseInt(raw,8);if(!Number.isSafeInteger(size)||size<0||offset+size>bytes.length)return false;
   files.set(full.slice(8),bytes.subarray(offset,offset+size));offset+=Math.ceil(size/512)*512;
  }
  if(files.size!==512)return false;
  const found=[];function walk(dir,base=''){for(const entry of readdirSync(dir,{withFileTypes:true})){
   const rel=base?base+'/'+entry.name:entry.name,path=join(dir,entry.name),stat=lstatSync(path);
   if(stat.isSymbolicLink())throw Error('linked image');if(stat.isDirectory())walk(path,rel);else if(stat.isFile())found.push(rel);else throw Error('unexpected image member');
  }}walk(packageRoot);return found.length===files.size&&found.every(path=>files.has(path)&&readFileSync(join(packageRoot,path)).equals(files.get(path)));
 }catch{return false;}
}
/** Authenticate the actual peer menu entry and package metadata, including bytes. */
export function exactMenuPeer(entry){
 try{const r=createRequire(entry),menu=realpathSync(r.resolve('@angular/material/menu')),metadata=realpathSync(r.resolve('@angular/material/package.json'));
  const json=JSON.parse(readFileSync(metadata));return json.name==='@angular/material'&&json.version==='22.1.7'
   &&sha(readFileSync(metadata))==='5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af'
   &&sha(readFileSync(menu))==='d8f563e5de5fc52a6b3161a3971363f6ff141701b893d9211063af646225710d';
 }catch{return false;}
}
