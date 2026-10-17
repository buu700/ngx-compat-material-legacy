# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current source qualification, immutable prior rows, and single native proof ownership."""
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
import tests.audit_test_context as context

ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()


def raw_rows(text):
    marker='\n  "entries": [';assert text.count(marker)==1
    pos=text.index(marker)+len(marker);decoder=json.JSONDecoder();rows=[]
    while True:
        while text[pos].isspace() or text[pos]==',':pos+=1
        if text[pos]==']':return rows
        row,end=decoder.raw_decode(text,pos);rows.append((row,text[pos:end]));pos=end


class ChipAuditSourceRequalification(unittest.TestCase):
    def test_current_definitions_roles_and_real_source_checker(self):
        command=['node','tests/chip_audit_source_requalification_probe.mjs']
        if os.environ.get('NGX_CHIP_AUDIT_SOURCE_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_AUDIT_SOURCE_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=100)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-12000:]);report=json.loads(result.stdout)
        self.assertEqual(report['current_native_guards'],31 if report['line']=='main' else 30)
        self.assertEqual(report['refreshed_native_profiles'],28 if report['line']=='main' else 27)
        self.assertTrue(report['all_current_guards_refuse_missing_coordinator']);self.assertTrue(report['all1697_dispositions_preserved'])
        self.assertEqual(report['upstream_import_bindings'],26);self.assertEqual(report['owned_replacement_roles'],1);self.assertEqual(report['updated_existing_role_references'],27)
        self.assertEqual(report['prior_authored_documents_preserved'],79);self.assertEqual(report['frozen_reviewed'],1446);self.assertEqual(report['current_reviewed'],178);self.assertEqual(report['current_open'],130)
        self.assertEqual(report['preexisting_stale_document_seals_repaired'],21);self.assertEqual(report['actual_CLI_controls'],2);self.assertEqual(report['new_semantic_closures'],0)
        self.assertTrue(report['combined_historical_union_pending']);self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_finite_source_transition_preserves_all_unrelated_entry_bytes(self):
        task=json.loads((ROOT/'compatibility/rc/chip-audit-source-requalification-worksheet.json').read_bytes());stored=(ROOT/task['prior']['path']).read_bytes();self.assertEqual(sha(stored),task['prior']['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),task['prior']['raw_sha256']);before=json.loads(raw)
        outputs=json.loads((ROOT/'compatibility/rc/chip-audit-source-requalification-outputs.json').read_bytes());old=raw_rows(before['ledger_text']);new=raw_rows((ROOT/before['ledger_path']).read_text());self.assertEqual(len(new),1697)
        self.assertEqual(subprocess.check_output(['git','--no-replace-objects','show',task['source_parent']+':'+before['ledger_path']],cwd=ROOT),before['ledger_text'].encode())
        updated={r['sha'] for r in outputs['refreshed_native_profiles']}|set(task['modern_source_scopes']);self.assertEqual(updated,set(outputs['updated_entry_shas']));self.assertEqual(len(updated),31 if task['line']=='main' else 30);same=[]
        for (previous,oldtext),(actual,newtext) in zip(old,new):
            self.assertEqual(previous['sha'],actual['sha']);self.assertEqual(previous['final_disposition'],actual['final_disposition'])
            if actual['sha'] not in updated:self.assertEqual(newtext,oldtext);same.append(newtext)
        self.assertEqual(len(same),outputs['unrelated_entry_bytes']);self.assertEqual(sha('\0'.join(same).encode()),outputs['unrelated_entry_bytes_sha256'])
        for member in [*before['reviews'],*before['authored_reviews']]:self.assertEqual((ROOT/member['path']).read_bytes(),member['text'].encode())
        for group in ['projects','testing','reference','fixtures']:
            self.assertEqual(subprocess.check_output(['git','diff',task['source_parent'],'--',group],cwd=ROOT),b'')

    def test_classic_multirow_native_proof_has_one_explicit_owner(self):
        entries={e['sha']:e for e in json.loads((ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_bytes())['entries']}
        shas=['e69b2b09efaf577cd5fe92b70808479f975913af','2861a306aebc54eafe4a72b4a53860d8612af5d4','8980ad584c7ab7d8a0553528cbff88958e94a22a']
        original_reader=context.read_review
        for sha_id in shas:
            entry=entries[sha_id];body,review=original_reader(ROOT,entry);context.assert_native_review(self,ROOT,entry)
            variants=[lambda b:b.update(individual_proof=copy.deepcopy(entry['individual_proof'])),lambda b:b.update(line='foreign'),lambda b:b['reviews'].reverse(),lambda b:next(r for r in b['reviews'] if r['sha']==sha_id).update(status='pending')]
            for mutate in variants:
                changed=copy.deepcopy(body);mutate(changed)
                def altered(root,current):
                    if current['sha']==sha_id:return changed,next(r for r in changed['reviews'] if r['sha']==sha_id)
                    return original_reader(root,current)
                with patch.object(context,'read_review',altered),self.subTest(sha=sha_id),self.assertRaises(AssertionError):context.assert_native_review(self,ROOT,entry)
