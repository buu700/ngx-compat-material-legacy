/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Main-only finite inherited table live execution. Does not decide G11. */
import {createHash,randomBytes} from 'node:crypto';import {spawnSync} from 'node:child_process';import {writeFileSync,lstatSync,realpathSync} from 'node:fs';import {join,resolve} from 'node:path';import {isDeepStrictEqual as eq} from 'node:util';import {readEvidenceMember,validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';import {verifyTableLiveBody} from './table-inherited-live-evidence.mjs';import {selectInheritedNativeProfile} from './inherited-native-profiles.mjs';
const subjects=new Map([
 ['27dae25a420e76817a1209f373326084ae6dd11c','47e892b47ed2aa20c923cfffd2d16678db74f658c41b8c03914178560d5a4945'],
 ['3b6ca5c9880996b57e08caffb408f6c12ed78de4','041149dad79ac5c7e41b02607b5474178d87096024a4df965a53dd36cdc633bb'],
 ['59b8f433c28e81c213668ccf7d220f12e3524635','7535ba9015a99e689cb727af4826a91674fae7fdc530d00d000b61292306a6b8'],
]);
const members=new Map([
  ["compatibility/rc/table-inherited-review/27dae25a420e76817a1209f373326084ae6dd11c.patch", "47e892b47ed2aa20c923cfffd2d16678db74f658c41b8c03914178560d5a4945"],
  ["compatibility/rc/table-inherited-review/3b6ca5c9880996b57e08caffb408f6c12ed78de4.patch", "041149dad79ac5c7e41b02607b5474178d87096024a4df965a53dd36cdc633bb"],
  ["compatibility/rc/table-inherited-review/59b8f433c28e81c213668ccf7d220f12e3524635.patch", "7535ba9015a99e689cb727af4826a91674fae7fdc530d00d000b61292306a6b8"],
  ["scripts/table-inherited-live-evidence.mjs", "d20c5c91494a0ed27fd4b15d7ef2d5e2ef9210ac9087d00476243e8c816d904b"],
  ["testing/table-inherited/readonly-negative.ts", "4e8e6676eb5d07ae41bd6941154b45b7676575f9c8f1fbebfa0699133e995546"],
  ["fixtures/sass/stepper-historical-bridge-oracle.json", "a952c70fbb725c5ec0bd78d8b6bb7b54ac506c5dcf0600616c29e328f8bf67d9"],
  ["tests/fixtures/stepper-material-16/source-manifest.json", "ed9b9c8e69c63bb134b71a25ded9d68d21f1d120cdd513ba423126864986fe74"],
  ["tests/fixtures/stepper-material-16/shape-observation.json", "9834806bacc495276bfeae3c36c6e583daff0ee35919b3f373ccd31c404ca805"],
  ["scripts/inherited-native-profiles.mjs", "5be11b7109e2ef37ea2b6ad2f560400ddef32bd3b3c3a0486709c76950c26079"],
  ["compatibility/rc/inherited-native-profiles.json", "250dcb18cc36074a73b4b22caf1101f30399a861c42727750e4d5911f5918cb7"],
  ["compatibility/rc/overlay-inherited-toolchain-main.json", "ad74c81bd537a16a7324cd440ad3b36e9788030d21a0ad1bc1ab36772f26e503"],
  ["compatibility/rc/overlay-inherited-toolchain-main-x64-provisional.json", "2e7c5d5b11cf001f06dcb8db6714d50e0bef440d63580a8ffa090760461f33f0"],
  ["scripts/table-inherited-toolchain.mjs", "a5d79febfefe4d3ea92aa33895f4460f48fd7593c147521dbd1ba5a8f498062d"],
  ["compatibility/rc/table-inherited-toolchain-main.json", "b8e843e43cd9ed5cb9696086dd8a3a80f5f16c4e2bd5cbb3cffc877f36e98de0"],
  ["projects/ngx-material-legacy/legacy-table/table.ts", "d77414235c1e07af3b210b8cce6dc1e0cae39d0fe749720f9ba37d982df90a4f"],
  ["projects/ngx-material-legacy/legacy-table/cell.ts", "28359f7f5b9f4145e809340e8b0b441507d7c08323cea13cde6dea86b3dd1dbb"],
  ["projects/ngx-material-legacy/legacy-table/row.ts", "b57c2be6361b4caf802e9e13759f3bdebab413cd0a903f37ebf6e6443cf4f37d"],
  ["projects/ngx-material-legacy/legacy-core/public-api.ts", "f78b50ea144140825dc7bcb175b533ddce2f33925ff24c929bdd31dcf339f5bd"],
  ["projects/ngx-material-legacy/legacy-core/internal/common-module.ts", "8f8d7dbcf89c151f6bb953f8a0e803b2d64cdb07fbcedfa460415c7f5c22afe6"],
  ["projects/ngx-material-legacy/legacy-core/internal/sanity-checks.ts", "8756b0495ab4f02518887dff55ab844ff433a267c5e899a9b6abfe005863e9d7"],
  ["projects/ngx-material-legacy/legacy-core/internal/test-environment.ts", "83f0fb37e81c2e5294719bac3b337f1fa7983152ae9693ff8c9d4459e66b0408"],
  ["projects/ngx-material-legacy/legacy-table/table-module.ts", "435daec2cf8013ea58b59f5542d8e4b89ca3ea1c03d587e867a04bf6f29186e3"],
  ["projects/ngx-material-legacy/legacy-table/text-column.ts", "157c01cc18f67ff7e499442e6f16a7a23ec08284d069b2318a5d8bae11dc4431"],
  ["projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts", "9edd40a3915297b0ad36f6cc812649979c7a00bf8e40eabfc363aecdf6ea6771"],
  ["projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts", "5fb6a70fbcab6e06d16a72d3d888a74b94a56d8620e543666191297569b369ef"],
  ["projects/ngx-material-legacy/legacy-table/internal/definition-owner.ts", "6a115eb4ae6c5d50814d1460fd4ba7c2a6cab2eab6d213af5964ab1e3aa6b5dc"],
  ["projects/ngx-material-legacy/legacy-table/internal/column-classes.ts", "58ad7e5915fd944328fa3442ad0a5c02f09623694219dbdb04fa1b11907d5f64"],
  ["projects/ngx-material-legacy/legacy-table/internal/table-outlet.ts", "522c2133fd03d68e669c521a029e060754d1c2de92cf1a500b33993f7cd31a8e"],
  ["scripts/table-inherited-native-run.mjs", "fe32415c858fd37d61a41b996225ace85f9b9a0672800346d86724da38bee567"],
  ["testing/table-inherited/consumer.ts", "32517f6ec055a791a8230155b6354dc67943ca27e91c0d9ffabfe6dafc8ad027"],
  ["testing/table-inherited/supplemental.ts", "b217165e8ac3584b0b1726f232439ed9e44a7f75780d8232ec8053687417b0cf"],
  ["testing/table-inherited/negative.ts", "b2879f41ffe1dea008f9af0c2701b9560cd0ea529e185dea52aea954d0edf8e0"],
  ["testing/table-inherited/contracts.mjs", "62f9c29f8ec64b1fa4aae14ce6b660091b7651f287df03d7f1442762b474ce5c"],
  ["scripts/check-companion-computed-styles.mjs", "bcc2808b58064868e366c8cdcb7cbb4d80724e178579b924a1062b7e688b561c"],
  ["scripts/safe-package-extract.mjs", "da44c3a23b8f4edb778e9719d2a9a053c99717022ed2dc859487fa566e03b4d1"],
  ["scripts/chromium-debug-endpoint.mjs", "7febf1ef79e18b76f2f64073960b5a6bd92fd3f6291101ccc50744321bca8e7c"],
  ["scripts/npm-tooling-options.mjs", "cf285c2d3d81d5a51cddfafd03e8307741530224a6cfb94e175a7cdd2acf3e71"],
  ["scripts/resolve-run-library.mjs", "9a14ee847112104772c5bfc1b85a21698af755150ed36b73660aa113f0ac1b81"],
  ["scripts/badge-high-contrast-contract.mjs", "e42950522f839e52b57d2784c5beed9edec7f3d0c346558251c50a0849f34c49"],
  ["scripts/bundle-consumer-harness.mjs", "b4b96b7589e5a5701df6fe7543e5eabfe9d460c2d756945e73a55eeb3301644e"],
  ["scripts/consumer-animation-engine.mjs", "37aa5b5bf2a0cd0527e72304da17f9413cbac0aaa915709d642b34a40c7d3dcb"],
  ["scripts/companion-computed-cases.mjs", "a1f821021b0a726980897cd745df23538a89e58bbd8c9b2b82d77480a4cd148a"],
  ["scripts/companion-bridge-peer-oracle.mjs", "0d569ba0f3bb3d389b0cd0001b25dec373184a2606c566defab63cb4c058123e"],
  ["compatibility/rc/table-inherited-deps-main.json", "3117e18c03cba6173d2c0da57399d9383dc1f73a4fdddc7fee3b69e4e0140aef"],
  ["pnpm-lock.yaml", "4aa1a53cd8947fa48a5088007a615bc788471d40fefd40f8fb0cd6202871a068"],
  ["toolchain-lock.json", "5e20f11d3a06b03fb5194af421e4ba11aafa2609fa4d0a34793b39097b65278b"],
  ["package.json", "e55e954caf2e9313f8f6e94d7427ac27fc1c1e780f91dff1a3ee988cdd7ee6d6"],
  ["scripts/upstream-packed-run-evidence.mjs", "4ca01cf54f88ddd557556955ce987986a53ad21f95adfaed3fb3686d31bbd5ac"],
]);
const kind='main-table-inherited-native',hash=b=>createHash('sha256').update(b).digest('hex'),need=(x,m)=>{if(!x)throw Error(m)},cache=new Map();
export function tablePinnedMembers(){return [...members.entries()].map(([path,sha256])=>({path,sha256}));}
export function tableOutputDirectoryOk(request){try{
 if(!request||typeof request.runDir!=='string'||typeof request.outputDir!=='string'||typeof request.invocation!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(request.invocation))return false;
 const base=resolve(request.runDir);if(realpathSync(base)!==base)return false;const expected=join(base,'evidence','upstream-audit-disposition',request.invocation);if(resolve(request.outputDir)!==expected)return false;
 for(const p of [base,join(base,'evidence'),join(base,'evidence','upstream-audit-disposition'),expected]){const stat=lstatSync(p);if(!stat.isDirectory()||stat.isSymbolicLink())return false}return true;
 }catch{return false}}
export function tableInheritedRequirements(sha,line){return line==='main'&&subjects.has(sha)?{sha,kind,patch:subjects.get(sha)}:null;}
export function validateTableInherited({root,entry,proof,request,line}){
 try{
  const expected=tableInheritedRequirements(entry?.sha,line);need(expected&&proof?.proof_kind===kind&&proof.diff_sha256===expected.patch&&eq(proof.affected_branches,['main']),'wrong table subject');
  need(proof.reachable_behavior?.kind==='executed-delegation'&&proof.reachable_behavior.id==='table-inherited-native/'+entry.sha,'wrong table delegation');
  for(const [path,digest] of members)need(hash(readEvidenceMember(root,path))===digest,'table source identity changed: '+path);
  const runtime=validatePackedConsumerRun({root,request});need(runtime.ok,'packed run not accepted: '+runtime.detail);need(tableOutputDirectoryOk(request),'invalid table assertion output directory');
  const profile=selectInheritedNativeProfile(root);profile.check();const key=JSON.stringify([profile.id,request.runDir,request.runId,runtime.library.sha256,request.invocation]);let live=cache.get(key);
  if(!live){
   const manifest=JSON.parse(readEvidenceMember(request.runDir,'run.json')),lib=manifest.artifacts.find(x=>x.id==='library'),nonce=randomBytes(16).toString('hex');const env={PATH:process.env.PATH,HOME:process.env.HOME,CHROME_BIN:process.env.CHROME_BIN,NODE_OPTIONS:'',LANG:'C.UTF-8'};
   const child=spawnSync(process.execPath,[join(root,'scripts/table-inherited-native-run.mjs'),join(request.runDir,lib.path),runtime.library.sha256,request.outputDir,nonce],{cwd:root,env,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
   need(child.status===0&&!child.error&&!child.signal,'table producer failed: '+String(child.error?.message||child.stderr||child.status).slice(-1000));const observation=JSON.parse(child.stdout);
   const recordHash=members.get(profile.arch==='arm64'?'compatibility/rc/overlay-inherited-toolchain-main.json':'compatibility/rc/overlay-inherited-toolchain-main-x64-provisional.json');
   const body={run_id:request.runId,invocation_id:request.invocation,binding:request.binding,source_commit:request.binding.source_commit,source_tree:request.binding.source_tree,library:runtime.library,role:'table-inherited-live-evidence',...observation};
   const combined=verifyTableLiveBody(body,{binding:request.binding,runId:request.runId,invocation:request.invocation,library:runtime.library,profile:{id:profile.id,browser_product:profile.browser_product,recordHash},sourcePins:Object.fromEntries(members)});
   for(const [path,digest] of members)if(Object.hasOwn(observation.source_before,path))need(observation.source_before[path]===digest,'table producer source mismatch '+path);
   profile.check();const output=`table-live-${nonce}.json`,bytes=Buffer.from(JSON.stringify(body)+'\n');writeFileSync(join(request.outputDir,output),bytes,{flag:'wx'});live={output,sha256:hash(bytes),bytes:bytes.length,nonce,run_id:request.runId,invocation_id:request.invocation,library:runtime.library,modes:combined};cache.set(key,live);
  }
  const raw=readEvidenceMember(request.runDir,`evidence/upstream-audit-disposition/${request.invocation}/${live.output}`);need(raw.length===live.bytes&&hash(raw)===live.sha256,'table live evidence changed');const recordHash=members.get(profile.arch==='arm64'?'compatibility/rc/overlay-inherited-toolchain-main.json':'compatibility/rc/overlay-inherited-toolchain-main-x64-provisional.json');const replay=verifyTableLiveBody(JSON.parse(raw),{binding:request.binding,runId:request.runId,invocation:request.invocation,library:runtime.library,profile:{id:profile.id,browser_product:profile.browser_product,recordHash},sourcePins:Object.fromEntries(members)});need(eq(replay,live.modes),'table cached observations changed');
  need(['zoneless','zoneful'].every(mode=>live.modes[mode].cases[entry.sha]===true),'table case failed');return{ok:true,detail:'Fixed producer ran the same packed artifact with the minimum peer and native browser; observation mutation controls are not upstream implementation mutants. Full audit remains separate.',execution:'live-packed-native-table',...live};
 }catch(error){return{ok:false,detail:error.message}}
}
