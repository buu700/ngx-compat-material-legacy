/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=process.argv[2];if(!path||process.argv.length!==3)throw Error('usage: node assert-range-end.mjs RESULT_JSON');
const {rows}=JSON.parse(readFileSync(path,'utf8'));
const excludedEnd=rows.filters.input[3];
assert.equal(excludedEnd.rangeStart,true,'start should be accepted by filter excluding 16');
assert.equal(excludedEnd.rangeEnd,false,'end should be invalid when filter excludes its date');
