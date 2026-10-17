# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite exact history readers, never current runtime admission."""
import gzip
import hashlib
import json
from weakref import WeakKeyDictionary
from tests.chip_history_union import chip_history_read,mark_chip_history_view,validate_chip_history_current

INPUT='compatibility/rc/recorded-source-context-inputs.json'
OUTPUT='compatibility/rc/recorded-source-context-outputs.json'
INPUT_PINS={'main': 'e1ac134a7018bd36d49d2e8f6f000cc0d714b82be318cb880d51380900c8acb5', '21.x': '941bf45036d3f1a3ecab1680d7a75fcf50db96c5956c151937b4bc211bdbf996'}
OUTPUT_PINS={'main': 'a05dcd9ca107f66882b1ae4b8169178a4bb54a2c9059424e3da43f4a3be1db2d', '21.x': '85d1724a5c9cce63a6c1cda5e05c87ad3931c61c8b082c55f05cd57c6aa8f5dc'}
JS_PIN='9ab4bb50af0cb9fd7c5343cfae25bf5bb774f37c33c671726c60c583cfd5d695'
_CACHE={};_VIEWS=WeakKeyDictionary();_READERS=WeakKeyDictionary()
_sha=lambda b:hashlib.sha256(b).hexdigest()

def recorded_source_context(root,read):
    if read in _VIEWS:return _VIEWS[read]
    read=chip_history_read(root,read)
    raw=read(INPUT);data=json.loads(raw);line=data['line'];assert _sha(raw)==INPUT_PINS[line]
    final=read(OUTPUT);output=json.loads(final);assert _sha(final)==OUTPUT_PINS[line]
    assert output['line']==line and output['inputs']==dict(path=INPUT,sha256=_sha(raw))
    prior=read(data['prior']['path']);after=read(output['expected']['path'])
    assert _sha(prior)==data['prior']['sha256'];assert _sha(after)==output['expected']['sha256']
    assert _sha(read('scripts/recorded-execution-source-context.mjs'))==JS_PIN
    key=(str(root),line,_sha(raw),_sha(final))
    if key not in _CACHE:
        before_raw=gzip.decompress(prior);after_raw=gzip.decompress(after)
        assert _sha(before_raw)==data['prior']['raw_sha256'];assert _sha(after_raw)==output['expected']['raw_sha256']
        before=json.loads(before_raw);expected=json.loads(after_raw)
        assert before['line']==expected['line']==line and before['baseline']==data['baseline']
        for member in [*before['sources'],*before['frame_tooling_before'],*before['reviews'],*before['authored_stores'],*before['authored_reviews'],*expected['members']]:assert _sha(member['text'].encode())==member['sha256']
        assert _sha(before['ledger_text'].encode())==before['ledger_sha256']
        assert _sha(before['implementation_ledger_text'].encode())==before['implementation_ledger_sha256']
        _CACHE[key]=(data,before,expected,output)
    return _CACHE[key]

def validate_recorded_subjects(root,read):
    """Strict current/history identities before the older eager Python checks."""
    validate_chip_history_current(root,read)
    read=chip_history_read(root,read)
    data,before,after,_=recorded_source_context(root,read)
    previous={m['path']:m['sha256'] for m in before['sources']}
    previous.update({m['path']:m['sha256'] for m in before['authored_stores']})
    previous[before['ledger_path']]=before['ledger_sha256']
    for member in [*data['changes'],*data['new_source_members'],*after['members']]:
        path=member['path'];allowed={member.get('current_sha256',member.get('sha256'))}
        if path in previous:allowed.add(previous[path])
        assert _sha(read(path)) in allowed,path


def recorded_historical_read(root,read):
    if read in _VIEWS:return read
    if read in _READERS:return _READERS[read]
    ctx=recorded_source_context(root,read);data,before,after,_=ctx
    successor=chip_history_read(root,read)
    sources={m['path']:m for m in before['sources']};changes={m['path']:m for m in data['changes']}
    previous={before['ledger_path']:dict(text=before['ledger_text'],sha256=before['ledger_sha256']),**{m['path']:m for m in before['authored_stores']}}
    current={m['path']:m for m in after['members']}
    def projected(path):
        raw=successor(path);fingerprint=_sha(raw)
        if path in sources and fingerprint==changes[path]['current_sha256']:return sources[path]['text'].encode()
        if path in previous and path in current and fingerprint==current[path]['sha256']:return previous[path]['text'].encode()
        return raw
    mark_chip_history_view(root,projected,read)
    _VIEWS[projected]=ctx;_READERS[read]=projected;return projected

def recorded_implementation_subject(root,path,read=None):
    read=chip_history_read(root,read or (lambda p:(root/p).read_bytes()));_,before,after,_=recorded_source_context(root,read)
    assert path==before['ledger_path']
    current=next(m for m in after['members'] if m['path']==path)
    assert _sha(read(path)) in (current['sha256'],before['implementation_ledger_sha256'])
    return before['implementation_ledger_text'].encode()
