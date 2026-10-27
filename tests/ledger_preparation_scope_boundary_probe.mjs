/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Scope mutations at preparation and returned-reader boundaries remain rejected. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {preparePackedUpstreamLedger,packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
const root=process.cwd(),raw=path=>readFileSync(join(root,path));
const ledger='compatibility/f10/disposition-ledger/ledger.json';
const spec='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts';
const trigger='compatibility/rc/historical-consumer-wrapper-ledger-successor.json';
const changed=path=>Buffer.concat([raw(path),Buffer.from('\n// changed scope subject\n')]);
const rejected=[];
for(const target of [spec,'projects/ngx-material-legacy/tsconfig.lib.json','scripts/snack-dom-source-context.mjs']){
  let armed=false;
  const read=path=>{if(path===trigger)armed=true;return armed&&path===target?changed(path):raw(path);};
  assert.throws(()=>preparePackedUpstreamLedger({root,read}),/late.*change/);
  assert.equal(armed,true);rejected.push('changed-before-preparation-return:'+target);
}
let target=null;
const read=path=>path===target?changed(path):raw(path);
const first=preparePackedUpstreamLedger({root,read});assert.equal(first.canonical_after.equals(raw(ledger)),true);
target=spec;
assert.throws(()=>preparePackedUpstreamLedger({root,read}),/late.*change/);
rejected.push('changed-before-reused-scope-preparation');
target=null;
const epoch=packedUpstreamLedgerEpoch({root,read});assert.equal(epoch.raw,read);
assert.equal(epoch.read(ledger).equals(first.before),true);
target='scripts/snack-dom-source-context.mjs';
assert.throws(()=>epoch.read(ledger),/late.*change/);
rejected.push('changed-after-return-before-historical-ledger-read');
target=null;
assert.equal(epoch.read(ledger).equals(first.before),true);
const report={schema_version:1,line:first.line,rejections:rejected.length,rejected,
  actual_canonical_after_preserved:true,reused_scope_checked_on_preparation_entry:true,
  scope_changes_during_preparation_rejected:true,returned_reader_late_gate_preserved:true,
  current_reader_identity_preserved:true,original_test_timeouts_or_assertions_changed:0,
  actual_native_artifact_browser_floor_or_audit_qualified:false,g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
