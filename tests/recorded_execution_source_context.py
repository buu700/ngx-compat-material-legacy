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

INPUT='compatibility/rc/recorded-source-context-inputs.json'
OUTPUT='compatibility/rc/recorded-source-context-outputs.json'
INPUT_PINS={'main': 'dc4a2446283ea1faaba8ae11821ec5a6d5d72f7310af126472da36407157a139', '21.x': 'ea4d3e34614fcb29559f1c5ff58c41fd82b773cf3bf18036d0a437db2dfef057'}
OUTPUT_PINS={'main': '440372733e6c21f5e7fcbc16d8b58dbeddf93a224409529f1d9f25ce1815264b', '21.x': 'b82e61caa3f19fc16316b46660d3314e9f30e476b42129b4a7b697f04b129ee2'}
JS_PIN='c70c734ae0ae6e3e6f236ac61b1c0c0c126eafc720001cba8facff31a784c5ab'
_CACHE={};_VIEWS=WeakKeyDictionary();_READERS=WeakKeyDictionary()
_sha=lambda b:hashlib.sha256(b).hexdigest()

def recorded_source_context(root,read):
    if read in _VIEWS:return _VIEWS[read]
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
    sources={m['path']:m for m in before['sources']};changes={m['path']:m for m in data['changes']}
    previous={before['ledger_path']:dict(text=before['ledger_text'],sha256=before['ledger_sha256']),**{m['path']:m for m in before['authored_stores']}}
    current={m['path']:m for m in after['members']}
    def projected(path):
        raw=read(path);fingerprint=_sha(raw)
        if path in sources and fingerprint==changes[path]['current_sha256']:return sources[path]['text'].encode()
        if path in previous and path in current and fingerprint==current[path]['sha256']:return previous[path]['text'].encode()
        return raw
    _VIEWS[projected]=ctx;_READERS[read]=projected;return projected

def recorded_implementation_subject(root,path,read=None):
    read=read or (lambda p:(root/p).read_bytes());_,before,after,_=recorded_source_context(root,read)
    assert path==before['ledger_path']
    current=next(m for m in after['members'] if m['path']==path)
    assert _sha(read(path)) in (current['sha256'],before['implementation_ledger_sha256'])
    return before['implementation_ledger_text'].encode()
