# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Authenticated historical task contexts; current admission stays raw."""
import json
import subprocess


def parent_bytes(root, path):
    if path not in {'tests/ng_zone_use_integration.py', 'tests/test_fixture_lifecycle_requalification.py'}:
        return (root / path).read_bytes()
    child = subprocess.run(['node', 'scripts/fixture-lifecycle-native-requalification.mjs', '--parent'],
        cwd=root, capture_output=True, text=True, timeout=60)
    assert child.returncode == 0, (child.stdout + child.stderr)[-10000:]
    data = json.loads(child.stdout)
    matches = [m for m in data['context_preimages'] if m['path'] == path]
    assert len(matches) == 1
    return matches[0]['text'].encode()
