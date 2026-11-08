/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Startup remains usable before workspace dependencies are installed.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,copyFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const tmp=mkdtempSync(join(tmpdir(),'select-scroll-token-no-deps-'));
try {
 const scripts=join(tmp,'scripts');mkdirSync(scripts);
 for(const file of ['api-select-scroll-token-contract.mjs','api-input-harness-contract.mjs'])
  copyFileSync(new URL('../scripts/'+file,import.meta.url),join(scripts,file));
 const check=`import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let absent=false;try { require.resolve('typescript'); } catch (e) { if(e.code==='MODULE_NOT_FOUND') absent=true; else throw e; }
if(!absent) throw Error('typescript unexpectedly resolvable');
const m=await import('./scripts/api-select-scroll-token-contract.mjs');
if(typeof m.selectScrollTokenProof!=='function'||m.selectScrollTokenProof(null,null,null)!==null) throw Error('module import or fail-closed proof failed');
console.log('typescript unavailable; token module imports and proof fails closed');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',check],{cwd:tmp,encoding:'utf8',env:{...process.env,NODE_PATH:''}});
 assert.equal(result.status,0,result.stderr||result.error?.message);assert.match(result.stdout,/typescript unavailable/);
 process.stdout.write(result.stdout);
} finally {rmSync(tmp,{recursive:true,force:true});}
