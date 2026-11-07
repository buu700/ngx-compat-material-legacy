/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
const PREFIX='compatibility/rc/c04-first-individual';
const MANIFEST_SHA='812fa3863ab090ba9ad38f2f08b65571abd4707078f76a54983bbcd9dcc354d9';
export const C04_FIRST_SHAS=Object.freeze(['1dcc195853a74d1e0b724b742673eb5fd744cb67','1de6a3aa37118e4153fb995a8c8f4daecdf6d0b5','4d0a3eff7c5d5186516fe5c8f1af8c003d02882d','6962c858378b52e0a90f7e2cada0f71c297840ed','ef14c286986f9451addeada26ab7b51402aa143f']);
const hash=b=>createHash('sha256').update(b).digest('hex');
const objectHash=(type,b)=>createHash('sha1').update(`${type} ${b.length}\0`).update(b).digest('hex');
const requireValue=(b,msg)=>{if(!b)throw Error(msg);return b;};
function treeEntry(bytes,name){
 let offset=0, found=[];
 while(offset<bytes.length){
  const space=bytes.indexOf(32,offset), nul=bytes.indexOf(0,space+1);
  if(space<0||nul<0||nul+21>bytes.length)throw Error('invalid tree');
  const mode=bytes.subarray(offset,space).toString(), key=bytes.subarray(space+1,nul).toString(), oid=bytes.subarray(nul+1,nul+21).toString('hex');
  if(key===name)found.push({mode,oid});offset=nul+21;
 }
 if(found.length!==1)throw Error('missing or duplicate tree member');return found[0];
}
/** Read-only finite source evidence; says nothing about native rendering or G11. */
export function c04FirstIndividualEvidenceOk({entry,body,line,read}){
 try {
  if(!C04_FIRST_SHAS.includes(entry?.sha)||line!=='main')return false;
  const manifestRaw=requireValue(read(`${PREFIX}/manifest.json`),'manifest');if(hash(manifestRaw)!==MANIFEST_SHA)return false;
  const manifest=JSON.parse(manifestRaw), rows=manifest.subjects;
  if(!isDeepStrictEqual(rows.map(x=>x.sha),C04_FIRST_SHAS)||manifest.line!=='main'||manifest.original16_commit!=='df60e733c60e572ba538f6ad0ceff3e63e527b53')return false;
  const matches=rows.filter(x=>x.sha===entry.sha);if(matches.length!==1)return false;const row=matches[0];
  if(entry.final_disposition!==row.proposed_disposition||entry.evidence_report!==row.evidence_report||!isDeepStrictEqual(entry.individual_proof,row.individual_proof))return false;
  if(entry.reason!==row.review.decision||entry.product_adaptation===true)return false;
  const reportRaw=requireValue(read(entry.evidence_report),'report');if(hash(reportRaw)!==row.report_sha256||!isDeepStrictEqual(JSON.parse(reportRaw),row.review)||!isDeepStrictEqual(body,row.review))return false;
  const patch=requireValue(read(row.review.patch_file),'patch');if(hash(patch)!==row.individual_proof.diff_sha256)return false;
  const censusRaw=requireValue(read('compatibility/rc/upstream-complete-patch-census.json.gz'),'census');if(hash(censusRaw)!==manifest.census_sha256)return false;
  const census=JSON.parse(gunzipSync(censusRaw)), originals=census.commits.filter(x=>x.sha===entry.sha);if(census.commits.length!==1697||originals.length!==1)return false;
  const original=originals[0], commit=Buffer.from(original.raw_commit);if(objectHash('commit',commit)!==entry.sha||hash(commit)!==row.original.raw_commit_sha256||original.tree!==row.original.tree||!isDeepStrictEqual(original.parents,row.original.parents)||!isDeepStrictEqual(original.complete_changed_files,row.original.complete_changed_files))return false;
  const lines=original.raw_commit.split('\n');if(lines[0]!==`tree ${row.original.tree}`||!isDeepStrictEqual(lines.filter(x=>x.startsWith('parent ')),row.original.parents.map(x=>`parent ${x}`)))return false;
  const changed=original.complete_changed_files.map(x=>x.path).sort();if(!isDeepStrictEqual(changed,row.review.upstream_changed_paths.slice().sort()))return false;
  const tagCommit=requireValue(read(`${PREFIX}/objects/${manifest.original16_commit}`),'tag commit');if(objectHash('commit',tagCommit)!==manifest.original16_commit)return false;
  const tagTree=/^tree ([0-9a-f]{40})\n/.exec(tagCommit.toString());if(!tagTree)return false;
  for(const member of row.review.current_members){
   const current=requireValue(read(member.path),'current');if(hash(current)!==member.sha256)return false;
   const names=member.tagged_path.split('/');if(names.some(x=>!x||x==='.'||x==='..'))return false;let tree=tagTree[1];
   for(let i=0;i<names.length;i++){
    const raw=requireValue(read(`${PREFIX}/objects/${tree}`),'tree');if(objectHash('tree',raw)!==tree)return false;
    const next=treeEntry(raw,names[i]);if(i<names.length-1){if(next.mode!=='40000')return false;tree=next.oid;}
    else {if(next.mode!=='100644'||next.oid!==member.tagged_blob)return false;const blob=requireValue(read(`${PREFIX}/${member.tagged_snapshot}`),'tagged');if(objectHash('blob',blob)!==next.oid||hash(blob)!==member.tagged_sha256)return false;}
   }
  }
  return true;
 }catch{return false;}
}

/** The checker's unconditional route for the finite C04 subjects. */
export function c04FirstIndividualEvidenceClass(entry, line, read) {
 if (!C04_FIRST_SHAS.includes(entry?.sha)) return null;
 try {
  const raw = typeof entry.evidence_report === 'string' && entry.evidence_report.endsWith('.json')
   ? read(entry.evidence_report) : null;
  const body = raw ? JSON.parse(raw) : null;
  return c04FirstIndividualEvidenceOk({entry, body, line, read}) ? null : 'invalid-c04-first-individual';
 } catch { return 'invalid-c04-first-individual'; }
}
