/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reverseNativeDateProducerSuccessor} from '../scripts/native-date-producer-successor.mjs';
const raw=readFileSync(new URL('../scripts/packed-consumer-aot-smoke.mjs',import.meta.url),'utf8');
const dataBytes=readFileSync(new URL('../compatibility/rc/native-date-admission-d70/successor.json',import.meta.url));
const data=JSON.parse(dataBytes); const prior=reverseNativeDateProducerSuccessor(raw);
assert.notEqual(prior,raw); let rejected=0;
for(const edit of data.edits){ assert.equal(raw.split(edit.after).length,2); assert.throws(()=>reverseNativeDateProducerSuccessor(raw.replace(edit.after,edit.before))); rejected++; }
for(const bad of [raw+'\n',raw.replace('nativeDateConstructorObservation','nativeDateConstructorCorrupted'),raw.replace('const nativeDateManual=','const nativeDateManualChanged=')]) {assert.notEqual(bad,raw);assert.throws(()=>reverseNativeDateProducerSuccessor(bad));rejected++;}
assert.throws(()=>reverseNativeDateProducerSuccessor(raw,Buffer.from(dataBytes.toString()+' ')));rejected++;
console.log(JSON.stringify({positive:1,negative:rejected,edits:data.edits.length,complete_predecessor_recovered:true,current_reader_projection:false}));
