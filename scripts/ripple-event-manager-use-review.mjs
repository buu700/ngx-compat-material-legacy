/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite imported NgZone boundary; native ripple qualification remains separate. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventoryNgZoneUses} from './ng-zone-use-inventory.mjs';
export function reviewRippleEventManagerNgZone(options={}) {
  const inventory=inventoryNgZoneUses(options),file='legacy-core/ripple/ripple-event-manager.ts';
  const boundary=inventory.cases.find(row=>row.file===file);
  assert.ok(boundary?.frozen);
  assert.deepEqual(boundary.references.map(({role,context})=>({role,context})),
    [{role:'typed-receiver:Parameter',context:'ngZone: NgZone'}]);
  const calls=inventory.accesses.filter(row=>row.file===file);
  assert.equal(calls.length,1);assert.equal(calls[0].member,'runOutsideAngular');
  assert.equal(calls[0].expression,'ngZone.runOutsideAngular');
  assert.equal(inventory.forwarding.filter(row=>row.file===file).length,0);
  return {schema_version:1,binding_parser:inventory.binding_parser,
    cases:[{file,module:'@angular/core',symbol:'NgZone',candidate_source_sha256:boundary.source_sha256,
      references:boundary.references,member_accesses:calls,typed_forwarding_arguments:0}],
    scope:'Actual finite source binding and exactly one public runOutsideAngular call. Complete manager/helper runtime and strict minimum declarations supply separate evidence; no native or full renderer qualification.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=reviewRippleEventManagerNgZone();
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({cases:report.cases.length,member_accesses:report.cases[0].member_accesses.length}));
}
