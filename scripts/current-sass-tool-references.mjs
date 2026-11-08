/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current tool references. Historical programs are authenticated as data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync,openSync,closeSync,readSync,fstatSync,constants} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import * as planner from './canonical-source-guard-plan.mjs';
const {composeCanonicalSourceGuards}=planner;

const SELF='scripts/current-sass-tool-references.mjs';
const requireLocal=createRequire(import.meta.url);
const DOMAIN_PACKET=Object.freeze({path:'compatibility/rc/current-tool-domain-source-successor-v1.json',sha256:'8995184d9e73a6a9aaaebd4c17df00913f12f59ba19a8b1ef3c639777d32d18b',bytes:158538});
const CHECKER_PACKET=Object.freeze({path:'compatibility/rc/current-tool-checker-source-successor-v1.json',sha256:'f295a815a7723fba08656833fe4b2796fd9ce6e126ee2a245c54dc96bdded517',bytes:9056});
const MATRIX_OWNER=Object.freeze({path:'scripts/current-tool-matrix-source.mjs',sha256:'42d5d1251e8cacf69f0d1519bd6ba9a356c9c9eaac0bf5c5af1eb8aba5b20f1c',bytes:24939});
const MATRIX_FACTORY_SHA256='9577b4bb31ad0c4218ad2455abe9c3cb8d13abd48cac10abeec64e1015fe8250';

