/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {packedUpstreamLedgerEpoch,packedUpstreamLedgerRawRead} from '../../scripts/packed-upstream-ledger-epoch.mjs';
const root=process.cwd(),read=p=>readFileSync(root+'/'+p),hash=b=>createHash('sha256').update(b).digest('hex'),start=performance.now();
const current=packedUpstreamLedgerEpoch({root,read});current.assertCurrent();
assert.equal(current.individual_decisions_applied,61);assert.equal(current.slider_m3_repairs_source_decisions_applied,2);
const ledger='compatibility/f10/disposition-ledger/ledger.json',registry='scripts/upstream-source-contract-registry.mjs',raw=packedUpstreamLedgerRawRead({root,read:current.read});
assert.equal(raw(ledger).equals(read(ledger)),true);assert.equal(raw(registry).equals(read(registry)),true);assert.equal(current.read(registry).equals(read(registry)),true);
const data=JSON.parse(read(ledger));assert.equal(data.entries.length,1697);assert.equal(data.closed_dispositions,397);assert.equal(data.open_or_deferred,1300);assert.equal(data.entries.filter(r=>r.final_disposition==='security-review').length,1);
const result={schema_version:1,result:'pass',elapsed_seconds:Math.round((performance.now()-start))/1000,prior_source_admissions_preserved:59,current_source_admissions:61,
 slider_m3_repairs_source_decisions:2,current_registry_records:40,closed_dispositions:397,pending_dispositions:1300,pending_security_reviews:1,
 source_epoch_assert_current_passed:true,public_registry_and_raw_ledger_match_current_bytes:true,
 ledger:{sha256:hash(read(ledger)),bytes:read(ledger).length},owner:{sha256:hash(read('scripts/packed-upstream-ledger-epoch.mjs')),bytes:read('scripts/packed-upstream-ledger-epoch.mjs').length},
 actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
