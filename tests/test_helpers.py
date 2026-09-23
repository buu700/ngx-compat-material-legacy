from __future__ import annotations
import copy
import importlib.util
import io
import json
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name: str, file: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


boot = load('bootstrap_material', 'bootstrap-material.py')
check = load('inspect_package', 'inspect-packed-package.py')
ENTRIES = json.loads((ROOT / 'research/scope.json').read_text())['preserved_entry_points']


def clean_package():
    manifest = {
        'name': check.PACKAGE, 'version': '22.0.0-next.0', 'license': 'MIT',
        'peerDependencies': {p: '^22.0.0' for p in
                             ('@angular/core', '@angular/common', '@angular/forms', '@angular/material', '@angular/cdk')},
        'dependencies': {'tslib': '^2.3.0'},
        'exports': {'.': {'sass': './_index.scss'}, **{
            './'+e: {'types': './types.d.ts', 'default': './fesm2022/library.mjs'} for e in ENTRIES}},
        'schematics': './schematics/collection.json',
    }
    return {
        'package.json': json.dumps(manifest).encode(),
        'LICENSE': (ROOT / 'templates/LICENSE').read_bytes(),
        '_index.scss': b'// synthetic fixture',
        'types.d.ts': b'export declare const fixture: number;',
        'fesm2022/library.mjs': b'export const fixture = 1;',
        'schematics/collection.json': json.dumps({'schematics': {'ng-add': {}, 'migrate-legacy': {}}}).encode(),
    }


class PackageChecks(unittest.TestCase):
    def setUp(self):
        self.files = clean_package()

    def result(self):
        return check.inspect_files(self.files, ENTRIES)

    def modify(self, action):
        manifest = json.loads(self.files['package.json'])
        action(manifest)
        self.files['package.json'] = json.dumps(manifest).encode()

    def test_clean_static_fixture(self):
        self.assertTrue(self.result()['ok'], self.result())

    def test_engine_runtime_rejected(self):
        self.files['fesm2022/library.mjs'] = b"import {trigger} from '@angular/animations';"
        self.assertFalse(self.result()['ok'])

    def test_engine_type_rejected(self):
        self.files['types.d.ts'] = b"import type {AnimationTriggerMetadata} from '@angular/animations';"
        self.assertFalse(self.result()['ok'])

    def test_old_namespace_rejected(self):
        self.files['fesm2022/library.mjs'] = b"export * from '@angular/material/legacy-select';"
        self.assertFalse(self.result()['ok'])

    def test_migration_detection_strings_allowed(self):
        self.files['schematics/index.js'] = b"const old = '@angular/material/legacy-select'; const engine = '@angular/animations';"
        self.assertTrue(self.result()['ok'], self.result())

    def test_wrong_notice_order_rejected(self):
        data = self.files['LICENSE'].decode()
        data = data.replace('Copyright (c) 2023 Google LLC.\nCopyright (c) 2026 Ryan Lester.',
                            'Copyright (c) 2026 Ryan Lester.\nCopyright (c) 2023 Google LLC.')
        self.files['LICENSE'] = data.encode()
        self.assertFalse(self.result()['ok'])

    def test_missing_entry_rejected(self):
        self.modify(lambda p: p['exports'].pop('./legacy-table'))
        self.assertFalse(self.result()['ok'])

    def test_missing_asset_rejected(self):
        self.files.pop('_index.scss')
        self.assertFalse(self.result()['ok'])

    def test_nested_angular_rejected(self):
        self.modify(lambda p: p['dependencies'].update({'@angular/material': '^22.0.0'}))
        self.assertFalse(self.result()['ok'])

    def test_placeholder_rejected(self):
        self.modify(lambda p: p['peerDependencies'].update({'@angular/cdk': '0.0.0-PLACEHOLDER'}))
        self.assertFalse(self.result()['ok'])

    def test_current_mirror_rejected(self):
        self.modify(lambda p: p['exports'].update({'./datepicker': './fesm2022/library.mjs'}))
        self.assertFalse(self.result()['ok'])

    def test_ng_add_is_optional(self):
        self.files['schematics/collection.json'] = json.dumps({'schematics': {'migrate-legacy': {}}}).encode()
        self.assertTrue(self.result()['ok'], self.result())

    def test_rxjs_peer_required_when_directly_imported(self):
        self.files['fesm2022/library.mjs'] = b"import {Subject} from 'rxjs';"
        self.assertFalse(self.result()['ok'])
        self.modify(lambda p: p['peerDependencies'].update({'rxjs': '^7.4.0'}))
        self.assertTrue(self.result()['ok'], self.result())

    def test_tslib_dependency_required_when_emitted(self):
        self.files['fesm2022/library.mjs'] = b"import {__decorate} from 'tslib';"
        self.modify(lambda p: p['dependencies'].pop('tslib'))
        self.assertFalse(self.result()['ok'])

    def test_sass_root_required(self):
        self.modify(lambda p: p['exports'].update({'.': {'default': './fesm2022/library.mjs'}}))
        self.assertFalse(self.result()['ok'])

    def test_tar_read_and_traversal(self):
        with tempfile.TemporaryDirectory() as td:
            good = Path(td)/'good.tgz'
            with tarfile.open(good, 'w:gz') as archive:
                for name, data in self.files.items():
                    info = tarfile.TarInfo('package/'+name); info.size = len(data)
                    archive.addfile(info, io.BytesIO(data))
            self.assertEqual(check.read_package(good), self.files)
            bad = Path(td)/'bad.tgz'
            with tarfile.open(bad, 'w:gz') as archive:
                info = tarfile.TarInfo('package/../../outside'); info.size = 1
                archive.addfile(info, io.BytesIO(b'x'))
            with self.assertRaises(ValueError):
                check.read_package(bad)
            self.assertFalse((Path(td)/'outside').exists())

    def test_tar_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            target = Path(td)/'symlink.tgz'
            with tarfile.open(target, 'w:gz') as archive:
                info = tarfile.TarInfo('package/linked'); info.type = tarfile.SYMTYPE; info.linkname = '/etc/passwd'
                archive.addfile(info)
            with self.assertRaises(ValueError):
                check.read_package(target)


