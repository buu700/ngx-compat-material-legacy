# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite exact predecessor and stage views, never native admission."""
import copy
import gzip
import hashlib
import json
from weakref import WeakKeyDictionary
INPUT='compatibility/rc/chip-batch-history-inputs.json'
PINS={'main': '6c0d45e439b635b5a20c0a45358020783ad246a96f8bfceb3125f3c1c7afa1f1', '21.x': '1c6aef4b435491aea12ad5cd8a91955dbedcc654250c66ef95e97443096c6c35'}
JS_PIN='d4dc422424237aed97ff955c4d79bdff47d5a77a62833cc701ea647e9bbb98a8'
BATCH_HISTORY_STAGES=['chip-edit-admission','chip-input-api-admission','chip-modernization-admission','chip-audit-source-requalification','chip-source-batch-requalification']
_CACHE={};_VIEWS=WeakKeyDictionary();_READERS=WeakKeyDictionary()
_sha=lambda b:hashlib.sha256(b).hexdigest()

def _context(root,read):
    if read in _VIEWS:return _VIEWS[read]
    raw=read(INPUT);data=json.loads(raw);assert _sha(raw)==PINS[data['line']]
    stored=read(data['prior']['path']);source_stored=read(data['source_prior']['path'])
    assert _sha(stored)==data['prior']['sha256'];assert _sha(source_stored)==data['source_prior']['sha256']
    assert _sha(read('scripts/chip-batch-history.mjs'))==JS_PIN
    key=(str(root),_sha(raw))
    if key not in _CACHE:
        unpacked=gzip.decompress(stored);source_raw=gzip.decompress(source_stored)
        assert _sha(unpacked)==data['prior']['raw_sha256'];assert _sha(source_raw)==data['source_prior']['raw_sha256']
        before=json.loads(unpacked);source_prior=json.loads(source_raw)
        assert before['line']==source_prior['line']==data['line'];assert before['source_parent']==source_prior['source_parent']==data['source_parent'];assert before['predecessor_frame']==data['predecessor_frame']
        assert _sha(source_prior['ledger_text'].encode())==data['ledger_sha256']
        current={m['path'] for m in data['current_subjects']};assert len(current)==len(data['current_subjects']);assert len(before['mappings'])==data['mapping_count'];assert len({m['path'] for m in before['mappings']})==data['mapping_count']
        for m in before['mappings']:
            assert _sha(m['before_text'].encode())==m['before_sha256'];assert _sha(m['parent_text'].encode())==m['parent_sha256'];assert m['path'] in current
        assert [s['name'] for s in before['stages']]==BATCH_HISTORY_STAGES
        assert data['stages']==[dict(name=s['name'],commit=s['commit'],paths=[m['path'] for m in s['members']]) for s in before['stages']]
        for stage in before['stages']:
            for m in stage['members']:assert _sha(m['text'].encode())==m['sha256'] and m['path'] in current and not m['path'].startswith('projects/')
        _CACHE[key]=(data,before,source_prior)
    return _CACHE[key]

def batch_history_context(root,read):
    # Public callers cannot poison the shared immutable facts through returned data.
    return copy.deepcopy(_context(root,read))

def validate_batch_history_current(root,read,required=False):
    data,before,source=_context(root,read);current=_sha(read(data['ledger_path']))==data['ledger_sha256'];assert current or not required
    if current:
        for m in data['current_subjects']:assert _sha(read(m['path']))==m['sha256'],m['path']
    return copy.deepcopy((data,before,source))

def batch_history_read(root,read):
    if read in _VIEWS:return read
    ctx=_context(root,read)
    if read in _READERS:return _READERS[read]
    data,before,_=ctx;current={m['path']:m['sha256'] for m in data['current_subjects']};previous={m['path']:m for m in before['mappings']}
    def projected(path):
        raw=read(path)
        if path in previous and _sha(raw)==current.get(path):return previous[path]['before_text'].encode()
        return raw
    _VIEWS[projected]=ctx;_READERS[read]=projected;return projected

def batch_recorded_stage_subject(root,stage,path,read=None):
    read=read or (lambda p:(root/p).read_bytes());data,before,_=_context(root,read)
    selected=[m for s in before['stages'] if s['name']==stage for m in s['members'] if m['path']==path];assert len(selected)==1,'unregistered batch history stage/member'
    current=next(m for m in data['current_subjects'] if m['path']==path)
    assert _sha(read(path)) in (current['sha256'],selected[0]['sha256']),'unreviewed batch stage subject'
    return selected[0]['text'].encode()
