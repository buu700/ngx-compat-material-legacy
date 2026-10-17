# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Test-only exact ledger/registry epoch; product/native code uses raw files."""
import gzip
import hashlib
import json
from copy import deepcopy
INPUT='compatibility/rc/chip-lifecycle-admission-inputs.json'
PINS={'main':'b71d71af00ddd8737515f1279e009e34e447ae23991908706782ef1742b2be1f','21.x':'a315aed37bffbf7961cd0e3b6da36509fb40b38412af2e76e3a4e78eefc58db6'}
_sha=lambda b:hashlib.sha256(b).hexdigest()
_CACHE={}

def _context(root,read=None):
    read=read or (lambda p:(root/p).read_bytes());raw=read(INPUT);data=json.loads(raw);assert _sha(raw)==PINS[data['line']]
    stored=read(data['prior']['path']);assert _sha(stored)==data['prior']['sha256']
    key=(str(root),_sha(raw))
    if key not in _CACHE:
        unpacked=gzip.decompress(stored);assert _sha(unpacked)==data['prior']['raw_sha256'];prior=json.loads(unpacked)
        assert prior['line']==data['line'] and prior['source_parent']==data['source_parent'];assert _sha(prior['ledger_text'].encode())==prior['ledger_sha256']
        for m in prior['sources']:assert _sha(m['text'].encode())==m['sha256']
        _CACHE[key]=(data,prior)
    return _CACHE[key]

def admission_context(root,read=None):
    return deepcopy(_context(root,read))

def admission_before_member(root,path,read=None):
    read=read or (lambda p:(root/p).read_bytes());data,prior=_context(root,read);raw=read(path)
    current=next((m for m in data['current_members'] if m['path']==path),None)
    if current and _sha(raw)==current['sha256']:
        return prior['ledger_text'].encode() if path==prior['ledger_path'] else next(m['text'].encode() for m in prior['sources'] if m['path']==path)
    return raw
