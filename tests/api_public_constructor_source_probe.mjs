/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,cpSync,copyFileSync,symlinkSync,realpathSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';import {join,dirname,resolve} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),args=process.argv.slice(2);
assert.ok(args.length===0||(args.length===2&&args[0]==='--peer-root'),'usage: node tests/api_public_constructor_source_probe.mjs [--peer-root <workspace>]');
const peerRequire=args.length?createRequire(join(resolve(args[1]),'package.json')):require,tmp=mkdtempSync(join(tmpdir(),'emitter-source-test-'));
try{
 const mods=join(tmp,'node_modules'),angular=join(mods,'@angular');mkdirSync(angular,{recursive:true});mkdirSync(join(tmp,'scripts'));
 cpSync(dirname(realpathSync(peerRequire.resolve('@angular/core/package.json'))),join(angular,'core'),{recursive:true});
 for(const [name,dest] of [['@angular/compiler',join(angular,'compiler')],['rxjs',join(mods,'rxjs')],['tslib',join(mods,'tslib')],['typescript',join(mods,'typescript')]])symlinkSync(dirname(realpathSync((name==='typescript'?require:peerRequire).resolve(name+'/package.json'))),dest,'dir');
 copyFileSync(new URL('../scripts/api-public-constructor-internals.mjs',import.meta.url),join(tmp,'scripts/api-public-constructor-internals.mjs'));
 copyFileSync(new URL('./api_public_constructor_source_child.mjs',import.meta.url),join(tmp,'api_public_constructor_source_child.mjs'));
 const run=spawnSync(process.execPath,['--import','@angular/compiler','api_public_constructor_source_child.mjs'],{cwd:tmp,encoding:'utf8'});
 assert.equal(run.status,0,run.stderr||run.error?.message);process.stdout.write(run.stdout);
}finally{rmSync(tmp,{recursive:true,force:true});}