const GUARD_PLAN=Object.freeze({path:'scripts/canonical-source-guard-plan.mjs',sha256:'4f632a3fe97975804edf5b89c1cc5abadc002ef78fe16c3a40edbadde460fc9f',bytes:4609});
const CURRENT_GUARD_PLAN=Object.freeze({path:'scripts/canonical-source-guard-plan.mjs',sha256:'3a3663ce06af2107f55c410fff458100a808593fa9a968e18a94d8490c7fc664',bytes:5014});
const PLANNER_PACKET=Object.freeze({path:'compatibility/rc/current-tool-planner-source-successor-v1.json',sha256:'7a986f7e700c45cc7137432e0573705f6aed6245c3963e9aa8953f93f8eec7fb',bytes:1162});
const PLANNER_PARENT='2fbecd1b2687e26515c205cbd5c0024e9474b4b8',PLANNER_COMMIT='8baa761eca624c9d71293c3d31750a2b3fdeebf0';
const GUARD_PLAN_FUNCTION_SHA256='fecc474c121931506ce1f0f97e176886957f1504da46e74a085a068910ff9947';
const loadedComposeCanonicalSourceGuards=composeCanonicalSourceGuards, functionToString=Function.prototype.toString;
const INPUTS='compatibility/rc/parent-base-class-tool-successor-inputs-v3.json';
const V4_INPUTS=Object.freeze({path:'compatibility/rc/parent-base-class-tool-successor-inputs-v4.json',sha256:'60088525932c75c41782874396eb72f8bcec479ec2ad4d911090e1e2b3964b24',bytes:109915});
const V5_INPUTS=Object.freeze({path:'compatibility/rc/parent-base-class-tool-successor-inputs-v5.json',sha256:'365ffeba024c5bc28705c1bc42127e2491fadcf0d76ed90bef686a83757e91af',bytes:19314});
const V5_PARENT='c72d88c74944463d1fea960ae718fb30944818c9',V5_COMMIT='5b09618cde44725b8723fe4f6c63c3a4c35ad7e5';
const V5_PATHS=['scripts/rc-verify.py','scripts/packed-consumer-evidence.mjs'];
const V4_PARENT='7870ef230c0e980d8b58eab81374358142eca065';
const V4_COMMITS=Object.freeze({'tests/current_sass_tool_reference_probe.mjs':'authored','scripts/browser-reference-source.mjs':'authored','scripts/checker-reference-proposal.mjs':'authored','tests/checker_reference_source_probe.mjs':'authored','tests/test_current_sass_tool_references.py':'authored','scripts/check-upstream-audit-disposition.mjs':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','scripts/rc-verify.py':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','scripts/rc_acceptance.py':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','compatibility/rc/matrices/full-verify.json':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','tests/test_rc_acceptance.py':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','scripts/select-dialog-finite-source-successor.mjs':'0da0a92934ffae20098de762d78c329dc932c04c','scripts/select_dialog_finite_source_successor_v4.py':'0da0a92934ffae20098de762d78c329dc932c04c','scripts/remaining-native-tab-lifecycle-review.mjs':'b30c40a7b58513047cdf453c28ae7e33cd40d5f3','scripts/inventory-reference-owner.mjs':'948e8290b74953c83d11268368f38952d0b51fd7','scripts/inventory-reference-proposal.mjs':'948e8290b74953c83d11268368f38952d0b51fd7','scripts/inventory-finite-tool-successor.mjs':'948e8290b74953c83d11268368f38952d0b51fd7','tests/inventory_finite_source_probe.mjs':'948e8290b74953c83d11268368f38952d0b51fd7','scripts/inventory-rc-acceptance-source-successor.mjs':'authored'});
const V2_INPUTS={path:'compatibility/rc/current-sass-tool-reference-inputs-v2.json',sha256:'d25ef6684992ececd518f7932bc68f5d43d433df23868d7a376ebf0a9e56a770',bytes:625566};
const V3_CHECKPOINTS={'21.x':'d8ab97315b6c77b83f42c2bebcf63b2984fff255',main:'59ba0e2aa8b76f71b472ea2831273e44e44b5b57'};
const V3_SOURCE_ANCHORS={
 'scripts/upstream-base-class-removal-admission.cjs':{before:{path:'scripts/upstream-base-class-removal-admission.cjs',sha256:'013cbe4ae44ebebcf8331d2aedca972f15c824dd4e61bc795f0efa188d35b69a',bytes:14322},packet:{path:'compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json',sha256:'720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881',bytes:3578},member_key:'handler'},
 'scripts/legacy-removal-canonical-stage.mjs':{packet:{path:'compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json',sha256:'1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b',bytes:184121},transition_index:1},
 'tests/test_packed_upstream_ledger_epoch.py':{packet:{path:'compatibility/rc/c04-inventory-owner-inputs.json',sha256:'0d9dfac3813a6dc60644a090a2173ce56eaed1bcbdb32c2be29ce53f32413cdc',bytes:12144},source_member_index:9},
 'scripts/browser-reference-source.mjs':{packet:{path:'compatibility/rc/c04-browser-owner-inputs.json',sha256:'710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a',bytes:15193},transition_index:2},
 'tests/checker_reference_source_probe.mjs':{packet:{path:'compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json',sha256:'1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b',bytes:184121},transition_index:4},
 'scripts/browser-owner-source.mjs':{packet:{path:'compatibility/rc/21x-legacy-removal-admission-owner-inputs.json',sha256:'f64114770b458614c1251e8aae33b245999e64fee8ffa9216324e0f253bd4e0f',bytes:40975},transition_index:2},
 'scripts/checker-owner-source.mjs':{packet:{path:'compatibility/rc/c04-browser-owner-inputs.json',sha256:'710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a',bytes:15193},transition_index:1},
 'scripts/checker-reference-proposal.mjs':{packet:{path:'compatibility/rc/c04-checker-owner-inputs.json',sha256:'3ae63a5b436eab901a7ff22cb8ecc9043a5aea8d2fb89ebd9e7f396ea3105bf3',bytes:12073},transition_index:2},
 'tests/browser_reference_owner_probe.mjs':{packet:{path:'compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json',sha256:'1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b',bytes:184121},transition_index:9},
 'tests/test_browser_reference_owner.py':{packet:{path:'compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json',sha256:'1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b',bytes:184121},transition_index:10},
};
const V3_REGRESSION_SOURCE_ANCHORS={"21.x":{"tests/browser_reference_source_probe.mjs":{"before":{"path":"tests/browser_reference_source_probe.mjs","sha256":"cca4093034ebb6932fc7e822e70e684413b55d8fff12b40dcccbfdc07713a0e7","bytes":7558},"packet":{"path":"compatibility/rc/c04-browser-reference-source-inputs.json","sha256":"5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae","bytes":115478},"source_member_index":50},"scripts/browser-reference-proposal.mjs":{"before":{"path":"scripts/browser-reference-proposal.mjs","sha256":"600a430a33955755561f018f46288acd4beed4b9ad4ca6b4daf8aa7cb5bf1d50","bytes":13492},"packet":{"path":"compatibility/rc/c04-browser-owner-inputs.json","sha256":"710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a","bytes":15193},"transition_index":3}},"main":{"tests/browser_reference_source_probe.mjs":{"before":{"path":"tests/browser_reference_source_probe.mjs","sha256":"cca4093034ebb6932fc7e822e70e684413b55d8fff12b40dcccbfdc07713a0e7","bytes":7558},"packet":{"path":"compatibility/rc/c04-browser-reference-source-inputs.json","sha256":"4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c","bytes":115393},"source_member_index":48},"tests/checker_reference_source_probe.mjs":{"before":{"path":"tests/checker_reference_source_probe.mjs","sha256":"0c1158d9c1dcbe5a33f6d8f7660e8ad0435b031020a9610f76655f4648f211a8","bytes":15116},"packet":{"path":"compatibility/rc/c04-checker-owner-inputs.json","sha256":"f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc","bytes":12073},"transition_index":0},"scripts/browser-reference-proposal.mjs":{"before":{"path":"scripts/browser-reference-proposal.mjs","sha256":"600a430a33955755561f018f46288acd4beed4b9ad4ca6b4daf8aa7cb5bf1d50","bytes":13492},"packet":{"path":"compatibility/rc/c04-browser-owner-inputs.json","sha256":"d22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb","bytes":15192},"transition_index":3},"scripts/checker-reference-proposal.mjs":{"before":{"path":"scripts/checker-reference-proposal.mjs","sha256":"22c49ba434ee0b1253ad2815b77510adb8259cc3f307005f6b66b73e522502ac","bytes":13095},"packet":{"path":"compatibility/rc/c04-checker-owner-inputs.json","sha256":"f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc","bytes":12073},"transition_index":2},"scripts/browser-reference-source.mjs":{"before":{"path":"scripts/browser-reference-source.mjs","sha256":"59f2ac538149e0d9b2176c231a97147862881fb19b46768a5a4e450d66f9fe38","bytes":10443},"packet":{"path":"compatibility/rc/c04-browser-owner-inputs.json","sha256":"d22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb","bytes":15192},"transition_index":2}}};
// Exact Git predecessors anchored by the untouched T14 source-input rows.
Object.assign(V3_REGRESSION_SOURCE_ANCHORS['21.x'], {"scripts/companion-bridge-peer-oracle.mjs":{"before":{"path":"scripts/companion-bridge-peer-oracle.mjs","sha256":"0bb0c5bc31c6e00b7e60346a008d0ce1a7c1a649c9c64bff504d14ac08554838","bytes":13994},"packet":{"path":"compatibility/rc/parent-t14-focused-21-final-compat-v1.json","sha256":"5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287","bytes":387987},"source_input_index":174},"scripts/sass-companion-addition-contract.mjs":{"before":{"path":"scripts/sass-companion-addition-contract.mjs","sha256":"6ebac00c6000aeade23d08d25b9bb3679b3497cfc8986fe51df1bc753befaf44","bytes":3002},"packet":{"path":"compatibility/rc/parent-t14-focused-21-final-compat-v1.json","sha256":"5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287","bytes":387987},"source_input_index":530}});
const PREVIOUS_INPUTS={path:'compatibility/rc/current-sass-tool-reference-inputs-v1.json',sha256:'ffb8fb98babb084a86e4d49f13ef17069f784eb732365c566f6c764efd62e64f',bytes:478008};
const CHECKPOINTS={'21.x':'b25aedd02f7b53e8cd8dfcdad369a806a1301619',main:'5e9f8e51fd53b63500ce9f292a3b0bd9e8b4e2d8'};
for(const [line,anchor] of Object.entries({"21.x":{"before":{"path":"scripts/browser-reference-owner.mjs","sha256":"7f0ae434273c4d19aa1b533bfbe3a61d8ffd4e4d9eb9959ab40f31d441db28e5","bytes":3026},"packet":{"path":"compatibility/rc/c04-browser-owner-inputs.json","sha256":"710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a","bytes":15193},"source_member_index":0},"main":{"before":{"path":"scripts/browser-reference-owner.mjs","sha256":"7f0ae434273c4d19aa1b533bfbe3a61d8ffd4e4d9eb9959ab40f31d441db28e5","bytes":3026},"packet":{"path":"compatibility/rc/c04-browser-owner-inputs.json","sha256":"d22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb","bytes":15192},"source_member_index":0}})) V3_REGRESSION_SOURCE_ANCHORS[line]['scripts/browser-reference-owner.mjs']=anchor;
for(const [line,anchors] of Object.entries({"21.x":{"tests/test_checker_reference_source.py":{"before":{"path":"tests/test_checker_reference_source.py","sha256":"96a98e5f871d6c2bc586938a08fbcd11205df6b10df9ce14395b38f73ed8c23c","bytes":4657},"packet":{"path":"compatibility/rc/c04-checker-owner-inputs.json","sha256":"3ae63a5b436eab901a7ff22cb8ecc9043a5aea8d2fb89ebd9e7f396ea3105bf3","bytes":12073},"transition_index":1},"tests/test_browser_reference_source.py":{"before":{"path":"tests/test_browser_reference_source.py","sha256":"e5fadb22854af2a821b0a7b21a296eb2cb3c133054e515716ebfa5594747b677","bytes":2926},"packet":{"path":"compatibility/rc/c04-browser-owner-inputs.json","sha256":"710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a","bytes":15193},"transition_index":4},"tests/test_browser_reference_proposal.py":{"before":{"path":"tests/test_browser_reference_proposal.py","sha256":"3abdbc8221cc4609dfef856affdc790f1b4848815049ab8ec34d50b9a6313c07","bytes":3283},"packet":{"path":"compatibility/rc/c04-browser-reference-proposal.json","sha256":"52d231aca902638226f5065c6622a6f857745990cdd23ee9df211aaf5e5ee56e","bytes":18691},"source_member_index":8}},"main":{"tests/test_checker_reference_source.py":{"before":{"path":"tests/test_checker_reference_source.py","sha256":"96a98e5f871d6c2bc586938a08fbcd11205df6b10df9ce14395b38f73ed8c23c","bytes":4657},"packet":{"path":"compatibility/rc/c04-checker-owner-inputs.json","sha256":"f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc","bytes":12073},"transition_index":1},"tests/test_browser_reference_source.py":{"before":{"path":"tests/test_browser_reference_source.py","sha256":"e5fadb22854af2a821b0a7b21a296eb2cb3c133054e515716ebfa5594747b677","bytes":2926},"packet":{"path":"compatibility/rc/c04-browser-owner-inputs.json","sha256":"d22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb","bytes":15192},"transition_index":4},"tests/test_browser_reference_proposal.py":{"before":{"path":"tests/test_browser_reference_proposal.py","sha256":"3abdbc8221cc4609dfef856affdc790f1b4848815049ab8ec34d50b9a6313c07","bytes":3283},"packet":{"path":"compatibility/rc/c04-browser-reference-proposal.json","sha256":"6a5ed7a82947ac170e3a051c3f7801ee1a72797fc0d679e78f959fe483255c07","bytes":20093},"source_member_index":8}}})) Object.assign(V3_REGRESSION_SOURCE_ANCHORS[line],anchors);
for(const [line,anchor] of Object.entries({"21.x":{"before":{"path":"compatibility/rc/consumer-floor-plan.json","sha256":"93f50163001b16d9aea5df9fe381bae7518cebbea229896d66ac139ad011327b","bytes":5273},"packet":{"path":"compatibility/rc/c04-browser-reference-source-inputs.json","sha256":"5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae","bytes":115478},"source_member_index":4},"main":{"before":{"path":"compatibility/rc/consumer-floor-plan.json","sha256":"93f50163001b16d9aea5df9fe381bae7518cebbea229896d66ac139ad011327b","bytes":5273},"packet":{"path":"compatibility/rc/c04-browser-reference-source-inputs.json","sha256":"4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c","bytes":115393},"source_member_index":4}})) V3_REGRESSION_SOURCE_ANCHORS[line]['compatibility/rc/consumer-floor-plan.json']=anchor;
for(const [line,anchor] of Object.entries({"21.x":{"before":{"path":"scripts/consumer-floor-roster.mjs","sha256":"a715032338cbeb1a51ad72799281c29697cfc1bc4f0d414a26333371d56c2b84","bytes":3317},"packet":{"path":"compatibility/rc/c04-browser-reference-source-inputs.json","sha256":"5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae","bytes":115478},"source_member_index":21},"main":{"before":{"path":"scripts/consumer-floor-roster.mjs","sha256":"a715032338cbeb1a51ad72799281c29697cfc1bc4f0d414a26333371d56c2b84","bytes":3317},"packet":{"path":"compatibility/rc/c04-browser-reference-source-inputs.json","sha256":"4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c","bytes":115393},"source_member_index":21}})) V3_REGRESSION_SOURCE_ANCHORS[line]['scripts/consumer-floor-roster.mjs']=anchor;
for(const [line,anchor] of Object.entries({"21.x":{"before":{"path":"scripts/upstream-chip-lifecycle-admission.mjs","sha256":"492d8a39f326e1af47eb0bf04c1c8b6d3505738a2161a1f50ecc34900dde21ab","bytes":13489},"packet":{"path":"compatibility/rc/parent-t14-focused-21-final-compat-v1.json","sha256":"5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287","bytes":387987},"source_input_index":690},"main":{"before":{"path":"scripts/upstream-chip-lifecycle-admission.mjs","sha256":"492d8a39f326e1af47eb0bf04c1c8b6d3505738a2161a1f50ecc34900dde21ab","bytes":13489},"packet":{"path":"compatibility/rc/parent-t14-focused-main-final-compat-v1.json","sha256":"b2340423afc90abef7c86ec7c748a23e9bcf13be416bc75b3b87fb900a31a090","bytes":346656},"source_input_index":664}})) V3_REGRESSION_SOURCE_ANCHORS[line]['scripts/upstream-chip-lifecycle-admission.mjs']=anchor;
for(const [line,anchor]of Object.entries({"21.x":{"before":{"path":"scripts/current-sass-inspection-scope.mjs","sha256":"23cb0ecaa69b6e7e606498a59d390a57c83e8e8132d31f59b9f68343121461e4","bytes":17456},"packet":{"path":"compatibility/rc/parent-t14-focused-21-final-compat-v1.json","sha256":"5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287","bytes":387987},"source_input_index":211},"main":{"before":{"path":"scripts/current-sass-inspection-scope.mjs","sha256":"23cb0ecaa69b6e7e606498a59d390a57c83e8e8132d31f59b9f68343121461e4","bytes":17456},"packet":{"path":"compatibility/rc/parent-t14-focused-main-final-compat-v1.json","sha256":"b2340423afc90abef7c86ec7c748a23e9bcf13be416bc75b3b87fb900a31a090","bytes":346656},"source_input_index":206}}))V3_REGRESSION_SOURCE_ANCHORS[line]['scripts/current-sass-inspection-scope.mjs']=anchor;
for(const [line,anchors]of Object.entries({"21.x":{"scripts/sass-ordinary-card-gate.mjs":{"before":{"path":"scripts/sass-ordinary-card-gate.mjs","sha256":"39ad6a5a0d0d43748ef14fed2cb716af7f4cd05149c16f287856fbbb01f14633","bytes":24949},"packet":{"path":"compatibility/rc/parent-t14-focused-21-final-compat-v1.json","sha256":"5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287","bytes":387987},"source_input_index":545},"scripts/sass_ordinary_card_gate.py":{"before":{"path":"scripts/sass_ordinary_card_gate.py","sha256":"979d3a33c0a60ea77240a2614b0b78fa447f737a72052d99916b5330eadfc165","bytes":15552},"packet":{"path":"compatibility/rc/parent-t14-focused-21-final-compat-v1.json","sha256":"5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287","bytes":387987},"source_input_index":577}},"main":{"scripts/sass-ordinary-card-gate.mjs":{"before":{"path":"scripts/sass-ordinary-card-gate.mjs","sha256":"39ad6a5a0d0d43748ef14fed2cb716af7f4cd05149c16f287856fbbb01f14633","bytes":24949},"packet":{"path":"compatibility/rc/parent-t14-focused-main-final-compat-v1.json","sha256":"b2340423afc90abef7c86ec7c748a23e9bcf13be416bc75b3b87fb900a31a090","bytes":346656},"source_input_index":526},"scripts/sass_ordinary_card_gate.py":{"before":{"path":"scripts/sass_ordinary_card_gate.py","sha256":"979d3a33c0a60ea77240a2614b0b78fa447f737a72052d99916b5330eadfc165","bytes":15552},"packet":{"path":"compatibility/rc/parent-t14-focused-main-final-compat-v1.json","sha256":"b2340423afc90abef7c86ec7c748a23e9bcf13be416bc75b3b87fb900a31a090","bytes":346656},"source_input_index":560}}}))Object.assign(V3_REGRESSION_SOURCE_ANCHORS[line],anchors);
const INPUTS_SHA='51dd68c4a501f1994e2db726abcac3844b08b27bec7cb076ec079c7193cb5c24';
const image=readFileSync(fileURLToPath(import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const reference=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const bufferEquals=Buffer.prototype.equals;
const equalBytes=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(bufferEquals,a,[b]);
const toolPath=path=>typeof path==='string'&&/^(?:scripts|tests)\/[a-zA-Z0-9_.-]+\.(?:mjs|cjs|py)$/.test(path);

function plain(value){
 if(value===null||['string','boolean'].includes(typeof value))return value;
 if(typeof value==='number'){assert.ok(Number.isSafeInteger(value));return value;}
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));const array=Array.isArray(value);assert.equal(Object.getPrototypeOf(value),array?Array.prototype:Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out=array?[]:{};
 for(const key of Reflect.ownKeys(descriptors)){
  assert.equal(typeof key,'string');if(array&&key==='length')continue;const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);
  if(array)assert.match(key,/^(?:0|[1-9][0-9]*)$/);Object.defineProperty(out,key,{value:plain(d.value),enumerable:true,writable:true,configurable:true});
 }
 if(array){assert.equal(out.length,descriptors.length.value);assert.equal(Object.keys(out).length,out.length);}return out;
}

function metadata(value){
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));assert.equal(Object.getPrototypeOf(value),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out={};
 for(const key of ['path','sha256','bytes']){
  const d=descriptors[key];if(key==='bytes'&&!d)continue;
  assert.ok(d&&Object.hasOwn(d,'value')&&d.enumerable,'tool reference requires data properties');out[key]=d.value;
 }
 assert.equal(typeof out.path,'string');assert.match(out.sha256,/^[0-9a-f]{64}$/);
 if(Object.hasOwn(out,'bytes'))assert.ok(Number.isSafeInteger(out.bytes)&&out.bytes>=0);
 return out;
}
function matches(raw,ref){assert.equal(hash(raw),ref.sha256,ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}
// Process-local authenticated immutable Git blobs only; current inputs are never cached.
const immutableGitImages=new Map();
function gitImages(root,requests){
 const unique=new Map();
 for(const r of requests){
  const commit=r.commit,path=r.path;assert.match(commit,/^[0-9a-f]{40}$/);assert.ok(typeof path==='string'&&path&&!path.includes('..')&&!path.includes('\n')&&!path.includes('\0')&&!path.startsWith('/'));
  unique.set(commit+':'+path,{commit,path});
 }
 if(unique.size===0)return new Map();
 const resolvedRoot=realpathSync(resolve(root)),cached=immutableGitImages.get(resolvedRoot)??new Map();
 const missing=[...unique].filter(([key])=>!cached.has(key));
 if(missing.length){
  const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
  const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','cat-file','--batch'],{cwd:resolvedRoot,env,input:missing.map(([,r])=>r.commit+':'+r.path).join('\n')+'\n',maxBuffer:32*1024*1024});
  const verified=new Map();let cursor=0;
  for(const [key] of missing){
   const end=raw.indexOf(10,cursor);assert.ok(end>cursor);const fields=raw.subarray(cursor,end).toString().split(' ');assert.equal(fields.length,3);
   const [blob,kind,sizeText]=fields;assert.match(blob,/^[0-9a-f]{40}$/);assert.equal(kind,'blob');assert.match(sizeText,/^(?:0|[1-9][0-9]*)$/);
   const size=Number(sizeText);assert.ok(Number.isSafeInteger(size)&&size>=0);const bytes=raw.subarray(end+1,end+1+size);
   assert.equal(bytes.length,size);assert.equal(raw[end+1+size],10);assert.equal(createHash('sha1').update('blob '+size+'\0').update(bytes).digest('hex'),blob);
   verified.set(key,Buffer.from(bytes));cursor=end+size+2;
  }
  assert.equal(cursor,raw.length);
  for(const [key,value] of verified)cached.set(key,value);
  immutableGitImages.set(resolvedRoot,cached);
 }
 return new Map([...unique.keys()].map(key=>[key,Buffer.from(cached.get(key))]));
}
function edited(before,edits){
 assert.ok(Array.isArray(edits));let cursor=0;const parts=[];
 for(const edit of edits){
  assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor);
  assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');assert.ok(edit.before!==edit.after);
  const old=Buffer.from(edit.before),next=Buffer.from(edit.after);assert.ok(equalBytes(before.subarray(edit.offset,edit.offset+old.length),old));
  parts.push(before.subarray(cursor,edit.offset),next);cursor=edit.offset+old.length;
 }
 parts.push(before.subarray(cursor));return Buffer.concat(parts);
}

// A failed nested entry poisons the enclosing transaction, even if caught by a reader.
const toolRegistryKey=Symbol.for('ngx-compat-material-legacy.current-tool-root-transactions.v1');
function createToolTransaction(){
 const roots=new Map(),keyOf=root=>realpathSync(resolve(root));
 const transact=(root,fn)=>{
  const key=keyOf(root),active=roots.get(key);
  if(active){active.poisoned=true;throw new Error('reentrant current tool root transaction');}
  const state={poisoned:false};roots.set(key,state);
  try{const result=fn();assert.equal(state.poisoned,false,'reentrant current tool root transaction');return result;}
  finally{roots.delete(key);}
 };
 Object.defineProperty(transact,'check',{value:root=>{const state=roots.get(keyOf(root));assert.ok(state&&!state.poisoned,'reentrant current tool root transaction');}});
 return Object.freeze(transact);
}
if(!Object.hasOwn(globalThis,toolRegistryKey))Object.defineProperty(globalThis,toolRegistryKey,{value:createToolTransaction(),writable:false,configurable:false});
const toolTransaction=globalThis[toolRegistryKey],registryDescriptor=Object.getOwnPropertyDescriptor(globalThis,toolRegistryKey);
assert.ok(typeof toolTransaction==='function'&&Object.isFrozen(toolTransaction)&&typeof toolTransaction.check==='function'&&!registryDescriptor.writable&&!registryDescriptor.configurable,'invalid current tool root registry');
export function currentSassToolReferenceSubject(options={}){
 return toolTransaction(options.root??process.cwd(),()=>{
  if(options.read===undefined)return constructToolSubject(options);
  let frame;constructToolSubject({...options,read:undefined},undefined,refs=>{frame=refs;});
  return constructToolSubject(options,frame);
 });
}
function constructToolSubject({root=process.cwd(),read:providedRead}={},prebound,captureBound){
 root=resolve(root);assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());assert.ok(providedRead===undefined||typeof providedRead==='function');const bound=new Map(prebound?.bound??[]),images=new Map(prebound?.images??[]);let scratch=Buffer.allocUnsafe(1);
 const read=path=>{
  const actual=readEvidenceMember(root,path),ref=reference(path,actual);
  if(bound.has(path)){assert.deepEqual(ref,bound.get(path));assert.ok(equalBytes(actual,images.get(path)),'changed current tool image '+path);}else{assert.equal(prebound,undefined,'unbound current tool input '+path);bound.set(path,ref);images.set(path,Buffer.from(actual));}
  if(providedRead!==undefined){assertPhysical();assert.ok(equalBytes(actual,providedRead(path)),'nonphysical current tool input '+path);toolTransaction.check(root);assertPhysical();}
  assert.ok(equalBytes(actual,readEvidenceMember(root,path)),'current tool changed during callback '+path);return actual;
 };
 const member=ref=>{const raw=read(ref.path);matches(raw,ref);return raw;};
 // Every sweep opens and fully rereads each physical member. Scratch and
 // directory deduplication save allocation/syscalls; no validity is retained.
 const assertPhysical=()=>{
  const rootStat=lstatSync(root);assert.ok(rootStat.isDirectory()&&!rootStat.isSymbolicLink());const checked=new Set();
  for(const [relative,image] of images){
   assert.ok(typeof relative==='string'&&!relative.includes('\\'));const parts=relative.split('/');assert.ok(parts.length&&parts.every(part=>part&&part!=='.'&&part!=='..'));
   const path=resolve(root,...parts);assert.ok(path.startsWith(root+sep));let cursor=root;
   for(let i=0;i<parts.length-1;i++){cursor=join(cursor,parts[i]);if(checked.has(cursor))continue;const st=lstatSync(cursor);assert.ok(st.isDirectory()&&!st.isSymbolicLink(),'invalid current tool directory '+relative);checked.add(cursor);}
   const last=lstatSync(path);assert.ok(last.isFile()&&!last.isSymbolicLink(),'invalid current tool member '+relative);
   if(scratch.length<image.length+1)scratch=Buffer.allocUnsafe(image.length+1);
   const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
   try{const st=fstatSync(fd);assert.ok(st.isFile()&&st.size===image.length,'late physical current tool input '+relative);let pos=0;
    while(pos<image.length){const count=readSync(fd,scratch,pos,image.length-pos,null);assert.ok(count>0,'short current tool input '+relative);pos+=count;}
    assert.ok(equalBytes(scratch.subarray(0,image.length),image),'late physical current tool input '+relative);
    assert.equal(readSync(fd,scratch,image.length,1,null),0,'extra current tool input '+relative);
    const final=fstatSync(fd);assert.ok(final.isFile()&&final.size===image.length,'late physical current tool input '+relative);
   }finally{closeSync(fd);}
  }
 };
 const packagePath='projects/ngx-material-legacy/package.json',packageImage=readEvidenceMember(root,packagePath);
 const version=JSON.parse(packageImage).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const activePlanner=line==='main'?CURRENT_GUARD_PLAN:GUARD_PLAN;
 const assertPlanner=()=>{
  assert.equal(composeCanonicalSourceGuards,loadedComposeCanonicalSourceGuards,'changed current tool guard planner');
  assert.equal(hash(functionToString.call(loadedComposeCanonicalSourceGuards)),GUARD_PLAN_FUNCTION_SHA256,'unauthenticated current tool guard planner');
  const raw=readEvidenceMember(root,activePlanner.path);matches(raw,activePlanner);
  if(line==='main'){assert.ok(Object.isFrozen(planner.canonicalSourceGuardPlanLoadedImage));assert.deepEqual(planner.canonicalSourceGuardPlanLoadedImage,activePlanner);}
 };
 // Authenticate the loaded planner and its physical image before caller reads.
 assertPlanner();
 if(line==='main')assert.ok(equalBytes(read(packagePath),packageImage),'package line changed during planner selection');
 let plannerBefore;
 if(line==='main'){
  const plan=JSON.parse(member(PLANNER_PACKET));assert.equal(plan.schema_version,1);assert.equal(plan.role,'current-tool-planner-source-successor');assert.equal(plan.source_parent,PLANNER_PARENT);assert.equal(plan.source_commit,PLANNER_COMMIT);assert.equal(plan.historical_programs_executed,false);assert.deepEqual(plan.before,GUARD_PLAN);assert.deepEqual(plan.after,CURRENT_GUARD_PLAN);
  const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
  assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',PLANNER_COMMIT],{cwd:root,env,encoding:'utf8'}).trim(),PLANNER_COMMIT+' '+PLANNER_PARENT);
  const images=gitImages(root,[{commit:PLANNER_PARENT,path:GUARD_PLAN.path},{commit:PLANNER_COMMIT,path:GUARD_PLAN.path}]);plannerBefore=images.get(PLANNER_PARENT+':'+GUARD_PLAN.path);matches(plannerBefore,GUARD_PLAN);const after=edited(plannerBefore,plan.edits);matches(after,CURRENT_GUARD_PLAN);assert.ok(equalBytes(after,images.get(PLANNER_COMMIT+':'+GUARD_PLAN.path)));assert.ok(equalBytes(member(CURRENT_GUARD_PLAN),after));assertPlanner();
 }
 assert.ok(equalBytes(read(SELF),image));const successor=JSON.parse(member({path:INPUTS,sha256:INPUTS_SHA}));
 assert.equal(successor.schema_version,3);assert.equal(successor.role,'finite-current-sass-tool-reference-successor');
 assert.deepEqual(successor.previous_epoch,V2_INPUTS);assert.deepEqual(successor.product_paths,[]);
 assert.equal(successor.historical_programs_executed,false);assert.equal(successor.historical_reports_rewritten,0);assert.equal(successor.artifact_or_audit_admission_granted,false);
 const raw=member(V2_INPUTS),packet=JSON.parse(raw);
 assert.equal(packet.schema_version,2);assert.equal(packet.role,'finite-current-sass-tool-reference-successor');
 assert.deepEqual(packet.previous_epoch,PREVIOUS_INPUTS);const previousRaw=member(PREVIOUS_INPUTS),previous=JSON.parse(previousRaw);
 assert.equal(previous.schema_version,1);assert.equal(previous.role,packet.role);
 assert.deepEqual(packet.product_paths,[]);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.historical_reports_rewritten,0);assert.equal(packet.artifact_or_audit_admission_granted,false);
 assert.ok(equalBytes(read(packagePath),packageImage),'package line changed');
 let matrixOwner;const domainOverlays=new Map();
 const routingImages=new Map(),retainedRulesJsPath='scripts/upstream-rules-js-build-admission.mjs';
 const retainedLandscapePaths=['scripts/autocomplete-landscape-source-judgment.mjs','tests/autocomplete_landscape_probe.mjs'];
 if(line==='main'){
  const program=JSON.parse(member({path:'compatibility/rc/main-retained-rules-js-program-source-v1.json',sha256:'dea173286cd6de2dddb4bc932a83fdb6a26ec788cea9e098ef2e66b76894708d',bytes:4229}));
  assert.equal(program.schema_version,1);assert.equal(program.role,'main-retained-rules-js-program-source');assert.equal(program.base_head,'0f2c3373afd5d6c917b4d47f874da31a26df2551');
  for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_source_judgments_changed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(program[key],value);
  const update=program.update;assert.equal(update.path,retainedRulesJsPath);assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);assert.equal(program.support.length,9);
  assert.equal(program.usage.path,'compatibility/rc/sass-wrapper-notice-reader-successors.json');const usage=JSON.parse(member(program.usage));assert.equal(usage.line,'main');
  const hook=usage.code_subjects.find(row=>row.path===update.path);assert.deepEqual({path:hook.path,...hook.after},update.before);
  const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
  execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',program.base_head,'HEAD'],{cwd:root,env});
  const images=gitImages(root,[{commit:program.base_head,path:update.path},...program.support.map(ref=>({commit:program.base_head,path:ref.path}))]);
  for(const ref of program.support){const committed=images.get(program.base_head+':'+ref.path);matches(committed,ref);assert.ok(equalBytes(member(ref),committed));}
  const before=images.get(program.base_head+':'+update.path);matches(before,update.before);const after=edited(before,update.edits);matches(after,update.after);assert.ok(equalBytes(member(update.after),after));
  domainOverlays.set(update.path,{update,identities:[{ref:update.before,bytes:before},{ref:update.after,bytes:after}]});
 }
 if(line==='main'){
  member({path:'scripts/retained-landscape-program-source.mjs',sha256:'fbe4525cba1f99c772455b92d92662920a2a84da0c524c51c0fe7c2f610af352',bytes:7975});
  const program=JSON.parse(member({path:'compatibility/rc/main-retained-landscape-program-source-v1.json',sha256:'3e0db22fc8764f8b82afeb5f99251cc6f86ebe0f7cf49a4906730041e63a3354',bytes:11763}));
  assert.equal(program.schema_version,1);assert.equal(program.role,'finite-main-retained-landscape-program-source');assert.equal(program.base_head,'62e961dd19e519ad47220a9a36c5d8c9e60fd18c');
  for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_report_bodies_changed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(program[key],value);
  assert.equal(program.loaded_function_sha256,'db951752d675bf74361db59fe385cc5a0900b8dc7356a6b6980a16375682e59e');
  assert.deepEqual(program.updates.map(row=>row.path),retainedLandscapePaths);assert.equal(program.support.length,9);
  assert.deepEqual(program.usages.map(ref=>ref.path),['compatibility/rc/autocomplete-selection-source-reader-successors.json','compatibility/rc/autocomplete-landscape-current-source-review.json']);
  const usages=program.usages.map(ref=>JSON.parse(member(ref)));assert.ok(usages.every(row=>row.line==='main'));
  const clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
  const hook=usages[0].code_subjects.find(row=>row.path===retainedLandscapePaths[0]);assert.deepEqual({path:hook.path,...hook.after},clean(program.updates[0].before));assert.deepEqual(usages[1].diagnostic_producer,clean(program.updates[1].before));
  const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
  for(const commit of new Set([program.base_head,...program.updates.map(row=>row.before_commit)])){assert.match(commit,/^[a-f0-9]{40}$/);execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',commit,program.base_head],{cwd:root,env});}
  execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',program.base_head,'HEAD'],{cwd:root,env});
  const images=gitImages(root,[...program.updates.map(row=>({commit:row.before_commit,path:row.path})),...program.support.map(ref=>({commit:program.base_head,path:ref.path}))]);
  for(const ref of program.support){const raw=images.get(program.base_head+':'+ref.path);matches(raw,ref);assert.ok(equalBytes(member(ref),raw));}
  for(const row of program.updates){const before=images.get(row.before_commit+':'+row.path);assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);matches(before,row.before);
    const after=edited(before,row.edits);matches(after,row.after);assert.ok(equalBytes(member(row.after),after));const update={...row,before:clean(row.before),after:clean(row.after)};
    assert.ok(!domainOverlays.has(row.path));domainOverlays.set(row.path,{update,identities:[{ref:update.before,bytes:before},{ref:update.after,bytes:after}]});}
 }
 if(line==='main'){
  const routing=JSON.parse(member({path:'compatibility/rc/main-current-inventory-source-routing-v2.json',sha256:'3815beb1e21779e54deaee5da2bf7bb316732e98a3dc9938ef6d2fdf18707280',bytes:24306}));
  assert.equal(routing.schema_version,1);assert.equal(routing.role,'main-current-inventory-source-routing');assert.equal(routing.base_head,'54aa9b85bdd38c1ebb93ce2eeaeee34f39161cc0');assert.equal(routing.source_scope_only,true);assert.equal(routing.historical_programs_executed,false);assert.equal(routing.historical_packets_rewritten,false);assert.equal(routing.artifact_or_audit_admission_granted,false);assert.equal(routing.g11_claim,'not-passed');
  const paths=['scripts/packed-upstream-ledger-epoch.mjs','scripts/inventory-reference-owner.mjs','scripts/inventory-finite-tool-successor.mjs','scripts/historical-repair-live-source-successor.mjs'];assert.deepEqual(routing.updates.map(row=>row.path),paths);
  member({path:'scripts/current-inventory-source-subject.mjs',sha256:'b87d99a5ea5482218b70c2e27f01d7821d44a2699b4e9500423aad6453f7dabe',bytes:8213});
  const env={PATH:process.env.PATH,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',routing.base_head,'HEAD'],{cwd:root,env});const originals=gitImages(root,paths.map(path=>({commit:routing.base_head,path})));
  const next=JSON.parse(member({path:'compatibility/rc/main-current-inventory-source-routing-v3.json',sha256:'d533e0e694d406ec9968b4748fb9da4a846a88df413fa800bae384403ea3402b',bytes:13219}));
  assert.equal(next.schema_version,1);assert.equal(next.role,'main-current-inventory-retained-source-routing');assert.equal(next.base_head,'b7ad00c881420e8621f23d77ab2feba7a3475e78');assert.equal(next.support_commit,next.base_head);
  assert.deepEqual(next.previous_packet,{path:'compatibility/rc/main-current-inventory-source-routing-v2.json',sha256:'3815beb1e21779e54deaee5da2bf7bb316732e98a3dc9938ef6d2fdf18707280',bytes:24306});
  for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_ledger_metadata_recipe_changed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(next[key],value);
  assert.deepEqual(next.updates.map(row=>row.path),[paths[0]]);assert.equal(next.support.length,23);execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',next.base_head,'HEAD'],{cwd:root,env});
  const continuations=gitImages(root,[...next.updates.map(row=>({commit:next.base_head,path:row.path})),...next.support.map(ref=>({commit:next.support_commit,path:ref.path}))]);
  for(const ref of next.support){const committed=continuations.get(next.support_commit+':'+ref.path);matches(committed,ref);assert.ok(equalBytes(member(ref),committed));}
  for(const update of routing.updates){
    assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);const before=originals.get(routing.base_head+':'+update.path);matches(before,update.before);const after=edited(before,update.edits);matches(after,update.after);
    const identities=[{ref:update.before,bytes:before},{ref:update.after,bytes:after}],continuation=next.updates.find(row=>row.path===update.path);let current=update;
    if(continuation){assert.deepEqual(continuation.before,update.after);assert.equal(continuation.after.path,update.path);assert.ok(equalBytes(continuations.get(next.base_head+':'+update.path),after));const actual=edited(after,continuation.edits);matches(actual,continuation.after);assert.ok(equalBytes(member(continuation.after),actual));identities.push({ref:continuation.after,bytes:actual});current={...update,after:continuation.after};}
    else assert.ok(equalBytes(member(update.after),after));
    routingImages.set(update.path,{update:current,identities});
  }
 }
 const routingComparison=ref=>{const overlay=routingImages.get(ref.path);if(!overlay)return member(ref);const meta=metadata(ref),identity=overlay.identities.find(row=>row.ref.path===meta.path&&row.ref.sha256===meta.sha256&&row.ref.bytes===meta.bytes);assert.ok(identity,'unknown current inventory routing comparison');member(overlay.update.after);return Buffer.from(identity.bytes);};
 // Authenticate the two maintained reader images before consuming the older
 // support descriptors. Comparison bytes stay private to metadata replay.
 const retainedReaderPaths=new Set(),retainedReaderImages=new Map();
 if(line==='main'){
  const packet=JSON.parse(member({path:'compatibility/rc/main-retained-current-reader-source-successors-v1.json',sha256:'1c0ccfdd33c5f264960cb598c74f4a4f7aea3ffb8779570b47182ea660dd589d',bytes:8704}));
  assert.equal(packet.schema_version,1);assert.equal(packet.role,'main-retained-current-reader-source-successors');assert.equal(packet.base_head,'a796c018da3023e916b37088917f6adca56fbc9d');assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.artifact_or_audit_admission_granted,false);assert.equal(packet.g11_claim,'not-passed');
  const paths=['scripts/historical-repair-live-source-successor.mjs','scripts/autocomplete-selection-spec-subject.mjs'];assert.deepEqual(packet.updates.map(row=>row.path),paths);
  assert.deepEqual(packet.new_helpers,[{path:'scripts/current-authored-tab-source-successor.mjs',sha256:'1be9161f5b5b6c5999f951f7c1eacf62d532587b1f6824a417e3b9a741baee93',bytes:6807},{path:'scripts/autocomplete-current-spec-source-successor.mjs',sha256:'1679a61ffc4ec0ce385a689574be5b997037ab87a61d735bf42a0e0304375225',bytes:4028}]);
  assert.deepEqual(packet.support,[{path:'compatibility/rc/main-autocomplete-current-spec-source-successor-v1.json',sha256:'507db85b892cb051ebbaee3214a48b275bae5be1a03234f53692966f47b1607d',bytes:4231}]);for(const ref of [...packet.new_helpers,...packet.support])member(ref);
  const env={PATH:process.env.PATH,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',packet.base_head,'HEAD'],{cwd:root,env});
  const originals=gitImages(root,paths.map(path=>({commit:packet.base_head,path})));
  for(const update of packet.updates){assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);const before=originals.get(packet.base_head+':'+update.path);matches(before,update.before);const after=edited(before,update.edits);matches(after,update.after);assert.ok(equalBytes(routingComparison(update.after),after));const overlay={update,identities:[{ref:update.before,bytes:before},{ref:update.after,bytes:after}]};assert.ok(!domainOverlays.has(update.path));domainOverlays.set(update.path,overlay);retainedReaderImages.set(update.path,overlay);retainedReaderPaths.add(update.path);}
 }
 const retainedReaderComparison=ref=>{const overlay=retainedReaderImages.get(ref.path);if(!overlay)return member(ref);const meta=metadata(ref),identity=overlay.identities.find(row=>row.ref.path===meta.path&&row.ref.sha256===meta.sha256&&row.ref.bytes===meta.bytes);assert.ok(identity,'unknown retained reader comparison');routingComparison(overlay.update.after);return Buffer.from(identity.bytes);};
 if(line==='main'){
  const ownerRaw=readEvidenceMember(root,MATRIX_OWNER.path);matches(ownerRaw,MATRIX_OWNER);
  const ownFile=readFileSync(fileURLToPath(new URL('./current-tool-matrix-source.mjs',import.meta.url)));matches(ownFile,MATRIX_OWNER);
  const loaded=requireLocal('./current-tool-matrix-source.mjs');assert.ok(Object.isFrozen(loaded.currentToolMatrixSourceLoadedImage));assert.deepEqual(loaded.currentToolMatrixSourceLoadedImage,MATRIX_OWNER);assert.equal(hash(functionToString.call(loaded.currentToolMatrixSource)),MATRIX_FACTORY_SHA256);
  assert.ok(equalBytes(member(MATRIX_OWNER),ownerRaw));matrixOwner=loaded.currentToolMatrixSource({root,read});assert.equal(matrixOwner.line,'main');
  const domain=JSON.parse(member(DOMAIN_PACKET));assert.equal(domain.schema_version,1);assert.equal(domain.role,'current-tool-domain-source-successor');assert.equal(domain.line,'main');assert.equal(domain.source_scope_only,true);assert.equal(domain.historical_programs_executed,false);assert.equal(domain.artifact_or_audit_admission_granted,false);
  assert.deepEqual(domain.domain_counts,{'Sass gate and source-authentication frame':10,'Sass graph, focus infrastructure and seal frame':14,'sandboxed browser launcher cells':1,'stepper peer-output and historical-model source':5});assert.equal(domain.updates.length,30);assert.equal(new Set(domain.updates.map(row=>row.path)).size,30);assert.equal(domain.supports.length,7);
  const supports=domain.supports.map(ref=>JSON.parse(member(ref)));const [sassReview,domainReview,browserReview,densityV1,densityV2,domainExecutable,stepperObservation]=supports;
  assert.equal(sassReview.line,'main');assert.equal(sassReview.source_parent,'2fbecd1b2687e26515c205cbd5c0024e9474b4b8');assert.equal(sassReview.actual_full_sass_pass,false);assert.equal(sassReview.g11_claim,'not-passed');
  assert.equal(domainReview.parent,'5f93a4dd74f3fc58a529ce9999abc3143405c300');assert.equal(browserReview.parent,'fdcdadee28c4552e3500b5099de9f42e456adb5c');
  assert.equal(densityV1.role,'main-ordinary-density-exact-source-successor');assert.equal(densityV2.line,'main');assert.equal(domainExecutable.line,'main');assert.equal(stepperObservation.line,'main');assert.equal(stepperObservation.focused_tests.count,11);assert.equal(stepperObservation.focused_tests.result,'pass');assert.equal(stepperObservation.artifact_or_audit_admission_granted,false);
  const allowedParents=new Map([['33d7d9e31fd96cbfa6c4e1f592c0bade985c0878','dfa4dfe18a17a117aaae3af1a8089f4615840cb0'],['8baa761eca624c9d71293c3d31750a2b3fdeebf0','2fbecd1b2687e26515c205cbd5c0024e9474b4b8'],['19ee6343365c391deb97362caec413b113665e1b','5f93a4dd74f3fc58a529ce9999abc3143405c300'],['8e9e7316806fe9266373865b0784e9917659e5e8','fdcdadee28c4552e3500b5099de9f42e456adb5c']]);
  const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
  for(const [commit,parent] of allowedParents)assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',commit],{cwd:root,env,encoding:'utf8'}).trim(),commit+' '+parent);
  const requests=domain.updates.flatMap(row=>row.steps.flatMap(step=>[{commit:step.parent,path:row.path},{commit:step.commit,path:row.path}])),images=gitImages(root,requests);
  for(const row of domain.updates){
   assert.ok(toolPath(row.path));assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);assert.ok(Array.isArray(row.steps)&&row.steps.length>=1&&row.steps.length<=2);
   let expected=row.before,priorBytes;const identities=[];
   for(const step of row.steps){assert.equal(allowedParents.get(step.commit),step.parent);assert.deepEqual(step.before,{sha256:expected.sha256,bytes:expected.bytes});const old=images.get(step.parent+':'+row.path),after=edited(old,step.edits);matches(old,step.before);matches(after,step.after);assert.ok(equalBytes(after,images.get(step.commit+':'+row.path)));if(priorBytes)assert.ok(equalBytes(priorBytes,old));identities.push({ref:{path:row.path,...step.before},bytes:old},{ref:{path:row.path,...step.after},bytes:after});priorBytes=after;expected={path:row.path,...step.after};if(step.commit==='8baa761eca624c9d71293c3d31750a2b3fdeebf0')assert.ok(sassReview.patch.paths.includes(row.path));}
   assert.deepEqual(expected,row.after);assert.ok(equalBytes(member(row.after),priorBytes));
   if(row.domain==='Sass graph, focus infrastructure and seal frame'){const e=domainReview.afterimages_verified.find(x=>x.path===row.path);assert.ok(e);assert.equal(e.sha256,row.after.sha256);assert.equal(e.bytes,row.after.bytes);}
   else if(row.domain==='Sass gate and source-authentication frame')assert.ok(sassReview.patch.paths.includes(row.path));
   else if(row.domain==='sandboxed browser launcher cells'){const e=browserReview.sources.find(x=>x.path===row.path);assert.ok(e);assert.equal(e.before_sha256,row.before.sha256);assert.equal(e.after_sha256,row.after.sha256);}
   else if(row.domain==='stepper peer-output and historical-model source'){const e=stepperObservation.paths.find(x=>x.path===row.path);assert.ok(e);assert.deepEqual(e.before,row.before);assert.deepEqual(e.after,row.after);}
   else assert.fail('unknown current tool domain');
   domainOverlays.set(row.path,{update:row,identities});
  }
  // Checker dispatch is a separately reviewed source domain, not a Sass batch.
  const checker=JSON.parse(member(CHECKER_PACKET));assert.equal(checker.schema_version,1);assert.equal(checker.role,'current-tool-individual-checker-source-successor');assert.equal(checker.line,'main');assert.equal(checker.source_scope_only,true);assert.equal(checker.historical_programs_executed,false);assert.equal(checker.artifact_or_audit_admission_granted,false);
  const checkerPath='scripts/check-upstream-audit-disposition.mjs',checkerCommits=['8647ee8a69167ae432313bda47e502f2416c450d','6c5d7a2ba37204074d7d212f8e839621d2a4988d','547abe83d86c4682a173a6e01d2c783b6bb1d855'];assert.equal(checker.before.path,checkerPath);assert.equal(checker.after.path,checkerPath);assert.equal(checker.steps.length,3);assert.equal(checker.supports.length,7);
  const reviews=checker.supports.map(ref=>JSON.parse(member(ref))),ids=['1dcc195853a74d1e0b724b742673eb5fd744cb67','1de6a3aa37118e4153fb995a8c8f4daecdf6d0b5','4d0a3eff7c5d5186516fe5c8f1af8c003d02882d','6962c858378b52e0a90f7e2cada0f71c297840ed','ef14c286986f9451addeada26ab7b51402aa143f'];
  for(let i=0;i<5;i++){assert.equal(reviews[i].sha,ids[i]);assert.equal(reviews[i].review_depth,'individual-compatibility');assert.equal(typeof reviews[i].decision,'string');assert.ok(reviews[i].decision.length>0);}assert.equal(reviews[5].parent,'107ccae1864dc4cbc56c4af1b8e70983a1fe947f');assert.equal(reviews[6].parent,'4c29be143432bcb5b2ca99d4f83ca6ff162b4554');
  const checkerImages=gitImages(root,checker.steps.flatMap(step=>[{commit:step.parent,path:checkerPath},{commit:step.commit,path:checkerPath}]));let expected=checker.before,priorBytes;const checkerIdentities=[];
  for(let i=0;i<checker.steps.length;i++){const step=checker.steps[i];assert.equal(step.commit,checkerCommits[i]);assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',step.commit],{cwd:root,env,encoding:'utf8'}).trim(),step.commit+' '+step.parent);assert.deepEqual(step.before,{sha256:expected.sha256,bytes:expected.bytes});const old=checkerImages.get(step.parent+':'+checkerPath),after=edited(old,step.edits);matches(old,step.before);matches(after,step.after);assert.ok(equalBytes(after,checkerImages.get(step.commit+':'+checkerPath)));if(priorBytes)assert.ok(equalBytes(priorBytes,old));checkerIdentities.push({ref:{path:checkerPath,...step.before},bytes:old},{ref:{path:checkerPath,...step.after},bytes:after});expected={path:checkerPath,...step.after};priorBytes=after;}
  // The live coordinator checker extends the reviewed committed checker. Replay its
  // exact source delta and bind the helper physically; this grants no audit result.
  assert.deepEqual(expected,checker.after);
  // Preserve the old checker and guard packets; authenticate their finite live epoch successor.
  const epoch=JSON.parse(member({path:'compatibility/rc/current-tool-ledger-source-epoch-21-successor-v1.json',sha256:'1bc33b626f1cdd75ade57bb4b9c6370df0a775b2a40e39f84d46894653919f31',bytes:10511}));
  assert.equal(epoch.schema_version,1);assert.equal(epoch.role,'current-tool-ledger-source-epoch-21-successor');assert.equal(epoch.source_only,true);assert.equal(epoch.historical_programs_executed,false);assert.equal(epoch.artifact_or_audit_admission_granted,false);assert.equal(epoch.g11_claim,'not-passed');
  assert.deepEqual(epoch.before,{path:'scripts/inventory-reference-live-source-epoch.mjs',sha256:'3836c4358edc6c5a15d0578f5df06b19beed563fbd4b094d694cfa9e5cc1175e',bytes:18156});
  assert.deepEqual(epoch.after,{path:epoch.before.path,sha256:'bbb222bf919e88e294f70d4d1b94caa1934a8a0e36303fd6a42d08e0197bc6bc',bytes:24685});
  const epochOld=member(epoch.archive);matches(epochOld,epoch.before);const epochNew=edited(epochOld,epoch.edits);matches(epochNew,epoch.after);
  const epoch22=JSON.parse(member({path:'compatibility/rc/current-tool-ledger-source-epoch-22-successor-v1.json',sha256:'5ac3931ad65636fc9fdfff84c05172860cd0017d3cb8b0bdca0d44f91a69a071',bytes:5558}));
  assert.equal(epoch22.schema_version,1);assert.equal(epoch22.role,'current-tool-ledger-source-epoch-22-successor');assert.equal(epoch22.source_only,true);assert.equal(epoch22.historical_programs_executed,false);assert.equal(epoch22.artifact_or_audit_admission_granted,false);assert.equal(epoch22.g11_claim,'not-passed');assert.deepEqual(epoch22.before,epoch.after);assert.equal(epoch22.base_head,'a796c018da3023e916b37088917f6adca56fbc9d');assert.equal(epoch22.source_commit,'0feac873886782da408d5894bbf1bb26862ec45c');assert.equal(epoch22.source_parent,'f569667b366b23b36280c5c2a10e9f87351472bd');assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',epoch22.source_commit],{cwd:root,env,encoding:'utf8'}).trim(),epoch22.source_commit+' '+epoch22.source_parent);execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',epoch22.base_head,'HEAD'],{cwd:root,env});const epoch22Bytes=edited(epochNew,epoch22.edits);matches(epoch22Bytes,epoch22.after);assert.ok(equalBytes(member(epoch22.after),epoch22Bytes));assert.deepEqual(epoch22.ledger_before,epoch.ledger_after);const epoch22Images=gitImages(root,[{commit:epoch22.source_parent,path:epoch22.ledger_before.path},{commit:epoch22.source_commit,path:epoch22.ledger_after.path}]);matches(epoch22Images.get(epoch22.source_parent+':'+epoch22.ledger_before.path),epoch22.ledger_before);matches(epoch22Images.get(epoch22.source_commit+':'+epoch22.ledger_after.path),epoch22.ledger_after);assert.ok(equalBytes(member(epoch22.ledger_after),epoch22Images.get(epoch22.source_commit+':'+epoch22.ledger_after.path)));member(epoch22.receipt);
  assert.equal(epoch.source_commit,'252689f364aee65c5d755d4b16e91987f6e305a5');assert.equal(epoch.source_parent,'862f511840c7bbeb81236ac6d74ba1a8a2d5f7a7');assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',epoch.source_commit],{cwd:root,env,encoding:'utf8'}).trim(),epoch.source_commit+' '+epoch.source_parent);execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',epoch.source_commit,'HEAD'],{cwd:root,env});
  assert.deepEqual(epoch.ledger_before,{path:'compatibility/f10/disposition-ledger/ledger.json',sha256:'4a59fbfc14cc0f11c1563f5b4de51adc8cd0a58bfca186069ffc25b03635f068',bytes:5068290});
  const ledgerImages=gitImages(root,[{commit:'e28364f10bc9c1f9219c9a18f0dbf9cffb267f57',path:epoch.ledger_before.path},{commit:epoch.source_commit,path:epoch.ledger_before.path}]);matches(ledgerImages.get('e28364f10bc9c1f9219c9a18f0dbf9cffb267f57:'+epoch.ledger_before.path),epoch.ledger_before);const liveLedger=ledgerImages.get(epoch.source_commit+':'+epoch.ledger_after.path);matches(liveLedger,epoch.ledger_after);assert.ok(equalBytes(epoch22Images.get(epoch22.source_parent+':'+epoch22.ledger_before.path),liveLedger));for(const ref of epoch.receipts)member(ref);
  const epochMember=ref=>{if(ref.path===epoch.before.path){assert.deepEqual(ref,epoch.before);return member(epoch22.after);}if(ref.path===epoch.ledger_before.path){assert.deepEqual(ref,epoch.ledger_before);return member(epoch22.ledger_after);}return member(ref);};
  const liveChecker=JSON.parse(member({path:'compatibility/rc/current-tool-live-checker-source-successor-v1.json',sha256:'639574a3836d851ba8917db3091cc62e819951f80b1f92190cd6002c39bfc4a1',bytes:2481}));
  assert.equal(liveChecker.schema_version,1);assert.equal(liveChecker.role,'current-tool-live-checker-source-successor');assert.equal(liveChecker.base_head,'a798ff9c58cdd539f115eda00b7cdd898d035353');assert.equal(liveChecker.source_only,true);assert.equal(liveChecker.historical_programs_executed,false);assert.equal(liveChecker.artifact_or_audit_admission_granted,false);assert.equal(liveChecker.g11_claim,'not-passed');assert.deepEqual(liveChecker.before,checker.after);
  assert.equal(execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',liveChecker.base_head,'HEAD'],{cwd:root,env}).length,0);
  assert.ok(equalBytes(gitImages(root,[{commit:liveChecker.base_head,path:checkerPath}]).get(liveChecker.base_head+':'+checkerPath),priorBytes));
  const liveCheckerBytes=edited(priorBytes,liveChecker.edits);matches(liveCheckerBytes,liveChecker.after);assert.ok(equalBytes(member(liveChecker.after),liveCheckerBytes));epochMember(liveChecker.helper);
  checkerIdentities.push({ref:liveChecker.after,bytes:liveCheckerBytes});domainOverlays.set(checkerPath,{update:{...checker,after:liveChecker.after,path:checkerPath,domain:'reviewed checker dispatch source'},identities:checkerIdentities});
  // The independently reviewed root propagation changes this one call site.
  const cvaPath='scripts/packed-cva-source-requalification.mjs',cvaBefore={path:cvaPath,sha256:'be8c26049e58848d0b7b0ac1e1dba78151d3d8e867ec49b9dc523f28cb304e33',bytes:27417},cvaAfter={path:cvaPath,sha256:'ac955ef53f1c530572d82d6b58f2e736787b04757a72a498a3a77bbcdcad3ad5',bytes:27422};
  const review=reviews[6].root_forwarding_manifest.callsite_changes.find(x=>x.path===cvaPath);assert.deepEqual(review,{path:cvaPath,calls:1,before_sha256:cvaBefore.sha256,after_sha256:cvaAfter.sha256});
  const cvaImages=gitImages(root,[{commit:'4c29be143432bcb5b2ca99d4f83ca6ff162b4554',path:cvaPath},{commit:'547abe83d86c4682a173a6e01d2c783b6bb1d855',path:cvaPath}]),cvaOld=cvaImages.get('4c29be143432bcb5b2ca99d4f83ca6ff162b4554:'+cvaPath),cvaNew=cvaImages.get('547abe83d86c4682a173a6e01d2c783b6bb1d855:'+cvaPath);matches(cvaOld,cvaBefore);matches(cvaNew,cvaAfter);
  const beforeCall='currentAuthoredUseAdmission({current: live, frozen: frozen.symbol_uses, candidate: added, line, readMember: proposed})',afterCall='currentAuthoredUseAdmission({root,current: live, frozen: frozen.symbol_uses, candidate: added, line, readMember: proposed})';assert.equal(cvaOld.toString().split(beforeCall).length,2);assert.equal(cvaOld.toString().replace(beforeCall,afterCall),cvaNew.toString());const cvaNext=JSON.parse(member({path:'compatibility/rc/current-tool-retired-adapter-checker-source-successor-v1.json',sha256:'c15eb5d8be6bed62d9dfe3476b16fdf2a4eee6e9d4a337cee551848fe7a9c62a',bytes:2094}));
  assert.equal(cvaNext.schema_version,1);assert.equal(cvaNext.role,'current-tool-retired-adapter-checker-source-successor');assert.equal(cvaNext.source_parent,'3be4d6b7aa54e97ee6622bc869d564313f1f7743');assert.equal(cvaNext.source_commit,'df6213c96e19af5c4a0c68f49e010d89e15f0c2c');assert.equal(cvaNext.historical_programs_executed,false);assert.equal(cvaNext.artifact_or_audit_admission_granted,false);assert.deepEqual(cvaNext.before,cvaAfter);
  assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',cvaNext.source_commit],{cwd:root,env,encoding:'utf8'}).trim(),cvaNext.source_commit+' '+cvaNext.source_parent);
  const cvaReview=JSON.parse(member(cvaNext.review));assert.equal(cvaReview.base_head,cvaNext.source_parent);assert.equal(cvaReview.independent_review.sha256,'a015a5f5570d98557454eee86bfbed635edc1f4fc9a586885a3d12085f3c63f2');
  const cvaNextImages=gitImages(root,[{commit:cvaNext.source_parent,path:cvaPath},{commit:cvaNext.source_commit,path:cvaPath}]),cvaBase=cvaNextImages.get(cvaNext.source_parent+':'+cvaPath),cvaFinal=edited(cvaBase,cvaNext.edits);assert.ok(equalBytes(cvaBase,cvaNew));matches(cvaFinal,cvaNext.after);assert.ok(equalBytes(cvaFinal,cvaNextImages.get(cvaNext.source_commit+':'+cvaPath)));assert.ok(equalBytes(member(cvaNext.after),cvaFinal));domainOverlays.set(cvaPath,{update:{path:cvaPath,before:cvaBefore,after:cvaNext.after},identities:[{ref:cvaBefore,bytes:cvaOld},{ref:cvaAfter,bytes:cvaNew},{ref:cvaNext.after,bytes:cvaFinal}]});
  const testPacket=JSON.parse(member({path:'compatibility/rc/current-tool-maintained-test-source-successor-v1.json',sha256:'bc88fc8797fe8f96a8d97077c6f6945c013394087bcec9d2e70cfaae51b14c27',bytes:5156}));
  assert.equal(testPacket.schema_version,1);assert.equal(testPacket.role,'current-tool-maintained-test-source-successor');assert.equal(testPacket.source_parent,'1cb122d2d4ee39949d0be4203aedea0131c20f75');assert.equal(testPacket.historical_programs_executed,false);assert.equal(testPacket.artifact_or_audit_admission_granted,false);
  const testPath='tests/test_current_sass_tool_references.py';assert.equal(testPacket.before.path,testPath);assert.equal(testPacket.after.path,testPath);const testOld=gitImages(root,[{commit:testPacket.source_parent,path:testPath}]).get(testPacket.source_parent+':'+testPath),testNew=edited(testOld,testPacket.edits);matches(testOld,testPacket.before);matches(testNew,testPacket.after);assert.ok(equalBytes(member(testPacket.after),testNew));domainOverlays.set(testPath,{update:{path:testPath,before:testPacket.before,after:testPacket.after},identities:[{ref:testPacket.before,bytes:testOld},{ref:testPacket.after,bytes:testNew}]});
  const mainProbe=JSON.parse(member({path:'compatibility/rc/current-tool-maintained-main-probe-source-successor-v1.json',sha256:'c0c575f6295fa85d0bf4236b8f9a246e917651e64ef38b1afa80bf0b8466ae16',bytes:10547}));assert.equal(mainProbe.schema_version,1);assert.equal(mainProbe.role,'current-tool-maintained-main-probe-source-successor');assert.equal(mainProbe.source_parent,testPacket.source_parent);assert.equal(mainProbe.historical_programs_executed,false);assert.equal(mainProbe.artifact_or_audit_admission_granted,false);
  const mainPath='tests/current_sass_tool_reference_probe.mjs';assert.equal(mainProbe.before.path,mainPath);assert.equal(mainProbe.after.path,mainPath);const mainOld=gitImages(root,[{commit:mainProbe.source_parent,path:mainPath}]).get(mainProbe.source_parent+':'+mainPath),mainNew=edited(mainOld,mainProbe.edits);matches(mainOld,mainProbe.before);matches(mainNew,mainProbe.after);assert.ok(equalBytes(member(mainProbe.after),mainNew));domainOverlays.set(mainPath,{update:{path:mainPath,before:mainProbe.before,after:mainProbe.after},identities:[{ref:mainProbe.before,bytes:mainOld},{ref:mainProbe.after,bytes:mainNew}]});
  const probe=JSON.parse(member({path:'compatibility/rc/current-tool-maintained-probe-source-successor-v1.json',sha256:'b1809b6d89c9cdbd29f9355ed11d82e995d77a8f549be7f69bca0e785b8b428f',bytes:1924}));assert.equal(probe.schema_version,1);assert.equal(probe.role,'current-tool-maintained-probe-source-successor');assert.equal(probe.source_parent,testPacket.source_parent);assert.equal(probe.historical_programs_executed,false);assert.equal(probe.artifact_or_audit_admission_granted,false);
  const probePath='tests/current_sass_tool_reference_v4_probe.mjs';assert.equal(probe.before.path,probePath);assert.equal(probe.after.path,probePath);const probeOld=gitImages(root,[{commit:probe.source_parent,path:probePath}]).get(probe.source_parent+':'+probePath),probeNew=edited(probeOld,probe.edits);matches(probeOld,probe.before);matches(probeNew,probe.after);assert.ok(equalBytes(member(probe.after),probeNew));
  const liveTests=JSON.parse(member({path:'compatibility/rc/current-tool-live-matrix-test-source-successor-v1.json',sha256:'48c790715a8ae0d154bd5db0968675fe4031c84f80a70207de8411861bc8e1e7',bytes:1887}));assert.equal(liveTests.schema_version,1);assert.equal(liveTests.role,'current-tool-live-matrix-test-source-successor');assert.equal(liveTests.source_only,true);assert.equal(liveTests.historical_programs_executed,false);assert.equal(liveTests.artifact_or_audit_admission_granted,false);assert.deepEqual(liveTests.matrix_owner,MATRIX_OWNER);assert.deepEqual(liveTests.updates.map(x=>x.path),['tests/test_current_sass_tool_reference_v5.py','tests/test_current_tool_planner_successor.py']);
  const testMember=(update,next)=>{const live=liveTests.updates.find(x=>x.path===update.path);if(!live){assert.ok(equalBytes(member(update.after),next));return;}assert.deepEqual(live.before,update.after);const final=edited(next,live.edits);matches(final,live.after);assert.ok(equalBytes(member(live.after),final));};
  const v5Tests=JSON.parse(member({path:'compatibility/rc/current-tool-maintained-v5-tests-source-successor-v1.json',sha256:'61b144081fd0aa72065962b283110951c4f9af54a359c4887191938b4513d444',bytes:6833}));assert.equal(v5Tests.schema_version,1);assert.equal(v5Tests.role,'current-tool-maintained-v5-tests-source-successor');assert.equal(v5Tests.source_parent,testPacket.source_parent);assert.equal(v5Tests.historical_programs_executed,false);assert.equal(v5Tests.artifact_or_audit_admission_granted,false);assert.deepEqual(v5Tests.updates.map(x=>x.path),['tests/test_current_sass_tool_reference_v5.py','tests/current_sass_tool_reference_v5_probe.mjs']);
  const v5TestImages=gitImages(root,v5Tests.updates.map(x=>({commit:v5Tests.source_parent,path:x.path})));for(const update of v5Tests.updates){assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);const old=v5TestImages.get(v5Tests.source_parent+':'+update.path),next=edited(old,update.edits);matches(old,update.before);matches(next,update.after);testMember(update,next);}
  const plannerTests=JSON.parse(member({path:'compatibility/rc/current-tool-maintained-planner-tests-source-successor-v1.json',sha256:'92e8b053bab86a45ccad938be30a81678be921ae5dbfbd48e89059b605cf9379',bytes:15282}));assert.equal(plannerTests.schema_version,1);assert.equal(plannerTests.role,'current-tool-maintained-planner-tests-source-successor');assert.equal(plannerTests.source_parent,testPacket.source_parent);assert.equal(plannerTests.historical_programs_executed,false);assert.equal(plannerTests.artifact_or_audit_admission_granted,false);assert.deepEqual(plannerTests.updates.map(x=>x.path),['tests/test_current_tool_planner_successor.py','tests/current_tool_planner_successor_probe.mjs']);
  const plannerTestImages=gitImages(root,plannerTests.updates.map(x=>({commit:plannerTests.source_parent,path:x.path})));for(const update of plannerTests.updates){assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);const old=plannerTestImages.get(plannerTests.source_parent+':'+update.path),next=edited(old,update.edits);matches(old,update.before);matches(next,update.after);testMember(update,next);}
  // Individually reviewed historical-repair helper plus its exact table data.
  const repair=JSON.parse(member({path:'compatibility/rc/current-tool-historical-repair-source-successor-v1.json',sha256:'6b036e7da92ffa3046aaf575ee487253c51508a50c12d3655257b479a3a11473',bytes:15104}));
  assert.equal(repair.schema_version,1);assert.equal(repair.role,'current-tool-historical-repair-source-successor');assert.equal(repair.source_parent,'68606c1ee64a6f529ef71b4576cc13c7863dbc85');assert.equal(repair.historical_programs_executed,false);assert.equal(repair.artifact_or_audit_admission_granted,false);
  const repairPath='scripts/historical-contract-repair-source.mjs';assert.deepEqual(repair.before,{path:repairPath,sha256:'bd7cfbf2235438c604fdc6bc7c4b37e7c365c755d1f8287ce51393389ce6f78d',bytes:22621});assert.deepEqual(repair.after,{path:repairPath,sha256:'00beaadf9fb7dac4ce3981c60d04cadc84b7d23607ffcbc47c4b3d764b9f20cd',bytes:31620});
  assert.deepEqual(repair.supports.map(ref=>ref.path),['compatibility/rc/historical-repair-table-signature-source-successor-v1.json','compatibility/rc/parent-main-table-column-diagnostic-v1.json','compatibility/rc/api/signature-differences.json','tests/historical_repair_table_planner_successor_probe.mjs','compatibility/rc/current-tool-historical-repair-source-review-v1.json']);
  const repairOld=gitImages(root,[{commit:repair.source_parent,path:repairPath}]).get(repair.source_parent+':'+repairPath),repairNew=edited(repairOld,repair.edits);matches(repairOld,repair.before);matches(repairNew,repair.after);
  const repairLive=JSON.parse(member({path:'compatibility/rc/current-tool-historical-repair-live-source-successor-v1.json',sha256:'12a0cadacb08783923c3c40a99cbcd51b1727f6758090d3870f8351b05d0c675',bytes:2605}));
  assert.equal(repairLive.schema_version,1);assert.equal(repairLive.role,'current-tool-historical-repair-live-source-successor');assert.equal(repairLive.source_parent,'1c8111243f93811083c8490d9fdf260a80a29a86');assert.equal(repairLive.source_commit,'a5aa2d7f08ec6e01f3d24fe0a0a23c9187c851d4');assert.equal(repairLive.source_only,true);assert.equal(repairLive.historical_programs_executed,false);assert.equal(repairLive.artifact_or_audit_admission_granted,false);assert.deepEqual(repairLive.before,repair.after);
  assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',repairLive.source_commit],{cwd:root,env,encoding:'utf8'}).trim(),repairLive.source_commit+' '+repairLive.source_parent);execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',repairLive.source_commit,'HEAD'],{cwd:root,env});
  const liveImages=gitImages(root,[{commit:repairLive.source_parent,path:repairPath},{commit:repairLive.source_commit,path:repairPath}]),liveRepair=edited(repairNew,repairLive.edits);assert.ok(equalBytes(repairNew,liveImages.get(repairLive.source_parent+':'+repairPath)));matches(liveRepair,repairLive.after);assert.ok(equalBytes(liveRepair,liveImages.get(repairLive.source_commit+':'+repairPath)));const repairComposition=JSON.parse(member({path:'compatibility/rc/current-tool-historical-repair-composition-successor-v1.json',sha256:'f48bc079216f0e13a342696eadcb9fe2742d922a70e45e363958252245f25480',bytes:15572}));assert.equal(repairComposition.schema_version,1);assert.equal(repairComposition.role,'current-tool-historical-repair-composition-successor');assert.equal(repairComposition.source_only,true);assert.equal(repairComposition.historical_programs_executed,false);assert.equal(repairComposition.artifact_or_audit_admission_granted,false);assert.equal(repairComposition.g11_claim,'not-passed');assert.deepEqual(repairComposition.before,repairLive.after);assert.deepEqual(repairComposition.intermediate,{path:repairPath,sha256:'bc58e869db60240b973094b985f64ee0feda29ff0935b7fab9d5f3ae7134bce7',bytes:36206});assert.deepEqual(repairComposition.after,{path:repairPath,sha256:'b63c419933c0015c8ac7b9fb6238ad3c14a43a384af29a4f346954ac75900855',bytes:37024});assert.equal(repairComposition.focus_patch.sha256,'cb287796debf160898772f625c1d194dd8424511b52b6f425e3c45107bdc613d');assert.ok(equalBytes(member(repairComposition.archive),liveRepair));member(repairComposition.focus_patch);member(repairComposition.independent_review);const focusedRepair=edited(liveRepair,repairComposition.focus_edits);matches(focusedRepair,repairComposition.intermediate);const composedRepair=edited(focusedRepair,repairComposition.composition_edits);matches(composedRepair,repairComposition.after);assert.ok(equalBytes(member(repairComposition.after),composedRepair));for(const ref of repairComposition.supports){
   if(ref.path!=='compatibility/f10/authored-dependency-current-dispositions.json'){retainedReaderComparison(ref);continue;}
   assert.deepEqual(ref,{path:ref.path,sha256:'460262e16c118c495e37b56c5218f0c2eadfd7bad0a71cf62fddccba05b130f4',bytes:718774});
   const parent='0feac873886782da408d5894bbf1bb26862ec45c',commit='a796c018da3023e916b37088917f6adca56fbc9d';assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',commit],{cwd:root,env,encoding:'utf8'}).trim(),commit+' '+parent);
   const images=gitImages(root,[{commit:parent,path:ref.path},{commit,path:ref.path}]),old=images.get(parent+':'+ref.path),next=images.get(commit+':'+ref.path);matches(old,ref);const current={path:ref.path,sha256:'dede4ab944da8fee8881644e27c0b2224c70e4120246c54e99976c48084ab2a5',bytes:720149};matches(next,current);assert.ok(equalBytes(member(current),next));
   const a=JSON.parse(old),b=JSON.parse(next),changed=[];assert.equal(a.symbol_uses.length,336);assert.equal(b.symbol_uses.length,336);for(let i=0;i<336;i++){const x=a.symbol_uses[i],y=b.symbol_uses[i];assert.deepEqual([x.file,x.module,x.symbol],[y.file,y.module,y.symbol]);if(JSON.stringify(x)!==JSON.stringify(y)){changed.push([x.file,x.module,x.symbol]);const z=structuredClone(y);z.source_review=x.source_review;if(x.file==='legacy-tabs/tab-label.ts')z.candidate_source_sha256=x.candidate_source_sha256;assert.deepEqual(z,x);}}assert.deepEqual(changed,[...['Injector','ProviderToken','runInInjectionContext'].map(x=>['legacy-tabs/internal/public-constructor-context.ts','@angular/core',x]),...['Inject','Optional','TemplateRef','ViewContainerRef'].map(x=>['legacy-tabs/tab-label.ts','@angular/core',x])]);const normalized=structuredClone(b);normalized.symbol_uses=a.symbol_uses;normalized.current_source_population_sha256=a.current_source_population_sha256;normalized.source_snapshot_history=a.source_snapshot_history;assert.deepEqual(normalized,a);
   for(const item of [{path:'compatibility/rc/parent-main-tab-label-source-context-v1.json',sha256:'a2810e63d5761d88639e2cbbd42ad3356a104d18c1a4493bee47cd3ccae72431',bytes:4191},{path:'compatibility/rc/tab-owned-label-field-context-proof-v1.json',sha256:'a22145ce4008bd7efc79e1651e95d547877d16753fe7ecd352ef1595fb8d0de0',bytes:16382},{path:'compatibility/f10/authored-use-reviews/tab-owned-label-field-context-v1.json',sha256:'77f1d0aca087662c5ffc135fb636a15a74cef549e0ba800da507fae511acca52',bytes:117149},{path:'projects/ngx-material-legacy/legacy-tabs/tab-label.ts',sha256:'db06eed7f8ceb42cecfcd9242d44a9cff315a59285c262cbdc2e101a339969ad',bytes:1514},{path:'projects/ngx-material-legacy/legacy-tabs/internal/tab-base.ts',sha256:'880575b7a0c3a6b30bfb363c68e3a574fcb585e11e4b10d362eeea5731785639',bytes:4870}])member(item);
   const typeParent='d809eb8ab440a0fc0a7b8fe65423016255cbed0e',typeCommit='f569667b366b23b36280c5c2a10e9f87351472bd';assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',typeCommit],{cwd:root,env,encoding:'utf8'}).trim(),typeCommit+' '+typeParent);
   const typeChanges=[['projects/ngx-material-legacy/legacy-tabs/tab-label.ts','5ff08854377bb33070d69ee6fb4f7a346d37bebf4aefb6f0fd7a48f6a98621ff','db06eed7f8ceb42cecfcd9242d44a9cff315a59285c262cbdc2e101a339969ad',']);\n    label._closestTab',']) as MatLegacyTabLabel;\n    label._closestTab'],['projects/ngx-material-legacy/legacy-tabs/internal/tab-base.ts','c2c5c4a69762261f8e8241e1325f381d6ad2c431a2734d354c85c84244d3291a','880575b7a0c3a6b30bfb363c68e3a574fcb585e11e4b10d362eeea5731785639','value && value._closestTab === this','value && (value as MatTabLabel & {_closestTab?: unknown})._closestTab === this']];
   const typeImages=gitImages(root,typeChanges.flatMap(([path])=>[{commit:typeParent,path},{commit:typeCommit,path}]));for(const [path,priorSha,currentSha,beforeText,afterText] of typeChanges){const prior=typeImages.get(typeParent+':'+path),current=typeImages.get(typeCommit+':'+path);assert.equal(hash(prior),priorSha);assert.equal(hash(current),currentSha);const text=prior.toString('utf8');assert.equal(text.split(beforeText).length,2);assert.ok(equalBytes(Buffer.from(text.replace(beforeText,afterText)),current));assert.ok(equalBytes(read(path),current));}
  }
  // The table support remains the committed historical identity; authenticate
  // the separate current physical file through each explicit successor.
  const sig=JSON.parse(member({path:'compatibility/rc/current-tool-signature-differences-live-source-successor-v1.json',sha256:'d27970b1fd18bd836dc9dcb0e0382fbc7fde0f568ab3f1738049364925519efa',bytes:8907}));assert.equal(sig.schema_version,1);assert.equal(sig.role,'current-tool-signature-differences-live-source-successor');assert.equal(sig.source_only,true);assert.equal(sig.historical_programs_executed,false);assert.equal(sig.artifact_or_audit_admission_granted,false);assert.equal(sig.steps.length,2);
  const sigCommits=[['356eb587f706c07f213553c8c8edb086b33e1e4e','87ba1a73bfb5fad632b7232a7ed0e98f2ad7ad14'],['a798ff9c58cdd539f115eda00b7cdd898d035353','66875e0e810e0b2b7173c05fe4597a1809e57374']];let sigExpected=repair.supports[2],sigPrior;
  for(let i=0;i<sig.steps.length;i++){const step=sig.steps[i];assert.deepEqual([step.source_parent,step.source_commit],sigCommits[i]);assert.deepEqual(step.before,sigExpected);assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',step.source_commit],{cwd:root,env,encoding:'utf8'}).trim(),step.source_commit+' '+step.source_parent);execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',step.source_commit,'HEAD'],{cwd:root,env});const ims=gitImages(root,[{commit:step.source_parent,path:step.before.path},{commit:step.source_commit,path:step.after.path}]),old=ims.get(step.source_parent+':'+step.before.path),next=edited(old,step.edits);matches(old,step.before);matches(next,step.after);assert.ok(equalBytes(next,ims.get(step.source_commit+':'+step.after.path)));if(sigPrior)assert.ok(equalBytes(old,sigPrior));member(step.receipt);sigExpected=step.after;sigPrior=next;}
  assert.ok(equalBytes(member(sigExpected),sigPrior));
  const support=repair.supports.map((ref,i)=>i===2?null:member(ref)),table=JSON.parse(support[0]),receipt=JSON.parse(support[1]),independent=JSON.parse(support[4]);
  assert.equal(table.schema_version,1);assert.equal(table.role,'historical-repair-table-signature-source-successor');assert.equal(table.source_parent,'c394ef616bfae381e0676c8f84af01e0553cad1d');assert.equal(table.source_commit,'68606c1ee64a6f529ef71b4576cc13c7863dbc85');assert.equal(table.historical_programs_executed,false);assert.equal(table.artifact_or_audit_admission_granted,false);assert.deepEqual(table.review,repair.supports[1]);assert.deepEqual(table.after,repair.supports[2]);
  assert.equal(receipt.base_head,table.source_parent);assert.equal(receipt.independent_review.sha256,'e9bb997595db0a8d165a30fbf38c54ddb4e572402f27d9cb842d4aae8714fe85');assert.equal(receipt.root_preflight.before[table.before.path],table.before.sha256);assert.equal(receipt.root_preflight.after[table.after.path],table.after.sha256);
  assert.equal(independent.schema_version,1);assert.equal(independent.role,'embedded-independent-historical-repair-table-planner-review');assert.equal(independent.historical_programs_executed,false);assert.equal(independent.artifact_or_audit_admission_granted,false);assert.equal(independent.original_sha256,'3f37b9ad190072bebc30e198b06ad7d49fc09f05a9183f22c58ae8240c6617e4');assert.equal(Buffer.byteLength(independent.text),independent.original_bytes);assert.equal(hash(independent.text),independent.original_sha256);
  assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',table.source_commit],{cwd:root,env,encoding:'utf8'}).trim(),table.source_commit+' '+table.source_parent);const tableImages=gitImages(root,[{commit:table.source_parent,path:table.before.path},{commit:table.source_commit,path:table.after.path}]),tableOld=tableImages.get(table.source_parent+':'+table.before.path),tableNew=edited(tableOld,table.edits);matches(tableOld,table.before);matches(tableNew,table.after);assert.ok(equalBytes(tableNew,tableImages.get(table.source_commit+':'+table.after.path)));matches(tableNew,repair.supports[2]);
  const oldTable=JSON.parse(tableOld),newTable=JSON.parse(tableNew);assert.equal(oldTable.differences.length,113);assert.equal(newTable.differences.length,114);assert.equal(newTable.differences[0].symbol_id,'legacy-table/primary/MatLegacyColumnDef');assert.equal(newTable.differences[0].historical_signature,'protected method _updateColumnCssClassName():*');assert.equal(newTable.differences[0].owned_signature,null);assert.deepEqual({...newTable,differences:newTable.differences.slice(1)},oldTable);
  domainOverlays.set(repairPath,{update:{path:repairPath,before:repair.before,after:repairComposition.after},identities:[{ref:repair.before,bytes:repairOld},{ref:repair.after,bytes:repairNew},{ref:repairLive.after,bytes:liveRepair},{ref:repairComposition.intermediate,bytes:focusedRepair},{ref:repairComposition.after,bytes:composedRepair}]});
  const guard=JSON.parse(member({path:'compatibility/rc/current-tool-inventory-guard-live-source-successor-v1.json',sha256:'77ff8036af2be230586ea8ef9aead9f5b6d36357d2398b3b5d9befb052816db0',bytes:43066}));assert.equal(guard.schema_version,1);assert.equal(guard.role,'current-tool-inventory-guard-live-source-successor');assert.equal(guard.source_parent,'a798ff9c58cdd539f115eda00b7cdd898d035353');assert.equal(guard.source_only,true);assert.equal(guard.historical_programs_executed,false);assert.equal(guard.artifact_or_audit_admission_granted,false);assert.deepEqual(guard.transitions.map(x=>x.path),['scripts/inventory-reference-proposal.mjs','scripts/inventory-finite-tool-successor.mjs','tests/inventory_finite_source_probe.mjs']);assert.equal(guard.support.length,7);execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',guard.source_parent,'HEAD'],{cwd:root,env});
  for(const ref of guard.support)epochMember(ref);
  const guardImages=gitImages(root,guard.transitions.map(x=>({commit:guard.source_parent,path:x.path})));for(const update of guard.transitions){assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);const before=guardImages.get(guard.source_parent+':'+update.path),after=edited(before,update.edits);matches(before,update.before);matches(after,update.after);assert.ok(!domainOverlays.has(update.path));if(update.path==='scripts/inventory-finite-tool-successor.mjs'){
   const successor=JSON.parse(member({path:'compatibility/rc/main-retained-ci-tool-source-successor-v1.json',sha256:'04a71083f8185094f496ffe6f110298177a7a1515d6e77c5d922212d96733d49',bytes:3133}));assert.equal(successor.schema_version,1);assert.equal(successor.role,'main-retained-ci-tool-source-successor');assert.equal(successor.source_scope_only,true);assert.equal(successor.historical_programs_executed,false);assert.equal(successor.full_Actions_execution_qualified,false);assert.equal(successor.g11_claim,'not-passed');assert.equal(successor.base_head,'a796c018da3023e916b37088917f6adca56fbc9d');execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',successor.base_head,'HEAD'],{cwd:root,env});assert.deepEqual(successor.before,update.after);const next=edited(after,successor.edits);matches(next,successor.after);assert.ok(equalBytes(routingComparison(successor.after),next));domainOverlays.set(update.path,{update:{...update,after:successor.after},identities:[{ref:update.before,bytes:before},{ref:update.after,bytes:after},{ref:successor.after,bytes:next}]});
  }else{assert.ok(equalBytes(member(update.after),after));domainOverlays.set(update.path,{update,identities:[{ref:update.before,bytes:before},{ref:update.after,bytes:after}]});}}
 }
 const sameReference=(a,b)=>Object.keys(a).length===3&&a.path===b.path&&a.sha256===b.sha256&&a.bytes===b.bytes;
 if(line==='main'){
  const ownerEnv={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};for(const key of Object.keys(ownerEnv))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete ownerEnv[key];
  const owner=JSON.parse(member({path:'compatibility/rc/main-inventory-owner-verify-lite-source-successor-v1.json',sha256:'b802918f6d264ea0f85e132a36830f2ea706d4e1e6036346e01ab87276baa20c',bytes:3256}));assert.equal(owner.schema_version,1);assert.equal(owner.role,'main-inventory-owner-verify-lite-source-successor');assert.equal(owner.source_scope_only,true);assert.equal(owner.historical_programs_executed,false);assert.equal(owner.full_Actions_execution_qualified,false);assert.equal(owner.g11_claim,'not-passed');assert.equal(owner.base_head,'a796c018da3023e916b37088917f6adca56fbc9d');execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',owner.base_head,'HEAD'],{cwd:root,env:ownerEnv});const before=gitImages(root,[{commit:owner.base_head,path:owner.before.path}]).get(owner.base_head+':'+owner.before.path);matches(before,owner.before);const after=edited(before,owner.edits);matches(after,owner.after);assert.ok(equalBytes(routingComparison(owner.after),after));assert.ok(!domainOverlays.has(owner.before.path));domainOverlays.set(owner.before.path,{update:{path:owner.before.path,before:owner.before,after:owner.after},identities:[{ref:owner.before,bytes:before},{ref:owner.after,bytes:after}]});
 }
 const checkerSourceAnchor=line==='main'?JSON.parse(member({path:'compatibility/rc/c04-checker-reference-proposal.json',sha256:'fe1a877f6d427b0eb598391ee11502b49c65d0242c55956f25bd5284314d71db',bytes:16215})):null;
 if(line==='main'){
  const authored=JSON.parse(member({path:'compatibility/rc/historical-repair-live-authored-v1.json',sha256:'e0b1e0c866e73f4f4c9913a9bfe6c464570fa3e59baa4de64b6bb8d2f0bd6dfe',bytes:1350}));assert.equal(authored.schema_version,1);assert.equal(authored.role,'historical-repair-live-authored-use-source-successor');assert.equal(authored.source_parent,'4c29be143432bcb5b2ca99d4f83ca6ff162b4554');assert.equal(authored.source_commit,'547abe83d86c4682a173a6e01d2c783b6bb1d855');assert.equal(authored.source_only,true);assert.equal(authored.historical_programs_executed,false);assert.equal(authored.artifact_or_audit_admission_granted,false);const ims=gitImages(root,[{commit:authored.source_parent,path:authored.before.path},{commit:authored.source_commit,path:authored.after.path}]),before=ims.get(authored.source_parent+':'+authored.before.path),committed=ims.get(authored.source_commit+':'+authored.after.path);matches(before,authored.before);const after=edited(before,authored.edits);matches(after,authored.after);assert.ok(equalBytes(committed,after));assert.ok(equalBytes(member(authored.after),after));assert.ok(!domainOverlays.has(authored.before.path));domainOverlays.set(authored.before.path,{update:{path:authored.before.path,before:authored.before,after:authored.after},identities:[{ref:authored.before,bytes:before},{ref:authored.after,bytes:after}]});
 }
 if(line==='main'){
  const packet=JSON.parse(member({path:'compatibility/rc/main-retained-browser-source-successors-v2.json',sha256:'b3e41ad092991cd6270e98a0efac58514d5f3cf779081363165eda046ff6f475',bytes:24658}));
  assert.equal(packet.schema_version,1);assert.equal(packet.role,'main-retained-browser-source-successors');assert.equal(packet.base_head,'a796c018da3023e916b37088917f6adca56fbc9d');assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.artifact_or_audit_admission_granted,false);assert.equal(packet.g11_claim,'not-passed');
  const paths=['scripts/browser-zone-source-successor.mjs','scripts/browser-form-zone-source-successor.mjs','scripts/browser-peer-zone-source-successor.mjs'];assert.deepEqual(packet.updates.map(u=>u.path),paths);
  assert.deepEqual(packet.new_helper,{path:'scripts/browser-sandbox-source-successor.mjs',sha256:'e24f607fa2f559eee1209d9ec8dcb845feb8c2a8db61b21821c08aeb54179999',bytes:4017});member(packet.new_helper);member(packet.support);
  const lineageEnv={PATH:process.env.PATH,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};execFileSync('git',['--no-replace-objects','merge-base','--is-ancestor',packet.base_head,'HEAD'],{cwd:root,env:lineageEnv});
  const originals=gitImages(root,paths.map(path=>({commit:packet.base_head,path})));
  for(const update of packet.updates){assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);const before=originals.get(packet.base_head+':'+update.path);matches(before,update.before);const after=edited(before,update.edits);matches(after,update.after);assert.ok(equalBytes(member(update.after),after));assert.ok(!domainOverlays.has(update.path));domainOverlays.set(update.path,{update,identities:[{ref:update.before,bytes:before},{ref:update.after,bytes:after}]});}
 }
 for(const [path,routing]of routingImages){const prior=domainOverlays.get(path);if(prior){assert.deepEqual(prior.update.after,routing.update.before,'routing successor must follow the exact previous source');domainOverlays.set(path,{update:{...prior.update,after:routing.update.after},identities:[...prior.identities,...routing.identities]});}else domainOverlays.set(path,routing);}
 const inventoryPrior=Object.freeze({path:'testing/legacy-runner/historical-inventory.json',sha256:'a3ebe782d8757db92b392c9c5ced70de7f25cca550a705363ccab825037d6403',bytes:106309});
 const inventoryCurrent=Object.freeze({path:inventoryPrior.path,sha256:'912def47c1e171f9c2a01906dcc0968b91c5288d9b8f73714247b0319f3a2b15',bytes:113388});
 const currentComparison=ref=>{
  if(matrixOwner&&ref.path===inventoryPrior.path){assert.deepEqual(metadata(ref),inventoryPrior);matrixOwner.assertCurrent();member(inventoryCurrent);const old=gitImages(root,[{commit:'948e8290b74953c83d11268368f38952d0b51fd7',path:inventoryPrior.path}]).get('948e8290b74953c83d11268368f38952d0b51fd7:'+inventoryPrior.path);matches(old,inventoryPrior);return Buffer.from(old);}
  if(matrixOwner&&ref.path===matrixOwner.after.path){const meta=metadata(ref);if(sameReference(meta,matrixOwner.after))return member(matrixOwner.after);return matrixOwner.comparisonBytes(meta);}
  const overlay=domainOverlays.get(ref.path);if(!overlay)return member(ref);const meta=metadata(ref),identity=overlay.identities.find(x=>sameReference(x.ref,meta));assert.ok(identity,'unknown current domain comparison '+ref.path);member(overlay.update.after);return Buffer.from(identity.bytes);
 };
 const rcSuccessors=new Map();
 if(line==='main'){
  const rcPacket={path:'compatibility/rc/current-tool-rc-verify-source-successor-v1.json',sha256:'35834cc2d98bb4a05e4bae35f3a1f51199ab81e86027858214a0144e911d2826',bytes:6911};
  const parent='dfa4dfe18a17a117aaae3af1a8089f4615840cb0',commit='33d7d9e31fd96cbfa6c4e1f592c0bade985c0878',path='scripts/rc-verify.py',data=JSON.parse(member(rcPacket));
  assert.equal(data.schema_version,1);assert.equal(data.role,'current-tool-rc-verify-source-successor');assert.equal(data.source_parent,parent);assert.equal(data.source_commit,commit);assert.equal(data.historical_programs_executed,false);
  assert.deepEqual(data.before,{path,sha256:'3a3a68dd67abf6b0c535853beea818f003867b5a1a1734e6bea683c82b51521c',bytes:103517});assert.deepEqual(data.after,{path,sha256:'92b12b9f95207d32160a6a8df98e09a1ac9ee5264fdaf6a2f9057ff8bc3deadd',bytes:103230});
  const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
  assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',commit],{cwd:root,env,encoding:'utf8'}).trim(),commit+' '+parent);
  const images=gitImages(root,[{commit:parent,path},{commit,path}]),before=images.get(parent+':'+path),after=edited(before,data.edits);matches(before,data.before);matches(after,data.after);assert.ok(equalBytes(after,images.get(commit+':'+path)));assert.ok(equalBytes(currentComparison(data.after),after));rcSuccessors.set(path,{update:data,before,after});
  assert.deepEqual(data.authored_updates.map(row=>row.path),['tests/test_current_sass_tool_references.py','tests/current_sass_tool_reference_probe.mjs']);
  const v5=JSON.parse(member(V5_INPUTS));for(const update of data.authored_updates){assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);const v5update=v5.authored_updates.find(row=>row.path===update.path);assert.ok(v5update);assert.deepEqual(v5update.after,update.before);
  const base=gitImages(root,[{commit:V5_COMMIT,path:update.path}]).get(V5_COMMIT+':'+update.path),historical=edited(base,v5update.edits);matches(base,v5update.before);matches(historical,update.before);
  const current=edited(historical,update.edits);matches(current,update.after);assert.ok(equalBytes(currentComparison(update.after),current));rcSuccessors.set(update.path,{update,before:historical,after:current});}
 }
 const v5Member=ref=>{const row=rcSuccessors.get(ref.path);if(row){assert.deepEqual(metadata(ref),row.update.before,'unknown source predecessor');assert.ok(equalBytes(currentComparison(row.update.after),row.after));return Buffer.from(row.before);}return currentComparison(ref);};
 const v5Overlays=new Map();
 if(line==='main'){
  const v5=JSON.parse(member(V5_INPUTS));
  assert.equal(v5.schema_version,5);assert.equal(v5.role,successor.role);assert.deepEqual(v5.previous_epoch,V4_INPUTS);
  assert.equal(v5.source_parent,V5_PARENT);assert.equal(v5.source_commit,V5_COMMIT);assert.deepEqual(v5.product_paths,[]);
  assert.equal(v5.historical_programs_executed,false);assert.equal(v5.historical_reports_rewritten,0);assert.equal(v5.artifact_or_audit_admission_granted,false);
  assert.deepEqual(v5.updates.map(u=>u.path),V5_PATHS);assert.equal(v5.additional_inputs.length,1);
  assert.equal(v5.additional_inputs[0].path,'compatibility/rc/fixed-report-catalog.json');
  const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
  const ancestry=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','rev-list','--parents','-n','1',V5_COMMIT],{cwd:root,env,encoding:'utf8'}).trim();
  assert.equal(ancestry,V5_COMMIT+' '+V5_PARENT,'V5 source commit has unexpected parent');
  const requests=v5.updates.flatMap(u=>[{commit:V5_PARENT,path:u.path},{commit:V5_COMMIT,path:u.path}]);
  assert.deepEqual(v5.authored_updates.map(u=>u.path),['tests/test_current_sass_tool_references.py','tests/current_sass_tool_reference_probe.mjs','scripts/current-native-tab-downstream-source.mjs']);
  requests.push(...v5.authored_updates.map(u=>({commit:V5_COMMIT,path:u.path})),{commit:V5_COMMIT,path:v5.additional_inputs[0].path});const images=gitImages(root,requests);
  for(const u of v5.updates){
   assert.deepEqual(Object.keys(u).sort(),['after','before','edits','path']);assert.equal(u.before.path,u.path);assert.equal(u.after.path,u.path);
   const before=images.get(V5_PARENT+':'+u.path),after=edited(before,u.edits);matches(before,u.before);matches(after,u.after);
   assert.ok(equalBytes(after,images.get(V5_COMMIT+':'+u.path)),'V5 Git postimage mismatch');
   assert.ok(equalBytes(v5Member(u.after),after),'V5 physical postimage mismatch');v5Overlays.set(u.path,{update:u,before,after});
  }
  for(const u of v5.authored_updates){
   assert.deepEqual(Object.keys(u).sort(),['after','before','edits','path']);assert.equal(u.before.path,u.path);assert.equal(u.after.path,u.path);
   const before=images.get(V5_COMMIT+':'+u.path),after=edited(before,u.edits);matches(before,u.before);matches(after,u.after);
   assert.ok(equalBytes(v5Member(u.after),after),'V5 authored test postimage mismatch');v5Overlays.set(u.path,{update:u,before,after});
  }
  assert.equal(v5.authored_support.length,1);assert.equal(v5.authored_support[0].path,'compatibility/rc/current-native-tab-downstream-source-epochs-v5.json');member(v5.authored_support[0]);
  const ref=v5.additional_inputs[0],current=member(ref);assert.ok(equalBytes(current,images.get(V5_COMMIT+':'+ref.path)),'V5 catalog Git mismatch');
 }
 // This function is only for verifying a historical identity as comparison data.
 // It always binds and reads the actual current member before returning old bytes.
 const v4Comparison=ref=>{
  if(line==='main'&&ref.path===GUARD_PLAN.path){assert.deepEqual(metadata(ref),GUARD_PLAN,'unknown planner predecessor');member(CURRENT_GUARD_PLAN);assertPlanner();return Buffer.from(plannerBefore);}
  const overlay=v5Overlays.get(ref.path);if(!overlay)return currentComparison(ref);
  assert.deepEqual(metadata(ref),overlay.update.before,'unknown V4 comparison identity '+ref.path);
  assert.ok(equalBytes(v5Member(overlay.update.after),overlay.after));return Buffer.from(overlay.before);
 };
 const v4Overlays=new Map();
 if(line==='main'){
  const v4=JSON.parse(member(V4_INPUTS));assert.equal(v4.schema_version,4);assert.equal(v4.role,successor.role);assert.equal(v4.source_parent,V4_PARENT);
  assert.deepEqual(v4.previous_epoch,{path:INPUTS,sha256:INPUTS_SHA,bytes:read(INPUTS).length});assert.deepEqual(v4.product_paths,[]);
  assert.equal(v4.historical_programs_executed,false);assert.equal(v4.historical_reports_rewritten,0);assert.equal(v4.artifact_or_audit_admission_granted,false);
  assert.deepEqual(v4.updates.map(x=>x.path).sort(),Object.keys(V4_COMMITS).sort());
  const requests=v4.updates.flatMap(u=>[{commit:V4_PARENT,path:u.path},...(u.source_commit==='authored'?[]:[{commit:u.source_commit,path:u.path}])]);const images=gitImages(root,requests);
  for(const u of v4.updates){
   assert.deepEqual(Object.keys(u).sort(),['after','before','edits','path','source_commit']);assert.equal(u.source_commit,V4_COMMITS[u.path]);assert.equal(u.before.path,u.path);assert.equal(u.after.path,u.path);
   const before=images.get(V4_PARENT+':'+u.path);matches(before,u.before);const after=edited(before,u.edits);matches(after,u.after);
   if(u.source_commit!=='authored')assert.ok(equalBytes(images.get(u.source_commit+':'+u.path),after));
   assert.ok(equalBytes(v4Comparison(u.after),after));v4Overlays.set(u.path,{update:u,before,after});
  }
  const browser=JSON.parse(member({path:'compatibility/rc/c04-browser-owner-inputs.json',sha256:'d22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb',bytes:15192}));
  assert.deepEqual(browser.source_members.find(ref=>ref.path==='scripts/check-upstream-audit-disposition.mjs'),v4.updates.find(u=>u.path==='scripts/check-upstream-audit-disposition.mjs').before);
  for(const receipt of v4.receipts)member(receipt);
  const native=JSON.parse(member(v4.receipts[4]));
  assert.equal(native.role,'main-native-tab-source-composition-qualification');
  assert.equal(native.source_parent,'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde');
  assert.deepEqual(native.sources[0],v4.updates.find(u=>u.path==='scripts/remaining-native-tab-lifecycle-review.mjs').after);
  assert.deepEqual(native.archive,v4.receipts[5]);
  for(const ref of native.sources)v4Comparison(ref);
  const inventory=JSON.parse(member(v4.receipts[6]));
  assert.equal(inventory.role,'main-nine-spec-inventory-source-qualification');
  assert.equal(inventory.source_parent,'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde');
  assert.deepEqual(inventory.archive,v4.receipts[7]);
  for(const ref of inventory.sources){
   const update=v4.updates.find(u=>u.path===ref.path);
   if(update)assert.deepEqual(update.after,ref);
   v4Comparison(ref);
  }
 }
 const v3Member=ref=>{const overlay=v4Overlays.get(ref.path);if(!overlay)return v4Comparison(ref);assert.deepEqual(metadata(ref),overlay.update.before,'unknown V3 predecessor identity '+ref.path);assert.ok(equalBytes(v4Comparison(overlay.update.after),overlay.after));return Buffer.from(overlay.before);};
 const branch=packet.branches[line],priorBranch=previous.branches[line];assert.ok(branch&&priorBranch);const archived=branch.historical_registry;
 const nextBranch=successor.branches[line];assert.ok(nextBranch);assert.equal(nextBranch.source_parent,V3_CHECKPOINTS[line]);
 const previousGitV2=gitImages(root,[{commit:V3_CHECKPOINTS[line],path:V2_INPUTS.path}]).get(V3_CHECKPOINTS[line]+':'+V2_INPUTS.path);
 assert.ok(equalBytes(raw,previousGitV2),'V2 packet differs from committed comparison data');
 assert.equal(new Set(nextBranch.updates.map(r=>r.path)).size,nextBranch.updates.length);
 assert.equal(new Set(nextBranch.additional_inputs.map(r=>r.path)).size,nextBranch.additional_inputs.length);
 const successorImages=gitImages(root,nextBranch.updates.map(r=>({commit:V3_CHECKPOINTS[line],path:r.path}))),overlays=new Map();
 for(const update of nextBranch.updates){
  assert.deepEqual(Object.keys(update).sort(),['after','before','edits','path']);assert.ok((toolPath(update.path)||update.path==='compatibility/rc/consumer-floor-plan.json')&&update.path!==SELF&&update.path!=='scripts/current_sass_tool_references.py');
  assert.equal(update.before.path,update.path);assert.equal(update.after.path,update.path);assert.ok(Number.isSafeInteger(update.before.bytes));assert.ok(Number.isSafeInteger(update.after.bytes));
  const before=successorImages.get(V3_CHECKPOINTS[line]+':'+update.path);matches(before,update.before);
  const after=edited(before,update.edits);matches(after,update.after);assert.ok(equalBytes(v3Member(update.after),after));
  overlays.set(update.path,{update,before,after});
 }
 // Only complete, authenticated predecessor identities select private comparison
 // DATA. Every physical read above/below remains the exact latest source image.
 const v2Member=ref=>{
  const overlay=overlays.get(ref.path);if(!overlay)return v3Member(ref);
  assert.deepEqual(metadata(ref),overlay.update.before,'unknown V2 predecessor identity '+ref.path);
  assert.ok(equalBytes(v3Member(overlay.update.after),overlay.after));return Buffer.from(overlay.before);
 };
 assert.equal(branch.previous_epoch_source_parent,CHECKPOINTS[line]);assert.deepEqual(archived,priorBranch.historical_registry);
 assert.deepEqual(branch.intermediate_inputs,priorBranch.intermediate_inputs);
 const previousGit=gitImages(root,[{commit:CHECKPOINTS[line],path:PREVIOUS_INPUTS.path}]).get(CHECKPOINTS[line]+':'+PREVIOUS_INPUTS.path);
 assert.ok(equalBytes(previousRaw,previousGit),'V1 epoch differs from committed comparison data');
 assert.equal(new Set(branch.updates.map(r=>r.path)).size,branch.updates.length);assert.equal(new Set(branch.additional_inputs.map(r=>r.path)).size,branch.additional_inputs.length);
 const registryBytes=gitImages(root,[{commit:archived.source_parent,path:archived.path}]).get(archived.source_parent+':'+archived.path);matches(registryBytes,archived);
 // The unchanged registry remains physically present. Its source programs are never run.
 assert.ok(equalBytes(v3Member(archived),registryBytes));const historical=JSON.parse(registryBytes);
 assert.equal(historical.line,line);assert.equal(historical.extension_kind,'spinner-snack-c04-source');assert.ok(historical.gate_tool_successor);
 assert.equal(historical.tool_transitions.length,line==='21.x'?45:17);
 assert.equal(historical.canonical_dispositions_changed,0);assert.equal(historical.product_changes,0);assert.equal(historical.old_programs_executed,false);assert.equal(historical.g11_claim,'not-passed');
 const originalRequests=historical.tool_transitions.map(r=>({commit:r.source_parent??historical.source_parent,path:r.path}));
 originalRequests.push(...branch.intermediate_inputs.map(r=>({commit:r.source_parent,path:r.path})),...branch.updates.map(r=>({commit:r.source_parent??archived.source_parent,path:r.path})),...priorBranch.updates.map(r=>({commit:CHECKPOINTS[line],path:r.path})));
 for(const old of priorBranch.updates){const latest=branch.updates.find(r=>r.path===old.path);assert.ok(latest,'missing V1 current tool '+old.path);assert.deepEqual(latest.before,old.before);assert.equal(latest.source_parent??archived.source_parent,archived.source_parent);}
 const originals=gitImages(root,originalRequests),rows=new Map();
 const addIdentity=(row,ref,bytes)=>{matches(bytes,ref);const prior=row.identities.get(ref.sha256);if(prior)assert.ok(equalBytes(prior,bytes));else row.identities.set(ref.sha256,Buffer.from(bytes));};
 for(const input of historical.tool_transitions){
  assert.ok(toolPath(input.path));assert.equal(rows.has(input.path),false);
  const before=originals.get((input.source_parent??historical.source_parent)+':'+input.path);matches(before,input.before);
  let after=before.toString();assert.ok(input.literal_edits.length);
  for(const edit of input.literal_edits){assert.equal(after.split(edit.before).length,2);after=after.replace(edit.before,edit.after);}
  const row={path:input.path,before:{...input.before},after:{...input.after},identities:new Map()};
  addIdentity(row,input.before,before);addIdentity(row,input.after,Buffer.from(after));rows.set(input.path,row);
 }
 const baselineSupport=new Map(historical.support_inputs.map(r=>[r.path,r]));
 for(const update of branch.updates){
  assert.ok(toolPath(update.path));const parent=update.source_parent??archived.source_parent;assert.ok(parent===archived.source_parent||parent===CHECKPOINTS[line]);
  const before=originals.get(parent+':'+update.path);matches(before,update.before);
  const prior=rows.get(update.path);if(prior)assert.deepEqual(update.before,{path:update.path,...prior.after});
  else if(baselineSupport.has(update.path))assert.deepEqual(update.before,baselineSupport.get(update.path));
  const after=edited(before,update.edits);matches(after,update.after);assert.ok(equalBytes(v2Member(update.after),after));
  const row=prior??{path:update.path,before:{sha256:update.before.sha256,bytes:update.before.bytes},identities:new Map()};
  addIdentity(row,update.before,before);addIdentity(row,update.after,after);row.after={sha256:update.after.sha256,bytes:update.after.bytes};rows.set(update.path,row);
 }
 // Register old accepted identities only after cumulative/latest rows exist.
 // Several V1 current tools were not in the original 45/17-row registry.
 for(const input of branch.intermediate_inputs){
  const row=rows.get(input.path);assert.ok(row);addIdentity(row,input,originals.get(input.source_parent+':'+input.path));
 }
 for(const input of priorBranch.updates){
  const row=rows.get(input.path);assert.ok(row);addIdentity(row,input.after,originals.get(CHECKPOINTS[line]+':'+input.path));
 }
 v2Member(historical.unchanged_source_subject);
 for(const input of historical.support_inputs)if(!branch.updates.some(r=>r.path===input.path))v2Member(input);
 for(const input of branch.additional_inputs){assert.ok(toolPath(input.path)||input.path.startsWith('compatibility/rc/'));v2Member(input);}
 for(const {update,before,after} of overlays.values()){
  let row=rows.get(update.path);
  if(row)assert.deepEqual(update.before,{path:row.path,...row.after},'V3 overlay does not follow exact V2 current row');
  else{
   assert.ok(line==='21.x'||update.path==='scripts/historical-contract-repair-source.mjs'||Object.hasOwn(V3_REGRESSION_SOURCE_ANCHORS[line],update.path),'unknown non-21.x V3 new-row path');
   const finiteBefore={
    'scripts/upstream-base-class-removal-admission.cjs':{path:update.path,sha256:'013cbe4ae44ebebcf8331d2aedca972f15c824dd4e61bc795f0efa188d35b69a',bytes:14322},
    'scripts/historical-contract-repair-source.mjs':{path:update.path,sha256:'d4870c2cc12609da71b03c1745996693dd26444b2dfd848260cfda1ac3514da5',bytes:13052},
    'scripts/legacy-removal-canonical-stage.mjs':{path:update.path,sha256:'9b5021340fcab66f2c2b45447b5162f0e25b002b45c7ea7c062c8087dfb80d6c',bytes:8412},
    'tests/test_packed_upstream_ledger_epoch.py':{path:update.path,sha256:'f7b3ae0ede9bd62fb033c49017a84d5b4ca81ce8b7920d72a105b1df1393e6df',bytes:17868},
    'scripts/browser-reference-source.mjs':{path:update.path,sha256:'59f2ac538149e0d9b2176c231a97147862881fb19b46768a5a4e450d66f9fe38',bytes:10443},
    'tests/checker_reference_source_probe.mjs':{path:update.path,sha256:'d15e169d07033f25f089c2f50d78aa77f924879256674431d9c1cfa20660fe47',bytes:17054},
    'scripts/table-local-compilation-canonical-stage.mjs':{path:update.path,sha256:'bdb3137f6db42ed2611ac3a41e400478defed7f0076d203061d1e12d03f63b7c',bytes:8231},
    'scripts/legacy-removal-owner-source.mjs':{path:update.path,sha256:'b88708bb7ed441e24c6ed623371330426d6a947df83452ca343487767d2c9122',bytes:6628},
    'scripts/browser-owner-source.mjs':{path:update.path,sha256:'f3eed08c7bc7d385a53ba2cabfeb35e4656e7f41871fab08b685104b1f0f84ad',bytes:6019},
    'scripts/checker-owner-source.mjs':{path:update.path,sha256:'0788290595d4c776ae958ebf8e0c110b281c3840f349d1be93b7e5b988a3567c',bytes:5220},
    'scripts/checker-reference-proposal.mjs':{path:update.path,sha256:'22c49ba434ee0b1253ad2815b77510adb8259cc3f307005f6b66b73e522502ac',bytes:13095},
    'tests/browser_reference_owner_probe.mjs':{path:update.path,sha256:'4f5d024bfd072129ec819374131795fb3d77e3e6e419d5d1617eade28ff25463',bytes:13406},
    'tests/test_browser_reference_owner.py':{path:update.path,sha256:'ffa0cb70dddc77825e971788b271a6caf6c3ad126f65c41e6b53d321fba50e64',bytes:4074},
   };
   for(const [path,anchor]of Object.entries(V3_REGRESSION_SOURCE_ANCHORS[line]))finiteBefore[path]=anchor.before;
   assert.ok(Object.hasOwn(finiteBefore,update.path),'unknown V3 new-row path');assert.deepEqual(update.before,finiteBefore[update.path]);
   if(update.path==='scripts/historical-contract-repair-source.mjs')assert.deepEqual(update.before,historical.unchanged_source_subject,'historical repair overlay must follow the immutable source identity');
   const anchor=V3_REGRESSION_SOURCE_ANCHORS[line][update.path]??V3_SOURCE_ANCHORS[update.path];
   if(anchor){
    const packet=JSON.parse(v3Member(anchor.packet));
    const expected=Object.hasOwn(anchor,'source_input_index')?packet.source_inputs[anchor.source_input_index]:(Object.hasOwn(anchor,'source_member_index')?packet.source_members[anchor.source_member_index]:(Object.hasOwn(anchor,'member_key')?packet[anchor.member_key]:packet.code_transitions[anchor.transition_index].after));
    assert.deepEqual(expected,update.before,'V3 new source row differs from immutable owner anchor');
   }
   row={path:update.path,before:{sha256:update.before.sha256,bytes:update.before.bytes},identities:new Map()};rows.set(update.path,row);
  }
  addIdentity(row,update.before,before);addIdentity(row,update.after,after);row.after={sha256:update.after.sha256,bytes:update.after.bytes};
 }
 for(const input of nextBranch.additional_inputs){assert.ok(toolPath(input.path)||input.path.startsWith('compatibility/rc/'));assert.ok(input.path!==SELF&&input.path!=='scripts/current_sass_tool_references.py');v3Member(input);}
 for(const {update,before,after} of v4Overlays.values()){
  let row=rows.get(update.path);
  if(row)assert.deepEqual(update.before,{path:row.path,...row.after},'V4 overlay does not follow exact V3 current row');
  else{assert.ok(nextBranch.additional_inputs.some(ref=>JSON.stringify(ref)===JSON.stringify(update.before)) || update.path==='scripts/check-upstream-audit-disposition.mjs','unknown V4 predecessor');row={path:update.path,before:{sha256:update.before.sha256,bytes:update.before.bytes},identities:new Map()};rows.set(update.path,row);}
  addIdentity(row,update.before,before);addIdentity(row,update.after,after);row.after={sha256:update.after.sha256,bytes:update.after.bytes};
 }
 for(const {update,before,after} of v5Overlays.values()){
  let row=rows.get(update.path);
  if(row)assert.deepEqual(update.before,{path:row.path,...row.after},'V5 overlay does not follow exact V4 current row');
  else {if(update.path==='scripts/current-native-tab-downstream-source.mjs')assert.deepEqual(update.before,{path:update.path,sha256:'86e46cca50f8c3658cfaf12bdd94f0475452ce8e5e1f4da35d953f81e72f21fa',bytes:12850});else assert.equal(update.path,'scripts/packed-consumer-evidence.mjs');row={path:update.path,before:{sha256:update.before.sha256,bytes:update.before.bytes},identities:new Map()};rows.set(update.path,row);}
  addIdentity(row,update.before,before);addIdentity(row,update.after,after);row.after={sha256:update.after.sha256,bytes:update.after.bytes};
 }
 for(const {update,before,after} of rcSuccessors.values()){const row=rows.get(update.before.path);assert.ok(row);assert.deepEqual({path:row.path,...row.after},update.before,'source successor must follow V5');addIdentity(row,update.before,before);addIdentity(row,update.after,after);row.after={sha256:update.after.sha256,bytes:update.after.bytes};}
 if(matrixOwner){const row=rows.get(matrixOwner.after.path);assert.ok(row);assert.deepEqual({path:row.path,...row.after},matrixOwner.before);addIdentity(row,matrixOwner.before,matrixOwner.comparisonBytes(matrixOwner.before));addIdentity(row,matrixOwner.intermediate,matrixOwner.comparisonBytes(matrixOwner.intermediate));addIdentity(row,matrixOwner.after,member(matrixOwner.after));row.after={sha256:matrixOwner.after.sha256,bytes:matrixOwner.after.bytes};}
 for(const {update,identities} of domainOverlays.values()){let row=rows.get(update.path);if(row)assert.deepEqual({path:row.path,...row.after},update.before,'domain successor must follow previous frame');else{assert.ok((line==='main'&&(update.path===retainedRulesJsPath||retainedLandscapePaths.includes(update.path)))||retainedReaderPaths.has(update.path)||routingImages.has(update.path)||nextBranch.additional_inputs.some(ref=>JSON.stringify(ref)===JSON.stringify(update.before))||(update.path==='scripts/authored-current-use-inventory.mjs'&&checkerSourceAnchor?.source_members.some(ref=>JSON.stringify(ref)===JSON.stringify(update.before))),'domain predecessor is not an existing input');row={path:update.path,before:{sha256:update.before.sha256,bytes:update.before.bytes},identities:new Map()};rows.set(update.path,row);}for(const identity of identities)addIdentity(row,identity.ref,identity.bytes);row.after={sha256:update.after.sha256,bytes:update.after.bytes};}
 for(const row of rows.values())member({path:row.path,...row.after});
 assert.deepEqual(bound.get(GUARD_PLAN.path),activePlanner,'current tool guard planner missing from finite bound');
 let consuming=false,batching=false;
 const assertIdle=()=>{assert.equal(consuming,false,'reentrant current tool guard consumption');assert.equal(batching,false,'reentrant current tool reference batch');};
 const internalNode=Object.freeze({
  dependencies:Object.freeze([]),
  preflight:()=>{assertIdle();assertPlanner();assertPhysical();if(matrixOwner)matrixOwner.assertCurrent();},
  consume:()=>{assertIdle();consuming=true;try{for(const ref of [...bound.values()])member(ref);}finally{consuming=false;}},
  final:()=>{assertPhysical();assertPlanner();if(matrixOwner)matrixOwner.assertCurrent();},
 });
 const composedGuard=loadedComposeCanonicalSourceGuards(Object.freeze([internalNode]));
 const transact=fn=>toolTransaction(root,fn);
 const guardNode=Object.freeze({dependencies:Object.freeze([]),
  preflight:()=>transact(internalNode.preflight),consume:()=>transact(internalNode.consume),final:()=>transact(internalNode.final)});
 const assertCurrentCore=()=>{assertIdle();composedGuard();};
 const assertCurrent=()=>transact(assertCurrentCore);
 const guardPlan=Object.freeze({assertCurrent,node:guardNode});
 const ownsReference=incoming=>{try{const ref=metadata(incoming),row=rows.get(ref.path),raw=row?.identities.get(ref.sha256);return Boolean(raw&&(ref.bytes===undefined||ref.bytes===raw.length));}catch{return false;}};
 const sideCore=(incoming,target)=>{
  const snapshot=plain(incoming),ref=metadata(snapshot),row=rows.get(ref.path);if(!row)return null;
  const prior=row.identities.get(ref.sha256);if(!prior)return null;matches(prior,ref);member({path:row.path,...row.after});
  const result={...snapshot,sha256:row[target].sha256,...(ref.bytes===undefined?{}:{bytes:row[target].bytes})};
  assert.deepEqual(plain(incoming),snapshot);return result;
 };
 const side=(incoming,target)=>{assert.equal(batching,false,'reentrant current tool reference batch');const result=sideCore(incoming,target);if(result!==null)assertPhysical();return result;};
 const comparisonCore=incoming=>{
  const snapshot=plain(incoming),ref=metadata(snapshot),row=rows.get(ref.path);assert.ok(row&&row.identities.has(ref.sha256));const result=Buffer.from(row.identities.get(ref.sha256));matches(result,ref);
  member({path:row.path,...row.after});assert.deepEqual(plain(incoming),snapshot);return result;
 };
 const comparisonBytes=incoming=>{assert.equal(batching,false,'reentrant current tool reference batch');const result=comparisonCore(incoming);assertPhysical();return result;};
 // One finite metadata operation on this actual subject. Every request still
 // consumes its own fresh current member; only the enclosing physical scope
 // is shared. Independent public operations retain their original sweeps.
 const referenceBatch=incoming=>{
  assertIdle();const snapshot=plain(incoming);
  assert.ok(Array.isArray(snapshot)&&snapshot.length>0,'reference batch requires nonempty requests');
  for(const request of snapshot){
   assert.ok(request&&typeof request==='object'&&!Array.isArray(request));
   assert.deepEqual(Object.keys(request).sort(),['kind','reference']);
   assert.ok(['qualify','predecessor','comparison'].includes(request.kind),'unknown reference batch operation');
   const ref=metadata(request.reference),row=rows.get(ref.path),prior=row?.identities.get(ref.sha256);
   if(request.kind==='comparison')assert.ok(prior,'unknown reference batch comparison');
   if(prior)matches(prior,ref);
  }
  batching=true;
  try{
   assertPlanner();assertPhysical();const result=[];
   for(let index=0;index<snapshot.length;index++){
    assert.deepEqual(plain(incoming),snapshot,'changed reference batch input');
    const request=incoming[index];
    result.push(request.kind==='comparison'?comparisonCore(request.reference):sideCore(request.reference,request.kind==='qualify'?'after':'before'));
   }
   assert.deepEqual(plain(incoming),snapshot,'changed reference batch input');assertPhysical();assertPlanner();return result;
  }finally{batching=false;}
 };
 const transitions=[...rows.values()].map(r=>({path:r.path,before:{...r.before},after:{...r.after}}));
 const result=Object.freeze({line,epoch:line==='main'?7:3,get bound(){return transact(()=>structuredClone([...bound.values()]));},get transitions(){return transact(()=>structuredClone(transitions));},ownsReference:ref=>transact(()=>ownsReference(ref)),qualify:ref=>transact(()=>side(ref,'after')),predecessorReference:ref=>transact(()=>side(ref,'before')),comparisonBytes:ref=>transact(()=>comparisonBytes(ref)),referenceBatch:refs=>transact(()=>referenceBatch(refs)),assertCurrent,guardNode,guardPlan,
  old_code_executed:false,old_product_bytes_exposed:false,old_tool_bytes_exposed_as_current:false,current_read_route_returned:false,canonical_admission_granted:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'});
 assertCurrentCore();if(captureBound)captureBound({bound:[...bound.entries()],images:[...images.entries()]});return result;
}
