/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bind enum producer subjects to the installed main minimum, not runtime behavior. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const root=process.cwd(), require=createRequire(root+'/package.json');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pkg=JSON.parse(readFileSync(require.resolve('@angular/core/package.json')));
const pins={
  'types/core.d.ts':'7d9eea93a0ccb308851fe7b50af8b8d894e8f0ae456e339fe8dcd87bf3fcfd84',
  'fesm2022/core.mjs':'3030cadda05c2c4bdf15f41f5bb2b571a81b78c375b5d0876aa5bc93d2398337',
  'types/_debug_node-chunk.d.ts':'359fdc800f92be1be371c69aa3a01c902976e8de13520eaf03dd5c85160e628b',
  'fesm2022/_debug_node-chunk.mjs':'29bbc73e55bbfc1d541628946de10d7c81697fcbf7ad9cccd3ba795da5b2ce19',
};
const installed=Object.fromEntries(Object.keys(pins).map(p=>[p,readFileSync('node_modules/@angular/core/'+p)]));
const captured=Object.fromEntries(Object.keys(pins).map(p=>[p,readFileSync('compatibility/rc/framework-enum-sources/22.1.7/'+p)]));
function verify(manifest,actual,reference) {
  assert.equal(manifest.name,'@angular/core');assert.equal(manifest.version,'22.1.7');
  assert.equal(manifest.exports['.'].types,'./types/core.d.ts');assert.equal(manifest.exports['.'].default,'./fesm2022/core.mjs');
  for(const [path,pin] of Object.entries(pins)){assert.equal(hash(actual[path]),pin,'installed member '+path);assert.equal(hash(reference[path]),pin,'captured member '+path);}
}
verify(pkg,installed,captured);
const rejected=[];function reject(name,action){assert.throws(action);rejected.push(name);}
reject('wrong-version',()=>verify({...pkg,version:'21.2.23'},installed,captured));
reject('wrong-root-types',()=>verify({...pkg,exports:{'.':{...pkg.exports['.'],types:'./wrong.d.ts'}}},installed,captured));
reject('wrong-root-runtime',()=>verify({...pkg,exports:{'.':{...pkg.exports['.'],default:'./wrong.mjs'}}},installed,captured));
for(const path of Object.keys(pins))reject('changed-installed:'+path,()=>verify(pkg,{...installed,[path]:Buffer.from('wrong')},captured));
for(const path of Object.keys(pins))reject('changed-capture:'+path,()=>verify(pkg,installed,{...captured,[path]:Buffer.from('wrong')}));
const report={schema_version:1,line:'main',role:'Installed minimum enum declaration and runtime member identities; no Angular behavior qualification',node:process.version,package:pkg.name,version:pkg.version,root_exports:pkg.exports['.'],members:pins,rejected_mutations:rejected};
const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report));
