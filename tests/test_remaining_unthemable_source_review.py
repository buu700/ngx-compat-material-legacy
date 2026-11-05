# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Fourteen complete token placement reviews with immutable reference and live-source controls."""
import json,os
from pathlib import Path
import subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
class RemainingUnthemableSourceReviewTests(unittest.TestCase):
    def test_whole_patches_historical_arguments_and_rejections(self):
        command=['node','tests/remaining_unthemable_source_review_probe.mjs']
        if os.environ.get('REMAINING_UNTHEMABLE_SOURCE_CONTROLS'):
            command.append(os.environ['REMAINING_UNTHEMABLE_SOURCE_CONTROLS'])
            if os.environ.get('REMAINING_UNTHEMABLE_SOURCE_REPORT'):
                command.append(os.environ['REMAINING_UNTHEMABLE_SOURCE_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:])
        report=json.loads(child.stdout)
        self.assertEqual(report['source_bindings'], report['expected_source_bindings'])
        self.assertTrue(report['current_source_bindings_match_exact_successor'])
        for key,value in dict(original_files=38,original_hunks=54,present_original_blobs=76,authenticated_absent_images=0,tagged_blobs=37,authenticated_tagged_absences=0,exact_patch_replays=38,authenticated_tree_objects=123,additional_files_beyond_seed=10,additional_hunks_beyond_seed=10,historical_source_bindings=642,argument_cases=160,css_semantic_mutants_detected=22,late_source_change_controls=36,owned_scss_members_rehashed=409,reference_sass_members=286,reference_locked_archives=38).items():
            self.assertEqual(report[key],value,key)
        self.assertEqual(report['comparison_counts'],{'companion-addition':40,'exact-untouched16':116,'form-field-state':4})
        self.assertEqual(report['historically_empty_cases'],16)
        self.assertEqual(len(report['reviews']),14)
        self.assertEqual(sum(len(r['whole_original_hunk_reviews'])for r in report['reviews']),54)
        self.assertEqual(len(report['rejected']),187)
        self.assertEqual(len(set(report['rejected'])),187)
        self.assertEqual(len(report['owned_theme_bodies']['post16_base_mixins_absent']),14)
        self.assertEqual(report['owned_theme_bodies']['tagged_fallback_dimension_recipes'],15)
        for key in ['canonical_decisions_changed','golden_or_finite_contract_changes','product_changes','consumer_HTML_CSS_SCSS_changes']:
            self.assertEqual(report[key],0,key)
        self.assertTrue(report['tagged_reference_Sass_executed'])
        self.assertTrue(report['approved_installed_minimum_peer_public_Sass_executed'])
        self.assertFalse(report['prior_CSS_results_reused'])
        self.assertFalse(report['captured_post16_patch_Sass_TypeScript_tests_or_workflows_executed'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'],'not-passed')
if __name__=='__main__':unittest.main()
