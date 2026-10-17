# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite inherited main MediaMatcher contract; no real browser qualification."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]
EDITS_SHA='ea6ba2b3af372490fd22f0579a6b679b295c98fa7ed08d5af8a5dcd8bc0014da'
CONTRACT_SHA='c097f400d929ad8609d42144acd0aa63f688b3932c04ec0b9addc5e498353eba'
MODULE_PINS={'scripts/upstream-media-matcher-evidence.mjs': 'e5c17dd1757660af056c213ec49422e32d27464541882cc7f9669e3ee7c829cd', 'scripts/media-matcher-peer-identity.mjs': 'd1b524d251e7df16f94bea95f927a385f57b558387ebb800116753b1586ebced'}
SHA='231f94f5557bb58afc0070585688b3014d541eb2'
SUFFIX=' Require both actual installed minimum-peer identities and the exact native brace-filter observations in the current complete clean same-library packed/browser run. This source document alone does not qualify execution.'


def project_media_matcher_context(root,read_member=None):
    """Check the exact complete transition before projecting its retained parent."""
    read=read_member or (lambda p:(root/p).read_bytes())
    load=lambda p:json.loads(read(p))
    digest=lambda b:hashlib.sha256(b).hexdigest()
    for member,pin in MODULE_PINS.items():assert digest(read(member))==pin
    task=load('compatibility/rc/media-matcher-admission-worksheet.json')
    parent,line=task['source_parent'],task['line']
    git=lambda *args:subprocess.check_output(['git',*args],cwd=root)
    cap_path='compatibility/rc/media-matcher-admission-context-prior.json.gz'
    raw=read(cap_path);cap=json.loads(gzip.decompress(raw))
    assert cap['source_parent']==parent and cap['line']==line
    edits_path='compatibility/rc/media-matcher-admission-source-edits.json'
    contract_path='compatibility/rc/media-matcher-admission-contract.json'
    assert digest(read(edits_path))==EDITS_SHA
    assert digest(read(contract_path))==CONTRACT_SHA
    sources={s['path']:s for s in cap['sources']}
    assert set(sources)=={'scripts/check-upstream-audit-disposition.mjs','scripts/browser-surface-families.mjs','tests/test_content_observer_admission.py'}
    texts={p:s['text'] for p,s in sources.items()}
    for p,s in sources.items():
        assert digest(s['text'].encode())==s['sha256']
        assert git('show',parent+':'+p)==s['text'].encode()
    for edit in load(edits_path)['files']:
        p=edit['path'];assert texts[p].count(edit['before'])==edit['occurrences']
        texts[p]=texts[p].replace(edit['before'],edit['after'])
    for p,text in texts.items():assert read(p)==text.encode()
    # The existing fixed native probe, marker and expectations are byte intact;
    # only metadata capture/dispatch additions above are permitted.
    original_bytes=git('show',parent+':compatibility/f10/disposition-ledger/ledger.json')
    original=json.loads(original_bytes);current=load('compatibility/f10/disposition-ledger/ledger.json')
    recovered=copy.deepcopy(current);entries={e['sha']:e for e in recovered['entries']}
    originals={e['sha']:e for e in original['entries']}
    selected=[]
    for e in original['entries']:
        for key,value in e.get('individual_proof',{}).items():
            if isinstance(value,dict) and 'source_members' in value and any(m['path'] in sources for m in value['source_members']):
                selected.append((e['sha'],key))
    assert selected==[(r['sha'],r['field']) for r in cap['rows']] and len(selected)==16
    prior={'path':cap_path,'sha256':digest(raw)}
    for row in cap['rows']:
        before=row['entry'];assert before==originals[row['sha']]
        expected=copy.deepcopy(before);deltas=[]
        for member in expected['individual_proof'][row['field']]['source_members']:
            if member['path'] in sources:
                p=member['path'];assert member['sha256']==sources[p]['sha256']
                member['sha256']=digest(read(p))
                deltas.append({'path':p,'before_sha256':sources[p]['sha256'],'after_sha256':member['sha256']})
        assert deltas
        target='compatibility/f10/disposition-ledger/evidence/closeout-media-matcher-admission-native-'+row['sha']+'.json'
        expected['evidence_report']=target
        assert entries[row['sha']]==expected
        review=load(target)
        context=review.pop('media_matcher_admission_source_context')
        assert context=={'prior':prior,'prior_review':{'path':before['evidence_report'],'sha256':digest(read(before['evidence_report']))},'source_changes':deltas,'original_verdict_and_native_requirements_unchanged':True,'actual_native_packed_or_floor_qualified':False}
        assert load(before['evidence_report'])==row['review']
        assert json.loads(git('show',parent+':'+before['evidence_report']))==row['review']
        expected_review=copy.deepcopy(row['review']);expected_review['individual_proof']=expected['individual_proof']
        assert review==expected_review
        for m in expected['individual_proof'][row['field']]['source_members']:assert digest(read(m['path']))==m['sha256']
        entries[row['sha']]=copy.deepcopy(before)
    before=cap['media_entry'];assert before==originals[SHA]
    if line=='main':
        definition=load(contract_path)['main']
        proof={'proof_kind':'browser-required-individual-media-matcher','diff_sha256':definition['patch'],'review_depth':'individual-compatibility','affected_branches':['main'],'decision':before['individual_proof']['decision']+SUFFIX,'installed_member':definition['installed_member'],'public_declaration':definition['public_declaration'],'reachable_behavior':{'kind':'executed-delegation','id':definition['case_ids'][0]},'media_matcher_behavior':{'kind':definition['kind'],'runtimes':definition['runtimes'],'case_ids':definition['case_ids'],'source_members':[{'path':p,'sha256':digest(read(p))} for p in definition['members']]}}
        target='compatibility/f10/disposition-ledger/evidence/closeout-media-matcher-admission-source-review.json'
        expected=copy.deepcopy(before);expected.update(evidence_report=target,individual_proof=proof)
        assert entries[SHA]==expected
        expected_review=copy.deepcopy(cap['media_review'])
        expected_review.update(individual_proof=proof,prior_source_review={'path':before['evidence_report'],'sha256':digest(read(before['evidence_report']))},native_admission={'kind':proof['proof_kind'],'required':True,'runtimes':definition['runtimes'],'case_ids':definition['case_ids'],'actual_native_or_packed_executed':False,'qualified_by_this_document':False,'g11_claim':'not-passed'},media_matcher_admission_source_context={'prior':prior,'prior_entry_sha':SHA,'source_only_verdict_preserved':True,'actual_native_packed_or_floor_qualified':False})
        assert load(target)==expected_review
    else:
        assert line=='21.x' and load(contract_path)['21.x'] is None
        assert entries[SHA]==before and before['final_disposition']=='security-review'
    assert load(before['evidence_report'])==cap['media_review']
    assert json.loads(git('show',parent+':'+before['evidence_report']))==cap['media_review']
    entries[SHA]=copy.deepcopy(before)
    recovered['entries']=[entries[e['sha']] for e in recovered['entries']]
    assert recovered==original and len(entries)==1697
    for p in ['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json','compatibility/rc/matrices/full-verify.json']:
        assert read(p)==git('show',parent+':'+p)
    assert git('diff',parent,'--name-only','--','projects','testing','reference','fixtures')==b''
    def projected(p):
        if p in sources:return sources[p]['text'].encode()
        if p=='compatibility/f10/disposition-ledger/ledger.json':return original_bytes
        return read(p)
    return recovered,projected


