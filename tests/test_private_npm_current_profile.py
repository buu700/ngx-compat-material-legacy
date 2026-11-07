# @license
# Copyright Google LLC All Rights Reserved.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.dev/license
# Copyright (c) 2026 Ryan Lester.
"""Current npm source identity controls; no network or dependency execution."""
from pathlib import Path
import hashlib
import importlib.util
import json
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('npm_current_profile', ROOT / 'scripts/check-dependency-eligibility.py')
eligibility = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eligibility)
SUFFIXES = ['.cjs', '.js', '.mjs', '.py', '.sh', '.ts']


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def roster_hash(rows):
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


class PrivateNpmCurrentProfileTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        files = {name: b'owned fixture\n' for name in (
            '.npmrc', 'chainman.toml', 'chainman.lock', 'justfile', 'package.json',
            'projects/ngx-material-legacy/package.json', 'pnpm-lock.yaml',
            'scripts/command.mjs', '.github/workflows/verify.yml',
            'tests/nested/probe.py', 'compatibility/handoff/codex-closeout/tools/test_probe.py',
            'support/helper.mjs', 'SECURITY.md')}
        files['projects/ngx-material-legacy/package.json'] = b'{"version":"22.0.0"}\n'
        for name, raw in files.items():
            self.write(name, raw)
        def row(name):
            raw = files[name]
            return {'path': name, 'sha256': digest(raw), 'bytes': len(raw),
                    'git_blob': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}
        primary = sorted(eligibility.private_npm_source_paths(self.root))
        support = sorted(name for name in files if name.startswith(('tests/', 'support/', 'compatibility/handoff/')))
        inputs = ['SECURITY.md']
        self.manifests = {'lines': {'main': {'source_parent': 'a' * 40, 'source_files': [{'path': 'historical/source.mjs'}]}}}
        self.evidence = {'roots': {'main': {'source_hashes': {'SECURITY.md': 'b' * 64}}}}
        branch = {'source_parent': 'c' * 40, 'historical_source_parent': 'a' * 40,
                  'historical_source_files': 1, 'source_files': [row(name) for name in primary],
                  'support_files': [row(name) for name in support], 'input_files': [row(name) for name in inputs],
                  'support_discovery': [
                      {'root': name, 'suffixes': SUFFIXES.copy(),
                       'paths': sorted(path for path in support if path.startswith(name + '/'))}
                      for name in ('tests', 'compatibility/handoff/codex-closeout/tools')],
                  'historical_source_hashes': {'SECURITY.md': {
                      'historical_sha256': 'b' * 64, 'current_sha256': digest(files['SECURITY.md'])}}}
        self.profile = {'schema_version': 1, 'scope': 'maintained-tool-owned-npm-invocations',
                        'historical_artifacts': eligibility.NPM_PRIVATE_PROFILE_ARTIFACTS.copy(),
                        'lines': {'main': branch}}
        self.seal()

    def write(self, name, raw):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)

    def seal(self):
        branch = self.profile['lines']['main']
        review = {'schema_version': 1, 'scope': self.profile['scope'], 'lines': {'main': {
            'source_parent': branch['source_parent'],
            **{name + '_sha256': roster_hash(branch[name]) for name in ('source_files', 'support_files', 'input_files')},
            'preconditions': 'unchanged-maintained-tool-owned-npm'}}}
        raw = json.dumps(review).encode()
        name = 'compatibility/rc/current-review-fixture.json'
        self.write(name, raw)
        self.profile['review'] = {'path': name, 'sha256': digest(raw), 'bytes': len(raw)}
        raw = json.dumps(self.profile).encode()
        self.write(eligibility.NPM_CURRENT_PRIVATE_PROFILE_PATH, raw)
        self.pin = digest(raw)

    def validate(self):
        with patch.object(eligibility, 'NPM_CURRENT_PRIVATE_PROFILE_SHA256', self.pin), patch.object(eligibility, 'NPM_HISTORICAL_PRIVATE_PROFILE_SHA256', self.pin):
            return eligibility._private_npm_current_profile(self.root, 'main', self.manifests, self.evidence)

    def test_exact_current_cut_and_repeated_physical_read(self):
        binding, recheck = self.validate()
        self.assertEqual(binding['current_source_parent'], 'c' * 40)
        self.assertEqual(binding['current_scope'], 'maintained-tool-owned-npm-invocations')
        recheck()
        self.write('support/helper.mjs', b'changed after initial validation\n')
        with self.assertRaises(ValueError):
            recheck()

    def test_changed_or_missing_program_metadata_review_and_profile_fail(self):
        targets = ['scripts/command.mjs', 'tests/nested/probe.py',
                   'compatibility/handoff/codex-closeout/tools/test_probe.py', 'support/helper.mjs',
                   'SECURITY.md', 'compatibility/rc/current-review-fixture.json',
                   eligibility.NPM_CURRENT_PRIVATE_PROFILE_PATH]
        for name in targets:
            with self.subTest(path=name):
                path = self.root / name
                raw = path.read_bytes()
                try:
                    path.write_bytes(raw + b'changed\n')
                    with self.assertRaises(ValueError):
                        self.validate()
                    path.unlink()
                    with self.assertRaises((ValueError, OSError)):
                        self.validate()
                finally:
                    path.write_bytes(raw)

    def test_resealed_stale_review_cannot_claim_current_preconditions(self):
        name = self.profile['review']['path']
        original = (self.root / name).read_bytes()
        for field in ('source_parent', 'source_files_sha256', 'support_files_sha256',
                      'input_files_sha256', 'preconditions'):
            with self.subTest(field=field):
                review = json.loads(original)
                review['lines']['main'][field] = 'stale'
                raw = json.dumps(review).encode()
                self.write(name, raw)
                self.profile['review'].update(sha256=digest(raw), bytes=len(raw))
                raw = json.dumps(self.profile).encode()
                self.write(eligibility.NPM_CURRENT_PRIVATE_PROFILE_PATH, raw)
                self.pin = digest(raw)
                with self.assertRaisesRegex(ValueError, 'review does not bind'):
                    self.validate()

    def test_outer_evidence_rechecks_current_sources_after_brace_stage(self):
        # Isolate orchestration with synthetic historical records and an empty
        # archive iterator. The current physical validator remains real.
        archive = b'synthetic archive DATA'
        evidence = json.loads(json.dumps(self.evidence))
        evidence['roots']['main']['revision'] = 'a' * 40
        evidence.update(npm_archive_sha256=digest(archive), source_excerpts=[],
                        authenticated_archive_members=0, complete_selector_source_population=[],
                        current_advisories=[])
        triage = {'findings': [{'triage_item_id': str(index), 'verdict': 'not_actionable', 'input_id': advisory}
                             for index, advisory in enumerate(('GHSA-ch52-4w7c-c8xp', 'GHSA-rj75-hqrm-r3gf'))]}
        documents = {'private-profile-source-manifests.json': self.manifests,
                     'private-profile-remaining-evidence.json': evidence,
                     'private-profile-remaining-result.json': triage}
        original_read = eligibility._tool_proof_bytes
        def read(root, relative, expected=None):
            prefix = 'compatibility/rc/tool-advisory-triage/'
            if relative.startswith(prefix) and relative[len(prefix):] in documents:
                return json.dumps(documents[relative[len(prefix):]]).encode()
            return original_read(root, relative, expected)
        def brace(*args):
            self.write('support/helper.mjs', b'changed during brace stage\n')
            return {'findings': {}, 'binding': {}}
        with patch.object(eligibility, 'NPM_CURRENT_PRIVATE_PROFILE_SHA256', self.pin), patch.object(eligibility, 'NPM_HISTORICAL_PRIVATE_PROFILE_SHA256', self.pin), \
             patch.object(eligibility, '_tool_proof_bytes', side_effect=read), \
             patch.object(eligibility.tarfile, 'open') as opened, \
             patch.object(eligibility, 'private_npm_brace_validation', side_effect=brace) as reviewed:
            opened.return_value.__enter__.return_value.__iter__.return_value = iter(())
            with self.assertRaisesRegex(ValueError, 'source changed: support/helper.mjs'):
                eligibility.private_npm_disposition_evidence(self.root, {'npm': archive})
            reviewed.assert_called_once()

    def test_added_primary_and_both_discovery_group_members_fail(self):
        for name in ['scripts/nested/extra.py', 'tests/nested/extra.mjs',
                     'compatibility/handoff/codex-closeout/tools/test_extra.py']:
            with self.subTest(path=name):
                self.write(name, b'new executable source\n')
                try:
                    with self.assertRaises(ValueError):
                        self.validate()
                finally:
                    (self.root / name).unlink()

    def test_linked_source_and_linked_discovery_ancestor_fail(self):
        path = self.root / 'support/helper.mjs'
        raw = path.read_bytes()
        path.unlink()
        path.symlink_to(self.root / 'scripts/command.mjs')
        with self.assertRaises(ValueError):
            self.validate()
        path.unlink()
        path.write_bytes(raw)
        parent = self.root / 'compatibility/handoff'
        moved = self.root / 'handoff-target'
        parent.rename(moved)
        parent.symlink_to(moved, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.validate()

    def test_resealed_inventory_metadata_does_not_broaden_scope(self):
        original = json.loads(json.dumps(self.profile))
        faults = ['missing-group', 'duplicate-group', 'unknown-group', 'suffix', 'missing-member',
                  'overlap', 'duplicate-row', 'git-blob', 'historical-attribution', 'trusted-checker']
        for fault in faults:
            with self.subTest(fault=fault):
                self.profile = json.loads(json.dumps(original))
                branch = self.profile['lines']['main']
                groups = branch['support_discovery']
                if fault == 'missing-group': groups.pop()
                if fault == 'duplicate-group': groups[1] = groups[0].copy()
                if fault == 'unknown-group': groups[1]['root'] = 'other'
                if fault == 'suffix': groups[0]['suffixes'].remove('.py')
                if fault == 'missing-member': groups[0]['paths'] = []
                if fault == 'overlap': branch['input_files'].append(branch['support_files'][0])
                if fault == 'duplicate-row': branch['support_files'].append(branch['support_files'][0])
                if fault == 'git-blob': branch['support_files'][0]['git_blob'] = '0' * 40
                if fault == 'historical-attribution': branch['historical_source_hashes']['SECURITY.md']['historical_sha256'] = '0' * 64
                if fault == 'trusted-checker':
                    extra = branch['support_files'][0].copy()
                    extra['path'] = 'scripts/check-dependency-eligibility.py'
                    branch['support_files'] = sorted(branch['support_files'] + [extra], key=lambda row: row['path'])
                self.seal()  # A recomputed profile/review cannot bypass independent predicates.
                with self.assertRaises(ValueError):
                    self.validate()

    def seal_v2(self, fault=None):
        self.seal()
        review = json.loads((self.root / self.profile['review']['path']).read_bytes())
        branch = self.profile['lines']['main']
        evidence_raw = b'authored contextual review\n'; evidence_name = 'compatibility/rc/context-review.txt'
        self.write(evidence_name, evidence_raw)
        evidence_ref = {'path': evidence_name, 'sha256': digest(evidence_raw), 'bytes': len(evidence_raw)}
        authored = {'evidence_refs': [evidence_ref], 'schema_version': 1, 'role': 'current-source-semantic-review', 'line': 'main',
                    'source_parent': 'd' * 40, 'preconditions': 'unchanged-maintained-tool-owned-npm',
                    **{name + '_sha256': roster_hash(branch[name]) for name in ('source_files', 'support_files', 'input_files')}}
        if fault == 'no-evidence': authored['evidence_refs'] = []
        if fault == 'unbound-evidence': authored['evidence_refs'][0]['sha256'] = '0' * 64
        if fault == 'wrong-scope': authored['line'] = '21.x'
        if fault == 'wrong-digest': authored['support_files_sha256'] = '0' * 64
        if fault == 'preconditions': authored['preconditions'] = 'changed'
        if fault == 'wrong-role': authored['role'] = 'other'
        if fault == 'bad-source': authored['source_parent'] = 'bad'
        raw = json.dumps(authored).encode(); name = 'compatibility/rc/authored-review.json'
        self.write(name, raw)
        ref = {'path': name, 'sha256': digest(raw), 'bytes': len(raw)}
        review['semantic_review_refs'] = sorted([ref, evidence_ref], key=lambda r: r['path'])
        review['current_source_reviews'] = {'main': ref.copy()}
        if fault == 'missing': del review['current_source_reviews']
        if fault == 'unbound': review['current_source_reviews']['main']['sha256'] = '0' * 64
        if fault == 'duplicate': review['semantic_review_refs'].append(ref.copy())
        if fault == 'unsafe': review['semantic_review_refs'][0]['path'] = '../review.json'
        raw = json.dumps(review).encode(); self.write(self.profile['review']['path'], raw)
        self.profile['review'].update(sha256=digest(raw), bytes=len(raw))
        self.profile['schema_version'] = 2
        raw = json.dumps(self.profile).encode(); self.write(eligibility.NPM_CURRENT_PRIVATE_PROFILE_PATH, raw)
        self.pin = digest(raw)

    def test_schema_two_positive_and_late_mutation(self):
        self.seal_v2()
        _, recheck = self.validate()
        self.write('compatibility/rc/authored-review.json', b'changed')
        with self.assertRaises(ValueError): recheck()

    def test_schema_two_rejects_unbound_or_invalid_review(self):
        for fault in ('no-evidence', 'unbound-evidence', 'missing', 'wrong-scope', 'wrong-digest', 'unbound', 'duplicate', 'unsafe',
                      'wrong-role', 'bad-source', 'preconditions'):
            with self.subTest(fault=fault):
                self.seal_v2(fault)
                with self.assertRaises((ValueError, KeyError)): self.validate()

    def test_v1_new_authority_rejected(self):
        self.seal()
        with patch.object(eligibility, 'NPM_CURRENT_PRIVATE_PROFILE_SHA256', self.pin):
            with self.assertRaisesRegex(ValueError, 'foreign current'):
                eligibility._private_npm_current_profile(self.root, 'main', self.manifests, self.evidence)


if __name__ == '__main__':
    unittest.main()
