/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Called only by the finite validator, never with a proof-selected command.
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,realpathSync} from 'node:fs';
import {dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as eq} from 'node:util';
import {extractArchive,verifyArchive} from './overlay-inherited-archive.mjs';
import {selectInheritedNativeProfile} from './inherited-native-profiles.mjs';
import {captureToolchain} from './overlay-inherited-toolchain.mjs';
import {captureSass} from './datepicker-inherited-sass-toolchain.mjs';
import {verifyDatepickerPeers} from './datepicker-inherited-peers.mjs';
import {fixturePins} from './datepicker-inherited-fixture-pins.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=x=>createHash('sha256').update(x).digest('hex');
const need=(v,m)=>{if(!v)throw Error(m)};
const [archive,expected,outParent,nonce,...extra]=process.argv.slice(2);need(!extra.length&&/^[a-f0-9]{64}$/.test(expected)&&/^[a-f0-9]{64}$/.test(nonce),'bad producer args');
const sourcePaths=['scripts/datepicker-inherited-native-run.mjs','scripts/datepicker-inherited-identities.mjs','scripts/datepicker-inherited-fixture-pins.mjs','scripts/datepicker-inherited-live-evidence.mjs','scripts/datepicker-inherited-peers.mjs','scripts/datepicker-inherited-sass-toolchain.mjs','scripts/upstream-datepicker-inherited-evidence.mjs','scripts/upstream-packed-run-evidence.mjs','scripts/overlay-inherited-archive.mjs','scripts/overlay-inherited-toolchain.mjs','scripts/inherited-native-profiles.mjs','scripts/check-companion-computed-styles.mjs','tests/browser_reference_owned_process.py','testing/datepicker-inherited/contracts-fixture.mjs','compatibility/rc/inherited-native-profiles.json','compatibility/rc/datepicker-inherited-sass-toolchain-main.json',...['run.mjs','supervised.py','main.ts','index.html','theme.scss','tsconfig.json','typecheck.ts'].map(n=>'tests/datepicker-inherited/'+n)];
const git=args=>execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}).trim();
const head=git(['rev-parse','HEAD']),tree=git(['rev-parse','HEAD^{tree}']);
function checkSource(){need(git(['rev-parse','HEAD'])===head&&git(['rev-parse','HEAD^{tree}'])===tree,'source changed');need(git(['status','--porcelain','--untracked-files=all','--','.',':(exclude)compatibility/rc/reports'])==='','dirty source');for(const path of sourcePaths){const blob=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',`HEAD:${path}`],{cwd:root,maxBuffer:16*1024*1024});need(eq(blob,readFileSync(join(root,path))),'source member changed '+path)}for(const [name,digest] of Object.entries(fixturePins))need(hash(readFileSync(join(root,'tests/datepicker-inherited',name)))===digest,'fixture identity changed '+name)}
const profile=selectInheritedNativeProfile(root),recordPath=profile.arch==='arm64'?'compatibility/rc/overlay-inherited-toolchain-main.json':'compatibility/rc/overlay-inherited-toolchain-main-x64-provisional.json';
const recordHash=profile.arch==='arm64'?'ad74c81bd537a16a7324cd440ad3b36e9788030d21a0ad1bc1ab36772f26e503':'2e7c5d5b11cf001f06dcb8db6714d50e0bef440d63580a8ffa090760461f33f0';
function checkTools(){profile.check();const rec=readFileSync(join(root,recordPath));need(hash(rec)===recordHash&&eq(captureToolchain(root),JSON.parse(rec).identity),'compiler/linker toolchain changed');const sass=readFileSync(join(root,'compatibility/rc/datepicker-inherited-sass-toolchain-main.json'));need(hash(sass)==='2202de22ddf427335e526d2bc17d8f058670f4450faf2b2f565e2160de8750dd'&&eq(captureSass(root),JSON.parse(sass)),'Sass dependency closure changed');}
checkSource();checkTools();const peers=verifyDatepickerPeers(root);need(hash(readFileSync(archive))===expected,'wrong archive');
mkdirSync(outParent,{recursive:true});const stage=mkdtempSync(join(resolve(outParent),'datepicker-native-'));extractArchive(profile.python,archive,stage);verifyArchive(profile.python,archive,stage);
const output=join(stage,'fixture');const child=spawnSync(process.execPath,[join(root,'tests/datepicker-inherited/run.mjs'),join(stage,'package'),root,output,nonce],{cwd:root,env:{PATH:process.env.PATH,HOME:process.env.HOME,CHROME_BIN:profile.browser,NODE_PATH:'',NODE_OPTIONS:'',LANG:'C.UTF-8'},encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024});
need(child.status===0&&!child.signal&&!child.error,'fixture child failed: '+String(child.error?.message||child.stderr||child.status).slice(-1500));
const results={};for(const mode of ['zoneless','zoneful']){
 const dir=join(output,mode),doc=JSON.parse(readFileSync(join(dir,'result.json')));need(doc.mode===mode&&doc.rows?.nonce===nonce&&doc.browser===profile.browser_product,'wrong fixture identity');need(doc.tooling?.ngcStatus===0&&doc.tooling?.ngcSignal===null&&doc.tooling?.linked>0,'missing AOT/linker success');need(Array.isArray(doc.bundleInputs)&&doc.bundleInputs.length>0,'missing bundle graph');
 const inputs=doc.bundleInputs.map(x=>{need(x&&typeof x.realpath==='string'&&/^[a-f0-9]{64}$/.test(x.sha256),'bad bundle input');const p=realpathSync(x.realpath);need(p===x.realpath&&hash(readFileSync(p))===x.sha256,'bundle input changed');const owner=Object.entries(peers).find(([,v])=>p.startsWith(v.path+sep));const own=p.startsWith(join(dir,'package')+sep),generated=p===join(dir,'out/main.js');need(owner||own||generated,'unapproved bundle input');return {path:p,sha256:x.sha256,owner:owner?.[0]||null};});
 need(inputs.some(x=>x.owner==='@angular/material'&&x.path.endsWith('/fesm2022/datepicker.mjs')),'datepicker peer not bundled');for(const n of ['core','form-field','input'])need(inputs.some(x=>x.path===join(dir,`package/fesm2022/ngx-compat-material-legacy-legacy-${n}.mjs`)),'missing packed legacy '+n);
 verifyArchive(profile.python,archive,dir);results[mode]={browser:doc.browser,rows:doc.rows,bundle_inputs:inputs,package_inventory_sha256:doc.package_inventory_sha256,module_sha256:doc.module_sha256,tooling:doc.tooling};
}
need(results.zoneless.package_inventory_sha256===results.zoneful.package_inventory_sha256,'different tested package');verifyArchive(profile.python,archive,stage);need(hash(readFileSync(archive))===expected,'archive changed');need(eq(verifyDatepickerPeers(root),peers),'peer drift');checkTools();checkSource();
console.log(JSON.stringify({kind:'datepicker-inherited-live-native',nonce,artifact_sha256:expected,source_commit:head,source_tree:tree,toolchain_profile:profile.id,toolchain_record_sha256:recordHash,results,fixture_exit_code:child.status,fixture_signal:child.signal}));