class BootstrapChecks(unittest.TestCase):
    def make_upstream(self, path):
        path.mkdir()
        boot.git(['init', '-b', '16.2.x'], cwd=path)
        boot.git(['config', 'user.name', 'Synthetic Fixture'], cwd=path)
        boot.git(['config', 'user.email', 'fixture@example.invalid'], cwd=path)
        (path/'README.md').write_text('baseline\n')
        boot.git(['add', 'README.md'], cwd=path)
        boot.git(['commit', '-m', 'baseline fixture'], cwd=path)
        sha = boot.git(['rev-parse', 'HEAD'], cwd=path)
        boot.git(['tag', '16.2.14'], cwd=path)
        (path/'README.md').write_text('subsequent branch commit\n')
        boot.git(['commit', '-am', 'branch advancement'], cwd=path)
        return sha

    def test_history_and_no_push(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td); upstream = base/'upstream'; dest = base/'work'
            sha = self.make_upstream(upstream)
            result = boot.bootstrap(dest, str(upstream), 'https://github.com/buu700/ngx-compat-material-legacy.git', sha)
            self.assertEqual(result['baseline_full_commit'], sha)
            self.assertFalse(result['pushed'])
            self.assertEqual(boot.git(['branch', '--show-current'], cwd=dest), 'compat-main')
            self.assertEqual(boot.git(['rev-parse', '--is-shallow-repository'], cwd=dest), 'false')
            self.assertEqual(boot.git(['remote', 'get-url', '--push', 'upstream'], cwd=dest), 'DISABLED')
            self.assertEqual((dest/'README.md').read_text(), 'baseline\n')

    def test_existing_destination_refused(self):
        with tempfile.TemporaryDirectory() as td:
            dest = Path(td)/'existing'; dest.mkdir(); (dest/'keep').write_text('retain')
            with self.assertRaises(ValueError):
                boot.bootstrap(dest, 'https://github.com/angular/components.git', 'https://github.com/buu700/ngx-compat-material-legacy.git')
            self.assertEqual((dest/'keep').read_text(), 'retain')

    def test_wrong_expected_sha_refused(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td); upstream = base/'upstream'; self.make_upstream(upstream)
            with self.assertRaises(ValueError):
                boot.bootstrap(base/'work', str(upstream), 'https://github.com/buu700/ngx-compat-material-legacy.git', '0'*40)


if __name__ == '__main__':
    unittest.main()
