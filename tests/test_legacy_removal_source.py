# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Full original population and independent replay; no source disposition pass."""
from pathlib import Path
import collections,copy,gzip,hashlib,json,os,re,subprocess,unittest,sys
from current_sass_canonical_test_scope import current_canonical_test_frame
from table_local_compilation_owner_source import table_predecessor_data
from historical_contract_repair_source import qualify_source_reference
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from current_sass_source import CurrentSassSource
PREFIX='compatibility/rc/21x-legacy-removal-source-'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def static_names(path,body,current=None,seen=()):
    """Independent limited lexical export inventory, checked against the AST result."""
    assert path not in seen
    body=re.sub(r'/\*[\s\S]*?\*/|//[^\n]*','',body)
    names=set(re.findall(r'\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|(?:const\s+)?enum|function|const(?!\s+enum\b)|let|var)\s+([\w$ɵ]+)',body))
    for group in re.findall(r'\bexport\s+(?:type\s+)?\{([^}]*)\}',body):
        for item in group.split(','):
            item=re.sub(r'^\s*type\s+','',item).strip()
            if item:names.add(re.split(r'\s+as\s+',item)[-1].strip())
    for spec in re.findall(r'\bexport\s*\*\s*from\s*[\'"]([^\'"]+)[\'"]',body):
        assert current is not None and spec.startswith('.')
        stem=Path(os.path.normpath(str(Path(path).parent/spec)))
        target=next(str(p)for p in [Path(str(stem)+'.ts'),stem/'index.ts',stem/'public-api.ts']if str(p)in current)
        names.update(static_names(target,(ROOT/target).read_text(),current,(*seen,path)))
    return sorted(names)
