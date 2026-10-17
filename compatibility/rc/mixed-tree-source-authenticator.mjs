/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Authenticate one of the explicitly enumerated mixed tree files and all hunks; no applicability verdict. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitHash=(kind,bytes)=>createHash('sha1').update(kind+' '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
const EXACT_PATHS = {"43b8dcbb1f17a9d5fcedc88e996c241ab9e28dd8": ["src/cdk/tree/tree.spec.ts", "src/cdk/tree/tree.ts", "src/material/tree/tree.spec.ts", "tools/public_api_guard/cdk/tree.md"], "004a9436d325dc87bde2a4bd37d821dfc6375745": ["src/cdk/tree/tree.spec.ts", "src/cdk/tree/tree.ts", "src/material/tree/tree.spec.ts", "tools/public_api_guard/cdk/tree.md"], "1f992d06c693a6e09332ac83d837c9ff8e1fdf7b": ["src/cdk/tree/tree.spec.ts", "src/cdk/tree/tree.ts", "src/material/tree/tree.spec.ts", "tools/public_api_guard/cdk/tree.md"], "cc5332259611bd59dcca3bebf4b99f8052c9c36a": ["src/cdk/tree/nested-node.ts", "src/cdk/tree/tree.ts", "src/material/tree/testing/tree-harness.spec.ts", "tools/public_api_guard/cdk/tree.md"]};
export function reviewCompleteMixedTreeFile(subject,registeredShas){
 assert.ok(Array.isArray(registeredShas)&&registeredShas.length>0&&registeredShas.every(value=>/^[0-9a-f]{40}$/.test(value))&&registeredShas.includes(subject.sha),'unregistered original subject');assert.equal(gitHash('commit',subject.raw_commit),subject.sha);assert.equal(hash(subject.raw_commit),subject.raw_commit_sha256);
 const metadata=subject.raw_commit.split('\n\n')[0].split('\n');assert.deepEqual(metadata.filter(row=>row.startsWith('parent ')).map(row=>row.slice(7)),subject.parents);assert.ok(metadata.includes('tree '+subject.tree));
 assert.equal(subject.members.length,1);assert.equal(subject.complete_changed_files.length,1);const member=subject.members[0],identity=subject.complete_changed_files[0];assert.equal(member.path,identity.path);assert.ok(EXACT_PATHS[subject.sha]?.includes(member.path), 'unregistered mixed source path');
 for(const side of ['before','after']){const raw=member[side];assert.equal(hash(raw.text),raw.sha256);assert.equal(Buffer.byteLength(raw.text),raw.bytes);assert.equal(gitHash('blob',raw.text),raw.git_blob);assert.equal(raw.git_blob,identity[side+'_blob']);}
 assert.equal(hash(subject.diff),subject.diff_sha256);assert.equal(Buffer.byteLength(subject.diff),subject.diff_bytes);
 const lines=subject.diff.split('\n');assert.equal(lines[0],`diff --git a/${member.path} b/${member.path}`);assert.equal(lines[1],`index ${member.before.git_blob}..${member.after.git_blob} 100644`);assert.equal(lines[2],'--- a/'+member.path);assert.equal(lines[3],'+++ b/'+member.path);
 const before=member.before.text.split('\n'),result=[],hunks=[];let at=4,cursor=0;
 while(at<lines.length-1){const start=at,header=lines[at++].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);assert.ok(header);
  const offset=Number(header[1])-1;assert.ok(offset>=cursor);result.push(...before.slice(cursor,offset));cursor=offset;assert.equal(result.length,Number(header[3])-1);let removed=0,added=0;
  while(at<lines.length-1&&!lines[at].startsWith('@@ ')){const prefix=lines[at][0],text=lines[at].slice(1);assert.ok([' ','-','+'].includes(prefix));if(prefix!=='+'){assert.equal(before[cursor++],text);removed++;}if(prefix!=='-'){result.push(text);added++;}at++;}
  assert.equal(removed,header[2]===undefined?1:Number(header[2]));assert.equal(added,header[4]===undefined?1:Number(header[4]));hunks.push({path:member.path,header:lines[start],sha256:hash(lines.slice(start,at).join('\n')+'\n')});
 }result.push(...before.slice(cursor));assert.equal(result.join('\n'),member.after.text);assert.equal(hunks.length,subject.original_hunks);return hunks;
}
