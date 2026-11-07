/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {dirname,join,relative,resolve,sep} from 'node:path';
const hash=x=>createHash('sha256').update(x).digest('hex');
function findRoot(req,name){
 let resolved;try{resolved=req.resolve(name+'/package.json')}catch{resolved=req.resolve(name)}
 let dir=dirname(realpathSync(resolved));while(dir!==dirname(dir)){try{const p=JSON.parse(readFileSync(join(dir,'package.json')));if(p.name===name)return dir}catch{}dir=dirname(dir)}throw Error('cannot resolve package '+name);
}
export function packageDigest(dir){const rows=[];function walk(at,rel){for(const name of readdirSync(at).sort()){if(name==='node_modules')continue;const path=join(at,name),part=rel?rel+'/'+name:name,st=lstatSync(path);if(st.isSymbolicLink())throw Error('symlink inside tool package '+path);if(st.isDirectory())walk(path,part);else if(st.isFile())rows.push([part,st.mode&0o111?1:0,st.size,hash(readFileSync(path))]);else throw Error('non-file tool input '+path)}}walk(dir,'');return {files:rows.length,sha256:hash(JSON.stringify(rows))}}
/** Exact transitive dependency and optional-dependency package closure used by
 * Angular compilation, Babel linking and esbuild. Missing optional packages are
 * recorded, not silently treated as a positive identity. */
export function captureToolchain(root){
 const modules=realpathSync(join(root,'node_modules')),rootRequire=createRequire(join(root,'package.json')),cliRoot=findRoot(rootRequire,'@angular/compiler-cli');const cliRequire=createRequire(join(cliRoot,'package.json'));
 const seeds=[['@angular/compiler-cli',rootRequire],['@angular/compiler',rootRequire],['typescript',rootRequire],['esbuild',rootRequire],['@babel/core',cliRequire]];const visited=new Map(),missing=[];
 function add(name,req,optional=false){let dir;try{dir=findRoot(req,name)}catch(e){if(optional){missing.push(name);return}throw e}if(!dir.startsWith(modules+sep))throw Error('tool package outside node_modules: '+name);if(visited.has(dir))return;const pkg=JSON.parse(readFileSync(join(dir,'package.json')));visited.set(dir,{name:pkg.name,version:pkg.version,...packageDigest(dir)});const r=createRequire(join(dir,'package.json'));for(const dep of Object.keys(pkg.dependencies||{}).sort())add(dep,r);for(const dep of Object.keys(pkg.optionalDependencies||{}).sort())if(!Object.hasOwn(pkg.dependencies||{},dep))add(dep,r,true)}
 for(const [name,req] of seeds)add(name,req);const packages=Object.fromEntries([...visited.entries()].map(([p,v])=>[relative(modules,p).split(sep).join('/'),v]).sort(([a],[b])=>a<b?-1:a>b?1:0));return {platform:process.platform,arch:process.arch,node_version:process.versions.node,packages,missing_optional:[...new Set(missing)].sort()};
}
