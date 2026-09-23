"""Static policy/data tests; these do not select peers or complete a source audit."""
from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def data(relative: str) -> dict:
    return json.loads((ROOT / relative).read_text())


class ResearchReleasePolicyChecks(unittest.TestCase):
    def test_toolchain_pin_and_bootstrap_evidence_agree(self):
        lock = data('templates/toolchain-lock.json')
        evidence = data('templates/tooling-release-evidence.json')
        manifest = data('templates/package.json')
        self.assertEqual(lock['repository']['pnpm'], '12.4.2')
        self.assertEqual(lock['release_observations']['pnpm']['version'], '12.4.2')
        self.assertEqual(evidence['tools']['pnpm']['version'], '12.4.2')
        self.assertEqual(manifest['packageManager'], 'pnpm@12.4.2')
        self.assertFalse(evidence['tools']['pnpm']['verified'])
        self.assertIsNone(evidence['tools']['pnpm']['artifact_integrity'])

    def test_official_pnpm_date_satisfies_dated_selection_rule(self):
        lock = data('templates/toolchain-lock.json')
        observation = lock['release_observations']['pnpm']
        self.assertEqual(observation['official_release_date'], '2026-09-15')
        # A date-only release-page observation is NOT registry or binary verification.
        release = datetime.fromisoformat(observation['official_release_date']).replace(tzinfo=timezone.utc)
        checked = datetime.fromisoformat(lock['checked_on']).replace(tzinfo=timezone.utc)
        self.assertGreaterEqual((checked - release).total_seconds(), lock['minimum_age_minutes'] * 60)
        self.assertFalse(lock['bootstrap_verification']['registry_metadata_captured'])
        self.assertTrue(observation['source'].endswith('/v12.4.2'))

    def test_research_source_does_not_select_runtime_baseline(self):
        observations = data('research/version-observations.json')
        self.assertEqual(observations['current_source_reference']['role'], 'research-only')
        self.assertFalse(observations['current_source_reference']['establishes_release_baseline'])
        self.assertFalse(observations['release_baseline_policy']['research_head_is_release_baseline'])
        self.assertEqual(observations['release_baseline_policy']['minimum_release_age_minutes'], 10080)
        policy = data('research/upstream-audit-policy.json')
        self.assertEqual(policy['inventory_role'], 'research-only')
        self.assertFalse(policy['research_head_selects_runtime_dependencies'])

    def test_release_baselines_start_unverified(self):
        baselines = data('research/version-observations.json')['release_baselines']
        self.assertEqual({item['package_major'] for item in baselines}, {21, 22})
        for item in baselines:
            self.assertEqual(item['status'], 'unresolved-unverified')
            self.assertEqual(item['exact_packages'], {})
            self.assertIsNone(item['lockfile_sha256'])
            self.assertFalse(item['verified'])
            self.assertFalse(item['compatibility_tests_passed'])

    def test_review_classes_have_distinct_depth_and_batch_rules(self):
        rules = data('research/upstream-audit-policy.json')['review_rules']
        self.assertEqual(len({item['id'] for item in rules}), len(rules))
        self.assertGreater(len({item['review_depth'] for item in rules}), 1)
        for item in rules:
            self.assertIsInstance(item['batch_allowed'], bool)
            if item['batch_allowed']:
                self.assertEqual(item['review_depth'], 'evidence-backed-batch')
                self.assertTrue(item.get('condition'))

    def test_low_risk_batches_require_exact_coverage_and_evidence(self):
        policy = data('research/upstream-audit-policy.json')
        self.assertEqual(policy['coverage'], 'every-enumerated-full-sha')
        self.assertTrue({'batch_id', 'commit_shas', 'rationale', 'evidence', 'reviewer',
                         'screening_and_escalation'} <= set(policy['batch_required_fields']))
        self.assertFalse(policy['titles_or_paths_alone_close_review'])

    def test_security_changes_require_individual_deep_review(self):
        rules = {item['id']: item for item in data('research/upstream-audit-policy.json')['review_rules']}
        self.assertEqual(rules['security-hardening']['review_depth'], 'individual-deep')
        self.assertFalse(rules['security-hardening']['batch_allowed'])
        self.assertFalse(rules['mixed-or-uncertain']['batch_allowed'])

    def test_pending_security_review_is_not_a_final_disposition(self):
        policy = data('research/upstream-audit-policy.json')
        self.assertIn('security-review', policy['pending_dispositions'])
        self.assertNotIn('security-review', policy['final_dispositions'])
        self.assertFalse(set(policy['pending_dispositions']) & set(policy['final_dispositions']))

    def test_runtime_lifecycle_and_contract_changes_cannot_be_batched(self):
        rules = {item['id']: item for item in data('research/upstream-audit-policy.json')['review_rules']}
        for name in ['runtime-bugfix', 'accessibility-lifecycle', 'public-api-removal-contract']:
            self.assertFalse(rules[name]['batch_allowed'])
            self.assertTrue(rules[name]['review_depth'].startswith('individual-'))

    def test_classification_is_not_a_completed_audit(self):
        policy = data('research/upstream-audit-policy.json')
        self.assertFalse(policy['automatic_classification_is_audit_completion'])
        self.assertTrue(policy['completion_requirements'])
        self.assertTrue({'affected_branches', 'evidence', 'status'} <= set(policy['individual_required_fields']))


if __name__ == '__main__':
    unittest.main()
