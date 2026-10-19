# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact historical task bytes after the current167-source successor validates."""
import json
import subprocess


def parent_bytes(root, path):
    child = subprocess.run(['node', 'scripts/fixture-lifecycle-requalification.mjs', '--qualification-parent'],
        cwd=root, capture_output=True, text=True, timeout=60)
    assert child.returncode == 0, (child.stdout + child.stderr)[-10000:]
    data = json.loads(child.stdout)
    matches = [m for m in data['ledger_preimages'] + data['context_preimages'] if m['path'] == path]
    assert len(matches) <= 1
    return matches[0]['text'].encode() if matches else (root / path).read_bytes()
