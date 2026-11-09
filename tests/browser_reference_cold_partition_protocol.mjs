/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Isolated checks of the actual probe's protocol parser; no source inspection runs. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const text=readFileSync(new URL('./browser_reference_source_probe.mjs',import.meta.url),'utf8');
const first=text.indexOf('function partitionIndices('),last=text.indexOf('function startColdPool(');
assert.ok(first>=0&&last>first);
const code=text.slice(first,last);
runInNewContext(`const WORKERS=4;\n${code}\n`+String.raw`
 const roster=Array.from({length:9},(_,i)=>({path:String(i),sha256:String(i),bytes:i+1})),report={line:'main',analysis_node:'node',result:'pass'};
 const payload=(part)=>({kind:'private-cold-partition-v1',line:'main',roster,report,indices:partitionIndices(roster.length,part)});
 const envelope=data=>({error:null,code:0,signal:null,stderr:'',stdout:JSON.stringify(data)+'\n'});
 const expected=[[0,4,8],[1,5],[2,6],[3,7]];
 for(let part=0;part<4;part++)assert.deepEqual(validateColdPartition(envelope(payload(part)),part,roster,report),expected[part]);
 const good=payload(0);
 const cases=[
  {...good,indices:[0]}, {...good,indices:[0,0,8]}, {...good,indices:[0,4,9]}, {...good,indices:[0,1,8]},
  {...good,indices:[8,4,0]}, {...good,line:'21.x'}, {...good,roster:roster.slice(1)},
  {...good,report:{...report,analysis_node:'other'}}, {...good,unexpected:true},
 ];
 for(const value of cases)assert.throws(()=>validateColdPartition(envelope(value),0,roster,report));
 for(const change of [{code:1},{signal:'SIGKILL'},{error:'spawn failed'},{stderr:'warning'},
  {stdout:JSON.stringify(good)+'\nextra\n'},{stdout:'{'},{stdout:''}])
  assert.throws(()=>validateColdPartition({...envelope(good),...change},0,roster,report));
 assert.throws(()=>partitionIndices(9,4));assert.throws(()=>partitionIndices(-1,0));
`,{assert});
console.log(JSON.stringify({result:'pass'}));
