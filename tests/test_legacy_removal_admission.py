# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Contract controls and independent complete-image proposal reconstruction."""
from pathlib import Path
import gzip,hashlib,json,os,re,subprocess,unittest
from current_sass_canonical_test_scope import current_canonical_test_frame
from table_local_compilation_owner_source import table_predecessor_data,qualify_table_owner_reference
from historical_contract_repair_source import qualify_tool_reference,tool_comparison_bytes
ROOT=Path(__file__).resolve().parents[1]
PREFIX='compatibility/rc/21x-legacy-removal-admission-'
def digest(raw):return hashlib.sha256(raw).hexdigest()
def entry_span(text,sha):
    decoder=json.JSONDecoder();found=[]
    for match in re.finditer(r'^    \{',text,re.M):
        start=match.start()+4
        try:row,end=decoder.raw_decode(text,start)
        except ValueError:continue
        if isinstance(row,dict)and row.get('sha')==sha:found.append((start,end,row))
    assert len(found)==1
    return found[0]
class LegacyRemovalAdmissionTests(unittest.TestCase):
    def test_current_source_contract_rejects_metadata_and_source_faults(self):
        command=['node','tests/legacy_removal_admission_probe.mjs',os.environ.get('LEGACY_REMOVAL_ADMISSION_REPORT',''),'contract']
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-8000:]);report=json.loads(child.stdout)
        self.assertEqual(report['result'],'pass');self.assertEqual(report['metadata_rejections'],20)
        self.assertEqual(report['cold_source_rejections'],13);self.assertEqual(report['late_source_rejections'],12)
        self.assertEqual(report['unselected_entries_preserved'],1696)
        historical_report=json.loads((ROOT/(PREFIX+'contract-controls.json')).read_bytes());self.assertFalse(historical_report['canonical_ledger_applied'])
        packet=json.loads((ROOT/(PREFIX+'canonical-proposal.json')).read_bytes());current=digest(table_predecessor_data(packet['before']['path'],current_canonical_test_frame(ROOT)['comparison'](packet['before']['path'],(ROOT/packet['before']['path']).read_bytes())))
        self.assertIn(current,[packet['before']['sha256'],packet['after']['sha256']]);self.assertEqual(report['canonical_ledger_applied'],current==packet['after']['sha256']);self.assertFalse(report['full_owner_integration_qualified']);self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])
    def test_independent_exact_entry_and_scalar_projection(self):
        packet=json.loads((ROOT/(PREFIX+'canonical-proposal.json')).read_bytes());sha=packet['selected_sha_ids'][0]
        before=gzip.decompress((ROOT/(PREFIX+'ledger-before.json.gz')).read_bytes());after=gzip.decompress((ROOT/(PREFIX+'ledger-after.json.gz')).read_bytes())
        self.assertEqual(digest(before),packet['before']['sha256']);self.assertEqual(len(before),packet['before']['bytes'])
        self.assertEqual(digest(after),packet['after']['sha256']);self.assertEqual(len(after),packet['after']['bytes'])
        a,b=before.decode(),after.decode();start,end,old=entry_span(a,sha);next_start,next_end,new=entry_span(b,sha)
        expected=a[:start]+b[next_start:next_end]+a[end:]
        for key,prior,current in [('closed_dispositions',424,425),('open_or_deferred',1273,1272)]:
            token=f'  "{key}": {prior},';self.assertEqual(expected.count(token),1);expected=expected.replace(token,f'  "{key}": {current},',1)
        self.assertEqual(expected,b)
        old_data,new_data=json.loads(a),json.loads(b);self.assertEqual(len(new_data['entries']),1697)
        self.assertEqual([row for row in old_data['entries']if row['sha']!=sha],[row for row in new_data['entries']if row['sha']!=sha])
        self.assertEqual([row for row in old_data['entries']if row['final_disposition']=='security-review'],[row for row in new_data['entries']if row['final_disposition']=='security-review'])
        self.assertEqual(old['files'],new['files']);self.assertEqual(len(new['files']),13)
        self.assertEqual(old['final_disposition'],'needs-individual-review');self.assertEqual(new['final_disposition'],'not-applicable')
        body=json.loads((ROOT/(PREFIX+'individual-review.json')).read_bytes());self.assertEqual(new['reason'],body['decision'])
        self.assertEqual(body['sha'],sha);self.assertEqual(len(body['complete_original_paths']),746)
        original=json.loads(gzip.decompress((ROOT/'compatibility/rc/21x-legacy-removal-source-originals.json.gz').read_bytes()))
        self.assertEqual(body['complete_original_paths'],[row['path']for row in original['sections']]);self.assertEqual((ROOT/body['patch_file']).read_text(),original['diff'])
        self.assertEqual(digest((ROOT/body['patch_file']).read_bytes()),new['individual_proof']['diff_sha256'])
        handler=new['individual_proof']['legacy_removal_source_scope']['handler'];current_handler=qualify_tool_reference(handler,ROOT)
        self.assertEqual(digest((ROOT/handler['path']).read_bytes()),current_handler['sha256']);self.assertEqual(digest(tool_comparison_bytes(handler,ROOT)),handler['sha256'])
        registry=gzip.decompress((ROOT/(PREFIX+'registry-before.mjs.gz')).read_bytes());proposed=gzip.decompress((ROOT/(PREFIX+'registry-after.mjs.gz')).read_bytes());self.assertEqual(digest(registry),packet['registry_before']['sha256']);self.assertEqual(digest(proposed),packet['registry_after']['sha256'])
        record=(f"  {{sha:'{sha}',proof_kind:'individual-historical-legacy-removal-source-exclusion',\n    scope_key:'legacy_removal_source_scope',module:'upstream-legacy-removal-admission.cjs'}},\n").encode()
        self.assertEqual(registry.count(b'];\n'),1);self.assertEqual(registry.replace(b'];\n',record+b'];\n'),proposed)
        self.assertEqual(len(re.findall(rb"\{sha:'[0-9a-f]{40}'",registry)),67);self.assertEqual(len(re.findall(rb"\{sha:'[0-9a-f]{40}'",proposed)),68)
        worksheet=json.loads((ROOT/(PREFIX+'worksheet.json')).read_bytes())
        for ref in [worksheet['before_ledger'],worksheet['before_registry'],worksheet['before_owner'],worksheet['protected_root_checker']]:
            if ref['path']in [worksheet['before_ledger']['path'],worksheet['before_registry']['path']]:
                image='ledger-before.json.gz'if ref['path']==worksheet['before_ledger']['path']else'registry-before.mjs.gz';raw=gzip.decompress((ROOT/(PREFIX+image)).read_bytes())
            elif ref['path']==worksheet['before_owner']['path']:
                raw=subprocess.check_output(['git','--no-replace-objects','show',worksheet['source_parent']+':'+ref['path']],cwd=ROOT)
            else:raw=(ROOT/ref['path']).read_bytes()
            self.assertEqual(digest(raw),ref['sha256']);self.assertEqual(len(raw),ref['bytes'])
        live_ledger=digest(table_predecessor_data(packet['before']['path'],current_canonical_test_frame(ROOT)['comparison'](packet['before']['path'],(ROOT/packet['before']['path']).read_bytes())));live_registry=digest(table_predecessor_data(packet['registry_before']['path'],current_canonical_test_frame(ROOT)['comparison'](packet['registry_before']['path'],(ROOT/packet['registry_before']['path']).read_bytes())))
        self.assertIn(live_ledger,[packet['before']['sha256'],packet['after']['sha256']]);self.assertIn(live_registry,[packet['registry_before']['sha256'],packet['registry_after']['sha256']])
        if live_ledger==packet['after']['sha256']:self.assertEqual(live_registry,packet['registry_after']['sha256'])
        tools=json.loads((ROOT/(PREFIX+'owner-inputs.json')).read_bytes());current_owner=next(row['after']for row in tools['code_transitions']if row['after']['path']==worksheet['before_owner']['path'])
        current_owner=qualify_table_owner_reference(current_owner)
        self.assertEqual(digest((ROOT/current_owner['path']).read_bytes()),current_owner['sha256'])
if __name__=='__main__':unittest.main()
