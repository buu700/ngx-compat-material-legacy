/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fixed expected-only operation; candidate CSS never enters this process. */
import {createPrivateCardContext,privateCardExpectedCss} from './private-card-composition.mjs';
import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {dirname} from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex'),request=JSON.parse(readFileSync(0,'utf8'));
if(Object.keys(request).sort().join('|')!=='closure_sha256|line|operation|payload|request_sha256'||!['21.x','main'].includes(request.line)||request.operation!=='private-card'||Object.keys(request.payload).join('|')!=='originalCss'||sha(JSON.stringify(request.payload))!==request.request_sha256)throw Error('invalid expected request');
const root=dirname(dirname(fileURLToPath(import.meta.url))),css=privateCardExpectedCss(createPrivateCardContext({root,line:request.line}),request.payload.originalCss);
if(typeof css!=='string'||!css)throw Error('expected computation failed');
process.stdout.write(JSON.stringify({schema_version:1,operation:request.operation,line:request.line,request_sha256:request.request_sha256,closure_sha256:request.closure_sha256,css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)}));
