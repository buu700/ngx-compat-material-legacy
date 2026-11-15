/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {readFileSync} from 'node:fs';import {prepareDisposableTableProbe} from './table-inherited-disposable.mjs';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const dir=process.env.TABLE_REVALIDATOR_FIXTURE;if(!dir)throw Error('Set TABLE_REVALIDATOR_FIXTURE to the synthetic source fixture');const {owned,args:base,file,bundle,writeOwned}=prepareDisposableTableProbe(dir),original=readFileSync(file),body=JSON.parse(original),bundleBytes=readFileSync(bundle),hash=b=>createHash('sha256').update(b).digest('hex');
function run(args){return spawnSync(process.execPath,['scripts/revalidate-table-inherited.mjs'],{cwd:base.root,input:JSON.stringify(args),encoding:'utf8',timeout:30000});}
function changed(mutator){const x=structuredClone(body);mutator(x);const data=Buffer.from(JSON.stringify(x)+'\n');writeOwned(file,data);const args=structuredClone(base);args.record.sha256=hash(data);args.record.bytes=data.length;return run(args)}
const results={};try{
 let r=run(base);assert.equal(r.status,0,r.stderr);results.positive=true;
 const foreign=structuredClone(base);foreign.record.sha256='0'.repeat(64);r=run(foreign);assert.notEqual(r.status,0);results.foreign_hash=true;
 for(const [name,mutator] of [['role',x=>x.role='wrong'],['missing_mode',x=>delete x.modes.zoneful],['wrong_mode',x=>x.modes.zoneful.observation.mode='zoneless'],['wrong_zone',x=>x.modes.zoneful.observation.zone_active=false],['wrong_nonce',x=>x.modes.zoneful.observation.nonce='wrong']]){r=changed(mutator);assert.notEqual(r.status,0,name);results[name]=true;}
 writeOwned(file,original);writeOwned(bundle,Buffer.concat([bundleBytes,Buffer.from('x')]));r=run(base);assert.notEqual(r.status,0);assert.match(r.stderr,/bundle changed/);results.bundle_changed=true;
}finally{writeOwned(file,original);writeOwned(bundle,bundleBytes)}
console.log(JSON.stringify({owned,results}));
