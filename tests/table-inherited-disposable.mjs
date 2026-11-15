/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// The supplied source is read only. All fault writes target a new 0700 copy.
import {constants,chmodSync,closeSync,fstatSync,ftruncateSync,lstatSync,mkdirSync,mkdtempSync,openSync,readFileSync,realpathSync,writeFileSync,writeSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {extractPackageArchive} from '../scripts/safe-package-extract.mjs';
import {selectInheritedNativeProfile} from '../scripts/inherited-native-profiles.mjs';
const need=(v,m)=>{if(!v)throw Error(m)},hash=b=>createHash('sha256').update(b).digest('hex');
function physicalDir(path){need(isAbsolute(path)&&resolve(path)===path&&realpathSync(path)===path,'linked or nonphysical directory');const st=lstatSync(path);need(st.isDirectory()&&!st.isSymbolicLink()&&st.uid===process.getuid(),'unowned directory');return st;}
function inside(root,path){return path.startsWith(root+sep)}
function outsideGitTree(path){let at=path;while(true){try{lstatSync(join(at,'.git'));throw Error('repository directories cannot be disposable sources')}catch(e){if(e.code!=='ENOENT')throw e}const parent=dirname(at);if(parent===at)return;at=parent;}}
function sourceFile(root,path){need(isAbsolute(path)&&resolve(path)===path&&inside(root,path),'source escapes fixture');const rel=relative(root,path),parts=rel.split(sep);let at=root;for(const part of parts){need(part&&part!=='.'&&part!=='..','invalid path');at=join(at,part);const st=lstatSync(at);need(!st.isSymbolicLink(),'linked source path');}const st=lstatSync(path);need(st.isFile()&&st.nlink===1&&st.uid===process.getuid()&&realpathSync(path)===path,'source is not an owned single-link file');return readFileSync(path);}
/** Reject untrusted output names before any fixture is created or written. */
export function validateSyntheticPaths(input,manifest){
 need(input?.runId==='synthetic-d70'&&input.invocation==='probe'&&input.binding?.source_commit==='a'.repeat(40)&&input.binding?.source_tree==='b'.repeat(40),'only synthetic diagnostic binding is accepted');
 need(typeof input.record?.path==='string'&&/^evidence\/upstream-audit-disposition\/probe\/table-live-[a-f0-9]{32}\.json$/.test(input.record.path),'invalid source report path');
 need(manifest?.stage==='draft'&&manifest.purpose==='post-fix-source-built-iteration-not-final-qualification'&&manifest.source?.dirty===true,'real run is not disposable');
 const libs=manifest.artifacts?.filter(x=>x.id==='library');need(libs?.length===1&&libs[0].path==='ngx-compat-material-legacy-22.0.0-rc.0.tgz','invalid synthetic archive');
 return libs[0];
}
/** Copy a narrowly identified synthetic d70 probe to a newly created private directory. */
export function prepareDisposableTableProbe(sourceDir){
 physicalDir(sourceDir);outsideGitTree(sourceDir);const marker=join(sourceDir,'.table-revalidator-disposable');sourceFile(sourceDir,marker);
 const input=JSON.parse(sourceFile(sourceDir,join(sourceDir,'revalidate-input.json')));const sourceRun=resolve(input.runDir||'');need(sourceRun===join(sourceDir,'run')&&realpathSync(sourceRun)===sourceRun,'run directory outside disposable source');physicalDir(sourceRun);
 const sourceRoot=resolve(input.root||'');physicalDir(sourceRoot);need(!inside(sourceRoot,sourceDir)&&sourceDir!==sourceRoot&&!inside(sourceRoot,sourceRun),'repository run is not disposable');
 const manifestBytes=sourceFile(sourceRun,join(sourceRun,'run.json')),manifest=JSON.parse(manifestBytes),lib=validateSyntheticPaths(input,manifest);const recordPath=input.record.path;const sourceRaw=join(sourceRun,recordPath),rawBytes=sourceFile(sourceRun,sourceRaw);need(rawBytes.length===input.record.bytes&&hash(rawBytes)===input.record.sha256,'source report changed');const raw=JSON.parse(rawBytes);
 const entries=raw.mode_bundle_inputs?.zoneful?.filter(p=>typeof p==='string'&&p.endsWith('/out/zoneful.js'))||[];need(entries.length===1,'missing source stage');const sourceStage=dirname(dirname(entries[0]));const sourceOut=join(sourceRun,'evidence/upstream-audit-disposition/probe');need(inside(sourceOut,sourceStage)&&/^table-live-[A-Za-z0-9]+$/.test(relative(sourceOut,sourceStage)),'stage outside disposable source');physicalDir(sourceStage);
 const archiveBytes=sourceFile(sourceRun,join(sourceRun,lib.path));need(hash(archiveBytes)===input.library.sha256&&archiveBytes.length===input.library.bytes,'source archive changed');
 const sourceStageFiles=['out/main.js','out/supplemental.js','out/zoneful.js','dist/zoneless.js','dist/zoneful.js'];const originals=new Map();for(const p of sourceStageFiles)originals.set(p,sourceFile(sourceStage,join(sourceStage,p)));
 const graph=new Map((raw.bundle_inputs||[]).map(x=>[x.path,x.sha256]));for(const p of sourceStageFiles.filter(x=>x.startsWith('out/')))need(hash(originals.get(p))===graph.get(join(sourceStage,p)),'source stage input changed');for(const mode of ['zoneless','zoneful'])need(hash(originals.get('dist/'+mode+'.js'))===raw.modes?.[mode]?.bundle_sha256,'source bundle changed');
 const tempRoot=realpathSync(tmpdir()),owned=mkdtempSync(join(tempRoot,'table-revalidator-owned-'));chmodSync(owned,0o700);const stat=physicalDir(owned),nonce=randomBytes(32).toString('hex'),ownership={kind:'owned-table-diagnostic-v1',nonce,dev:stat.dev,ino:stat.ino,uid:stat.uid};const ownMarker=join(owned,'.owned-table-diagnostic.json');writeFileSync(ownMarker,JSON.stringify(ownership),{flag:'wx',mode:0o600});
 const runDir=join(owned,'run'),out=join(runDir,'evidence/upstream-audit-disposition/probe'),stage=join(out,'table-live-owned'+nonce.slice(0,12));mkdirSync(out,{recursive:true,mode:0o700});mkdirSync(stage,{mode:0o700});writeFileSync(join(runDir,'run.json'),manifestBytes,{flag:'wx',mode:0o600});const archive=join(runDir,lib.path);writeFileSync(archive,archiveBytes,{flag:'wx',mode:0o600});const profile=selectInheritedNativeProfile(sourceRoot);extractPackageArchive(archive,stage,{pythonExecutable:profile.python,pythonIsolated:true});
 for(const [p,bytes] of originals){const path=join(stage,p);mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,bytes,{flag:'wx',mode:0o600});}
 const translate=p=>{if(inside(sourceStage,p))return stage+p.slice(sourceStage.length);const modules=realpathSync(join(sourceRoot,'node_modules'));need(inside(modules,p)&&realpathSync(p)===p,'foreign bundle input');return p};
 raw.bundle_inputs=raw.bundle_inputs.map(x=>({...x,path:translate(x.path)}));for(const mode of ['zoneless','zoneful'])raw.mode_bundle_inputs[mode]=raw.mode_bundle_inputs[mode].map(translate);
 const file=join(runDir,recordPath),bytes=Buffer.from(JSON.stringify(raw)+'\n');writeFileSync(file,bytes,{flag:'wx',mode:0o600});const args={...input,runDir,record:{...input.record,sha256:hash(bytes),bytes:bytes.length}};const bundle=join(stage,'dist/zoneful.js');
 const allowed=new Map([file,bundle].map(path=>{const st=lstatSync(path);return[path,{dev:st.dev,ino:st.ino}]}));
 function check(){const now=physicalDir(owned),mark=JSON.parse(sourceFile(owned,ownMarker));need(now.dev===ownership.dev&&now.ino===ownership.ino&&(now.mode&0o777)===0o700&&JSON.stringify(mark)===JSON.stringify(ownership),'disposable ownership changed');}
 function writeOwned(path,data){check();need(allowed.has(path)&&inside(owned,path),'unowned mutation target');const expected=allowed.get(path);sourceFile(owned,path);const fd=openSync(path,constants.O_WRONLY|constants.O_NOFOLLOW);try{const st=fstatSync(fd);need(st.isFile()&&st.nlink===1&&st.uid===process.getuid()&&st.dev===expected.dev&&st.ino===expected.ino,'mutation target identity changed');ftruncateSync(fd,0);let offset=0;while(offset<data.length)offset+=writeSync(fd,data,offset,data.length-offset);}finally{closeSync(fd)}}
 check();return{owned,args,file,bundle,writeOwned};
}
