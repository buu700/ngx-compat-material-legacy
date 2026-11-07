# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise the finite aggregate projection without modifying the worktree."""
from pathlib import Path
import subprocess
import unittest

class AggregateSourceSuccessorTests(unittest.TestCase):
    def test_projection_and_negative_controls(self):
        root=Path(__file__).resolve().parents[1]
        result=subprocess.run(['node','tests/sass_aggregate_successor_probe.mjs'],cwd=root,text=True,capture_output=True,check=True,timeout=120)
        self.assertIn('three source mutations, symlink, rehashed peer and wrong-line',result.stdout)

    def test_full_css_admission_and_js_python_reject_rehashed_changes(self):
        import copy, hashlib, json, sys
        from types import SimpleNamespace
        root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'scripts'));sys.path.insert(0,str(root/'tests'))
        from sass_ordered_aggregate_admission import ordered_aggregate_assertion_ok
        from sass_ordered_aggregate_fixture import ordered_aggregate_receipt
        active=SimpleNamespace(binding={'source_line':'main'},manifest={'run_id':'run','artifacts':[{'id':'library','sha256':'a'*64}]})
        body=ordered_aggregate_receipt(active,'06-aggregate-and-companions','inv');peers=body['current_companion']['peers']
        program="""import {readFileSync} from 'node:fs';import {aggregateExpectedSuccessor,aggregateProjectedSources} from './scripts/sass-aggregate-source-successor.mjs';const p=JSON.parse(readFileSync(0,'utf8'));process.stdout.write(JSON.stringify({out:aggregateExpectedSuccessor(process.cwd(),'main',p),sources:aggregateProjectedSources(process.cwd())}));"""
        call=subprocess.run(['node','--input-type=module','-e',program],cwd=root,input=json.dumps(peers),text=True,capture_output=True,check=True,timeout=120)
        computed=json.loads(call.stdout);m=body['actual_measurement'];m.update(css=computed['out']['css'],css_sha256=computed['out']['css_sha256'],css_bytes=computed['out']['css_bytes'],sources=computed['sources']);body['candidate_sha256']=m['css_sha256']
        self.assertTrue(ordered_aggregate_assertion_ok(body));cases=[body]
        def add(fn):
            b=copy.deepcopy(body);fn(b);self.assertFalse(ordered_aggregate_assertion_ok(b));cases.append(b)
        def css_mutation(b):
            m=b['actual_measurement'];m['css']+='\n.extra { color: red; }';m['css_sha256']=hashlib.sha256(m['css'].encode()).hexdigest();m['css_bytes']=len(m['css'].encode());b['candidate_sha256']=m['css_sha256']
        add(css_mutation)
        add(lambda b:b['actual_measurement']['sources'][0].__setitem__('sha256','0'*64))
        def peer_mutation(b):
            p=b['current_companion']['peers']['light'];p['css']+='\n.extra {color:red}';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode())
        add(peer_mutation)
        add(lambda b:b.__setitem__('line','21.x'))
        js="""import {readFileSync} from 'node:fs';import {orderedAggregateResultMatches} from './scripts/sass-ordered-aggregate-contract.mjs';const rows=JSON.parse(readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(rows.map(b=>b.line===b.actual_measurement.line && orderedAggregateResultMatches({status:'blocked',baseline_sha256:b.baseline_sha256,candidate_sha256:b.candidate_sha256},{status:'compiled',module:'@ngx-compat/material-legacy',fixture_sha256:b.fixture_sha256,css_sha256:b.candidate_sha256,actual_measurement:b.actual_measurement,current_companion:b.current_companion}))));"""
        jsout=subprocess.run(['node','--input-type=module','-e',js],cwd=root,input=json.dumps(cases),text=True,capture_output=True,check=True,timeout=150)
        self.assertEqual(json.loads(jsout.stdout),[True,False,False,False,False])
