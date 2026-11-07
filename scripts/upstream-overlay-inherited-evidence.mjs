/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash,randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember,validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {verify} from '../testing/overlay-inherited/contracts-fixture.mjs';
const subjects=new Map([
 ['01cc6f3265903cc6c3a58ea4ae5e03c917597e8f','8f6e7ec15882069bba4b10e5ab483b61c6a4b73098cc43100000d36830c4c964'],
 ['09df51d8ebb86a3ee76614b6775dd62136660567','d1395fc1c377a2483bddef9d3c3f37d22d5bc39b8947c214bfb0e0b39f69fce3'],
 ['0ca0c3112c762f449673f5cc1f3f4d7e8e3c20af','541e6727c4a5a503e9428fcfbef77b4328548432af9e8e8c64991b6c75f7ed62'],
 ['1a92e22eff7728d92b6af8834701f78acbb4d2cc','34aee1bf21f21f4db87cbb3990b91ea085aefe5f1994feeee78de05ebd6cb125'],
 ['332f78607b409c7158e7153ef0ed044a09922a99','1a463d477de46328dd43376f37836e6fe86063ecf98509f8b4cb8757b16d9b30'],
]);
const priorRecords={"01cc6f3265903cc6c3a58ea4ae5e03c917597e8f":{"row":"11708f4e0ba678f56a04bb5364a2548089a579cbdf069b2305257834152fbbc1","report":"compatibility/rc/reports/behavior-semantic-one-diff.json","reportHash":"e407a0c71f67a8a85a8dc7b887a5e37349915549e34ac720783072fa7729be19","archiveHash":"3ba3a7488795236f95fe099ec9b6c8dbe9445546e36e06073e1c8396b6391286","fullIndex":null},"09df51d8ebb86a3ee76614b6775dd62136660567":{"row":"be751701969bcf447ecc9cbeca97b35d1e36dd7f3ed045092c4494cba9cad450","report":"compatibility/rc/reports/behavior-semantic-one-diff.json","reportHash":"e407a0c71f67a8a85a8dc7b887a5e37349915549e34ac720783072fa7729be19","archiveHash":"3ba3a7488795236f95fe099ec9b6c8dbe9445546e36e06073e1c8396b6391286","fullIndex":null},"1a92e22eff7728d92b6af8834701f78acbb4d2cc":{"row":"1b11eeae192974d074caa048ff39712f3e9251b9d0f42259610900e0fa6f3a83","report":"compatibility/f10/disposition-ledger/evidence/mechanical/1a92e22eff7728d92b6af8834701f78acbb4d2cc.json","reportHash":"a9007f8ef7362456ae03f36040a306c4ebf8602780a5a3cf15c9b1275939fed7","archiveHash":"5530ec4c4f0b21e1511ddffe79d0239b89f2af666f4ffc3ce9e305a533683b07","fullIndex":"7f40795487c54605b6d5d8ce79c18b91f85a35e9685f1550b5920f586dc81ae5"},"0ca0c3112c762f449673f5cc1f3f4d7e8e3c20af":{"row":"1f5b32698194e39c9515bb202abde49459c9bc32ada5ffd88ba0da8da395f3ce","report":"compatibility/f10/disposition-ledger/evidence/mechanical/0ca0c3112c762f449673f5cc1f3f4d7e8e3c20af.json","reportHash":"39eb2ef1d85fe7d60a05839efccfc812fa3aec79c78d587d74f582da29a8acb6","archiveHash":"13df1f786fb1276427d44eca1a061bd09d55235b68f03161526e9b6e4a6984bc","fullIndex":"5b8935eaf66f279b4b8900a56261fa633f169567834ed73de6f4ddb695aa64b8"},"332f78607b409c7158e7153ef0ed044a09922a99":{"row":"2251eb4f0bea36ed8fa722052761434f3da8efb44bbf34c21a670708cb842bac","report":"compatibility/f10/disposition-ledger/evidence/mechanical/332f78607b409c7158e7153ef0ed044a09922a99.json","reportHash":"d613860761b355b4b1e72581471c6feb02ced6b9da1d83094029d98dab9d77c2","archiveHash":"fccd0a767f936703fc10714fe9f6caf0aab352771a4b0cf17c28ce501fdac071","fullIndex":"d9d7ddeaadbedb1893fe74224c0d3f93737773409d18f7b4a003e74a83a6caef"}};
const reviewHashes={"01cc6f3265903cc6c3a58ea4ae5e03c917597e8f":"e66aef6f146da66a77f43458ad079027328809503d6bf8d4350b8c7f779d6672","09df51d8ebb86a3ee76614b6775dd62136660567":"f64783c8002853a126a622a48c0df2780d4f6087ae3671c1f9b6a7dcc19fabbc","0ca0c3112c762f449673f5cc1f3f4d7e8e3c20af":"3346b3df732ff536464903bb0f4e13b92582f9c5ff87ac67614d554878d2b4af","1a92e22eff7728d92b6af8834701f78acbb4d2cc":"89857559bbae2fb80eab3b3aa6dd0887dba59cb4477548463d245d4a96259664","332f78607b409c7158e7153ef0ed044a09922a99":"376bc6ddb9fc55199de827f4f680e02c31240b64e44497e24e7985b1cfca6c97"};
const members=new Map([
 ['scripts/overlay-inherited-toolchain.mjs','a5d79febfefe4d3ea92aa33895f4460f48fd7593c147521dbd1ba5a8f498062d'],
 ['compatibility/rc/overlay-inherited-toolchain-main.json','ad74c81bd537a16a7324cd440ad3b36e9788030d21a0ad1bc1ab36772f26e503'],
 ['compatibility/rc/overlay-inherited-hunk-accountability.json','3241e714a8758583f6fe70231de5df5c49034834850ed69ff67b069c27fb8f8e'],
 ['compatibility/rc/overlay-inherited-deps-main.json','ddaada5e1426b6b0025a23a9f21a90bd8b56a84f475bdf0d29d712402a0fb54e'],
 ['scripts/overlay-inherited-native-run.mjs','25a9a8589ded9e71b5d3cfcce51e9bc1b36bd367ee88191b3628097002811efb'],
 ['scripts/overlay-inherited-browser.mjs','d2366348fe3726f5d95cdf1b172569b6224642ed13166ceda36ede7454a85b28'],
 ['testing/overlay-inherited/consumer.ts','b3543c3a8fdfebd3514151df0c9eb7757bf80e0e23ed1d9a1eecb9d16fe8da17'],
 ['testing/overlay-inherited/contracts-fixture.mjs','fc60987f26405cfa35f642aa42b94e8210b4e3bfecb36a01c4e2949980c91516'],
 ['projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts','fc29490be443cdb544e553f762be572fb4e6635216ad47dbb492a5dffa113aad'],
 ['projects/ngx-material-legacy/legacy-select/internal/select-base.ts','120ab123d79e58ea256211cafa50268dba3ce26524426e88b0347a8624aee68d'],
 ['projects/ngx-material-legacy/legacy-select/select.html','9d895bf6cbf1b2da7063acedc1fed7ee4cf7f10ce25bc7a797e8ee32875feec2'],
 ['scripts/upstream-packed-run-evidence.mjs','4ca01cf54f88ddd557556955ce987986a53ad21f95adfaed3fb3686d31bbd5ac'],
]);
const kind='main-overlay-inherited-native';const cache=new Map(), hash=x=>createHash('sha256').update(x).digest('hex');const demand=(x,m)=>{if(!x)throw Error(m)};
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
function verifyPrior(root,entry,scope){
 const known=priorRecords[entry.sha],old=entry.prior_disposition_record;
 demand(known&&old&&hash(Buffer.from(stable(old)))===known.row,'prior disposition record changed');
 demand(entry.diff_sha256===scope.patch&&old.evidence_report===known.report,'prior or current digest binding changed');
 const currentPatch='compatibility/rc/overlay-inherited-original-patches/'+entry.sha+'.patch';
 const reviewPath='compatibility/rc/overlay-inherited-original-patches/'+entry.sha+'.json';
 demand(entry.evidence_report===reviewPath&&hash(readEvidenceMember(root,currentPatch))===scope.patch,'current complete patch changed');
 const reviewBytes=readEvidenceMember(root,reviewPath);demand(hash(reviewBytes)===reviewHashes[entry.sha],'current individual review changed');
 const review=JSON.parse(reviewBytes);const src=review.prior_disposition_source,p=src?.prior_source_review,d=review.digest_provenance;
 const archive='compatibility/rc/overlay-inherited-prior/'+known.reportHash+'.json.gz';
 demand(src?.base_commit==='9be00b7baf32477b8e521305efa36273589566b9'&&src.ledger_path==='compatibility/f10/disposition-ledger/ledger.json'&&src.prior_entry_canonical_sha256===known.row&&p?.path===known.report&&p.sha256===known.reportHash&&p.archive_path===archive&&p.archive_sha256===known.archiveHash&&p.compression==='gzip','prior review metadata changed');
 const zipped=readEvidenceMember(root,archive);demand(hash(zipped)===known.archiveHash&&hash(gunzipSync(zipped))===known.reportHash,'prior review archive changed');
 demand(d?.current_complete_patch?.sha256===scope.patch&&d.prior_top_level_ledger_diff?.sha256===(old.diff_sha256??null)&&d.prior_top_level_ledger_diff?.format_or_scope?.includes('unknown'),'digest provenance changed');
 if(known.fullIndex){const diff='compatibility/rc/overlay-inherited-prior/'+entry.sha+'.full-index.diff';demand(d.prior_mechanical_join_diff?.path===diff&&d.prior_mechanical_join_diff.sha256===known.fullIndex&&hash(readEvidenceMember(root,diff))===known.fullIndex,'prior mechanical diff changed');}
}
export function overlayInheritedRequirements(sha,line){return line==='main'&&subjects.has(sha)?{sha,kind,patch:subjects.get(sha)}:null;}
export function validateOverlayInherited({root,entry,proof,request,line}){
 try {
  const scope=overlayInheritedRequirements(entry?.sha,line);demand(scope&&proof?.proof_kind===kind&&proof.diff_sha256===scope.patch&&isDeepStrictEqual(proof.affected_branches,['main']),'wrong overlay subject scope');
  verifyPrior(root,entry,scope);
  demand(proof.reachable_behavior?.kind==='executed-delegation'&&proof.reachable_behavior.id==='overlay-inherited-native/'+entry.sha,'wrong overlay delegation');
  for(const [path,digest] of members)demand(hash(readEvidenceMember(root,path))===digest,'overlay source identity changed: '+path);
  const runtime=validatePackedConsumerRun({root,request});demand(runtime.ok,'packed run not accepted: '+runtime.detail);
  const key=JSON.stringify([request.runDir,request.runId,runtime.library.sha256,request.invocation]);let live=cache.get(key);
  if(!live){const run=JSON.parse(readEvidenceMember(request.runDir,'run.json'));const lib=run.artifacts.find(x=>x.id==='library');const nonce=randomBytes(16).toString('hex');const archive=join(request.runDir,lib.path);
   const env={PATH:process.env.PATH,HOME:process.env.HOME,CHROME_BIN:process.env.CHROME_BIN,NODE_OPTIONS:'',LANG:'C.UTF-8'};
   const child=spawnSync(process.execPath,[join(root,'scripts/overlay-inherited-native-run.mjs'),archive,runtime.library.sha256,request.outputDir,nonce],{cwd:root,env,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});
   demand(child.status===0&&!child.error&&!child.signal,'overlay producer failed: '+String(child.error?.message||child.stderr||child.status).slice(-800));const observation=JSON.parse(child.stdout);const verified=verify({results:observation.results});
   demand(observation.kind==='overlay-inherited-live-native'&&observation.nonce===nonce&&observation.artifact_sha256===runtime.library.sha256&&observation.fixture_faults_are_upstream_mutations===false&&observation.toolchain_verified_before_and_after===true&&observation.toolchain_record_sha256==='ad74c81bd537a16a7324cd440ad3b36e9788030d21a0ad1bc1ab36772f26e503'&&verified.pass&&isDeepStrictEqual(verified.results,observation.contracts),'wrong live overlay observation');
   demand(Object.values(observation.results).every(x=>x.result.nonce===nonce&&/^Chrome\/\d+\./.test(x.browser.product)),'wrong live browser identity');
   const output=`overlay-live-${nonce}.json`,bytes=Buffer.from(JSON.stringify({run_id:request.runId,invocation_id:request.invocation,...observation})+'\n');writeFileSync(join(request.outputDir,output),bytes,{flag:'wx'});live={output,sha256:hash(bytes),nonce,run_id:request.runId,invocation_id:request.invocation,library:runtime.library,contracts:verified.results};cache.set(key,live);
  }
  const selected=live.contracts.find(x=>x.sha===entry.sha);demand(selected?.baseline===true&&selected.fault_accepted===false,'overlay contract failed');
  return {ok:true,detail:'Fixed producer reexecuted on the current packed artifact; bounded Chromium overlay behavior observed. Fixture negatives are not upstream mutations; full browser, security and G11 gates remain separate.',execution:'live-packed-native-overlay',...live};
 }catch(error){return {ok:false,detail:error.message}}
}
