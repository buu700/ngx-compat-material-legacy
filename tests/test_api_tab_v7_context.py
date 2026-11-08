# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license in LICENSE.
"""Only independently observed v7 and original tab context receipts qualify."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]

class TabV7ContextTests(unittest.TestCase):
    def test_finite_receipts_and_scope_controls(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tabHeaderObservationProblems} from './scripts/api-tab-header-context.mjs';
import {tabPortalObservationProblems} from './scripts/api-tab-portal-context.mjs';
const rows=Object.values(JSON.parse(readFileSync('tests/fixtures/api-tab-v7-qualified.json')).rows);
assert.equal(rows.length,6);
const oldHash='6da280036d123a97c111549e054ca67903c68600f1cc261424f39b356be763a1';
for(const row of rows){
 const portal=row.symbol.name==='MatLegacyTabBodyPortal', check=portal?tabPortalObservationProblems:tabHeaderObservationProblems;
 assert.deepEqual(check(row),[]);
 const old=structuredClone(row);
 if(portal)old.factory_tab_portal_context.packed_helper.sha256=oldHash;
 else {const s=old.factory_tab_header_context.source;s.sha256=oldHash;for(const k of ['owner_start','owner_end','field_start','field_end'])s[k]-=8;}
 assert.deepEqual(check(old),[]);
 const mutations=portal?[
  x=>x.factory_tab_portal_context.packed_helper.sha256='0'.repeat(64),
  x=>x.factory_tab_portal_context.packed_helper.constructor_sha256='0'.repeat(64),
  x=>x.factory_tab_portal_context.packed_helper.helper_sha256.constructLegacyTabBodyPortal='0'.repeat(64),
  x=>x.factory_tab_portal_context.parent_source.sha256='0'.repeat(64),
  x=>x.factory_tab_portal_parent_context.child_self_provider_absent=false,
  x=>x.factory_tab_portal_context.manual_argument_overrides=false,
  x=>x.factory_tab_portal_context.borrowed_parent_view_alive=false
 ]:[
  x=>x.factory_tab_header_context.source.sha256=oldHash,
  x=>x.factory_tab_header_context.source.owner_start-=8,
  x=>x.factory_tab_header_context.source.field_start-=8,
  x=>x.factory_tab_header_context.source.helper_text_sha256='0'.repeat(64),
  x=>x.factory_tab_header_context.source.cdk_version='22.1.8',
  x=>x.factory_tab_header_context.child_scope_matched=false,
  x=>x.factory_tab_header_context.parent_scope_distinct=false,
  x=>x.factory_tab_header_context.request.optional=true
 ];
 for(const mutate of mutations){const bad=structuredClone(row);mutate(bad);assert.ok(check(bad).length,row.symbol.symbol_id);}
}
'''
        run = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT, capture_output=True, text=True, timeout=20)
        self.assertEqual(run.returncode, 0, (run.stdout + run.stderr)[-5000:])
