# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact history-only successor; current runtime validators use actual files."""
import gzip
import hashlib
import json
import subprocess
from weakref import WeakKeyDictionary
from tests.chip_batch_history import batch_history_read,batch_recorded_stage_subject,BATCH_HISTORY_STAGES,validate_batch_history_current

INPUT='compatibility/rc/chip-history-union-inputs.json'
PINS={'main': '8eaac78f9ed1d217035fe69ff8776578e612ed04ebad979e93a6c5ca550c7925', '21.x': '8b9e6784e47ea448cfe6ce50dbf03670e9178e82e74560d813281f4577c0f5c1'}
JS_PIN='ce0c92f6dafc4372e549c2eaad5ea739417240bbbcc17aff94e91ebc036004a9'
_CACHE={};_VIEWS=WeakKeyDictionary();_READERS=WeakKeyDictionary()
_sha=lambda b:hashlib.sha256(b).hexdigest()


def chip_history_union_context(root,read):
    if read in _VIEWS:return _VIEWS[read]
    read=batch_history_read(root,read)
    raw=read(INPUT);data=json.loads(raw);assert _sha(raw)==PINS[data['line']]
    stored=read(data['prior']['path']);assert _sha(stored)==data['prior']['sha256']
    extra=read(data['supplement']['path']);assert _sha(extra)==data['supplement']['sha256']
    assert _sha(read('scripts/chip-history-union.mjs'))==JS_PIN
    key=(str(root),_sha(raw))
    if key not in _CACHE:
        unpacked=gzip.decompress(stored);assert _sha(unpacked)==data['prior']['raw_sha256'];before=json.loads(unpacked)
        assert before['line']==data['line'] and before['source_parent']==data['source_parent']
        unpacked_extra=gzip.decompress(extra);assert _sha(unpacked_extra)==data['supplement']['raw_sha256'];supplemental=json.loads(unpacked_extra)
        assert supplemental['line']==data['line'] and supplemental['source_parent']==data['source_parent'] and supplemental['target_frame']==before['target_frame']
        before['members']+=supplemental['members'];assert len({m['path'] for m in before['members']})==len(before['members'])
        for m in before['members']:
            assert _sha(m['before_text'].encode())==m['before_sha256'];assert _sha(m['prior_current_text'].encode())==m['prior_current_sha256']
        for stage in before['stages']:
            for m in stage['members']:assert _sha(m['text'].encode())==m['sha256']
        assert [s['name'] for s in before['stages']]==['modern-chip-admission','classic-chip-list-contract','chip-source-requalification']
        _CACHE[key]=(data,before)
    return _CACHE[key]


def validate_chip_history_current(root,read,required=False):
    validate_batch_history_current(root,read)
    read=batch_history_read(root,read)
    data,before=chip_history_union_context(root,read);current=_sha(read(data['ledger_path']))==data['ledger_sha256']
    assert current or not required
    if current:
        previous={m['path']:m for m in before['members']}
        for m in data['current_subjects']:
            allowed={m['sha256'],*data['retained_source_identities'].get(m['path'],[])}
            if m['path'] in previous:allowed.add(previous[m['path']]['before_sha256'])
            assert _sha(read(m['path'])) in allowed,m['path']
    return data,before


def mark_chip_history_view(root,view,read):
    _VIEWS[view]=chip_history_union_context(root,read)
    return view


def chip_history_read(root,read):
    if read in _VIEWS:return read
    read=batch_history_read(root,read)
    data,before=chip_history_union_context(root,read)
    if read in _READERS:return _READERS[read]
    current={m['path']:m['sha256'] for m in data['current_subjects']};previous={m['path']:m for m in before['members']}
    def projected(path):
        raw=read(path)
        if path in previous and _sha(raw)==current.get(path):return previous[path]['before_text'].encode()
        return raw
    _VIEWS[projected]=(data,before);_READERS[read]=projected
    return projected


def recorded_stage_subject(root,stage,path,read=None):
    read=read or (lambda p:(root/p).read_bytes())
    if stage in BATCH_HISTORY_STAGES:return batch_recorded_stage_subject(root,stage,path,read)
    read=batch_history_read(root,read);data,before=chip_history_union_context(root,read)
    selected=[m for s in before['stages'] if s['name']==stage for m in s['members'] if m['path']==path]
    assert len(selected)==1,'unregistered chip history stage/member';current=next(m for m in data['current_subjects'] if m['path']==path)
    assert _sha(read(path)) in (current['sha256'],selected[0]['sha256']),'unreviewed chip history stage subject'
    return selected[0]['text'].encode()


def historical_product_diff(root,baseline,read=None,name_only=False):
    read=read or (lambda p:(root/p).read_bytes());data,before=chip_history_union_context(root,read)
    assert baseline in {row['base'] for row in before['product_comparisons']},'unregistered historical product base'
    scope=['projects','testing','reference','fixtures']
    git=lambda *args:subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=root)
    assert git('diff',before['qualified_product_frame'],'--',*scope)==b'','unreviewed current product delta'
    assert git('ls-files','--others','--exclude-standard','--',*scope)==b'','unreviewed added product member'
    return git('diff',baseline,before['target_frame'],*(['--name-only'] if name_only else []),'--',*scope)
