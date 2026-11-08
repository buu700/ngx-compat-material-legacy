/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Exact v8 image qualification; earlier API profiles remain unchanged. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..'),sha=raw=>createHash('sha256').update(raw).digest('hex');
export const API_V8_ARTIFACT_SHA='fd5b57f85aaa7b61f82f15a0dfb9ef12e65e6c80bdc47984d6917f0a517c3ce5';
export const API_V7_ARTIFACT_SHA='66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca';
const manifest='compatibility/rc/api-v8-exact-artifact-successor-v1.json',manifestSha='9927d0c90e375cb10d3b7e82b84620547d8394a4dbbd5908dfd3ff4f4ed045b2';
function members(archive){
 const raw=gunzipSync(archive,{maxOutputLength:100*1024*1024}),result=new Map();let offset=0;
 const field=(header,start,end)=>header.subarray(start,end).toString('utf8').replace(/\0.*$/s,'');
 while(offset+512<=raw.length){const header=raw.subarray(offset,offset+512);offset+=512;if(header.every(value=>value===0))break;
  const name=field(header,0,100),prefix=field(header,345,500),full=prefix?prefix+'/'+name:name,sizeText=field(header,124,136).trim();assert.match(full,/^package\/[a-zA-Z0-9_@.\/-]+$/);assert.ok(full.split('/').every(part=>part&&part!=='.'&&part!=='..'));assert.equal(header[156],48);assert.match(sizeText,/^[0-7]+$/);assert.ok(!result.has(full.slice(8)));
  const size=parseInt(sizeText,8);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<=raw.length);result.set(full.slice(8),Buffer.from(raw.subarray(offset,offset+size)));offset+=Math.ceil(size/512)*512;
 }assert.equal(result.size,512);return result;
}
export function qualifyApiV8Archive(archive){try{
 if(!Buffer.isBuffer(archive)||sha(archive)!==API_V8_ARTIFACT_SHA)return false;
 const path=join(ROOT,manifest);assert.ok(lstatSync(path).isFile()&&!lstatSync(path).isSymbolicLink());const manifestBytes=readFileSync(path);assert.equal(sha(manifestBytes),manifestSha);const packet=JSON.parse(manifestBytes);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-api-v8-artifact-successor');assert.equal(packet.before_archive.sha256,API_V7_ARTIFACT_SHA);assert.equal(packet.after_archive.sha256,API_V8_ARTIFACT_SHA);assert.equal(packet.after_archive.bytes,archive.length);assert.equal(packet.member_count,512);assert.equal(packet.identical_members,511);assert.equal(packet.all_executable_JS_DTS_CSS_Sass_assets_and_package_metadata_unchanged,true);assert.equal(packet.original_profiles_rewritten,false);assert.equal(packet.artifact_behavior_or_DI_requalified,false);assert.equal(packet.g02_claim,'not-passed');assert.equal(packet.g11_claim,'not-passed');
 const files=members(archive);assert.deepEqual([...files.keys()].sort(),Object.keys(packet.members).sort());for(const [name,raw]of files){assert.equal(raw.length,packet.members[name].bytes);assert.equal(sha(raw),packet.members[name].sha256);}
 assert.equal(packet.changed_member.path,'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs.map');const mapRaw=files.get(packet.changed_member.path);assert.equal(sha(mapRaw),packet.changed_member.after.sha256);assert.equal(mapRaw.length,packet.changed_member.after.bytes);
 const {sourcesContent,mappings,...common}=JSON.parse(mapRaw);assert.deepEqual(common,packet.source_map_common_fields);assert.equal(sourcesContent.length,37);assert.equal(sha(mappings),packet.mappings.after_sha256);assert.deepEqual(common.sources,packet.source_map_content_hashes.map(row=>row.source));sourcesContent.forEach((text,index)=>assert.equal(sha(text),packet.source_map_content_hashes[index].sha256));
 assert.equal(packet.source_commit,'f569667b366b23b36280c5c2a10e9f87351472bd');assert.equal(packet.source_parent,'d809eb8ab440a0fc0a7b8fe65423016255cbed0e');assert.deepEqual(packet.source_changes.map(row=>row.path),['projects/ngx-material-legacy/legacy-tabs/internal/tab-base.ts','projects/ngx-material-legacy/legacy-tabs/tab-label.ts']);
 const env={PATH:process.env.PATH,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'},git=args=>execFileSync('git',['--no-replace-objects',...args],{cwd:ROOT,env,maxBuffer:1024*1024});assert.equal(git(['rev-list','--parents','-n','1',packet.source_commit]).toString().trim(),packet.source_commit+' '+packet.source_parent);
 for(const row of packet.source_changes){const before=git(['show',packet.source_parent+':'+row.path]),after=git(['show',packet.source_commit+':'+row.path]);assert.equal(sha(before),row.before_sha256);assert.equal(sha(after),row.after_sha256);const text=before.toString();assert.equal(text.split(row.literal_before).length,2);assert.equal(text.replace(row.literal_before,row.literal_after),after.toString());assert.ok(after.equals(readFileSync(join(ROOT,row.path))));const index=common.sources.indexOf('../../../'+row.path);assert.ok(index>=0);assert.equal(sourcesContent[index],after.toString());}
 assert.equal(sha(readFileSync(path)),manifestSha);return true;
}catch{return false;}}
