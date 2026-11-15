/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical producer recovery only; never a current evidence reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dataUrl=new URL('../compatibility/rc/native-date-admission-d70/successor.json',import.meta.url);
export function reverseNativeDateProducerSuccessor(text, dataBytes=readFileSync(dataUrl)) {
 assert.equal(sha(dataBytes),'9cfa72c9834cad7348ecb9d4737afbd25675524447e84b9ec8b82710905f798b','unreviewed successor data');
 const data=JSON.parse(dataBytes);
 assert.equal(sha(text),data.current_sha256,'unreviewed current producer');
 for(const {before,after} of [...data.edits].reverse()) {
  assert.equal(text.split(after).length,2,'ambiguous successor edit');
  text=text.replace(after,()=>before);
 }
 assert.equal(sha(text),data.prior_with_native_sha256,'complete native predecessor not recovered');
 return text;
}
