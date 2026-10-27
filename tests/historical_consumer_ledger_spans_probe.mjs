/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Byte preservation around exact metadata replacements, not source approval. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {replaceHistoricalConsumerEntries} from '../scripts/historical-consumer-wrapper-metadata.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const untouched='    {"sha":"keep","text":"escaped \\\" quote, } ] and \\u03b2","nested":[{"a":1}]}';
const before=Buffer.from('{\n  "note": "unchanged header",\n  "entries": [\n    {"sha":"change","value":1},\n'+untouched+'\n  ],\n  "g11_claim": "not-passed"\n}\n');
const changed={sha:'change',value:2},after=replaceHistoricalConsumerEntries(before,[{sha:'change',after_entry:changed}]);
assert.equal(after.includes(untouched),true);assert.deepEqual(JSON.parse(after).entries[0],changed);
assert.equal(replaceHistoricalConsumerEntries(before,[]).equals(before),true);
for(const entries of [
  [{sha:'missing',after_entry:{sha:'missing'}}],
  [{sha:'change',after_entry:changed},{sha:'change',after_entry:changed}],
  [{sha:'change',after_entry:{sha:'different'}}],
])assert.throws(()=>replaceHistoricalConsumerEntries(before,entries));
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',raw=readFileSync(join(root,ledgerPath)),ledger=JSON.parse(raw);
const transport=JSON.parse(readFileSync(join(root,'compatibility/rc/historical-consumer-wrapper-successor.json')));
const replacements=transport.canonical_reference_refresh_required.map(row=>{
  const original=ledger.entries.find(entry=>entry.sha===row.sha);assert.ok(original);const next=structuredClone(original);
  for(const change of row.source_reference_changes)next.individual_proof.source_evidence[change.index]=structuredClone(change.after);
  return {sha:row.sha,after_entry:next};
});
const result=replaceHistoricalConsumerEntries(raw,replacements),parsed=JSON.parse(result),selected=new Set(replacements.map(row=>row.sha));
assert.equal(parsed.entries.length,1697);assert.equal(selected.size,65);
for(const [index,entry]of ledger.entries.entries())if(!selected.has(entry.sha))assert.deepEqual(parsed.entries[index],entry);
assert.deepEqual(parsed.entries.map(row=>[row.sha,row.final_disposition]),ledger.entries.map(row=>[row.sha,row.final_disposition]));
assert.equal(readFileSync(join(root,ledgerPath)).equals(raw),true,'formatter test wrote the canonical ledger');
console.log(JSON.stringify({schema_version:1,synthetic_edge_cases_passed:2,invalid_replacements_rejected:3,
  actual_ledger_entries:1697,preview_replacements:65,unselected_entries_preserved:1632,canonical_ledger_written:false,
  source_or_native_or_audit_qualification:false}));
