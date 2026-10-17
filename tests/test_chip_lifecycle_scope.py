# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Whole lifecycle source/hunk review, real authored protocols and native gap preservation."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.chip_lifecycle_admission_context import admission_before_member
from tests.chip_focus_repair_context import focus_before_member,focus_historical_product_diff
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()

class ChipLifecycleScope(unittest.TestCase):
    def test_all_originals_and_authored_protocol_corruptions(self):
        command=['node','tests/chip_lifecycle_scope_probe.mjs']
        if os.environ.get('NGX_CHIP_LIFECYCLE_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_LIFECYCLE_DIAGNOSTIC'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=60)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-10000:]);report=json.loads(child.stdout)
        self.assertEqual(report['subjects'],7);self.assertEqual(report['hunks'],30);self.assertEqual(report['protocol_cases'],37);self.assertEqual(report['controls'],33);self.assertEqual(report['focus_counterexamples'],2)
        self.assertEqual(report['protocols']['blur_cases'],13);self.assertEqual(report['protocols']['macro_task_DOM_escape_cases'],12)
        self.assertEqual(report['protocols']['query_selection_timing_cases'],6);self.assertEqual(report['protocols']['destroy_event_and_focus_cases'],6)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_complete_original_members_and_individual_hunk_reviews_have_exact_provenance(self):
        task=json.loads((ROOT/'compatibility/rc/chip-lifecycle-scope-worksheet.json').read_bytes());ref=task['originals'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);original=json.loads(raw)
        body=json.loads((ROOT/'compatibility/rc/chip-lifecycle-scope-source-review.json').read_bytes());self.assertEqual(body['originals'],ref);self.assertEqual(body['source_dispositions_closed_by_this_foundation'],0)
        hunk_count=0;paths=0;blobs=0
        for before,review in zip(original['subjects'],body['reviews']):
            self.assertEqual(review['sha'],before['sha']);self.assertEqual(review['original_analysis']['diff_sha256'],sha(before['diff'].encode()));self.assertEqual(sha(before['raw_commit'].encode()),before['raw_commit_sha256'])
            data=before['raw_commit'].encode();self.assertEqual(hashlib.sha1(b'commit '+str(len(data)).encode()+b'\0'+data).hexdigest(),before['sha'])
            self.assertEqual(len(review['whole_original_hunk_reviews']),before['hunks']);hunk_count+=before['hunks'];paths+=len(before['members'])
            for member in before['members']:
                for side in ['before','after']:
                    data=member[side]['text'].encode();self.assertEqual(sha(data),member[side]['sha256']);self.assertEqual(hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest(),member[side]['git_blob']);blobs+=1
            for hunk,reviewed in zip(review['original_analysis']['whole_original_hunks'],review['whole_original_hunk_reviews']):
                expected={k:v for k,v in reviewed.items() if k not in ['review','review_depth']};self.assertEqual(expected,hunk);self.assertEqual(reviewed['review_depth'],'individual-original-hunk');self.assertTrue(reviewed['review'])
            self.assertFalse(review['actual_native_packed_or_floor_qualified'])
        self.assertEqual(hunk_count,30);self.assertEqual(paths,16);self.assertEqual(blobs,32)
        source=body['candidate_context'];self.assertFalse(source['upstream_afterNextRender_or_timeout_adopted']);self.assertEqual(source['existing_DOM_focus_escape_tests'],0);self.assertTrue(source['owned_direct_DOM_focus_escape'])
        floors=source['minimum_public_key_manager_sources'];self.assertEqual([s['version'] for s in floors['minimum_subjects']],['22.1.7','21.2.14'])
        for subject in floors['minimum_subjects']:
            for member in subject['source_members']:self.assertEqual(sha((ROOT/member['path']).read_bytes()),member['sha256'])
        self.assertEqual(body['reviews'][2]['proposed_disposition'],'do-not-adopt');self.assertEqual(body['reviews'][2]['prior_disposition'],'already-adapted' if task['line']=='main' else 'needs-individual-review')
        self.assertTrue(body['pending_TypeScript_focus_repair_required']);self.assertEqual(len(body['source_confirmed_focus_counterexamples']),2)
        self.assertEqual(body['reviews'][4]['proposed_disposition'],'already-adapted');self.assertEqual(sum(r['native_admission_required_for_proposed_owned_contract'] for r in body['reviews']),3)
        self.assertFalse(body['actual_native_packed_or_floor_qualified']);self.assertEqual(body['consumer_HTML_CSS_SCSS_changes'],0)

    def test_ledger_sources_priors_and_unexecuted_native_gap_stay_explicit(self):
        task=json.loads((ROOT/'compatibility/rc/chip-lifecycle-scope-worksheet.json').read_bytes());ref=task['prior'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);prior=json.loads(raw)
        current=admission_before_member(ROOT,prior['ledger_path']);self.assertEqual(sha(current),prior['ledger_sha256']);self.assertEqual(current,prior['ledger_text'].encode());self.assertEqual(len(json.loads(current)['entries']),1697)
        self.assertEqual(subprocess.check_output(['git','--no-replace-objects','show',task['source_parent']+':'+prior['ledger_path']],cwd=ROOT),current)
        for m in prior['owned_sources']+prior['reviews']:self.assertEqual(focus_before_member(ROOT,m['path']),m['text'].encode())
        for group in ['projects','testing','reference','fixtures']:self.assertEqual(focus_historical_product_diff(ROOT,task['source_parent'],[group]),b'')
        body=json.loads((ROOT/'compatibility/rc/chip-lifecycle-scope-source-review.json').read_bytes());proposal=body['native_proposal'];self.assertEqual(sha((ROOT/proposal['path']).read_bytes()),proposal['sha256']);p=json.loads((ROOT/proposal['path']).read_bytes())
        self.assertEqual(p['actual_native_cases_added'],0);self.assertFalse(p['actual_runtime_executed']);self.assertEqual(len(p['new_native_SHA_scopes_required']),3)
        self.assertEqual(p['existing_historical_case_count'],2232);self.assertEqual(p['existing_original_and_shared_positive_cases'],2227);self.assertEqual(p['existing_negative_discovery_cases'],5)
        self.assertEqual(p['proposed_chip_spec_indices'],[34,35,36,37]);self.assertEqual(p['future_full_historical_case_count_if_exact4_appended'],2236)
        self.assertEqual([r['case_id'].split('#')[-1] for r in p['existing_escape_case_ids_to_strengthen']],['27','28']);self.assertFalse(p['actual_native_packed_or_floor_qualified'])
        ref=body['cyph_sanity'];self.assertEqual(sha((ROOT/ref['path']).read_bytes()),ref['sha256']);consumer=json.loads((ROOT/ref['path']).read_bytes());self.assertEqual(consumer['required_consumer_HTML_CSS_SCSS_changes'],0);self.assertFalse(consumer['actual_consumer_build_executed'])
