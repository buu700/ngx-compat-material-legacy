/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Source identity for the explicit main roster epoch; no native/audit credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/selection-native-registry-source-successor.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const path='scripts/upstream-historical-behavior-evidence.mjs';
const before={path,sha256:'2e3d0d372775457655239efabd3769ca3b8bd1e0de42333bd48f9926bf1c3044',bytes:20121};
const after={path,sha256:'b4267df0a78789777bcea4943f6d1371239e94c51d32055ecdcfe818e4743eaa',bytes:23393};
const review={path:'compatibility/rc/parent-main-historical-pointer-epoch-review-v1.json',sha256:'dac9b4aa338be698a2faf555a9aff8c33c9c2c0e102248134839b1126032c222',bytes:38008};
const product='projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts';
const productImages=[
 {path:product,sha256:'8c69aa2791f76d8298845d0fb99a0b979df559256bc9023ae02342188a75edd1',bytes:40967},
 {path:product,sha256:'19f6b4cbd1710ee1a33f3d4d7a68e790f484acde462373e7edc2e2538c380b83',bytes:41565},
 {path:product,sha256:'79f14a12676f6835602cf2f66b4650817e15a944ed8555cb3281231abcc8f8f0',bytes:41708},
 {path:product,sha256:'058cfeaafc5f02799bbab843de7529f7e50eea6bd7fdd00cfb3692e2cea71798',bytes:43007},
 {path:product,sha256:'803e95c96c22e5a6863a5f353f0485ec5a0431d04c9fe0b987031083ed7afaa9',bytes:43131},
];
const productSteps=[
 ['fdb32c2dd48e489c1cfeec297cb791a87169069a','a712a8abc59fce79f5fc935fff98bf0b04d0cbfc'],
 ['0a0ced0d07f06b561a8970cc7db80ed3a389f9e9','b6ef5d7d94a7a7a2b3d65beb8115ffd2e1223e5c'],
 ['d648f9de6d325aab1f858130d0cb8d93e5e5adaa','45bbb3016f631296c08cf0eaa5f54a0e61455cf1'],
 ['04daa4f8c0617be2ea1a93cbfca06cedf30da3ab','c051c2d66d97969d9ecd31e01c4103a10e1f4bb3'],
];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function selectionNativeRegistrySourceSuccessor({root,read=p=>readEvidenceMember(root,p)}){
 const physical=p=>readEvidenceMember(root,p),exact=(raw,ref)=>{assert.equal(hash(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);};
 assert.ok(physical(SELF).equals(image));
 const packagePath='projects/ngx-material-legacy/package.json',packageBytes=physical(packagePath);assert.match(JSON.parse(packageBytes).version,/^22\./);
 const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=args=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:1024*1024});
 const parent='aec05d8f6baf3dfdd92581504291309992abcb89',commit='1e26eefba6fa380b520ae05cb6f9ff3ea734545a';
 assert.equal(git(['rev-list','--parents','-n','1',commit]).toString().trim(),commit+' '+parent);git(['merge-base','--is-ancestor',commit,'HEAD']);
 exact(git(['show',parent+':'+path]),before);const current=git(['show',commit+':'+path]);exact(current,after);assert.ok(current.equals(physical(path)));
 const reviewBytes=physical(review.path);exact(reviewBytes,review);assert.ok(git(['show',commit+':'+review.path]).equals(reviewBytes));
 const record=JSON.parse(reviewBytes);assert.equal(record.current_files[path],after.sha256);assert.equal(record.root_controls.old_default_and_21_requirements_preserved,15);assert.equal(record.root_controls.cross_line_and_unknown_epoch_rejected,true);assert.equal(record.root_controls.all_57_golden_hashes_unchanged,true);
 const base='8b2a12324f3fbfd02d970654b98fe9e7f86469c9';git(['merge-base','--is-ancestor',base,'HEAD']);exact(git(['show',base+':'+product]),productImages[0]);
 assert.deepEqual(git(['log','--format=%H',base+'..HEAD','--',product]).toString().trim().split('\n'),productSteps.map(row=>row[1]).reverse());
 for(const [index,[parent,commit]]of productSteps.entries()){
  assert.equal(git(['rev-list','--parents','-n','1',commit]).toString().trim(),commit+' '+parent);
  exact(git(['show',parent+':'+product]),productImages[index]);exact(git(['show',commit+':'+product]),productImages[index+1]);
 }
 assert.ok(git(['show',productSteps.at(-1)[1]+':'+product]).equals(physical(product)));
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{...after},{...review},{path:packagePath,sha256:hash(packageBytes),bytes:packageBytes.length},{...productImages.at(-1)}];
 const assertCurrent=()=>{assert.ok(physical(SELF).equals(image));for(const ref of bound){const actual=physical(ref.path);exact(actual,ref);const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied)&&supplied.equals(actual),'nonphysical native registry successor '+ref.path);assert.ok(actual.equals(physical(ref.path)));}};
 const qualify=ref=>{
  assert.ok(ref&&typeof ref==='object'&&!types.isProxy(ref)&&Object.getPrototypeOf(ref)===Object.prototype);const fields=Object.getOwnPropertyDescriptors(ref),keys=Reflect.ownKeys(fields);assert.ok(keys.every(key=>typeof key==='string'));assert.deepEqual(keys.sort(),Object.hasOwn(fields,'bytes')?['bytes','path','sha256']:['path','sha256']);for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
  const images=fields.path.value===path?[before,after]:fields.path.value===product?productImages:null;if(!images)return null;const selected=images.find(value=>value.sha256===fields.sha256.value);assert.ok(selected,'unknown native registry/product predecessor');if(fields.bytes)assert.equal(fields.bytes.value,selected.bytes);assertCurrent();return {...images.at(-1)};
 };
 assertCurrent();return {before:{...before},after:{...after},bound:structuredClone(bound),qualify,assertCurrent,native_artifact_or_audit_admission_granted:false};
}
