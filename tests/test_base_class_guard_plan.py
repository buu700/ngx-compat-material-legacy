# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real base frame/source guards retain cold and late callback lifetimes."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
MUTATION_SUFFIXES = (b'\n// cold helper drift\n', b'\n// cold prepared drift\n',
                     b'\n// final source callback drift\n')


def restore_known_mutations(before):
    """Recover after a reaped child; preserve any unrecognized external bytes.

    Test execution has one writer. This is not an atomic filesystem rollback or
    protection from hostile concurrent writers. Missing/linked/partial/foreign
    files require explicit recovery rather than an unconditional overwrite.
    """
    unexpected = []
    for path, original in before.items():
        if path.is_symlink() or not path.is_file():
            unexpected.append(str(path))
            continue
        current = path.read_bytes()
        if current == original:
            continue
        if current in (original + suffix for suffix in MUTATION_SUFFIXES):
            path.write_bytes(original)
        else:
            unexpected.append(str(path))
    if unexpected:
        raise RuntimeError('Unexpected test input bytes preserved; recovery required: ' + ', '.join(unexpected))


class BaseClassGuardPlanTests(unittest.TestCase):
    def test_actual_prepared_guards_and_scheduler_dependency(self):
        # The source-only member is chosen from actual owner bindings in Node.
        # Back up its finite possible owned family population and helper before
        # launching. subprocess.run kills and reaps a timed-out child before
        # this parent-owned recovery executes, unlike the child's own finally.
        paths = [ROOT / 'scripts/canonical-source-guard-plan.mjs',
                 ROOT / 'compatibility/rc/21x-base-class-owner-guard-plan-transition-v3.json',
                 ROOT / 'compatibility/rc/parent-base-admission-current-source-successor-v1.json',
                 ROOT / 'scripts/upstream-base-class-removal-admission.cjs',
                 ROOT / 'scripts/historical-contract-repair-source.mjs',
                 ROOT / 'scripts/upstream-base-class-removal-source.mjs',
                 ROOT / 'compatibility/rc/21x-base-class-removal-source-final-review.mjs']
        for family in (ROOT / 'projects/ngx-material-legacy').glob('legacy-*'):
            if family.is_dir() and not family.is_symlink():
                paths.extend(family.rglob('*.ts'))
        before = {path: path.read_bytes() for path in paths if not path.is_symlink()}
        try:
            child = subprocess.run(['node', 'tests/base_class_guard_plan_probe.mjs'], cwd=ROOT,
                                   text=True, capture_output=True, timeout=60)
        finally:
            restore_known_mutations(before)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['line'], '21.x')
        self.assertTrue(report['actual_frame_and_source_owner_executed'])
        self.assertTrue(report['actual_stage_context_executed'])
        self.assertTrue(report['guard_plan_identity_forwarded'])
        self.assertEqual(report['narrow_projection_callbacks'], [1, 1])
        self.assertEqual(report['narrow_reentrant_controls'], 4)
        self.assertEqual(report['source_read_pairing_controls'], 4)
        self.assertEqual(report['historical_source_bindings_revalidated'], 715)
        self.assertEqual(report['rejected_lifetime_faults'], 70)
        self.assertEqual(report['admission_successor_faults_rejected'], 28)
        self.assertTrue(report['exact_historical_proof_preserved'])
        self.assertTrue(report['default_source_reader_executed'])
        self.assertTrue(report['owned_source_facade_executed'])
        self.assertEqual(report['standalone_forged_reader_controls'], 2)
        self.assertEqual(report['source_reentrant_controls'], 3)
        self.assertEqual(report['distinct_scope_nesting_controls'], 2)
        self.assertEqual(report['metadata_predicate_controls'], 3)
        self.assertEqual(report['late_facade_pointer_controls'], 1)
        self.assertEqual(report['frame_dependency_reentry_controls'], 1)
        self.assertEqual(report['inspector_getters_invoked'], 0)
        self.assertTrue(report['restoration_passed'])
        self.assertTrue(report['constructor_full_guard_retained'])
        self.assertFalse(report['full_composed_owner_executed'])
        self.assertFalse(report['compiler_or_build_executed'])
        self.assertEqual(report['g11_claim'], 'not-passed')

    def test_parent_recovery_restores_known_mutations_and_preserves_foreign_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            first, foreign = Path(directory) / 'owned.ts', Path(directory) / 'external.ts'
            first.write_bytes(b'original' + MUTATION_SUFFIXES[0]); foreign.write_bytes(b'foreign')
            with self.assertRaisesRegex(RuntimeError, 'preserved'):
                restore_known_mutations({first: b'original', foreign: b'external original'})
            self.assertEqual(first.read_bytes(), b'original')
            self.assertEqual(foreign.read_bytes(), b'foreign')

    def test_parent_recovery_runs_after_a_child_is_timed_out_and_reaped(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'owned.ts'; path.write_bytes(b'original')
            script = 'import sys,time;from pathlib import Path;Path(sys.argv[1]).write_bytes(bytes.fromhex(sys.argv[2]));print("mutated",flush=True);time.sleep(60)'
            import sys
            child = subprocess.Popen([sys.executable, '-c', script, str(path),
                                      (b'original' + MUTATION_SUFFIXES[1]).hex()],
                                     text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            try:
                self.assertEqual(child.stdout.readline().strip(), 'mutated')
                with self.assertRaises(subprocess.TimeoutExpired):
                    child.communicate(timeout=0.05)
            finally:
                child.kill(); child.communicate()
                restore_known_mutations({path: b'original'})
            self.assertIsNotNone(child.returncode)
            self.assertEqual(path.read_bytes(), b'original')


if __name__ == '__main__':
    unittest.main()
