"""Missing explicit artifact input must stop before installation or execution."""
import os
import json
import tempfile
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedConsumerRequiresArtifact(unittest.TestCase):
    def test_missing_run_and_tarball_exits_two(self):
        env = {key: value for key, value in os.environ.items() if not key.startswith('RC_')}
        result = subprocess.run(['node', 'scripts/packed-consumer-aot-smoke.mjs'], cwd=ROOT,
            env=env, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 2, result.stderr or result.stdout)
        self.assertIn('--tarball or --run is required', result.stderr)
        self.assertIn('historical-unbound', result.stderr)

    def test_shared_coordinator_rejects_wrong_line_and_dirty_source(self):
        result = subprocess.run(['node', 'tests/packed_consumer_source_identity_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        observation = json.loads(result.stdout)
        self.assertEqual(observation['cases'], 14)
        self.assertEqual(observation['rejected'], 10)
        self.assertFalse(observation['native_executed'])

    def test_actual_consumers_stop_invalid_subject_before_artifact_or_install(self):
        git = lambda ref: subprocess.check_output(['git', '-c', 'gc.auto=0', '-c',
            'maintenance.auto=0', 'rev-parse', ref], cwd=ROOT, text=True).strip()
        version = json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())['version']
        line = '21.x' if version.startswith('21.') else 'main'
        base = {'run_id': 'source-negative', 'source_commit': git('HEAD'),
            'source_tree': git('HEAD^{tree}'), 'source_line': line, 'source_clean': True}
        with tempfile.TemporaryDirectory(prefix='consumer-source-entrypoint-') as temp:
            for check in ['packed-consumer', 'engine-free-consumer']:
                script = 'packed-consumer-aot-smoke.mjs' if check == 'packed-consumer' else 'engine-free-consumer.mjs'
                for name, change, message in [('false-clean', {'source_clean': False}, 'clean'),
                        ('foreign-line', {'source_line': 'main' if line == '21.x' else '21.x'}, 'source line')]:
                    with self.subTest(check=check, scenario=name):
                        out = Path(temp)/name/check/'evidence'/check/'source-negative'
                        out.mkdir(parents=True)
                        env = {key: value for key, value in os.environ.items() if not key.startswith('RC_')}
                        env.update(RC_CHECK_ID=check, RC_RUN_ID=base['run_id'],
                            RC_INVOCATION_ID='source-negative', RC_ASSERTION_OUTPUT_DIR=str(out),
                            RC_EVIDENCE_BINDING=json.dumps(base | change))
                        missing = Path(temp)/'does-not-exist.tgz'
                        result = subprocess.run(['node', 'scripts/'+script, '--tarball', str(missing)],
                            cwd=ROOT, env=env, capture_output=True, text=True, timeout=15)
                        self.assertEqual(result.returncode, 2, result.stderr or result.stdout)
                        self.assertIn('refusing acceptance report', result.stderr)
                        self.assertIn(message, result.stderr)
                        self.assertNotIn('Missing tarball', result.stderr)
                        self.assertEqual(list(out.iterdir()), [])

    @unittest.skipUnless(subprocess.run(['node', '-e', "require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0, 'TypeScript parser unavailable; table admission probe unexecuted')
    def test_table_construction_case_cannot_disappear_or_admit_false_observation(self):
        result = subprocess.run(['node', 'tests/packed_table_construction_admission_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        observation = json.loads(result.stdout)
        self.assertEqual(observation['cases'], 9)
        self.assertEqual(observation['mutants_rejected'], 2)
        self.assertEqual(observation['derived_cases'], 92)
        self.assertFalse(observation['native_executed'])
