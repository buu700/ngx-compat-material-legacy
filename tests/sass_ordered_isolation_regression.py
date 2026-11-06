# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual ordered Python release-admission route; disposable source copy only."""
import copy,hashlib,importlib,importlib.util,json,sys
from pathlib import Path
from types import SimpleNamespace
root=Path(sys.argv[1]).resolve();line=sys.argv[2];report=json.loads(Path(sys.argv[3]).read_bytes());packet=json.loads(Path(sys.argv[4]).read_bytes())
if (root/'.sass-isolation-disposable').read_text()!='test-owned-disposable\n':raise ValueError('disposable source copy required')
sys.path.insert(0,str(root/'scripts'));path=root/'scripts/sass_ordered_button_composition.py';original=path.read_text();guard_path=root/'scripts/sass_ordered_button_source_guard.py';guard_original=guard_path.read_text();poison=original.replace('return _replace(css,edits)',"return _replace(css,edits)+'\\n.unrelated { color: red; }'")
if poison==original:
    # The pure helper uses direct slice rebuilding; preserve a live malicious function control.
    poison=original+'\n_original_compose=compose_ordered_aggregate_button\ndef compose_ordered_aggregate_button(args):\n    value=_original_compose(args)\n    return value+"\\n.unrelated { color: red; }" if type(value) is str else value\n'
poison_guard=guard_original.replace('    if not __debug__:return False', '    return True\n    if not __debug__:return False');assert poison_guard!=guard_original
try:path.write_text(poison);guard_path.write_text(poison_guard);helper=importlib.import_module('sass_ordered_button_composition');admission=importlib.import_module('sass_ordered_aggregate_admission')
finally:path.write_text(original);guard_path.write_text(guard_original)
record=next(v for v in report['fixtures'] if v['id']=='06-aggregate-and-companions');m=record['actual_measurement'];catalog=json.loads((root/'fixtures/sass/ordered-aggregate-contracts.json').read_bytes());entry=catalog['cases'][record['id']];run=packet['run'];binding=packet['body']['binding']
body=dict(kind='assertion',check_id='sass-seal',group='ordered-css-dom',result='pass',exit_code=0,line=line,run_id=run['run_id'],invocation_id='unit',binding=binding,tarball_sha256=next(a for a in run['artifacts'] if a['id']=='library')['sha256'],case_id=record['id'],actual_measurement=m,current_companion=record['current_companion'],comparison=admission.ORDERED_AGGREGATE_CONTRACT,raw_status='blocked',status='conforming-current-companion',baseline_sha256=entry['reference_sha256'],candidate_sha256=m['css_sha256'],fixture=entry['fixture'],fixture_sha256=entry['fixture_sha256'],reference=entry['reference'],reference_sha256=entry['reference_sha256'])
base=admission.ordered_aggregate_expected_css(record['current_companion']['peers'],line);forged_css=helper.compose_ordered_aggregate_button(dict(caseId=record['id'],css=base));assert forged_css.endswith('.unrelated { color: red; }')
bad=copy.deepcopy(body);bad['actual_measurement'].update(css=forged_css,css_sha256=hashlib.sha256(forged_css.encode()).hexdigest(),css_bytes=len(forged_css.encode()));bad['candidate_sha256']=bad['actual_measurement']['css_sha256'];active=SimpleNamespace(manifest=run,binding=binding)
assert admission.ordered_button_source_guard(line,m['sources'],body['current_companion']['peers'],bad['actual_measurement']['css']),'poisoned guard must remain active'
assert admission.ordered_aggregate_envelope_ok(active,body,'unit')
assert not admission.ordered_aggregate_envelope_ok(active,bad,'unit')
bad_source=copy.deepcopy(body);bad_source['actual_measurement']['sources'].pop();assert not admission.ordered_aggregate_envelope_ok(active,bad_source,'unit'),'poisoned guard must not bypass full source closure'
spec=importlib.util.spec_from_file_location('isolation_ordered_release_coordinator',root/'scripts/rc-verify.py');coordinator=importlib.util.module_from_spec(spec);spec.loader.exec_module(coordinator);coordinator.ACTIVE_RUN=active
assert coordinator._sass_seal_assertion_ok(body,'unit')
assert not coordinator._sass_seal_assertion_ok(bad,'unit')
assert not coordinator._sass_seal_assertion_ok(bad_source,'unit')
print(json.dumps(dict(schema_version=1,line=line,controls=['captured-Python-ordered-helper-active','poisoned-imported-Python-guard-rejected','full-source-closure-required','actual-Python-ordered-positive','actual-Python-ordered-forgery-rejected','actual-release-coordinator-ordered-positive','actual-release-coordinator-ordered-forgery-rejected'],scope='Actual admission route with prior packed fixture and simulated run envelope; no full coordinator execution or final seal pass',source_restored=path.read_text()==original)))
