/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Finite packed-image successor for the two owned trailing Injector proofs only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'), dir=join(root,'compatibility/rc/qualification/api-node-combined-v1');
const sha=x=>createHash('sha256').update(x).digest('hex');
export const API_NODE_COMBINED_SHA='04092350fea6096cac866268fc295eb390b2670c67366a3195a75c14b319be88';
export const API_NODE_COMBINED_BUNDLES=Object.freeze({'legacy-form-field':'ee222f0c8709cef79ac3bc149a758f5f8e50b8dc8f512477ada8cdbbec771475','legacy-select':'b9132cbc55d37592a95e8af94a5aa523134bbedc7dcf2fa4183181aa02a44419'});
function members(archive){
 const raw=gunzipSync(archive,{maxOutputLength:100*1024*1024}),files=new Map();let offset=0;
 const field=(h,a,b)=>h.subarray(a,b).toString('utf8').replace(/\0.*$/s,'');
 while(offset+512<=raw.length){const h=raw.subarray(offset,offset+512);offset+=512;if(h.every(v=>v===0))break;const name=field(h,0,100),prefix=field(h,345,500),full=prefix?prefix+'/'+name:name,sizeText=field(h,124,136).trim();assert.match(full,/^package\/[a-zA-Z0-9_@.\/-]+$/);assert.ok(full.split('/').every(x=>x&&x!=='.'&&x!=='..'));assert.equal(h[156],48);assert.match(sizeText,/^[0-7]+$/);assert.ok(!files.has(full.slice(8)));const size=parseInt(sizeText,8);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<=raw.length);files.set(full.slice(8),Buffer.from(raw.subarray(offset,offset+size)));offset+=Math.ceil(size/512)*512;}
 assert.equal(files.size,512);return files;
}
function replaceOnce(s,a,b){assert.equal(s.split(a).length,2);return s.replace(a,b);}
function verifySources(files,census){
 const snapshot=gunzipSync(readFileSync(join(dir,'source-snapshot.patch.gz')));assert.equal(sha(snapshot),'8832414542be2d87c660ffbc32d72c590d13883a099a4eac07db2fbc0fe5e80f');
 for(const family of Object.keys(API_NODE_COMBINED_BUNDLES)){
  const prefix='fesm2022/ngx-compat-material-legacy-'+family+'.mjs', info=census.family_maps[family],map=JSON.parse(files.get(prefix+'.map'));
  assert.equal(sha(files.get(prefix)),API_NODE_COMBINED_BUNDLES[family]);assert.equal(sha(files.get(prefix+'.map')),info.map_sha256);assert.equal(map.sources.length,map.sourcesContent.length);assert.equal(map.sources.length,info.sources.length);
  map.sources.forEach((name,i)=>{assert.equal(name.replace(/^\.\.\/\.\.\/\.\.\//,''),info.sources[i].path);assert.equal(sha(map.sourcesContent[i]),info.sources[i].sha256);});
  const leaf=family==='legacy-form-field'?'form-field.ts':'internal/select-base.ts',name='../../../projects/ngx-material-legacy/'+family+'/'+leaf,idx=map.sources.indexOf(name);assert.ok(idx>=0&&idx===map.sources.lastIndexOf(name));
  const priorGz=readFileSync(join(dir,family+'-prior-source.gz'));assert.equal(sha(priorGz),family==='legacy-form-field'?'4fa0a512977059e1b7de29ef27bec339acd59d5d8d2c6ffafd50004275f9f361':'c7fce7cfbff6648cbfc510cbba0abb7b76ad24f368ce809e3073b06e74537e9d');let prior=gunzipSync(priorGz).toString();
  if(family==='legacy-form-field'){
   prior=replaceOnce(prior," */\n\nimport {Directionality}"," */\n\nimport {LEGACY_ANIMATION_MODE} from '@ngx-compat/material-legacy/legacy-core';\n\nimport {Directionality}");
   prior=replaceOnce(prior,"import {ANIMATION_MODULE_TYPE} from '@angular/core';",'');prior=replaceOnce(prior,'@Inject(ANIMATION_MODULE_TYPE) _animationMode','@Inject(LEGACY_ANIMATION_MODE) _animationMode');
  }else{
   prior=replaceOnce(prior,'  ENTER,\n','  ENTER,\n  ESCAPE,\n');prior=replaceOnce(prior,'import {\n  AfterContentInit,\n','import {\n  AfterContentInit,\n  AfterViewInit,\n');prior=replaceOnce(prior,'    AfterContentInit,\n','    AfterContentInit,\n    AfterViewInit,\n');prior=replaceOnce(prior,'  protected _overlayDir: CdkConnectedOverlay;\n','  protected _overlayDir: CdkConnectedOverlay;\n  private _overlayKeydownBound = false;\n');
   prior=replaceOnce(prior,'  ngDoCheck() {',`  ngAfterViewInit() {\n    if (this._motionDestroyed || this._overlayKeydownBound || !this._overlayDir) {\n      return;\n    }\n    this._overlayKeydownBound = true;\n    // Let the select own Escape so the CDK does not detach the panel before\n    // the select's exit lifecycle has finished. This also keeps an interrupted\n    // exit attached when the user immediately reopens the panel.\n    this._overlayDir.disableClose = true;\n    this._overlayDir.overlayKeydown.pipe(takeUntil(this._destroy)).subscribe(event => {\n      if (event.keyCode === ESCAPE && !hasModifierKey(event)) {\n        event.preventDefault();\n        this.close();\n      }\n    });\n  }\n\n  ngDoCheck() {`);
  }assert.equal(map.sourcesContent[idx],prior);
 }
}
export function qualifyApiNodeCombinedArchive(archive,packageRoot){try{
 assert.ok(Buffer.isBuffer(archive));assert.equal(sha(archive),API_NODE_COMBINED_SHA);
 const raw=readFileSync(join(dir,'artifact-census.json'));assert.equal(sha(raw),'66a56c14aa784dcf05d3db643d30271892cdcf0cd1e5d6a8212c17b2192458fa');const census=JSON.parse(raw);assert.equal(census.candidate_archive_sha256,API_NODE_COMBINED_SHA);assert.equal(census.member_count,512);const files=members(archive);assert.deepEqual([...files.keys()].sort(),Object.keys(census.members).sort());for(const [name,bytes] of files){assert.equal(bytes.length,census.members[name].bytes);assert.equal(sha(bytes),census.members[name].sha256);}verifySources(files,census);
 if(packageRoot){assert.equal(realpathSync(packageRoot),packageRoot);const found=[];function walk(path,base=''){for(const e of readdirSync(path,{withFileTypes:true})){const rel=base?base+'/'+e.name:e.name,p=join(path,e.name),s=lstatSync(p);assert.ok(!s.isSymbolicLink());if(s.isDirectory())walk(p,rel);else{assert.ok(s.isFile());found.push(rel);assert.ok(files.has(rel));assert.ok(readFileSync(p).equals(files.get(rel)));}}}walk(packageRoot);assert.equal(found.length,512);}
 return true;
 }catch{return false;}}

// Expose the unchanged 040 source proof to exact successor images.
export {verifySources as verifyNodeCombinedSources};
