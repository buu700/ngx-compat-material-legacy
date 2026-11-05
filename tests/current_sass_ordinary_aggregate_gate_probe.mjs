/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three aggregate dimensions through one actual candidate-fixture context. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createSpinnerSnackGateContext,spinnerSnackGateAggregateMatch,spinnerSnackGateDescriptor} from '../scripts/sass-spinner-snack-gate-integration.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));assert.ok(input.candidate_root.includes('ngx-current-sass-source-test-'));
const context=createSpinnerSnackGateContext({root:input.candidate_root}),controls=[];
const hash=css=>createHash('sha256').update(css).digest('hex');
const match=body=>spinnerSnackGateAggregateMatch({context,caseId:body.case_id,original:body.expected??null,
 actual:body.actual??body.actual_measurement,companion:body.current_companion,descriptor:body.current_spinner_snack_bridge});
assert.equal(input.bodies.length,3);assert.equal(context.line,input.line);
for(const body of input.bodies){assert.equal(match(body),true,body.case_id);controls.push('composed aggregate positive '+body.case_id);}
const extra=structuredClone(input.bodies[1]),actual=extra.actual;actual.css+='\n.foreign { color: red; }\n';actual.css_sha256=hash(actual.css);actual.css_bytes=Buffer.byteLength(actual.css);
assert.equal(match(extra),false);controls.push('coherent extra candidate CSS rejects');
const descriptor=structuredClone(input.bodies[0]);descriptor.current_spinner_snack_bridge.source_modules.pop();
assert.equal(match(descriptor),false);controls.push('different current source descriptor rejects');
const peer=structuredClone(input.bodies[1]);peer.current_companion.peer.line=input.line==='main'?'21.x':'main';
assert.equal(match(peer),false);controls.push('foreign peer line rejects');
process.stdout.write(JSON.stringify({line:context.line,controls,descriptor:spinnerSnackGateDescriptor(context),contexts:1,compiler_calls:0,
 role:'Actual gate matcher on candidate fixture with modeled current CSS; no fresh CSS or packed run'})+'\n');
