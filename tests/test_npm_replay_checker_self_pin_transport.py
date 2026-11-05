# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite checker self-seal transport on disposable Git source fixtures."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NODE = '/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'
PROBE = 'tests/npm_replay_checker_self_pin_transport_probe.mjs'
DOC = 'compatibility/rc/historical-source-replay.md'
CHECKER = 'scripts/check-dependency-eligibility.py'
PROFILE = 'compatibility/rc/parent-private-npm-current-profile-inputs-v2.json'


def canonical(value):
    return json.dumps(value, indent=2) + '\n'


class NpmReplayCheckerSelfPinTransportTests(unittest.TestCase):
    def run_probe(self, root):
        result = subprocess.run([NODE, str(root / PROBE)], cwd=root,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['status'], 'finite-checker-self-pin-transport-controls-pass')
        self.assertEqual(report['controls'], 36)
        self.assertEqual(sum(not case['rejected'] for case in report['cases']), 2)
        self.assertEqual(sum(case.get('restoration_passed', False) for case in report['cases']), 4)
        self.assertEqual(report['fixture_document_namespace'], 'independent-literal-before-frame')
        self.assertFalse(report['production_registry_pin_authentication_exercised'])
        self.assertFalse(report['current_npm_semantic_profile_qualification_exercised'])
        self.assertFalse(report['full_predecessor_owner_or_historical_program_executed'])
        self.assertFalse(report['source_mutations'])
        return report

    def test_exact_afterimage_and_bounded_refusals(self):
        self.run_probe(ROOT)

    def test_final_descriptor_in_copied_source_root_does_not_poison_fixture(self):
        # This copies finite source DATA and creates all commits in a disposable
        # repository. The actual production document and Git refs never change.
        data = json.loads((ROOT / 'compatibility/rc/historical-source-replay-inputs.json').read_bytes())
        older = json.loads((ROOT / 'compatibility/rc/older-audit-history-inputs.json').read_bytes())
        paths = set(data['current_head_tooling_paths']) | {row['probe'] for row in data['entries']}
        paths.update(row['path'] for row in data['wrapper_edits'])
        paths.update({CHECKER, PROBE, 'tests/historical_replay_current_frame_probe.mjs',
                      'compatibility/rc/older-audit-history-inputs.json', older['prior']['path'],
                      'compatibility/rc/historical-consumer-wrapper-successor.json'})
        environment = {**os.environ, 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_CONFIG_SYSTEM': '/dev/null',
                       'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
        for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
            environment.pop(key, None)

        def git(root, *args):
            return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
                                            '-c', 'maintenance.auto=0', '-c', 'core.hooksPath=/dev/null',
                                            '-c', 'user.name=fixture', '-c', 'user.email=fixture@invalid',
                                            *args], cwd=root, env=environment)

        def commit(root, message):
            git(root, 'add', '--all')
            git(root, 'commit', '-q', '-m', message)
            return git(root, 'rev-parse', 'HEAD').decode().strip()

        production_before = (ROOT / DOC).read_bytes()
        with tempfile.TemporaryDirectory(prefix='ngx-final-seal-source-root-') as directory:
            root = Path(directory)
            for name in sorted(paths - {DOC}):
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / name, target)
            (root / DOC).write_text('Independent finalized source-root fixture document.\n')
            text = (root / CHECKER).read_text()
            old_path = next(line for line in text.splitlines() if line.startswith('NPM_CURRENT_PRIVATE_PROFILE_PATH = '))
            text = text.replace(old_path, 'NPM_CURRENT_PRIVATE_PROFILE_PATH = "' + PROFILE + '"')
            (root / CHECKER).write_text(text)
            git(root, 'init', '-q')
            common = Path(git(ROOT, 'rev-parse', '--git-common-dir').decode().strip())
            if not common.is_absolute():
                common = (ROOT / common).resolve()
            (root / '.git/objects/info/alternates').write_text(str(common / 'objects') + '\n')
            source_a = commit(root, 'independent source frame A')
            listing = git(root, 'ls-tree', '-rz', source_a)
            data['current_frame'] = {'commit': source_a,
                                     'tree': git(root, 'rev-parse', source_a + '^{tree}').decode().strip(),
                                     'tree_listing_sha256': hashlib.sha256(listing).hexdigest(),
                                     'members': len(listing.rstrip(b'\0').split(b'\0'))}
            (root / 'compatibility/rc/historical-source-replay-inputs.json').write_text(canonical(data))
            source_b = commit(root, 'independent source metadata B')
            original = json.loads((ROOT / 'compatibility/rc/parent-private-npm-current-profile-inputs-v1.json').read_bytes())
            def branch():
                return {'source_parent': source_b, 'source_files': [], 'support_files': [], 'input_files': [],
                        'support_discovery': [{'root': name, 'suffixes': ['.cjs', '.js', '.mjs', '.py', '.sh', '.ts'], 'paths': []}
                                              for name in ('tests', 'compatibility/handoff/codex-closeout/tools')]}
            profile = {'schema_version': 1, 'scope': 'maintained-tool-owned-npm-invocations',
                       'historical_artifacts': original['historical_artifacts'],
                       'lines': {'21.x': branch(), 'main': branch()}}
            (root / PROFILE).write_text(canonical(profile))
            profile_c = commit(root, 'immutable synthetic final profile DATA C')
            raw = (root / PROFILE).read_bytes()
            digest = hashlib.sha256(raw).hexdigest()
            checker = (root / CHECKER).read_text()
            before_pin = next(line for line in checker.splitlines() if line.startswith('NPM_CURRENT_PRIVATE_PROFILE_SHA256 = '))
            (root / CHECKER).write_text(checker.replace(before_pin, 'NPM_CURRENT_PRIVATE_PROFILE_SHA256 = "' + digest + '"'))
            descriptor = {'schema_version': 1, 'line': data['line'],
                          'profile': {'path': PROFILE, 'sha256': digest, 'bytes': len(raw), 'commit': profile_c}}
            (root / DOC).write_text('Independent finalized source-root fixture document.\n\n'
                                    '<!-- npm-current-profile-checker-self-pin-v1 -->\n```json\n'
                                    + canonical(descriptor) + '```\n'
                                    '<!-- /npm-current-profile-checker-self-pin-v1 -->\n')
            commit(root, 'actual synthetic final descriptor and checker seal D')
            document_before = (root / DOC).read_bytes()
            report = self.run_probe(root)
            self.assertTrue(report['source_document_contains_seal_descriptor'])
            self.assertEqual((root / DOC).read_bytes(), document_before)
        self.assertEqual((ROOT / DOC).read_bytes(), production_before)


if __name__ == '__main__':
    unittest.main()
