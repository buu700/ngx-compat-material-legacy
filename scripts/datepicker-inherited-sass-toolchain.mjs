/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {createRequire} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import {dirname,join,relative,sep} from 'node:path';
import {packageDigest} from './overlay-inherited-toolchain.mjs';
export function captureSass(root){
 const modules=realpathSync(join(root,'node_modules')),seen=new Map(),missing=[];
 function find(req,name){let resolved;try{resolved=req.resolve(name+'/package.json')}catch{resolved=req.resolve(name)}let d=dirname(realpathSync(resolved));while(d!==dirname(d)){try{let p=JSON.parse(readFileSync(join(d,'package.json')));if(p.name===name)return d}catch{}d=dirname(d)}throw Error('cannot resolve '+name)}
 function add(name,req,optional=false){let d;try{d=find(req,name)}catch(e){if(optional){missing.push(name);return}throw e}if(!d.startsWith(modules+sep))throw Error('Sass package outside modules');if(seen.has(d))return;const pkg=JSON.parse(readFileSync(join(d,'package.json')));seen.set(d,{name:pkg.name,version:pkg.version,...packageDigest(d)});const r=createRequire(join(d,'package.json'));for(const n of Object.keys(pkg.dependencies||{}).sort())add(n,r);for(const n of Object.keys(pkg.optionalDependencies||{}).sort())if(!Object.hasOwn(pkg.dependencies||{},n))add(n,r,true)}
 add('sass',createRequire(join(root,'package.json')));return {packages:Object.fromEntries([...seen].map(([p,v])=>[relative(modules,p).split(sep).join('/'),v]).sort(([a],[b])=>a.localeCompare(b))),missing_optional:[...new Set(missing)].sort()};
}
