# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact historical task subjects; never a current admission/source reader."""
import gzip
import hashlib
import json
import subprocess

PRIOR = 'compatibility/rc/ripple-global-options-integration-prior.json.gz'
INPUTS = 'compatibility/rc/ripple-global-options-integration-inputs.json'
LEDGER = 'compatibility/f10/authored-dependency-dispositions.json'
PRIOR_PINS = {'main': 'db2dfef8aae2af08c065a648cab2db3442ef5acbba794075bdee1f84a58a8e82',
              '21.x': '0a28eaf31c5f795ac867af0cf265800effbdb3b78377b350886047a7a4718a4d'}
INPUT_PINS = {'main': 'c9af788ae5cd8cd6f1191646f582a610c67dff38feefe1a37b7a36457ef63a05', '21.x': 'c6751a194de3af3c42006458b1ba483fb5f0a5e4a292667f969bd89748e5fcc3'}
TEST_PATHS = {'tests/test_chip_source_scope_requalification.py', 'tests/test_chip_recent_history.py',
              'tests/test_older_audit_history.py', 'tests/test_current_audit_native.py',
              'tests/chip_source_scope_requalification_probe.mjs', 'tests/test_import_cleanup_review_history.py'}
sha = lambda raw: hashlib.sha256(raw).hexdigest()


def integration_state(root):
    stored = (root / PRIOR).read_bytes()
    prior = json.loads(gzip.decompress(stored))
    assert sha(stored) == PRIOR_PINS[prior['line']], 'changed ledger preimage'
    raw_inputs = (root / INPUTS).read_bytes()
    assert sha(raw_inputs) == INPUT_PINS[prior['line']], 'changed context edit registry'
    inputs = json.loads(raw_inputs)
    assert inputs['line'] == prior['line'] and inputs['prior_sha256'] == sha(stored)
    original = subprocess.check_output(['git', '--no-replace-objects', 'show', prior['source_parent'] + ':' + LEDGER], cwd=root)
    assert sha(original) == prior['ledger']['sha256'] == sha(prior['ledger']['text'].encode())
    expected = json.loads(prior['ledger']['text'])
    wanted = {(file, '@angular/material/core', symbol) for file in ['legacy-chips/chip.ts',
        'legacy-tabs/internal/tab-nav-bar-base.ts', 'legacy-tabs/tab-nav-bar/tab-nav-bar.ts']
        for symbol in ['MAT_RIPPLE_GLOBAL_OPTIONS', 'RippleGlobalOptions']}
    assert {(r['file'], r['module'], r['symbol']) for r in prior['selected']} == wanted
    changed = 0
    for row in expected['symbol_uses']:
        if (row['file'], row['module'], row['symbol']) in wanted:
            assert row['status'] == 'inventory-seed' and row['disposition'] == 'open' and 'source_review' not in row
            row.update(status='reviewed', disposition='closed', source_review=prior['review']); changed += 1
    assert changed == 6 and expected['reviewed_uses'] == 1446 and expected['open_uses'] == 290
    expected.update(reviewed_uses=1452, open_uses=284,
        note='Frozen1736-use denominator retained. Six exact chip/tab ripple token/type source reviews admitted; prior receipts and source epochs are preserved. Current valid reviewed labels: 1452; open: 284. Native, packed and full floor qualification remain separate; G11 not-passed.')
    assert (json.dumps(expected, indent=2) + '\n').encode() == (root / LEDGER).read_bytes(), 'unknown ledger delta'
    for member in [prior['review'], *prior['independent_evidence'], *prior['source_members']]:
        assert sha((root / member['path']).read_bytes()) == member['sha256'], member['path']
    assert {e['path'] for e in inputs['test_context_edits']} == {p['path'] for p in prior['test_preimages']}
    for edit in inputs['test_context_edits']:
        before = next(m for m in prior['test_preimages'] if m['path'] == edit['path'])
        text = before['text']; assert sha(text.encode()) == before['sha256']
        for start, end in edit['substitutions']:
            assert text.count(start) == 1; text = text.replace(start, end)
        assert sha(text.encode()) == edit['after_sha256']
        assert (root / edit['path']).read_bytes() == text.encode(), edit['path']
    return prior, inputs


def historical_protected_bytes(root, path):
    """Unchanged members remain raw; only exact registered preimages may differ."""
    if path != LEDGER and path not in TEST_PATHS:
        return (root / path).read_bytes()
    prior, _ = integration_state(root)
    if path == LEDGER:
        return prior['ledger']['text'].encode()
    matches = [m for m in prior['test_preimages'] if m['path'] == path]
    assert len(matches) == 1, 'unregistered test preimage'
    return matches[0]['text'].encode()


def historical_task_diff(root, start, paths):
    """The original zero-diff assertion has an explicit immutable end subject."""
    prior, _ = integration_state(root)
    frames = [frame for frame in prior['preservation_frames'] if frame['source_parent'] == start]
    assert len(frames) == 1, 'unregistered preservation source epoch'
    assert paths and all(path in ['projects', 'testing', 'reference', 'fixtures', 'compatibility/f10'] for path in paths)
    return subprocess.check_output(['git', '--no-replace-objects', 'diff', '--name-only', start,
        frames[0]['preservation_end'], '--', *paths], cwd=root)
