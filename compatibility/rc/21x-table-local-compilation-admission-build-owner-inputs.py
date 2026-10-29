# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Build finite owner/iteration source data; no canonical files are changed."""
from pathlib import Path
import collections,gzip,hashlib,json,subprocess
r=Path.cwd();prefix='compatibility/rc/21x-table-local-compilation-admission-';h=lambda b:hashlib.sha256(b).hexdigest()
def ref(path):
 raw=(r/path).read_bytes();return {'path':path,'sha256':h(raw),'bytes':len(raw)}
w=json.loads((r/(prefix+'owner-worksheet.json')).read_text());edits=json.loads((r/(prefix+'owner-code-edits.json')).read_text());grouped=collections.defaultdict(list)
for e in edits:grouped[e['path']].append({'before':e['before'],'after':e['after']})
transitions=[]
for path,changes in grouped.items():
 before=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','show',w['source_parent']+':'+path]);expected=before.decode()
 for edit in changes:
  assert expected.count(edit['before'])==1,(path,edit['before'][:100]);expected=expected.replace(edit['before'],edit['after'])
 after=(r/path).read_bytes();assert after==expected.encode();transitions.append({'before':{'path':path,'sha256':h(before),'bytes':len(before)},'after':ref(path),'literal_edits':changes})
tracked=subprocess.check_output(['git','diff','--name-only']).decode().splitlines();assert sorted(tracked)==sorted(grouped),tracked
roster_path='compatibility/rc/21x-remaining-disposition-worksheet.json';roster=(r/roster_path).read_bytes();before=json.loads(roster);proposal=json.loads((r/(prefix+'canonical-proposal.json')).read_text());after_ledger=json.loads(gzip.decompress((r/(prefix+'ledger-after.json.gz')).read_bytes()));selected=[row['sha']for row in after_ledger['entries']if row['final_disposition']in ['needs-individual-review','security-review']]
assert len(before['selected_sha_ids'])==1272 and len(selected)==1271
assert [x for x in before['selected_sha_ids']if x not in selected]==[proposal['sha']]
assert [x for x in selected if x not in before['selected_sha_ids']]==[]
next_roster={**before,'unresolved_count':1271,'selected_sha_ids':selected,'status':'90canonical individual source admissions.426closed/1271pending including1security-review;full release/product/native/packed/floor/independent-audit gates remain open.','individual_source_reviews_with_retained_evidence':90,'selected_population_awaiting_initial_individual_review':1270,'pending_counts':{'needs-individual-review':1270,'security-review':1},'ledger_subject':proposal['after'],'table_local_compilation_roster_reconciliation':{'previous_worksheet_sha256':h(roster),'before_ledger_sha256':proposal['before']['sha256'],'after_ledger_sha256':proposal['after']['sha256'],'previous_selected_count':1272,'current_selected_count':1271,'removed_after_individual_source_admission':[proposal['sha']],'pending_security_reviews':1,'current_source_admissions':90,'registry_records':69,'canonical_proposal':ref(prefix+'canonical-proposal.json'),'source_contract_qualification':ref(prefix+'source-contract-proposal-qualification.json'),'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}}
for tail,raw in [('roster-before.json.gz',roster),('roster-after.json.gz',(json.dumps(next_roster,indent=2)+'\n').encode())]:(r/(prefix+tail)).write_bytes(gzip.compress(raw,mtime=0))
sources=['scripts/upstream-table-local-compilation-admission.cjs','scripts/upstream-table-local-compilation-source.mjs','scripts/check-upstream-audit-disposition.mjs','scripts/packed-upstream-ledger-base.mjs','tests/table_local_compilation_owner_source.py',prefix+'source-contract-proposal-qualification.json',prefix+'individual-review.json',prefix+'canonical-proposal.json',prefix+'owner-worksheet.json','compatibility/rc/21x-legacy-removal-admission-owner-inputs.json']
packet={'schema_version':1,'line':'21.x','source_parent':w['source_parent'],'code_transitions':transitions,'code_transition_count':len(transitions),'source_members':[ref(p)for p in sources],'proposal':ref(prefix+'canonical-proposal.json'),'ledger_before_image':ref(prefix+'ledger-before.json.gz'),'ledger_after_image':ref(prefix+'ledger-after.json.gz'),'registry_before_image':ref(prefix+'registry-before.mjs.gz'),'registry_after_image':ref(prefix+'registry-after.mjs.gz'),'registry_ancestor_image':ref('compatibility/rc/21x-legacy-removal-admission-registry-before.mjs.gz'),'roster_before_image':ref(prefix+'roster-before.json.gz'),'roster_after_image':ref(prefix+'roster-after.json.gz'),'canonical_dispositions_applied':0,'old_program_executed':False,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
p=r/(prefix+'owner-inputs.json');p.write_text(json.dumps(packet,indent=2)+'\n');pin=h(p.read_bytes());module=r/'scripts/table-local-compilation-owner-source.mjs';text=module.read_text();import re;text,n=re.subn(r"^const PIN='[0-9a-f]{64}';$","const PIN='"+pin+"';",text,flags=re.M);assert n==1;module.write_text(text);print(json.dumps({'owner_inputs':ref(prefix+'owner-inputs.json'),'code_transitions':len(transitions),'literal_edits':len(edits),'roster_after':h(gzip.decompress((r/(prefix+'roster-after.json.gz')).read_bytes()))}))
