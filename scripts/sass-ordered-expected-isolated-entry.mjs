/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fixed 06 expected-only operation. Candidate CSS never enters this process. */
import {orderedAggregateExpectedCss} from './sass-ordered-aggregate-model.mjs';
import {composeOrderedAggregateButton} from './sass-ordered-button-composition.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const request=JSON.parse(readFileSync(0,'utf8'));
if(Object.keys(request).sort().join('|')!=='closure_sha256|line|operation|payload|request_sha256'||!['21.x','main'].includes(request.line)||request.operation!=='ordered-aggregate-06'||Object.keys(request.payload).join('|')!=='peers'||sha(JSON.stringify(request.payload))!==request.request_sha256)throw Error('invalid isolated request');
const base=orderedAggregateExpectedCss(request.payload.peers,request.line);
const css=typeof base==='string'?composeOrderedAggregateButton({caseId:'06-aggregate-and-companions',css:base}):null;
if(typeof css!=='string'||!css)throw Error('expected computation failed');
process.stdout.write(JSON.stringify({schema_version:1,operation:request.operation,line:request.line,request_sha256:request.request_sha256,closure_sha256:request.closure_sha256,css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)}));
