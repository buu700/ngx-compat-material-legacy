# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Authenticated finite history projection; current validators always read actual files."""
import copy
import gzip
import hashlib
import json
import subprocess

INPUT='compatibility/rc/native-date-context-inputs.json'
OUTPUT='compatibility/rc/native-date-context-outputs.json'
INPUT_PINS={'main': '454c1b7b78cf9fa0444e206c7ab45638ef118922270a2a34619e29992f5df521', '21.x': 'ad9b34e36a2083a9cd08e8a730c7b766b928370e8eff8bd5a28ea6ddf9d483f2'}
OUTPUT_PINS={'main': 'bb603329c639354f6350a009a36600ce2e9470cf5ff1793f4be06effd09170c1', '21.x': '33fc7db1da33cde995e89a6e4a0b22938ae4162cd29b3d8611c80a22e5f2975b'}
JS_PIN='6e52f913ad826bcbe8e948ff9ef0147a24407e0aca76210c23fbfcb15b1ed4fb'
_CACHE={}


def project_native_date_context(root,read_member=None):
    read=read_member or (lambda p:(root/p).read_bytes())
    digest=lambda raw:hashlib.sha256(raw).hexdigest()
    raw=read(INPUT);data=json.loads(raw);line=data['line']
    assert digest(raw)==INPUT_PINS[line]
    final_raw=read(OUTPUT);output=json.loads(final_raw)
    assert digest(final_raw)==OUTPUT_PINS[line]
    assert output['line']==line and output['inputs']=={'path':INPUT,'sha256':digest(raw)}
    stored=read(data['prior']['path']);assert digest(stored)==data['prior']['sha256']
    final_stored=read(output['expected']['path']);assert digest(final_stored)==output['expected']['sha256']
    assert digest(read('scripts/native-date-packed-source-context.mjs'))==JS_PIN
    cache_key=(str(root),line,digest(stored),digest(final_stored))
    if cache_key not in _CACHE:
        before_raw=gzip.decompress(stored);assert digest(before_raw)==data['prior']['raw_sha256']
        after_raw=gzip.decompress(final_stored);assert digest(after_raw)==output['expected']['raw_sha256']
        before=json.loads(before_raw);after=json.loads(after_raw)
        assert before['baseline']==data['baseline'] and before['line']==after['line']==line
        for member in [*before['sources'],*before['reviews'],*before['authored_stores'],*before['authored_reviews'],*after['members']]:
            assert digest(member['text'].encode())==member['sha256']
        assert digest(before['ledger_text'].encode())==before['ledger_sha256']
        original=subprocess.check_output(['git','--no-replace-objects','show',data['baseline']+':compatibility/f10/disposition-ledger/ledger.json'],cwd=root)
        assert original==before['ledger_text'].encode()
        _CACHE[cache_key]=(before,after)
    before,after=_CACHE[cache_key]
    matrix=before['matrix_history'];assert digest(read(matrix['path']))==matrix['current_sha256']
    sources={m['path']:m for m in before['sources']};changes={m['path']:m for m in data['changes']}
    assert len(sources)==len(changes)==30 and sources.keys()==changes.keys()
    for path,member in sources.items():
        current=read(path);change=changes[path]
        assert digest(current) in [member['sha256'],change['current_sha256']],path
        if digest(current)==member['sha256']:continue
        text=current.decode()
        for edit in reversed(change['edits']):
            assert text[edit['start']:edit['end']]==edit['after']
            text=text[:edit['start']]+edit['before']+text[edit['end']:]
        assert text==member['text']
    previous={'compatibility/f10/disposition-ledger/ledger.json':{'text':before['ledger_text'],'sha256':before['ledger_sha256']},**{m['path']:m for m in before['authored_stores']}}
    for member in after['members']:
        allowed=[member['sha256']]
        if member['path'] in previous:allowed.append(previous[member['path']]['sha256'])
        assert digest(read(member['path'])) in allowed,member['path']
    for member in [*before['reviews'],*before['authored_reviews']]:assert digest(read(member['path']))==member['sha256'],member['path']
    for member in [*data['new_dependencies'],data['new_runtime_source']]:assert digest(read(member['path']))==member['sha256']
    assert subprocess.check_output(['git','diff',data['baseline'],'--','projects','testing','reference','fixtures'],cwd=root)==b''
    def projected(path):
        if path in sources:return sources[path]['text'].encode()
        if path in previous:return previous[path]['text'].encode()
        return read(path)
    return copy.deepcopy(json.loads(before['ledger_text'])),projected
