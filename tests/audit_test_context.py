# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current native requirements and retained history are separate test subjects.

No source record, stored status or old proof is treated as executed evidence.
The unchanged production validators are queried without a coordinator and must
reject every registered native subject. No original snapshot is rewritten.
"""
import hashlib
import json
from functools import lru_cache
from pathlib import Path
import subprocess

PROGRAM=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const entries=JSON.parse(readFileSync('compatibility/f10/disposition-ledger/ledger.json')).entries;
const line=JSON.parse(readFileSync('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const definitions=[
 ['artifact-behavior','ARTIFACT_BEHAVIOR_KIND','artifact_behavior','artifactBehaviorRequirements','validateArtifactBehavior'],
 ['historical-behavior','HISTORICAL_BEHAVIOR_KIND','historical_behavior','historicalBehaviorRequirements','validateHistoricalBehavior'],
 ['generated-identity','GENERATED_IDENTITY_KIND','generated_identity_behavior','generatedIdentityRequirements','validateGeneratedIdentity'],
 ['selection','SELECTION_BEHAVIOR_KIND','selection_behavior','selectionBehaviorRequirements','validateSelectionBehavior'],
 ['bidi','BIDI_BEHAVIOR_KIND','bidi_behavior','bidiBehaviorRequirements','validateBidiBehavior'],
 ['progress-csp','PROGRESS_CSP_KIND','progress_csp_behavior','progressCspRequirements','validateProgressCsp'],
 ['form-field-hover','FORM_FIELD_HOVER_KIND','form_field_hover_behavior','formFieldHoverRequirements','validateFormFieldHover'],
 ['tab-completion','TAB_COMPLETION_KIND','tab_completion_behavior','tabCompletionRequirements','validateTabCompletion'],
 ['ripple-replay','RIPPLE_REPLAY_KIND','ripple_replay_behavior','rippleReplayRequirements','validateRippleReplay'],
 ['content-observer','CONTENT_OBSERVER_KIND','content_observer_behavior','contentObserverRequirements','validateContentObserver'],
 ['media-matcher','MEDIA_MATCHER_KIND','media_matcher_behavior','mediaMatcherRequirements','validateMediaMatcher'],
];
const rows=[];
for(const[name,kind,field,requirements,validator]of definitions){
 const m=await import('./scripts/upstream-'+name+'-evidence.mjs');
 assert.equal(typeof m[kind],'string');assert.equal(typeof m[requirements],'function');assert.equal(typeof m[validator],'function');
 for(const entry of entries){const definition=m[requirements](entry.sha,line);if(!definition)continue;
  const noRun=m[validator]({root:process.cwd(),entry,proof:entry.individual_proof});
  assert.equal(noRun.ok,false,entry.sha);assert.equal(noRun.detail,'missing coordinator run',entry.sha+': '+noRun.detail);
  rows.push({sha:entry.sha,kind:m[kind],field,definition,no_run:noRun});
 }
}
assert.equal(rows.length,line==='main'?23:22);assert.equal(new Set(rows.map(r=>r.sha)).size,rows.length);
console.log(JSON.stringify({line,rows,actual_native_or_packed_qualified:false}));
'''

@lru_cache(maxsize=4)
def native_contracts(root):
    child=subprocess.run(['node','--input-type=module','-e',PROGRAM],cwd=root,text=True,capture_output=True,timeout=30)
    if child.returncode:raise AssertionError((child.stdout+child.stderr)[-7000:])
    return json.loads(child.stdout)


def read_review(root,entry):
    member=member_path(root,entry['evidence_report'])
    assert member.is_file()
    body=json.loads(member.read_bytes())
    if isinstance(body.get('reviews'),list):
        rows=[r for r in body['reviews'] if r.get('sha')==entry['sha']]
        assert len(rows)==1
        return body,rows[0]
    assert body.get('sha')==entry['sha']
    return body,body


def assert_native_review(test,root,entry,body=None):
    registered={r['sha']:r for r in native_contracts(root)['rows']}
    test.assertIn(entry['sha'],registered)
    contract=registered[entry['sha']];definition=contract['definition']
    actual,review=read_review(root,entry)
    if body is not None:test.assertEqual(body,actual)
    proof=entry['individual_proof'];test.assertEqual(proof['proof_kind'],contract['kind'])
    test.assertEqual(actual['individual_proof'],proof)
    test.assertEqual(proof['affected_branches'],[native_contracts(root)['line']])
    test.assertEqual(actual.get('final_disposition',entry['final_disposition']),entry['final_disposition'])
    test.assertEqual(actual['g11_claim'],'not-passed')
    test.assertNotEqual(entry['final_disposition'],'needs-individual-review')
    test.assertEqual(review['diff_sha256'],proof['diff_sha256'])
    patch=review.get('diff')
    raw=patch.encode() if isinstance(patch,str) and patch.startswith('diff --git ') else (root/review['patch_file']).read_bytes()
    test.assertIn(b'diff --git ',raw)
    test.assertEqual(hashlib.sha256(raw).hexdigest(),proof['diff_sha256'])
    if 'patch' in definition:test.assertEqual(proof['diff_sha256'],definition['patch'])
    scope=proof[contract['field']];test.assertEqual(scope['kind'],definition['kind'])
    test.assertEqual({m['path'] for m in scope['source_members']},set(definition['members']))
    test.assertEqual(len(scope['source_members']),len(definition['members']))
    for m in scope['source_members']:test.assertEqual(hashlib.sha256((root/m['path']).read_bytes()).hexdigest(),m['sha256'])
    for field in ['case_ids','runtimes','engines','modes','themes','stages']:
        if field in definition:test.assertEqual(scope[field],definition[field])
    if 'cases' in definition:test.assertEqual(scope['case_ids'],[c['case_id'] for c in definition['cases']])
    for field in ['installed_member','public_declaration','peer_reference']:
        if field in definition:test.assertEqual(proof[field],definition[field])
    for field in ['actual_native_or_packed_or_floor_qualified','actual_packed_or_native_or_floor_qualified','actual_native_packed_or_floor_qualified','actual_current_native_or_floor_qualified','semantic_pass']:
        if field in actual:test.assertFalse(actual[field])
    for field in ['runtime_admission','runtime_qualification','native_admission']:
        value=actual.get(field)
        if isinstance(value,dict) and 'qualified_by_this_document' in value:
            test.assertTrue(value['required']);test.assertFalse(value['qualified_by_this_document'])
    test.assertFalse(contract['no_run']['ok']);test.assertEqual(contract['no_run']['detail'],'missing coordinator run')
    return actual


def assert_runtime_roster(test,root,entries):
    frozen=json.loads((root/'compatibility/f10/upstream-sha-risk-bootstrap.json').read_bytes())['commits']
    test.assertEqual(len(entries),1697);test.assertEqual(len({e['sha'] for e in entries}),1697)
    test.assertEqual({e['sha'] for e in entries},{e['sha'] for e in frozen})
    test.assertFalse({e['sha'] for e in entries if e['final_disposition']=='needs-individual-review'})
    rows=native_contracts(root)['rows'];kinds={r['kind'] for r in rows}
    test.assertEqual({e['sha'] for e in entries if (e.get('individual_proof') or {}).get('proof_kind') in kinds},{r['sha'] for r in rows})
    indexed={e['sha']:e for e in entries}
    for row in rows:assert_native_review(test,root,indexed[row['sha']])


def source_history(root,entry):
    """Follow immutable prior entries for history checks, never admission."""
    pending=[entry];seen=set()
    while pending:
        current=pending.pop();key=json.dumps(current,sort_keys=True)
        if key in seen:continue
        seen.add(key);assert len(seen)<=128
        assert current['sha']==entry['sha']
        body,review=read_review(root,current)
        yield current,body,review
        priors=[*current.get('prior_dispositions',[]),*current.get('superseded_closeout_source_judgments',[]),review.get('prior_entry'),review.get('previous_row')]
        if 'original_source_review' in review:
            ref=review['original_source_review'];raw=member_path(root,ref['path']).read_bytes()
            assert hashlib.sha256(raw).hexdigest()==ref['sha256']
            historical=json.loads(raw);assert historical==review['historical_source_review']
            assert historical['sha']==entry['sha']
            priors.append(historical.get('prior_entry'))
        for candidate in priors:
            if isinstance(candidate,dict) and 'sha' not in candidate and candidate.get('evidence_report'):
                # A retained per-entry superseded snippet inherits only its
                # enclosing SHA; verify the actual referenced record below.
                candidate={**candidate,'sha':entry['sha']}
            if isinstance(candidate,dict) and set(candidate)=={'ledger_path','ledger_commit','entry_sha256'}:
                assert candidate['ledger_path']=='compatibility/f10/disposition-ledger/ledger.json'
                import re
                assert re.fullmatch('[0-9a-f]{40}',candidate['ledger_commit'])
                prior=git_ledger(root,candidate['ledger_commit'])
                rows=[row for row in prior['entries'] if row['sha']==entry['sha']];assert len(rows)==1
                raw=(json.dumps(rows[0],indent=2,ensure_ascii=False)+'\n').encode()
                assert hashlib.sha256(raw).hexdigest()==candidate['entry_sha256']
                candidate=rows[0]
            if isinstance(candidate,dict) and candidate.get('sha')==entry['sha'] and candidate.get('evidence_report'):pending.append(candidate)


def prior_source_entry(root,entry,predicate):
    for old,body,review in source_history(root,entry):
        if predicate(old,body,review):return old,body,review
    raise AssertionError('No authenticated retained history matches '+entry['sha'])


def read_original_patch(root,sha,review):
    """Authenticate named original provenance and every stored representation."""
    original=None
    ref=review.get('original_sources')
    if isinstance(ref,dict):
        import gzip
        stored=member_path(root,ref['path']).read_bytes()
        assert hashlib.sha256(stored).hexdigest()==ref['sha256']
        capsule=json.loads(gzip.decompress(stored))
        subjects=[row for row in capsule['subjects'] if row['sha']==sha]
        assert len(subjects)==1
        original=subjects[0]['diff'].encode()
        assert hashlib.sha256(original).hexdigest()==subjects[0]['diff_sha256']==review['diff_sha256']
    if isinstance(review.get('diff'),str):raw=review['diff'].encode()
    else:
        member=member_path(root,review['patch_file'])
        if member.is_file():raw=member.read_bytes()
        else:
            assert original is not None
            raw=original
    assert hashlib.sha256(raw).hexdigest()==review['diff_sha256']
    if original is not None:assert raw==original
    return raw


@lru_cache(maxsize=24)
def git_ledger(root,commit):
    return json.loads(subprocess.check_output(['git','--no-replace-objects','show',commit+':compatibility/f10/disposition-ledger/ledger.json'],cwd=root))


def member_path(root,path):
    assert isinstance(path,str) and '\\' not in path
    parts=path.split('/')
    assert parts and all(part and part not in {'.','..'} for part in parts)
    member=root
    for part in parts:
        member=member/part
        assert not member.is_symlink()
    return member
