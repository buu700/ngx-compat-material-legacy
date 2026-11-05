/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Independent test roster: retained report identities remain historical data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,unlinkSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {spinnerSnackC04Source} from '../scripts/sass-spinner-snack-c04-source.mjs';
const REPORTS={
 'theming-inspection':['.json','55d2533ffe204f9e589cc82fd78d66dd286d31f89769573d71cbb1d8425687d2',133530,605],
 'inspection-compatibility':['.json','852cf937178ada91b0c604d349cf214cd810266af6118122c19e0dd534c55118',135386,610],
 'control-m3-theme':['.json','69df54b7474b863fc9e1db8f1017217d7289072f4272d20f57ea21391df51fd6',1852529,630],
 'remaining-unthemable':['.json.gz','c25b0a59e7bbe5e63eebc3068a84eb010e9e558d021770de22b81d669380e31b',1824722,642],
 'button-tokenization':['.json','4fa19472ae965a5fbc097b51ab60f344acd7791909d97221a954a25f89e9463a',870169,623],
};
const BUTTON_INPUTS=[
 ['compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs','f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0',13313],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs','2b136425698aa80d0ae368f74968fff94267d40b612b00b0bfba5577763a0692',5779],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json','8f4186d34848a0f298170c2124bbb727ff31a3995a1e8f041ab05476ffe1125d',12675],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json','3e96bf8c73dc35d1cb9d132c74f69b6f91ee7d22b19b185cf3540d68d3cb9f43',1706],
 ['compatibility/rc/upstream-sass-inspection-current-scope.json.gz','b0a8f0d0d2ce8cb41943a0585ccdcc25fd6bb0d30c9339f80501ef86c65726f4',61597],
];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const union=refs=>[...new Map(refs.map(ref=>[ref.path,ref])).values()].sort((a,b)=>a.path.localeCompare(b.path));
/** Must run before a probe deliberately mutates returned public metadata. */
export function assertCurrentReviewTestSources({kind,scope,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 assert.ok(Object.hasOwn(REPORTS,kind));const [extension,sha256,bytes,count]=REPORTS[kind];
 const path='compatibility/rc/21x-c04-'+kind+'-source-review'+extension,raw=read(path);
 assert.equal(hash(raw),sha256);assert.equal(raw.length,bytes);
 const historical=JSON.parse(extension.endsWith('.gz')?gunzipSync(raw):raw);
 assert.equal(historical.current_source_bindings.length,count);assert.deepEqual(scope.historical_report,historical);
 const owner=spinnerSnackC04Source({root,read}),extra=[];
 if(kind==='button-tokenization'){
  extra.push({path,sha256,bytes});
  for(const [path,sha256,bytes]of BUTTON_INPUTS){const body=read(path);assert.equal(hash(body),sha256);assert.equal(body.length,bytes);extra.push({path,sha256,bytes});}
 }
 const expected=union([...owner.bound,...historical.current_source_bindings.map(ref=>owner.qualify(ref)),...extra]);
 assert.deepEqual(union(scope.bound),expected,'unexpected current guarded source population');
 assert.deepEqual(union(scope.report.current_source_bindings),expected,'reported source population differs from guards');
 assert.equal(scope.report.current_source_bindings.length,expected.length);
 scope.assertCurrent();owner.assertCurrent();
 return {historical_source_bindings:count,expected_source_bindings:expected.length,current_source_bindings_match_exact_successor:true};
}

/** Exercise a physical absence guard without recompiling its already-live scope.
 * Only an exclusive new sentinel is removed; every existing file is preserved. */
export function assertPhysicalAbsentCounterpart({root=process.cwd(),path,assertCurrent}){
 assert.match(path,/^projects\/ngx-material-legacy\/styles\/.+\.scss$/);
 const parts=path.split('/');assert.ok(parts.every(p=>p&&p!=='.'&&p!=='..'&&!p.includes('\\')&&!p.includes('\0')));
 let parent=root;assert.equal(lstatSync(parent).isSymbolicLink(),false);
 for(const part of parts.slice(0,-1)){parent=join(parent,part);const stat=lstatSync(parent);assert.equal(stat.isSymbolicLink(),false);assert.equal(stat.isDirectory(),true);}
 const target=join(root,path),sentinel=Buffer.from('// current Sass absence-guard negative fixture\n');
 assert.throws(()=>lstatSync(target),error=>error.code==='ENOENT');
 writeFileSync(target,sentinel,{flag:'wx'});
 try{assert.throws(()=>assertCurrent(),'new physical owned counterpart must reject');}
 finally{assert.deepEqual(readFileSync(target),sentinel,'refuse to remove a sentinel changed by another writer');unlinkSync(target);}
 assert.throws(()=>lstatSync(target),error=>error.code==='ENOENT');assertCurrent();
}