def check_review(original,review,boundary):
    assert review['sha']==original['original_commit']['sha']
    assert review['original_commit']=={k:original['original_commit'][k]for k in ['sha','tree','parents','sha256']}
    assert review['proposed_final_disposition']=='not-applicable'
    for key in ['canonical_decisions_changed','source_admissions_changed','product_changes','peer_changes','golden_or_exception_changes']:assert review[key]==0
    assert review['actual_native_packed_browser_floor_or_full_audit_qualified']is False
    assert review['g11_claim']=='not-passed'
    for ref in review['source_inputs']:
        raw=(ROOT/ref['path']).read_bytes();assert sha(raw)==ref['sha256'];assert len(raw)==ref['bytes']
    modified=[row for row in original['sections']if row['status']=='M'];deleted=[row for row in original['sections']if row['status']=='D']
    assert [row['path']for row in review['nondeletion_file_reviews']]==[row['path']for row in modified]
    for actual,expected in zip(review['nondeletion_file_reviews'],modified):
        for key in ['before_blob','after_blob','patch_sha256']:assert actual[key]==expected[key]
        assert len(actual['hunks'])==len(expected['hunks'])
        for note,hunk in zip(actual['hunks'],expected['hunks']):
            for key in ['index','header','sha256']:assert note[key]==hunk[key]
            assert note['source_decision']=='do-not-adopt-upstream-removal-or-MDC-migration'
            assert isinstance(note['review'],str)and len(note['review'])>60
    rows=review['complete_deleted_path_membership'];assert [row['path']for row in rows]==[row['path']for row in deleted]
    members={row['path']:row for row in boundary['current_members']}
    assert len(members)==len(boundary['current_members'])
    sass=CurrentSassSource(ROOT)
    repair_successors=sass_successors=0
    for member in members.values():
        current=qualify_source_reference(member,ROOT)
        repair_successors+=current['sha256']!=member['sha256']
        prior=current
        current=sass.qualify(current) or current
        sass_successors+=current['sha256']!=prior['sha256']
        raw=(ROOT/member['path']).read_bytes();assert sha(raw)==current['sha256'];assert len(raw)==current['bytes']
    sass.assert_current()
    assert repair_successors==4 and sass_successors==5
    for actual,expected in zip(rows,deleted):
        assert actual['before_blob']==expected['before_blob'];assert actual['before_sha256']==expected['before']['sha256'];assert actual['patch_sha256']==expected['patch_sha256']
        assert actual['hunks']==[{k:h[k]for k in ['index','sha256']}for h in expected['hunks']]
        assert actual['group']in review['deletion_group_reviews']
        for target in actual['current_targets']:assert target==members[target['path']]
        if actual['group'].startswith('owned-'):assert actual['current_targets']
    counts=collections.Counter(row['group']for row in rows);assert dict(counts)==review['deletion_group_counts']
    assert counts['upstream-build-only']==45;assert counts['upstream-development-demo']==208;assert counts['upstream-SSR-demo']==2;assert counts['upstream-generated-API-golden']==44
    assert counts['owned-historical-spec']==57;assert counts['owned-public-api']==44;assert counts['previous-engine-recipe-removal']==3
    assert review['complete_original_files_reviewed']==len(modified)+len(deleted)==746
    assert review['nondeletion_hunks_individually_reviewed']==sum(len(row['hunks'])for row in modified)==97
    assert review['deleted_files_grouped_with_complete_membership']==702
    assert review['original_text_hunks_accounted_for']==sum(len(row['hunks'])for row in original['sections'])==797
    tagged={row['path']:row for row in original['tagged_reference']['members']}
    assert len(boundary['api_name_inventory'])==44
    for entry in boundary['api_name_inventory']:
        assert entry['historical_barrel_blob']==tagged[entry['historical_barrel']]['blob']
        golden=tagged[entry['historical_golden']];assert entry['historical_golden_blob']==golden['blob']
        block=re.search(r'```ts\n([\s\S]*?)\n```',golden['body']);assert block
        assert static_names(golden['path'],block[1])==entry['historical_names'],golden['path']
        assert static_names(entry['current_path'],(ROOT/entry['current_path']).read_text(),members)==entry['current_names'],entry['current_path']
        assert entry['missing']==sorted(set(entry['historical_names'])-set(entry['current_names']))
    assert sum(len(row['historical_names'])for row in boundary['api_name_inventory'])==458
    aliases=boundary['existing_recipe_alias_removals'];assert len(aliases)==9
    assert sorted(row['name']for row in aliases)==sorted(name for row in boundary['api_name_inventory']for name in row['missing'])
    assert len(boundary['legacy_forward_bindings'])==29
    for item in boundary['legacy_forward_bindings']:
        assert item['current']=={'source':'./styles/'+item['tagged']['source'][2:],'binding':item['tagged']['binding']}
    assert boundary['product_population']==1142
    assert boundary['experimental_imports']==[]
    assert boundary['historical_suite']=={'rows':57,'complete_deleted_spec_membership':True,'current_candidate_hashes_match':True,'execution_credit':False}
    assert boundary['actual_native_packed_browser_floor_or_full_audit_qualified']is False
    return True
