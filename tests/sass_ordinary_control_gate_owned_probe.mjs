/** Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
/** Three actual JS physical contexts; modeled owned envelopes, no compiler. */
import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{createOrdinaryControlGateContext,ordinaryControlGateDirectMatch,ORDINARY_CONTROL_GATE_CASES,ORDINARY_CONTROL_DEFAULT_CASES}from'../scripts/sass-ordinary-control-gate.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));const context=createOrdinaryControlGateContext({root:input.root});assert.equal(context.line,input.line);assert.equal(ORDINARY_CONTROL_GATE_CASES.length,65);assert.equal(ORDINARY_CONTROL_DEFAULT_CASES.length,15);let positives=0,negatives=0;
const match=b=>ordinaryControlGateDirectMatch({context,caseId:b.case_id,original:b.expected,actual:b.actual,identity:b.identity,descriptor:b.current_ordinary_controls,companion:b.current_companion??null});
for(const b of input.bodies){assert.ok(match(b),b.case_id);positives++;for(const kind of['before_program','current_program','catalog','source']){const bad=structuredClone(b);if(kind==='before_program')bad.expected.program_sha256=bad.actual.program_sha256;else if(kind==='current_program')bad.actual.program_sha256=bad.expected.program_sha256;else if(kind==='catalog')bad.identity.catalog='fixtures/sass/mixin-argument-contracts.json';else bad.actual.sources.pop();assert.equal(match(bad),false);negatives++;}}
console.log(JSON.stringify({positives,negatives,source_context_actual:true,compiles:0,packed_runs:0}));
