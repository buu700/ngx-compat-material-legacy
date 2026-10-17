/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Authenticate one of the explicitly enumerated mixed theming files and all hunks; no applicability verdict. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitHash=(kind,bytes)=>createHash('sha1').update(kind+' '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
const EXACT_PATHS = {"82844b3d52235f67119eb5f0fe4e5c56474440c3": ["src/material-experimental/column-resize/_column-resize-theme.scss", "src/material-experimental/popover-edit/_popover-edit-theme.scss", "src/material/_index.scss", "src/material/core/theming/tests/theming-inspection-api.spec.ts"], "1735032610eec0cb4d9695b2fd621a71346495c7": ["src/material-experimental/theming/_definition.scss", "src/material-experimental/theming/_m3-palettes.scss", "src/material-experimental/theming/_m3-tokens.scss", "src/material/core/theming/tests/theming-definition-api.spec.ts", "src/material/core/theming/tests/theming-inspection-api.spec.ts"], "0da585f7307ea98b5575d520d3b6da79769827c4": ["src/dev-app/select/select-demo.html", "src/dev-app/select/select-demo.ts", "src/dev-app/theme-m3.scss", "src/material-experimental/_index.scss", "src/material-experimental/theming/_config-validation.scss", "src/material-experimental/theming/_custom-tokens.scss", "src/material-experimental/theming/_definition.scss", "src/material-experimental/theming/_m3-palettes.scss", "src/material-experimental/theming/_m3-tokens.scss", "src/material/core/theming/tests/theming-definition-api.spec.ts"], "a28b5b0ace56e005d6e9100bbd76d87c33d254ac": ["integration/harness-e2e-cli/src/styles.scss", "integration/yarn-pnp-compat/angular.json", "src/e2e-app/BUILD.bazel", "src/e2e-app/index.html", "src/e2e-app/theme.scss", "src/material/sidenav/drawer.spec.ts", "src/universal-app/styles.scss", "test/karma.conf.js", "tools/defaults.bzl"]};
export function reviewCompleteMixedThemingFile(subject,registeredShas){
 assert.ok(Array.isArray(registeredShas)&&registeredShas.length>0&&registeredShas.every(value=>/^[0-9a-f]{40}$/.test(value))&&registeredShas.includes(subject.sha),'unregistered original subject');assert.equal(gitHash('commit',subject.raw_commit),subject.sha);assert.equal(hash(subject.raw_commit),subject.raw_commit_sha256);
 const metadata=subject.raw_commit.split('\n\n')[0].split('\n');assert.deepEqual(metadata.filter(row=>row.startsWith('parent ')).map(row=>row.slice(7)),subject.parents);assert.ok(metadata.includes('tree '+subject.tree));
 assert.equal(subject.members.length,1);assert.equal(subject.complete_changed_files.length,1);const member=subject.members[0],identity=subject.complete_changed_files[0];assert.equal(member.path,identity.path);assert.ok(EXACT_PATHS[subject.sha]?.includes(member.path), 'unregistered mixed source path');
 for(const side of ['before','after']){const raw=member[side];assert.equal(hash(raw.text),raw.sha256);assert.equal(Buffer.byteLength(raw.text),raw.bytes);assert.equal(gitHash('blob',raw.text),raw.git_blob);assert.equal(raw.git_blob,identity[side+'_blob']);}
 assert.equal(hash(subject.diff),subject.diff_sha256);assert.equal(Buffer.byteLength(subject.diff),subject.diff_bytes);
 const lines=subject.diff.split('\n');assert.equal(lines[0],`diff --git a/${member.path} b/${member.path}`);assert.equal(lines[1],`index ${member.before.git_blob}..${member.after.git_blob} 100644`);assert.equal(lines[2],'--- a/'+member.path);assert.equal(lines[3],'+++ b/'+member.path);
 // This finite population has exactly one unterminated original member. Keep
 // line terminators as data; a diff marker is checked, never silently dropped.
 const eofSubject=subject.sha==='a28b5b0ace56e005d6e9100bbd76d87c33d254ac'&&member.path==='integration/harness-e2e-cli/src/styles.scss';
 const marker='\\ No newline at end of file';
 assert.equal(member.before.text.endsWith('\n'),!eofSubject);
 assert.equal(member.after.text.endsWith('\n'),true);
 assert.equal(lines.filter(line=>line===marker).length,eofSubject?1:0);
 const tokenize=text=>{if(!text)return[];const terminated=text.endsWith('\n'),rows=text.split('\n');if(terminated)rows.pop();return rows.map((text,index)=>({text,terminated:terminated||index<rows.length-1}));};
 const before=tokenize(member.before.text),result=[],hunks=[];let at=4,cursor=0;
 while(at<lines.length-1){const start=at,header=lines[at++].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);assert.ok(header);
  const offset=Number(header[1])-1;assert.ok(offset>=cursor);result.push(...before.slice(cursor,offset));cursor=offset;assert.equal(result.length,Number(header[3])-1);let removed=0,added=0;
  while(at<lines.length-1&&!lines[at].startsWith('@@ ')){
   const prefix=lines[at][0],text=lines[at].slice(1),unterminated=lines[at+1]===marker;
   assert.ok([' ','-','+'].includes(prefix));
   if(prefix!=='+'){const original=before[cursor++];assert.ok(original);assert.equal(original.text,text);assert.equal(original.terminated,!unterminated,'original line-terminator marker mismatch');removed++;}
   if(prefix!=='-'){result.push({text,terminated:!unterminated});added++;}
   at+=unterminated?2:1;
  }
  assert.equal(removed,header[2]===undefined?1:Number(header[2]));assert.equal(added,header[4]===undefined?1:Number(header[4]));hunks.push({path:member.path,header:lines[start],sha256:hash(lines.slice(start,at).join('\n')+'\n')});
 }result.push(...before.slice(cursor));assert.ok(result.every((line,index)=>line.terminated||index===result.length-1),'unterminated line before final line');assert.equal(result.map(line=>line.text+(line.terminated?'\n':'')).join(''),member.after.text);assert.equal(hunks.length,subject.original_hunks);return hunks;
}
