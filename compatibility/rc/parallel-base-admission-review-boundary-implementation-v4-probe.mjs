import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(new URL('../..',import.meta.url).pathname);
const prefix='compatibility/rc/parallel-base-admission-review-boundary-implementation-v4-';
const epochPath='scripts/packed-upstream-ledger-epoch.mjs',basePath='scripts/packed-upstream-ledger-base.mjs';
const epoch=readFileSync(root+'/'+epochPath,'utf8'),base=readFileSync(root+'/'+basePath,'utf8');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ref=(path,raw=readFileSync(root+'/'+path))=>({path,sha256:hash(raw),bytes:Buffer.byteLength(raw)});
const checks=[];
function check(name,action){action();checks.push(name);}
function reject(name,action){assert.throws(action);checks.push(name);}
const OWNER=epochPath,TITLE_NATIVE_REGISTRY='scripts/upstream-historical-behavior-evidence.mjs';
const LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const checker='scripts/check-upstream-audit-disposition.mjs';
const epochCode=epoch.slice(epoch.indexOf('const sourceMetadataReaders='),epoch.indexOf('function original(')).replace('export function ','function ');
assert.ok(epochCode.includes('function bindSourceMetadata(')&&epochCode.includes('function packedUpstreamLedgerCurrentSourceLane('));
const ownerLane=new Function('assert','resolve','hash','OWNER','TITLE_NATIVE_REGISTRY','LEDGER',epochCode+'\nreturn {bindSourceMetadata,packedUpstreamLedgerCurrentSourceLane};')(
  assert,resolve,hash,OWNER,TITLE_NATIVE_REGISTRY,LEDGER);
const baseCode=base.slice(base.indexOf('const checkerComparisonReaders='),base.indexOf('function selectionNative('));
assert.ok(baseCode.includes('function separateSourceBindings('));
const api=new Function('assert','hash','packedUpstreamLedgerCurrentSourceLane',baseCode+`\nreturn {sourceLane,separateSourceBindings,rememberCurrent,
  testOnlyRegisterChecker:(key,frame)=>checkerComparisonReaders.set(key,frame)};`)(assert,hash,ownerLane.packedUpstreamLedgerCurrentSourceLane);
// Only this isolated probe exposes test injection. No repository module writer
// is exported or modified, and none of the owner/stage constructors executes.
const values=new Map();
for(const path of [OWNER,TITLE_NATIVE_REGISTRY,'scripts/autocomplete-selection-native-subject.mjs',LEDGER,
  'testing/legacy-runner/historical-inventory.json','.github/workflows/ci.yml',
  'scripts/upstream-dialog-title-admission.cjs','scripts/upstream-dialog-title-native-evidence.mjs',checker,'untouched'])values.set(path,Buffer.from('physical:'+path));
const physical=path=>Buffer.from(values.get(path));
const guardCalls={table:0,legacy:0,inventory:0,title:0,checker:0};
const frames=[];
function frame(raw,role,paths){
  const projected=new Map(paths.map(path=>[path,Buffer.from(role+':'+path)]));
  const prior=new Map(paths.map(path=>[path,raw(path)]));
  const guard=()=>{guardCalls[role]++;for(const[path,expected]of prior)assert.ok(raw(path).equals(expected));};
  const metadataRead=path=>projected.has(path)?Buffer.from(projected.get(path)):raw(path);
  const context={metadataRead,assertCurrent:guard};
  ownerLane.bindSourceMetadata(root,context,raw,role);frames.push({role,projected,context});return metadataRead;
}
const table=frame(physical,'table',[LEDGER]);
const legacy=frame(table,'legacy',[LEDGER]);
const inventory=frame(legacy,'inventory',[LEDGER,'testing/legacy-runner/historical-inventory.json','.github/workflows/ci.yml',
 'scripts/upstream-dialog-title-admission.cjs','scripts/upstream-dialog-title-native-evidence.mjs']);
const title=frame(inventory,'title',[OWNER,TITLE_NATIVE_REGISTRY,'scripts/autocomplete-selection-native-subject.mjs',LEDGER]);
const checkerBefore=Buffer.from('checker-before'),beforeRead=path=>path===checker?Buffer.from(checkerBefore):title(path);
api.testOnlyRegisterChecker(beforeRead,{root,raw:title,read:beforeRead,guard:()=>{guardCalls.checker++;assert.ok(title(checker).equals(values.get(checker)));},
  before:ref(checker,checkerBefore),after:ref(checker,values.get(checker))});
