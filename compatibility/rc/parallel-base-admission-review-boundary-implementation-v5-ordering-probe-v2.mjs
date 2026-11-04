/** Focused exact-function controls; synthetic capabilities are test-only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {historicalContractRepairReaderSubject,readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
import {packedUpstreamLedgerCurrentSourceLane as publicLane} from '../../scripts/packed-upstream-ledger-epoch.mjs';
import {registeredSourceCheckerTransition} from '../../scripts/registered-source-checker-transition.mjs';
import {requiresTestingApi21xEntry} from '../../scripts/upstream-testing-api-21x-admission.mjs';
import {requiresSassInspectionScope} from '../../scripts/upstream-sass-inspection-admission.mjs';
import {requiresRulesJsBuild} from '../../scripts/upstream-rules-js-build-admission.mjs';
import {requiresLegacySassEntrypointScope} from '../../scripts/upstream-legacy-sass-entrypoint-admission.mjs';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const root=resolve(new URL('../..',import.meta.url).pathname),prefix='compatibility/rc/parallel-base-class-owner-integration-';
const OWNER='scripts/packed-upstream-ledger-epoch.mjs',BASE='scripts/packed-upstream-ledger-base.mjs',TITLE_NATIVE_REGISTRY='scripts/upstream-historical-behavior-evidence.mjs',LEDGER='compatibility/f10/disposition-ledger/ledger.json',CHECKER='scripts/check-upstream-audit-disposition.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),physical=path=>readHistoricalContractRepairOwnerMember(root,path);
const ref=(path,raw=physical(path))=>({path,sha256:hash(raw),bytes:Buffer.byteLength(raw)});
const source=path=>physical(path).toString(),epoch=source(OWNER),base=source(BASE),helper=source('scripts/checker-reference-metadata.mjs');
const checks=[];function check(name,fn){fn();checks.push(name);}function rejects(name,fn){assert.throws(fn);checks.push(name);}
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const original=(parent,path)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});
const epochCode=epoch.slice(epoch.indexOf('const sourceMetadataReaders='),epoch.indexOf('function original(')).replaceAll('export function ','function ');
const ownerApi=new Function('assert','resolve','hash','OWNER','TITLE_NATIVE_REGISTRY','LEDGER',epochCode+'\nreturn {bindSourceMetadata,packedUpstreamLedgerCurrentSourceLane,testOnlySet:(key,frame)=>sourceMetadataReaders.set(key,frame)};')(assert,resolve,hash,OWNER,TITLE_NATIVE_REGISTRY,LEDGER);
const baseCode=base.slice(base.indexOf('const checkerComparisonReaders='),base.indexOf('function selectionNative(')).replaceAll('export function ','function ');
const comparisonCode=base.slice(base.indexOf('function sourceComparisonReference('),base.indexOf('function selectionReaders('));
const checkerCode=base.slice(base.indexOf('function checkerBeforeEntrypointMetadata('),base.indexOf('\nconst allowed ='));
const prepareCode=base.slice(base.indexOf('export function preparePackedUpstreamLedger('),base.indexOf('function preparePackedUpstreamLedgerInner(')).replaceAll('export function ','function ');
let driver=()=>({assertCurrent:()=>{}});
const api=new Function('assert','hash','packedUpstreamLedgerCurrentSourceLane','testingApiChecker','gitBytes','legacySassEntrypointCheckerSuccessor','preparePackedUpstreamLedgerInner','packedUpstreamLedgerRawRead',baseCode+comparisonCode+checkerCode+prepareCode+`\nreturn {sourceLane,separateSourceBindings,rememberCurrent,retainSourceScope,bindScopeReferences,sourceComparisonReference,selectionComparisonMembers,preparePackedUpstreamLedger,
 testOnlyRegister:(key,frame)=>checkerComparisonReaders.set(key,frame),depth:()=>sourcePreparationStack.length};`)(assert,hash,ownerApi.packedUpstreamLedgerCurrentSourceLane,CHECKER,(r,p,path)=>original(p,path),text=>{
 // Use the exact current successor function and edits, not a probe approximation.
 const start=base.indexOf('const legacySassEntrypointCheckerEdits ='),end=base.indexOf('// Metadata reconstruction only.',start);
 return new Function('assert',base.slice(start,end)+'\nreturn legacySassEntrypointCheckerSuccessor;')(assert)(text);
},args=>driver(args),({read})=>read);
const values=new Map(),frames=[],guardCalls={title:0,inventory:0,legacy:0,table:0,checker:0};
for(const path of [OWNER,TITLE_NATIVE_REGISTRY,'scripts/autocomplete-selection-native-subject.mjs',LEDGER,'testing/legacy-runner/historical-inventory.json','.github/workflows/ci.yml','scripts/upstream-dialog-title-admission.cjs','scripts/upstream-dialog-title-native-evidence.mjs',CHECKER,'untouched'])values.set(path,Buffer.from('actual:'+path));
const actual=path=>Buffer.from(values.get(path));
function frame(raw,role,paths){const projected=new Map(paths.map(path=>[path,Buffer.from(role+':'+path)])),prior=new Map(paths.map(path=>[path,raw(path)]));
 const guard=()=>{guardCalls[role]++;for(const[path,before]of prior)assert.ok(raw(path).equals(before));};
 const context={metadataRead:path=>projected.has(path)?Buffer.from(projected.get(path)):raw(path),assertCurrent:guard};
 ownerApi.bindSourceMetadata(root,context,raw,role);frames.push({role,projected,context});return context.metadataRead;}
const table=frame(actual,'table',[LEDGER]),legacy=frame(table,'legacy',[LEDGER]),inventory=frame(legacy,'inventory',[LEDGER,'testing/legacy-runner/historical-inventory.json','.github/workflows/ci.yml','scripts/upstream-dialog-title-admission.cjs','scripts/upstream-dialog-title-native-evidence.mjs']),title=frame(inventory,'title',[OWNER,TITLE_NATIVE_REGISTRY,'scripts/autocomplete-selection-native-subject.mjs',LEDGER]);
const oldChecker=Buffer.from('checker-before'),privateRead=path=>path===CHECKER?Buffer.from(oldChecker):title(path);
api.testOnlyRegister(privateRead,{root,raw:title,read:privateRead,guard:()=>{guardCalls.checker++;assert.ok(title(CHECKER).equals(values.get(CHECKER)));},before:ref(CHECKER,oldChecker),after:ref(CHECKER,values.get(CHECKER))});
const lane=api.sourceLane(root,privateRead);
check('nested owner/checker chain resolves actual original callback',()=>assert.equal(lane.read,actual));
check('all intermediate ledger/reference transforms compose exactly',()=>{for(const path of [LEDGER,OWNER,CHECKER,'untouched'])assert.deepEqual(lane.comparisonReference(ref(path,values.get(path))),ref(path,privateRead(path)));});
rejects('wrong root rejected',()=>api.sourceLane(root+'/other',privateRead));
check('unknown no-op-guard lookalike remains unprivileged',()=>{const unknown=path=>privateRead(path);unknown.assertCurrent=()=>{};assert.equal(api.sourceLane(root,unknown).read,unknown);assert.equal(publicLane({root,read:unknown}).read,unknown);});
rejects('wrong transformed reference rejected',()=>lane.comparisonReference({path:OWNER,sha256:'0'.repeat(64),bytes:1}));
const cyclic=()=>Buffer.alloc(0);api.testOnlyRegister(cyclic,{root,raw:cyclic});rejects('combined map cycle rejected',()=>api.sourceLane(root,cyclic));
const alternatingA=()=>Buffer.alloc(0),alternatingB=()=>Buffer.alloc(0);api.testOnlyRegister(alternatingA,{root,raw:alternatingB});ownerApi.testOnlySet(alternatingB,{root,raw:alternatingA});rejects('alternating checker/owner cycle rejected',()=>api.sourceLane(root,alternatingA));
const mixed=new Map([[OWNER,hash(values.get(OWNER))],[LEDGER,hash(privateRead(LEDGER))],[CHECKER,hash(oldChecker)],['untouched',hash(values.get('untouched'))]]);
const separated=api.separateSourceBindings(root,privateRead,mixed,title);
check('private outer and actual maps retain distinct checker/source identities',()=>{assert.equal(separated.metadataBound.get(CHECKER),hash(oldChecker));assert.equal(separated.outerBound.get(CHECKER),hash(values.get(CHECKER)));assert.equal(separated.physicalBound.get(OWNER),hash(values.get(OWNER)));assert.notEqual(separated.metadataBound.get(OWNER),separated.physicalBound.get(OWNER));});
let saved=values.get('untouched');values.set('untouched',Buffer.from('late-actual'));rejects('late actual member rejected',()=>separated.assertCurrent());values.set('untouched',saved);separated.assertCurrent();
const titleFrame=frames.find(row=>row.role==='title');saved=titleFrame.projected.get(OWNER);titleFrame.projected.set(OWNER,Buffer.from('late-private'));rejects('late private member rejected',()=>separated.assertCurrent());titleFrame.projected.set(OWNER,saved);separated.assertCurrent();
for(const key of Object.keys(guardCalls))guardCalls[key]=0;
for(let i=0;i<3;i++){const current=api.sourceLane(root,privateRead);for(const path of ['untouched',OWNER,TITLE_NATIVE_REGISTRY,LEDGER])current.comparisonReference(ref(path,values.get(path)));}
const hotGuardCalls={...guardCalls};check('hot identity and relevant-pair checks invoke no full owner guards',()=>assert.ok(Object.values(hotGuardCalls).every(value=>value===0)));
let scopeCalls=0,preparedCalls=0;const scope={bound:[ref(OWNER,values.get(OWNER))],assertCurrent:()=>{scopeCalls++;assert.equal(hash(actual(OWNER)),hash(values.get(OWNER)));}};
driver=({read})=>{for(let i=0;i<3;i++){api.retainSourceScope(root,api.sourceLane(root,read),scope);api.bindScopeReferences(mixed,scope,api.sourceLane(root,read));}return {assertCurrent:()=>{preparedCalls++;}};};
const prepared=api.preparePackedUpstreamLedger({root,read:privateRead}),batchGuardCalls={...guardCalls};check('preparation exits private stack and returns retained full guards',()=>{assert.equal(api.depth(),0);assert.equal(scopeCalls,2);assert.ok(Object.values(batchGuardCalls).every(value=>value>0));prepared.assertCurrent();assert.equal(preparedCalls,1);});
const failure=new Error('original child failure');driver=()=>{throw failure;};check('thrown preparation preserves original error and unwinds stack',()=>{assert.throws(()=>api.preparePackedUpstreamLedger({root,read:privateRead}),error=>error===failure);assert.equal(api.depth(),0);});
const beforeExternal=scopeCalls;api.retainSourceScope(root,lane,scope);check('external cache reuse after failure runs scope guard',()=>assert.equal(scopeCalls,beforeExternal+1));
let nesting=0;driver=({read})=>{assert.equal(api.depth(),nesting+1);if(nesting===0){nesting++;api.preparePackedUpstreamLedger({root,read});nesting--;assert.equal(api.depth(),1);}api.retainSourceScope(root,api.sourceLane(root,read),scope);return {assertCurrent:()=>{}};};api.preparePackedUpstreamLedger({root,read:privateRead});check('nested preparations unwind to their own frame',()=>assert.equal(api.depth(),0));
saved=titleFrame.projected.get(OWNER);driver=({read})=>{api.retainSourceScope(root,api.sourceLane(root,read),scope);titleFrame.projected.set(OWNER,Buffer.from('during-private'));return {assertCurrent:()=>{}};};rejects('private callback mutation during preparation rejected by end guard',()=>api.preparePackedUpstreamLedger({root,read:privateRead}));titleFrame.projected.set(OWNER,saved);assert.equal(api.depth(),0);
saved=values.get(OWNER);driver=()=>{values.set(OWNER,Buffer.from('during-actual'));return {assertCurrent:()=>{}};};rejects('actual callback mutation during preparation rejected by end guard',()=>api.preparePackedUpstreamLedger({root,read:privateRead}));values.set(OWNER,saved);assert.equal(api.depth(),0);prepared.assertCurrent();
// Real physical refs plus exact Git-authenticated predecessor bytes, carried by
// synthetic test-only private associations; no actual owner context executes.
const nativePacket=JSON.parse(physical('compatibility/rc/autocomplete-selection-native-contract-proposal.json')),packet=JSON.parse(physical('compatibility/rc/autocomplete-selection-ledger-successor.json'));
const nativeOld=original('33e11b2965c9ff559865bc81298e6766653672be',TITLE_NATIVE_REGISTRY),inventoryPath='testing/legacy-runner/historical-inventory.json',inventoryOld=original('97bdcbed054d714841db8f2446ade83b953cd5e0',inventoryPath);
assert.equal(hash(nativeOld),nativePacket.registry.after_sha256);assert.equal(hash(inventoryOld),packet.qualification_members.find(row=>row.path===inventoryPath).sha256);
const inventoryContext={metadataRead:path=>path===inventoryPath?Buffer.from(inventoryOld):physical(path),assertCurrent:()=>assert.equal(hash(physical(inventoryPath)),hash(readFileSync(root+'/'+inventoryPath)))};
ownerApi.bindSourceMetadata(root,inventoryContext,physical,'inventory');
const ownerBefore=original('519e487c40c9cb2beaf92a5e6564a9af1b355720',BASE);
const titleContext={metadataRead:path=>path===OWNER?Buffer.from(ownerBefore):path===TITLE_NATIVE_REGISTRY?Buffer.from(nativeOld):inventoryContext.metadataRead(path),assertCurrent:()=>assert.equal(hash(physical(TITLE_NATIVE_REGISTRY)),ref(TITLE_NATIVE_REGISTRY).sha256)};
ownerApi.bindSourceMetadata(root,titleContext,inventoryContext.metadataRead,'title');
const transition=registeredSourceCheckerTransition({root,read:titleContext.metadataRead});api.testOnlyRegister(transition.beforeRead,{root,raw:titleContext.metadataRead,read:transition.beforeRead,guard:transition.assertCurrent,before:ref(CHECKER,transition.before),after:ref(CHECKER,transition.after)});
const metadata=transition.beforeRead,physicalMembers=packet.qualification_members.map(row=>ref(row.path));physicalMembers.push(ref(BASE));
const sourceView={bound:physicalMembers};check('frozen qualification members compare through exact native/checker/inventory lanes',()=>assert.deepEqual(api.selectionComparisonMembers(root,metadata,sourceView,packet.qualification_members),packet.qualification_members));
for(const entry of packet.entries){const expected=entry.after_entry.individual_proof.historical_behavior.source_members,current=expected.map(row=>({path:row.path,sha256:hash(physical(row.path))}));check('frozen generated proof refs '+entry.sha,()=>assert.deepEqual(current.map(row=>api.sourceComparisonReference(root,metadata,row)),expected));}
check('all frozen native digest after-updates remain historical',()=>{const compared=api.sourceLane(root,metadata).comparisonReference(ref(TITLE_NATIVE_REGISTRY));assert.ok(packet.source_digest_updates.every(row=>row.after===compared.sha256));assert.notEqual(compared.sha256,ref(TITLE_NATIVE_REGISTRY).sha256);});
const retainedExtra=api.separateSourceBindings(root,metadata,new Map(physicalMembers.map(row=>[row.path,row.sha256])),metadata);check('additional current provenance retained in physical map',()=>assert.equal(retainedExtra.physicalBound.get(BASE),ref(BASE).sha256));
rejects('missing saved qualification member rejects',()=>api.selectionComparisonMembers(root,metadata,{bound:physicalMembers.slice(1)},packet.qualification_members));
// Actual shared repair-reader constructor on current physical inputs.
const subject=historicalContractRepairReaderSubject({root,read:physical});check('actual17-row physical reader qualification',()=>assert.equal(subject.transitions.length,17));
check('missing and unknown tool hashes acquire no ownership',()=>{assert.equal(subject.ownsReference({path:BASE}),false);assert.equal(subject.ownsReference({path:BASE,sha256:'0'.repeat(64)}),false);});
check('exact prior BASE and epoch intermediate metadata authenticate',()=>{assert.equal(subject.comparisonBytes({path:BASE,sha256:'ee74d3c46ae056f4ffd16cc1d38d60820ca449d96158c776319a2bfcbc6fc715',bytes:109664}).length,109664);assert.ok(subject.qualify({path:OWNER,sha256:'34a8c062367debddf81a5112be37e4aa603e4a3c6b9c8e5c7c34144995d62669',bytes:74930}));});
rejects('actual physical reader rejects unbranded old-tool callback',()=>historicalContractRepairReaderSubject({root,read:path=>path===OWNER?Buffer.from('old-tool'):physical(path)}));
let mutate=false;const lateRead=path=>mutate&&path===BASE?Buffer.from('late-tool'):physical(path),late=historicalContractRepairReaderSubject({root,read:lateRead});mutate=true;rejects('actual physical reader rejects late provided callback mutation',()=>late.assertCurrent());mutate=false;late.assertCurrent();
// Exact checker helper function with isolated physical-title dependency. All
//14 old checker exclusions, immutable review literals and final ledger digest
// execute unchanged; this is not real title/owner construction.
const titlePacket=JSON.parse(physical('compatibility/rc/dialog-title-current-source-reader-successors.json'));
const checkerScopeBound=[ref(OWNER),ref(BASE),ref('scripts/checker-reference-metadata.mjs')],checkerScope={bound:checkerScopeBound,qualify:reference=>{const row=titlePacket.code_subjects.find(row=>row.path===reference.path);if(!row)return null;const candidate=subject.qualify({path:row.path,...row.after})??{path:row.path,...row.after};assert.ok([row.before.sha256,row.after.sha256,candidate.sha256].includes(reference.sha256));assert.deepEqual(candidate,ref(row.path));return candidate;},assertCurrent:()=>{for(const row of checkerScopeBound)assert.deepEqual(ref(row.path),row);}};
const checkerFunctions=helper.slice(helper.indexOf('function property(')).replaceAll('export function ','function ');
const checkerApi=new Function('assert','ts','hash','original','dialogTitleReaderSubject','packedUpstreamBaseCurrentSourceLane','CHECKER_REFERENCE_REVIEW','CHECKER_REFERENCE_LEDGER','reviewHash','afterHash','syntax','requiresTestingApi21xEntry','requiresSassInspectionScope','requiresRulesJsBuild','requiresLegacySassEntrypointScope',checkerFunctions+'\nreturn checkerReferenceMetadata;')(assert,ts,hash,(r,p,path)=>original(p,path),({read})=>{assert.equal(read,physical);return checkerScope;},({root:r,read})=>api.sourceLane(r,read),'compatibility/rc/checker-reference-metadata-review.json',LEDGER,'b65c4822274eaf5f5ee7cfe3683e8b2e29a6867518d317e1a644cbc8b6924c62','d015c3d9cca4b9ea489da7028ab5a8bcd675adf428db3000ed60c0b2380f0e27',new Map(),requiresTestingApi21xEntry,requiresSassInspectionScope,requiresRulesJsBuild,requiresLegacySassEntrypointScope);
const mixedHelper=checkerApi({root,read:metadata,line:'21.x'});check('exact mixed checker helper preserves all old checker96/ledger comparisons',()=>{assert.equal(hash(mixedHelper.after),'d015c3d9cca4b9ea489da7028ab5a8bcd675adf428db3000ed60c0b2380f0e27');assert.equal(mixedHelper.current_source_bound.length,3);mixedHelper.assertCurrent();});
const nativeFirst=nativeOld[0];nativeOld[0]^=1;rejects('mixed checker retained guard rejects late private native metadata mutation',()=>mixedHelper.assertCurrent());nativeOld[0]=nativeFirst;mixedHelper.assertCurrent();
rejects('mixed checker helper rejects unregistered historical-reader lookalike',()=>checkerApi({root,read:path=>metadata(path),line:'21.x'}));
const reordered=physicalMembers.filter(row=>row.path!==CHECKER),checkerRef=physicalMembers.find(row=>row.path===CHECKER);
const scopesAt=reordered.findIndex(row=>row.path==='scripts/autocomplete-selection-native-scopes.mjs');assert.ok(scopesAt>=0);reordered.splice(scopesAt,0,checkerRef);
let orderingAccepted=false,orderingError=null;try{assert.deepEqual(api.selectionComparisonMembers(root,metadata,{bound:reordered},packet.qualification_members),packet.qualification_members);orderingAccepted=true;}catch(error){orderingError=error.message;}
const orderingEvidence={physical_ref_order_changes_due_to_current_provenance:true,root_checker_before_native_scope_module:true,projection_accepts_reordered_current_refs:orderingAccepted,error:orderingError,expected_checker_index:packet.qualification_members.findIndex(row=>row.path===CHECKER),current_checker_index:reordered.findIndex(row=>row.path===CHECKER),original_path_population_unchanged:true};
const output={schema_version:1,status:orderingAccepted?'reordered-physical-metadata-projection-passes':'reordered-physical-metadata-projection-rejection-reproduced',orderingEvidence,node:process.version,checks_passed:checks.length,checks,source_inputs:[OWNER,BASE,'scripts/checker-reference-metadata.mjs','scripts/historical-contract-repair-readers.mjs','compatibility/rc/historical-contract-repair-reader-inputs.json','compatibility/rc/autocomplete-selection-ledger-successor.json'].map(path=>ref(path)),guard_count_model:{members:3,scope_references_per_member:3,prior_full_guards_per_owner:84,prior_checker_full_guards:30,current_hot_full_guards:hotGuardCalls,bracketed_full_guards:batchGuardCalls,scope_guards_during_initial_three_lookups:2},execution_lanes:{actual_physical_reader_constructor:true,actual_owner_or_source_producer_construction:false,private_capability_injection:'test-only exact-function extraction',mixed_checker:'exact helper with isolated physical title dependency; original14 predicates and literal comparisons executed'},canonical_changes_applied:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const out='compatibility/rc/parallel-base-admission-review-boundary-implementation-v5-ordering-result-v2.json';writeFileSync(root+'/'+out,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({output:ref(out),checks:checks.length,guard_count_model:output.guard_count_model}));
