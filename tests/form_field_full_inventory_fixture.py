#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Build modeled historical source capsules; never claims artifact qualification."""
import hashlib
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SUBJECT = '4015b7002997bb18d20d0b2fb2d6a99c223dab3c'
sys.path[:0] = [str(ROOT / 'scripts'), str(ROOT / 'tests')]
import test_current_sass_source as source_fixture
from test_sass_ordinary_control_gate import OrdinaryControlGateTests as Control
from test_sass_spinner_snack_gate_integration import SpinnerSnackGateIntegrationTests as Spinner
from test_ordinary_card_entry import OrdinaryCardEntryTests as Card


def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True).strip()


def physical_inventory(root):
    # Include ignored paths and symlinks; no symlink is followed. Capture file
    # content and metadata, so an unknown or changed ignored file blocks removal.
    records = {}
    def fail_walk(error):
        raise error
    for directory, dirs, files in os.walk(root, followlinks=False, onerror=fail_walk):
        for name in sorted(dirs + files):
            path = Path(directory) / name
            relative = path.relative_to(root).as_posix()
            before = path.lstat()
            if stat.S_ISLNK(before.st_mode):
                value = ('link', before.st_mode, os.readlink(path))
            elif stat.S_ISDIR(before.st_mode):
                value = ('directory', before.st_mode)
            elif stat.S_ISREG(before.st_mode):
                digest = hashlib.sha256()
                with path.open('rb') as file:
                    for block in iter(lambda: file.read(1024 * 1024), b''):
                        digest.update(block)
                after = path.lstat()
                if (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_mode) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_mode):
                    raise ValueError('fixture changed during inventory: ' + relative)
                value = ('file', before.st_mode, before.st_size, digest.hexdigest())
            else:
                raise ValueError('unexpected fixture file type: ' + relative)
            records[relative] = value
    return records


def main():
    if git('rev-parse', SUBJECT + '^{commit}') != SUBJECT:
        raise ValueError('historical fixture commit does not resolve exactly')
    old_root = source_fixture.ROOT
    initialized = []
    temp = Path(tempfile.mkdtemp(prefix='form-color-full-inventory-'))
    baseline = temp / 'baseline'
    registered = False
    snapshot = None
    tree = None
    try:
        subprocess.run(['git', 'worktree', 'add', '--detach', str(baseline), SUBJECT],
                       cwd=ROOT, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        registered = True
        if baseline.resolve() == ROOT.resolve():
            raise ValueError('fixture resolved to the source checkout')
        head = git('rev-parse', 'HEAD', cwd=baseline)
        tree = git('rev-parse', 'HEAD^{tree}', cwd=baseline)
        index_tree = git('write-tree', cwd=baseline)
        if head != SUBJECT or tree != git('rev-parse', SUBJECT + '^{tree}') or index_tree != tree:
            raise ValueError('fixture HEAD or index does not match historical subject')
        if git('status', '--porcelain', '--untracked-files=all', cwd=baseline):
            raise ValueError('new historical fixture is dirty')
        entries = git('worktree', 'list', '--porcelain').splitlines()
        if 'worktree ' + str(baseline.resolve()) not in entries:
            raise ValueError('historical fixture is not registered')
        for package in ('@angular/core', '@angular/material', '@angular/cdk', 'sass'):
            dest = baseline / 'node_modules' / package
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copytree((ROOT / 'node_modules' / package).resolve(), dest)
        sass_siblings = (ROOT / 'node_modules/sass').resolve().parent
        for package in ('immutable', 'chokidar', 'source-map-js'):
            shutil.copytree((sass_siblings / package).resolve(), baseline / 'node_modules' / package)
        snapshot = physical_inventory(baseline)
        source = source_fixture.CurrentSassSource(baseline)
        bound_count = len(source.bound)
        if bound_count != 835:
            raise ValueError('historical source closure size differs')
        if os.environ.get('FORM_COLOR_FIXTURE_SMOKE') == '1':
            with patch('os.scandir', side_effect=PermissionError('injected scan failure')):
                try:
                    physical_inventory(baseline)
                except PermissionError:
                    pass
                else:
                    raise AssertionError('physical inventory ignored a scan failure')
            print(json.dumps(dict(result='smoke', head=head, tree=tree, index_tree=index_tree,
                                  source_bound_count=bound_count, registered=True, scan_error_rejected=True)))
            return
        source_fixture.ROOT = baseline
        for cls in (Control, Spinner, Card):
            cls.setUpClass()
            initialized.append(cls)
        card = Card()
        cards = [card.model(row)['body'] for row in Card.rows if row['case_id'].startswith('mixin-css/')]
        # The spinner fixture is the synthetic source root for density and
        # private-card contexts as well. Add missing historical inputs only;
        # never replace an already authenticated fixture file.
        for name in ('scripts', 'fixtures', 'compatibility/rc'):
            for path in (baseline / name).rglob('*'):
                if not path.is_file() or path.is_symlink() or '/reports/' in str(path):
                    continue
                dest = Spinner.root / path.relative_to(baseline)
                if not dest.exists():
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(path, dest)
        data = dict(controlRoot=str(Control.root), spinnerRoot=str(Spinner.root), cardRoot=str(Card.root),
                    control=Control.bodies, spinner=Spinner.bodies, card=cards)
        result = subprocess.run(['node', str(ROOT / 'tests/form-field-full-inventory-probe.mjs')],
                                cwd=ROOT, input=json.dumps(data), text=True, capture_output=True, timeout=1080)
        if result.returncode:
            raise RuntimeError((result.stderr or result.stdout)[-10000:])
        report = json.loads(result.stdout)
        report['historical_fixture'] = dict(head=head, tree=tree, index_tree=index_tree,
                                            source_bound_count=bound_count, registered=True)
        print(json.dumps(report, separators=(',', ':')))
    finally:
        cleanup_error = None
        for cls in reversed(initialized):
            try:
                cls.tearDownClass()
            except Exception as exc:
                cleanup_error = exc
        source_fixture.ROOT = old_root
        if registered:
            try:
                entries = git('worktree', 'list', '--porcelain').splitlines()
                if (snapshot is None or tree is None or git('rev-parse', 'HEAD', cwd=baseline) != SUBJECT
                        or git('write-tree', cwd=baseline) != tree
                        or 'worktree ' + str(baseline.resolve()) not in entries
                        or git('status', '--porcelain', '--untracked-files=all', cwd=baseline)
                        or physical_inventory(baseline) != snapshot):
                    raise RuntimeError('historical worktree identity or complete physical inventory changed')
                subprocess.run(['git', 'worktree', 'remove', str(baseline)], cwd=ROOT, check=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
            except Exception as exc:
                cleanup_error = RuntimeError(f'historical worktree preserved at {baseline}: {exc}')
        if not baseline.exists():
            try:
                temp.rmdir()
            except OSError as exc:
                cleanup_error = RuntimeError(f'fixture parent preserved at {temp}: {exc}')
        if cleanup_error is not None:
            raise cleanup_error


if __name__ == '__main__':
    main()
