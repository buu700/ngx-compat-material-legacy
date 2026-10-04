"""Movable run closure. The producing machine path is not an input."""
from __future__ import annotations

import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from archive_run_closure import ClosureError, check_closure, write_closure


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


class ClosureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-closure-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'origin'
        self.library = b'library-bytes-a'
        self.cli = b'cli-bytes'
        self.execution = b'{"schema_version":1}\n'
        self.pack_exec = b'{"status":"completed"}\n'
        self.observation = b'{"case":"api"}\n'
        self._populate(self.root)

    def _populate(self, root: Path) -> None:
        library = _sha(self.library)
        cli = _sha(self.cli)
        execution = _sha(self.execution)
        pack_exec = _sha(self.pack_exec)
        observation = _sha(self.observation)
        _write(root / 'ngx-compat-material-legacy-22.0.0-rc.0.tgz', self.library)
        _write(root / 'inputs/migrate-cli.tgz', self.cli)
        _write(root / 'execution-record.json', self.execution)
        _write(root / 'pack-execution.json', self.pack_exec)
        _write(root / 'pack-meta.json', json.dumps({'tarball': 'ngx-compat-material-legacy-22.0.0-rc.0.tgz'}).encode() + b'\n')
        _write(root / 'evidence/api-completeness/invocation/api-observations.json', self.observation)
        report = {
            'outputs': [{
                'path': 'evidence/api-completeness/invocation/api-observations.json',
                'sha256': observation,
                'bytes': len(self.observation),
            }],
        }
        _write(root / 'reports/api-completeness.json', json.dumps(report).encode() + b'\n')
        run = {
            'run_id': 'verify-main-test',
            'artifacts': [
                {'id': 'library', 'path': 'ngx-compat-material-legacy-22.0.0-rc.0.tgz', 'sha256': library, 'bytes': len(self.library)},
                {'id': 'migrate-cli', 'path': 'inputs/migrate-cli.tgz', 'sha256': cli, 'bytes': len(self.cli)},
            ],
            'execution_record': {'path': 'execution-record.json', 'sha256': execution, 'bytes': len(self.execution)},
            'pack_execution': {'path': 'pack-execution.json', 'sha256': pack_exec, 'bytes': len(self.pack_exec)},
            'pack_metadata': {'path': 'pack-meta.json', 'sha256': _sha((root / 'pack-meta.json').read_bytes()), 'bytes': (root / 'pack-meta.json').stat().st_size},
            'expected_matrix': {'path': 'compatibility/rc/matrices/full-verify.json', 'sha256': _sha(b'matrix-v1\n')},
        }
        _write(root / 'run.json', json.dumps(run).encode() + b'\n')
        summary = {
            'run_id': 'verify-main-test',
            'out': '/tmp/this-machine-does-not-exist/artifacts/main/closure',
            'completeness': {'automatic_product_result': 'incomplete', 'validated_files': [
                {'root': 'run', 'path': 'run.json', 'sha256': _sha((root / 'run.json').read_bytes()), 'bytes': (root / 'run.json').stat().st_size},
                {'root': 'run', 'path': 'reports/api-completeness.json', 'sha256': _sha((root / 'reports/api-completeness.json').read_bytes()), 'bytes': (root / 'reports/api-completeness.json').stat().st_size},
            ]},
        }
        _write(root / 'verify-summary.json', json.dumps(summary).encode() + b'\n')

    def test_moved_failed_run_rechecks_without_the_origin_path(self):
        write_closure(self.root)
        moved = Path(self.temp.name) / 'rehydrated'
        shutil.copytree(self.root, moved)
        self.assertFalse(Path('/tmp/this-machine-does-not-exist/artifacts/main/closure').exists())
        index = check_closure(moved)
        self.assertEqual(index['run_id'], 'verify-main-test')
        listed = {item['path'] for item in index['files']}
        for name in (
            'run.json', 'pack-execution.json', 'pack-meta.json', 'execution-record.json',
            'inputs/migrate-cli.tgz', 'ngx-compat-material-legacy-22.0.0-rc.0.tgz',
            'reports/api-completeness.json', 'evidence/api-completeness/invocation/api-observations.json',
        ):
            self.assertIn(name, listed)

    def test_missing_manifest_fails(self):
        write_closure(self.root)
        moved = Path(self.temp.name) / 'missing'
        shutil.copytree(self.root, moved)
        (moved / 'execution-record.json').unlink()
        with self.assertRaises(ClosureError) as caught:
            check_closure(moved)
        self.assertIn('execution-record.json', str(caught.exception))

    def test_bytes_from_another_run_are_rejected(self):
        write_closure(self.root)
        other = b'library-bytes-from-another-run'
        self.assertNotEqual(other, self.library)
        (self.root / 'ngx-compat-material-legacy-22.0.0-rc.0.tgz').write_bytes(other)
        with self.assertRaises(ClosureError) as caught:
            check_closure(self.root)
        self.assertIn('hash mismatch', str(caught.exception))

    def test_source_matrix_must_match_when_a_checkout_is_supplied(self):
        write_closure(self.root)
        source = Path(self.temp.name) / 'source'
        matrix = source / 'compatibility/rc/matrices/full-verify.json'
        _write(matrix, b'matrix-v1\n')
        check_closure(self.root, source)
        matrix.write_bytes(b'matrix-v2\n')
        with self.assertRaises(ClosureError) as caught:
            check_closure(self.root, source)
        self.assertIn('matrix hash', str(caught.exception))


if __name__ == '__main__':
    unittest.main()
