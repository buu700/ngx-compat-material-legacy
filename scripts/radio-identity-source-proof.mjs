/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {inspectRadioIdentityNamespace,reverseRadioIdentityNamespace,radioIdentityPath} from './radio-identity-namespace.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p));
const git=args=>execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root});
const worksheet=JSON.parse(read('compatibility/rc/radio-identity-namespace-worksheet.json')),source=inspectRadioIdentityNamespace({root});
assert.equal(hash(git(['show',worksheet.source_parent+':'+radioIdentityPath])),source.before_sha256);
const members=git(['ls-tree','-rz',worksheet.source_parent,'--','projects/ngx-material-legacy']).toString().split('\0').filter(Boolean).map(text=>{const [prefix,path]=text.split('\t'),[mode,type,blob]=prefix.split(' ');assert.equal(type,'blob');assert.ok(['100644','100755'].includes(mode));const candidate=read(path),before=path===radioIdentityPath?Buffer.from(reverseRadioIdentityNamespace(candidate.toString())):candidate;assert.equal(createHash('sha1').update('blob '+before.length+'\0').update(before).digest('hex'),blob,'unexpected product change '+path);return {path,sha256:hash(candidate),bytes:candidate.length};});
const tracked=git(['ls-files','projects/ngx-material-legacy']).toString().trim().split('\n');assert.deepEqual(tracked,members.map(m=>m.path));
const cyphRoot='/home/parallels/cyph',cyphFiles=['shared/js/cyph/components/dynamic-form/dynamic-form.component.html','shared/js/cyph/components/dynamic-form/dynamic-form.component.scss','shared/js/cyph/components/dynamic-form/dynamic-form.component.ts'];
const cyph=cyphFiles.map(path=>{const raw=readFileSync(join(cyphRoot,path));return {path,sha256:hash(raw),bytes:raw.length};});
const html=readFileSync(join(cyphRoot,cyphFiles[0]),'utf8'),scss=readFileSync(join(cyphRoot,cyphFiles[1]),'utf8');assert.ok(html.includes('[name]="getName(o)"'));assert.ok(scss.includes('mat-radio-group {')&&scss.includes('mat-radio-button {'));assert.ok(!/mat-radio-(?:group-)?\d/.test(html+scss));
const report={schema_version:1,line:worksheet.line,source_parent:worksheet.source_parent,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),helper_sha256:hash(read('scripts/radio-identity-namespace.mjs')),changed:[{...source,exact_reversal_to_parent:true}],unchanged_product_members:members.filter(m=>m.path!==radioIdentityPath),product_files:members.length,unchanged_styles:members.filter(m=>/\.(?:scss|css)$/.test(m.path)).length,unchanged_templates:members.filter(m=>m.path.endsWith('.html')).length,cyph:{root:cyphRoot,read_only:true,files:cyph,findings:['Explicit getName(o) group names retain the same input setter/selection behavior.','Element-based mat-radio-group/mat-radio-button padding selectors and complete legacy template/style bytes are unchanged.','No generated numeric ID/name selector in the affected consumer source. No Cyph build or rendering was run.']},g11_claim:'not-passed'};
const [out]=process.argv.slice(2);assert.ok(out);assert.equal(existsSync(out),false);writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({line:report.line,product_files:members.length,changed_product_files:1,unchanged_styles:report.unchanged_styles,unchanged_templates:report.unchanged_templates,cyph_files:cyph.length}));