class MediaMatcherAdmission(unittest.TestCase):
    def test_exact_transition_and_unchanged_security_dispositions(self):
        project_media_matcher_context(ROOT)

    def test_unreviewed_context_mutations_rejected(self):
        read=lambda p:(ROOT/p).read_bytes()
        def edit(raw,mutate):
            x=json.loads(raw);mutate(x);return json.dumps(x).encode()
        cases=[('scripts/check-upstream-audit-disposition.mjs',lambda raw:raw+b'\n// unreviewed\n'),('scripts/browser-surface-families.mjs',lambda raw:raw+b'\n// unreviewed\n'),('scripts/upstream-media-matcher-evidence.mjs',lambda raw:raw+b'\n// unreviewed\n'),('scripts/media-matcher-peer-identity.mjs',lambda raw:raw+b'\n// unreviewed\n'),('compatibility/rc/media-matcher-admission-contract.json',lambda raw:edit(raw,lambda x:x.update(forged=True))),('compatibility/f10/disposition-ledger/ledger.json',lambda raw:edit(raw,lambda x:x['entries'][0].update(forged=True)))]
        # Both branches bind the new modules through all refreshed native scopes,
        # even though21.x has no MediaMatcher inherited admission.
        for p,mutate in cases:
            changed=mutate(read(p))
            with self.subTest(path=p),self.assertRaises(AssertionError):
                project_media_matcher_context(ROOT,lambda member:changed if member==p else read(member))

    def test_actual_peer_identity_native_predicate_writer_and_admission(self):
        child=subprocess.run(['node','tests/media_matcher_admission_probe.mjs'],cwd=ROOT,text=True,capture_output=True,timeout=100)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-8000:])
        x=json.loads(child.stdout.strip().splitlines()[-1])
        self.assertTrue(x['fixture_only']);self.assertFalse(x['actual_native_packed_or_floor_qualified'])
        self.assertGreaterEqual(x['metadata_controls'],12);self.assertGreaterEqual(x['predicate_controls'],20)
        if x['line']=='main':
            self.assertGreaterEqual(x['actual_helper_controls'],35);self.assertGreaterEqual(x['actual_CLI_controls'],13)
        else:self.assertTrue(x['security_review_preserved'])

if __name__=='__main__':unittest.main()
