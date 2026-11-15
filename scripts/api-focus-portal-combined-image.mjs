/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Finite packed successor: preserve predecessor observation checks and source closure. */
import {qualifyCombinedArtifactSubject} from './api-combined-d70-image.mjs';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const sha=x=>createHash('sha256').update(x).digest('hex');
const snapshot=join(dirname(fileURLToPath(import.meta.url)),'../compatibility/rc/qualification/api-focus-portal-combined-v1/source-transitions.json.gz');
const bundles={dialog:'02cbd08f4d1e656cbbfb08e80fa6dd9606222ace6e600b0f7b777642f17b03ac',tabs:'d272c01799c1cb542e95f819b90b71fb68e89ee4b713b136c59629e8de8f8ed4'};
export function qualifyFocusPortalCombinedImage(context,family){try{
 const root=context.packageRoot,archive=readFileSync(context.tarball);if(!qualifyCombinedArtifactSubject(archive,root))return false;
 const bytes=readFileSync(snapshot);if(sha(bytes)!=='da5457ef151100cc03f7b383bf32c034f995c07bab72fd667b2ebed5cfd65a57')return false;
 const data=JSON.parse(gunzipSync(bytes))[family],path=join(root,'fesm2022/ngx-compat-material-legacy-legacy-'+family+'.mjs'),bundle=readFileSync(path),mapBytes=readFileSync(path+'.map'),map=JSON.parse(mapBytes);
 if(sha(bundle)!==bundles[family]||sha(bundle)!==data.new_bundle_sha256||sha(mapBytes)!==data.new_map_sha256||!isDeepStrictEqual(map.sources,data.sources)||map.sourcesContent.length!==data.prior.length)return false;
 for(let i=0;i<data.sources.length;i++){
  const prior=data.prior[i],transitions=data.transitions[data.sources[i]]||[];let offset=0,result='';
  for(const [start,end,oldText,newText] of transitions){if(start<offset||prior.slice(start,end)!==oldText)return false;result+=prior.slice(offset,start)+newText;offset=end;}
  result+=prior.slice(offset);if(result!==map.sourcesContent[i])return false;
 }
 return true;
 }catch{return false;}}