const lane=api.sourceLane(root,beforeRead);
check('exact nested private functions resolve original actual callback',()=>assert.equal(lane.read,physical));
check('four owner frames retained in actual callback order',()=>assert.equal(ownerLane.packedUpstreamLedgerCurrentSourceLane({root,read:title}).registered_frames,4));
check('inner-to-outer reference translation authenticates every intermediate ledger image',()=>{
  assert.deepEqual(lane.comparisonReference(ref(LEDGER,values.get(LEDGER))),ref(LEDGER,beforeRead(LEDGER)));
});
check('checker and owner translations compose separately',()=>{
  for(const path of [checker,OWNER,'untouched'])assert.deepEqual(lane.comparisonReference(ref(path,values.get(path))),ref(path,beforeRead(path)));
});
reject('foreign root cannot unwrap a registered private callback',()=>api.sourceLane(root+'/foreign',beforeRead));
check('unregistered lookalike callback receives no source-lane authority',()=>{
  const lookalike=path=>beforeRead(path);assert.equal(api.sourceLane(root,lookalike).read,lookalike);
});
reject('wrong current reference hash rejected',()=>lane.comparisonReference({path:LEDGER,sha256:'0'.repeat(64),bytes:values.get(LEDGER).length}));
reject('wrong current reference byte length rejected',()=>lane.comparisonReference({...ref(LEDGER,values.get(LEDGER)),bytes:1}));
const mixed=new Map([[OWNER,hash(values.get(OWNER))],[LEDGER,hash(beforeRead(LEDGER))],[checker,hash(checkerBefore)],['untouched',hash(values.get('untouched'))]]);
api.rememberCurrent(root,beforeRead,[ref('scripts/upstream-dialog-title-native-evidence.mjs',values.get('scripts/upstream-dialog-title-native-evidence.mjs'))]);
const separated=api.separateSourceBindings(root,beforeRead,mixed,title);
check('three binding maps preserve inner/outer/current checker identities',()=>{
  assert.equal(separated.metadataBound.get(checker),hash(checkerBefore));assert.equal(separated.outerBound.get(checker),hash(values.get(checker)));
  assert.equal(separated.physicalBound.get(checker),hash(values.get(checker)));assert.equal(separated.metadataBound.get(OWNER),hash(beforeRead(OWNER)));
  assert.equal(separated.physicalBound.get(OWNER),hash(values.get(OWNER)));
});
const oldUntouched=values.get('untouched');values.set('untouched',Buffer.from('mutation'));
reject('late physical input mutation rejected',()=>separated.assertCurrent());values.set('untouched',oldUntouched);separated.assertCurrent();
const titleFrame=frames.find(frame=>frame.role==='title'),oldOwner=titleFrame.projected.get(OWNER);titleFrame.projected.set(OWNER,Buffer.from('metadata-mutation'));
reject('late historical metadata input mutation rejected',()=>separated.assertCurrent());titleFrame.projected.set(OWNER,oldOwner);separated.assertCurrent();
checks.push('restored authentic inputs accepted after both mutation controls');

// Read exact current comparison function against a physical native reference.
// This proves the preserved stage's equality cannot translate the title-native
// successor. It does not invoke the real source producer or the full owner.
const metadataCode=base.slice(base.indexOf('function checkerBeforeEntrypointMetadata('),base.indexOf('\nconst allowed ='));
const translate=new Function('testingApiChecker',metadataCode+'\nreturn checkerBeforeEntrypointMetadata;')(checker);
const packetPath='compatibility/rc/autocomplete-selection-ledger-successor.json';
const packet=JSON.parse(readFileSync(root+'/'+packetPath));
const nativeExpected=packet.qualification_members.find(row=>row.path===TITLE_NATIVE_REGISTRY);assert.ok(nativeExpected);
const nativeCurrent=ref(TITLE_NATIVE_REGISTRY);
check('current frozen-stage native comparison reproduces exact reference mismatch',()=>{
 assert.notDeepEqual(nativeCurrent,nativeExpected);assert.deepEqual(translate(root,physical,nativeCurrent),nativeCurrent);
 assert.throws(()=>assert.deepEqual(nativeExpected,translate(root,physical,nativeCurrent)));
});
const nativePacket=JSON.parse(readFileSync(root+'/compatibility/rc/autocomplete-selection-native-contract-proposal.json'));
check('later frozen digest update also expects historical native after-image',()=>{
 assert.ok(packet.source_digest_updates.every(row=>row.after===nativePacket.registry.after_sha256));
 assert.notEqual(nativeCurrent.sha256,nativePacket.registry.after_sha256);
});

// Cheap model count using exact current functions and in-memory guard counters.
// Three inputs are enough to expose repeated complete-frame guards without an
// expensive source run; the real owner enumerates 1,142 product members.
for(const role of Object.keys(guardCalls))guardCalls[role]=0;
const measuredPaths=[OWNER,TITLE_NATIVE_REGISTRY,LEDGER];
for(let index=0;index<3;index++){
 const current=api.sourceLane(root,beforeRead);
 current.comparisonReference(ref('untouched',values.get('untouched')));
 for(const path of measuredPaths)current.comparisonReference(ref(path,values.get(path)));
}
const guardCountModel={members:3,scope_references_per_member:measuredPaths.length,guard_calls:{...guardCalls}};
const result={schema_version:1,status:'focused-private-functions-pass-frozen-selection-stage-reference-mismatch-reproduced',
 source_inputs:[ref(epochPath,epoch),ref(basePath,base),ref(packetPath)],checks,checks_passed:checks.length,
 actual_native_reference:nativeCurrent,frozen_stage_expected_native_reference:nativeExpected,
 constructor_observation:'Inventory/legacy/table roles do not project any present historical repair-helper source path. Title measurement explicitly recognizes the exact inventory callback for its native-handler/inventory predecessor metadata.',
 guard_count_model:guardCountModel,
 limits:['Test-only extraction/injection of exact current private functions; actual owner context constructors and public producer are unexecuted.',
 'No full owner/build/compiler/browser/native/matrix/canonical execution or existing edits.',
 'The ordinary repair registry extension is still being prepared by its owner; this probe does not bypass or qualify it.']};
writeFileSync(root+'/'+prefix+'result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({result:ref(prefix+'result.json'),checks:checks.length,guard_count_model:guardCountModel}));
