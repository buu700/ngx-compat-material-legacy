# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite historical task view; live source/native readers do not import this helper."""
import json
import os
import subprocess
from tests import ripple_global_options_integration as parent

LEDGER = parent.LEDGER


class _ParentMember:
    def __init__(self, path, replacements):
        self.path, self.replacements = path, replacements

    def read_bytes(self):
        key = str(self.path.relative_to(self.replacements['root']))
        if key in self.replacements['bytes']:
            return self.replacements['bytes'][key]
        return self.path.read_bytes()

    def read_text(self):
        return self.read_bytes().decode()


class _ParentRoot:
    def __init__(self, root):
        # No receipt cache: the Node checker rehashes actual current bytes on every call.
        child = subprocess.run(['node', 'scripts/fixture-lifecycle-requalification.mjs', '--validated-parent'],
            cwd=root, capture_output=True, text=True, timeout=60)
        assert child.returncode == 0, (child.stdout + child.stderr)[-10000:]
        data = json.loads(child.stdout)
        members = {LEDGER: data['ledger']['text'].encode()}
        members.update({edit['path']: edit['text'].encode() for edit in data['test_context_edits']})
        self.root = root
        self.replacements = {'root': root, 'bytes': members}

    def __fspath__(self):
        return os.fspath(self.root)

    def __truediv__(self, path):
        return _ParentMember(self.root / path, self.replacements)


def integration_state(root):
    return parent.integration_state(_ParentRoot(root))


def parent_protected_bytes(root, path):
    return (_ParentRoot(root) / path).read_bytes()


def historical_protected_bytes(root, path):
    # Ordinary source assertions already hash their actual bytes. Only finite
    # registered substitutions need a validated historical parent projection.
    context_paths = parent.TEST_PATHS | {'tests/test_ripple_global_options_integration.py',
                                        'tests/ripple_global_options_integration_probe.mjs'}
    if path != LEDGER and path not in context_paths:
        return (root / path).read_bytes()
    return parent.historical_protected_bytes(_ParentRoot(root), path)


def historical_task_diff(root, start, paths):
    return parent.historical_task_diff(_ParentRoot(root), start, paths)
