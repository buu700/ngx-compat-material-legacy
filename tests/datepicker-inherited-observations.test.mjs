/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateDatepickerRows as check} from '../testing/datepicker-inherited/contracts-fixture.mjs';
if(process.argv.length!==4)throw Error('usage: node test.mjs zoneless/result.json zoneful/result.json');
const ids=['0d36e863ba6752596b6cee5810b5d953d536a9a9','2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b','5db8dca18b5967c203a5898dfa713ff03d9e7134','e8b28fa6ba15f536e72d13c0b22765924efaf1f6'];
for(const [file,mode] of [[process.argv[2],'zoneless'],[process.argv[3],'zoneful']]){
 const doc=JSON.parse(readFileSync(file));assert.equal(doc.mode,mode);const rows=doc.rows,nonce=rows.nonce;
 for(const sha of ids){
  assert.deepEqual(check(sha,rows,nonce),{baseline:sha!==ids[1],negative:true});
  assert.deepEqual(check(sha,rows,'deadbeef'),{baseline:false,negative:false});
  const missing=structuredClone(rows);delete missing.faults;assert.equal(check(sha,missing,nonce).negative,false);
  const lifecycle=structuredClone(rows);lifecycle.cleanup.overlayCalendars=1;assert.equal(check(sha,lifecycle,nonce).baseline,false);
 }
 let fixed=structuredClone(rows);fixed.filters.input[3].rangeEnd=false;fixed.filters.input[4].rangeEnd=true;assert.equal(check(ids[1],fixed,nonce).baseline,true);
 let x=structuredClone(rows);x.classes.month.set.initial[0]=false;assert.equal(check(ids[0],x,nonce).baseline,false);
 x=structuredClone(fixed);x.filters.input[2].rangeStart=true;assert.equal(check(ids[1],x,nonce).baseline,false);
 x=structuredClone(rows);x.early.todayCall='Error';assert.equal(check(ids[2],x,nonce).baseline,false);
 x=structuredClone(rows);x.navigation.year.pastMin.focused=false;assert.equal(check(ids[3],x,nonce).baseline,false);
 assert.deepEqual(check('not-a-registered-sha',rows,nonce),{baseline:false,negative:false});
}
console.log('raw observation comparator tests pass; diagnostic inputs are not execution admission');