class LegacyRemovalSourceTests(unittest.TestCase):
    def test_independent_original_objects_full_population_and_corruptions(self):
        command=['node','tests/legacy_removal_source_probe.mjs']
        if os.environ.get('LEGACY_REMOVAL_ORIGINAL_REPORT'):command.append(os.environ['LEGACY_REMOVAL_ORIGINAL_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-10000:]);report=json.loads(child.stdout)
        self.assertEqual(report['complete_original_files'],746);self.assertEqual(report['original_text_hunks'],797)
        self.assertEqual(report['deleted_files'],702);self.assertEqual(report['modified_files'],44)
        self.assertEqual(report['authenticated_tree_objects'],217);self.assertEqual(report['untouched_tagged_members'],119)
        self.assertEqual(report['authenticated_binary_deletions'],1);self.assertEqual(report['authenticated_empty_text_deletions'],1)
        self.assertEqual(report['semantic_object_tree_scope_and_hunk_mutants_rejected'],16)
        self.assertEqual(report['cold_source_faults_rejected'],3);self.assertEqual(report['late_source_faults_rejected'],3)
        self.assertTrue(report['complete_changed_population_derived_from_tree_objects']);self.assertTrue(report['all_text_hunks_replayed_to_exact_after_blobs']);self.assertTrue(report['both_binary_literals_reconstructed'])
        self.assertFalse(report['substantive_hunk_or_ownership_review_completed']);self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])
    def test_source_review_has_not_changed_the_canonical_subject(self):
        worksheet=json.loads((ROOT/'compatibility/rc/21x-legacy-removal-source-worksheet.json').read_bytes())
        # The source-only stage remains exact data after a separately qualified admission.
        before=worksheet['protected_ledger'];raw=gzip.decompress((ROOT/'compatibility/rc/21x-legacy-removal-admission-ledger-before.json.gz').read_bytes())
        self.assertEqual(hashlib.sha256(raw).hexdigest(),before['sha256']);self.assertEqual(len(raw),before['bytes'])
        ledger=json.loads(raw);entry=next(row for row in ledger['entries']if row['sha']==worksheet['sha'])
        self.assertEqual(entry,worksheet['before_entry']);self.assertEqual(ledger['closed_dispositions'],424);self.assertEqual(ledger['open_or_deferred'],1273)
        self.assertEqual(sum(row['final_disposition']=='security-review'for row in ledger['entries']),1)
        proposal=json.loads((ROOT/'compatibility/rc/21x-legacy-removal-admission-canonical-proposal.json').read_bytes());current=table_predecessor_data(before['path'],current_canonical_test_frame(ROOT)['comparison'](before['path'],(ROOT/before['path']).read_bytes()))
        self.assertIn(hashlib.sha256(current).hexdigest(),[proposal['before']['sha256'],proposal['after']['sha256']])
        after=gzip.decompress((ROOT/'compatibility/rc/21x-legacy-removal-admission-ledger-after.json.gz').read_bytes());self.assertEqual(hashlib.sha256(after).hexdigest(),proposal['after']['sha256'])
        selected=worksheet['sha'];candidate=json.loads(after)
        self.assertEqual([row for row in candidate['entries']if row['sha']!=selected],[row for row in ledger['entries']if row['sha']!=selected])
        self.assertEqual(candidate['closed_dispositions'],425);self.assertEqual(candidate['open_or_deferred'],1272)
    def test_complete_review_against_independent_export_and_scope_checks(self):
        original=json.loads(gzip.decompress((ROOT/(PREFIX+'originals.json.gz')).read_bytes()))
        review=json.loads((ROOT/(PREFIX+'review.json')).read_bytes());boundary=json.loads((ROOT/(PREFIX+'boundary-reviewed.json')).read_bytes())
        self.assertTrue(check_review(original,review,boundary))
    def test_review_rejects_omitted_paths_hunks_and_changed_current_targets(self):
        original=json.loads(gzip.decompress((ROOT/(PREFIX+'originals.json.gz')).read_bytes()))
        review=json.loads((ROOT/(PREFIX+'review.json')).read_bytes());boundary=json.loads((ROOT/(PREFIX+'boundary-reviewed.json')).read_bytes())
        mutations=[lambda d:d['nondeletion_file_reviews'].pop(),lambda d:d['nondeletion_file_reviews'][0]['hunks'].pop(),lambda d:d['complete_deleted_path_membership'].pop(),lambda d:d['nondeletion_file_reviews'][0]['hunks'][0].update(sha256='0'*64),lambda d:next(row for row in d['complete_deleted_path_membership']if row['current_targets'])['current_targets'][0].update(sha256='0'*64),lambda d:d.update(actual_native_packed_browser_floor_or_full_audit_qualified=True)]
        for mutate in mutations:
            candidate=copy.deepcopy(review);mutate(candidate)
            with self.assertRaises(AssertionError):check_review(original,candidate,boundary)
if __name__=='__main__':unittest.main()
