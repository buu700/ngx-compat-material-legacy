#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Build modeled historical source capsules; never claims artifact qualification."""
import hashlib
import json
import os
import stat
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SUBJECT = '4015b7002997bb18d20d0b2fb2d6a99c223dab3c'
sys.path[:0] = [str(ROOT / 'scripts'), str(ROOT / 'tests')]
import test_current_sass_source as source_fixture
from test_sass_ordinary_control_gate import OrdinaryControlGateTests as Control
from test_sass_spinner_snack_gate_integration import SpinnerSnackGateIntegrationTests as Spinner
from test_ordinary_card_entry import OrdinaryCardEntryTests as Card


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


HISTORICAL_DATA = (
    'compatibility/rc/oracles/material-16.2.14-sass-api.json',
    'reference/material-16.2.14/PROVENANCE.json',
    'reference/material-16.2.14/environment-package-lock.json',
    'fixtures/sass/form-field-state-contracts.json',
    'tests/form_field_state_contract_fixture.json',
    'compatibility/rc/ordinary-control-css-python-vectors-v1.json',
    'compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json',
    'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json',
    'compatibility/rc/original16-sass-source-diagnostic-identity.json',
    'fixtures/sass/default-aggregate-contracts.json',
    'tests/sass_default_aggregate_fixture.json',
    'fixtures/sass/function-contracts.json',
)


def historical_data():
    """Authenticate comparison DATA; never load or execute historical programs."""
    env = dict(PATH=os.environ.get('PATH',''), LANG='C', LC_ALL='C',
               GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null',
               GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1', GIT_TERMINAL_PROMPT='0')
    def read_git(*args):
        return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0',
                                        '-c','maintenance.auto=0',*args],cwd=ROOT,env=env)
    assert read_git('rev-parse',SUBJECT+'^{commit}').decode().strip()==SUBJECT
    read_git('merge-base','--is-ancestor',SUBJECT,'HEAD')
    rows=[]
    for path in HISTORICAL_DATA:
        cursor=ROOT
        for part in path.split('/'):
            cursor=cursor/part
            assert not cursor.is_symlink()
        assert cursor.is_file()
        actual=cursor.read_bytes();historical=read_git('show',SUBJECT+':'+path)
        assert actual==historical, 'historical comparison data changed: '+path
        assert cursor.read_bytes()==actual, 'historical comparison data changed during read: '+path
        rows.append(dict(path=path,sha256=hashlib.sha256(actual).hexdigest(),bytes=len(actual)))
    return rows


def main():
    # Current constructors authenticate only current physical source.  The old
    # commit is used exclusively as an immutable comparison-data source.
    data_before=historical_data()
    source=source_fixture.CurrentSassSource(ROOT)
    source.assert_current()
    if os.environ.get('FORM_COLOR_FIXTURE_SMOKE') == '1':
        with patch('os.scandir', side_effect=PermissionError('injected scan failure')):
            try:
                physical_inventory(ROOT)
            except PermissionError:
                pass
            else:
                raise AssertionError('physical inventory ignored a scan failure')
        assert historical_data()==data_before
        source.assert_current()
        print(json.dumps(dict(result='smoke',historical_data_commit=SUBJECT,
                              historical_data_count=len(data_before),
                              current_source_bound_count=len(source.bound),scan_error_rejected=True,
                              historical_programs_executed=False,fixture_only=True)))
        return
    initialized=[]
    try:
        for cls in (Control, Spinner, Card):
            cls.setUpClass()
            initialized.append(cls)
        card = Card()
        cards = [card.model(row)['body'] for row in Card.rows if row['case_id'].startswith('mixin-css/')]
        # Copy only missing current fixture inputs. Existing authenticated files
        # are never replaced; no historical executable enters a current reader.
        tracked = subprocess.check_output(['git','--no-replace-objects','ls-files','-z','--',
                                           'scripts','fixtures','compatibility/rc'],cwd=ROOT).decode().split('\0')
        candidates=set(tracked) | {row['path'] for row in source.bound}
        for relative in sorted(candidates):
            if not relative or not relative.startswith(('scripts/','fixtures/','compatibility/rc/')) or '/reports/' in relative:
                continue
            path=ROOT/relative
            if not path.is_file() or path.is_symlink():
                continue
            dest=Spinner.root/relative
            if not dest.exists():
                dest.parent.mkdir(parents=True,exist_ok=True)
                raw=path.read_bytes();dest.write_bytes(raw)
                assert path.read_bytes()==raw and dest.read_bytes()==raw
        data = dict(controlRoot=str(Control.root), spinnerRoot=str(Spinner.root), cardRoot=str(Card.root),
                    control=Control.bodies, spinner=Spinner.bodies, card=cards)
        result = subprocess.run(['node', str(ROOT / 'tests/form-field-full-inventory-probe.mjs')],
                                cwd=ROOT, input=json.dumps(data), text=True, capture_output=True, timeout=1080)
        if result.returncode:
            raise RuntimeError((result.stderr or result.stdout)[-10000:])
        report = json.loads(result.stdout)
        assert historical_data()==data_before
        source.assert_current()
        report['historical_data'] = dict(commit=SUBJECT,files=data_before,historical_programs_executed=False)
        report['current_source'] = dict(bound_count=len(source.bound),physical=True,fixture_only=True)
        print(json.dumps(report, separators=(',', ':')))
    finally:
        for cls in reversed(initialized):
            cls.tearDownClass()


if __name__ == '__main__':
    main()
