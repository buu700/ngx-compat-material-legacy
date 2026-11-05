# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bounded fixture smoke of maintained Python model plus explicit current JS API."""
from pathlib import Path
import copy
import json
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'tests'),str(ROOT/'scripts')]
from test_current_sass_source import candidate_fixture,NODE
import test_sass_spinner_snack_bridge_admission as maintained

with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as directory:
    root=Path(directory);line=candidate_fixture(root)
    for path in ['scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py',
                 'scripts/sass-spinner-snack-bridge-contract.mjs','scripts/sass_spinner_snack_bridge_admission.py']:
        (root/path).write_bytes((ROOT/path).read_bytes())
    # Change only the test module's explicit root variable, never source-reader
    # bytes. The fixture physically contains exactly the proposed four modules.
    previous_root=maintained.ROOT
    try:
        maintained.ROOT=root;subject=maintained.SpinnerSnackBridgeAdmissionTests;subject.setUpClass()
        instance=subject();model=instance.model(subject.diagnostic['rows'][0])
        assert tuple(row['case_id'] for row in subject.diagnostic['rows'])==maintained.subject.SPINNER_SNACK_BRIDGE_CASES
        assert len(subject.context.descriptor['source_modules'])==4
        assert maintained.current_spinner_snack_assertion_ok(context=subject.context,**model)
        wrong=copy.deepcopy(model);wrong['body']['call']='cold wrong maintained metadata'
        assert not maintained.current_spinner_snack_assertion_ok(context=subject.context,**wrong)
        child=subprocess.run([NODE,str(ROOT/'compatibility/rc/current-sass-spinner-snack-maintained-tests-smoke.mjs')],
            cwd=ROOT,input=json.dumps(dict(root=str(root),model=model)),text=True,capture_output=True,timeout=40)
        assert child.returncode==0,child.stderr
        javascript=json.loads(child.stdout);assert javascript['line']==line
        report=dict(schema_version=1,line=line,python_current_positive=True,python_cold_wrong_metadata_rejected=True,
            javascript=javascript,maintained_roster=maintained.subject.SPINNER_SNACK_BRIDGE_CASES,
            current_source_set_successors=subject.context.source_set_successors,actual_candidate_fixture=True,
            compiler_calls=0,old_physical_constructor_executed=False,full_maintained_suite_executed=False,
            maintained_python_setup_and_model_executed=True,maintained_javascript_probe_syntax_only=True,
            packed_browser_floor_fullowner_or_G11_qualified=False)
    finally:maintained.ROOT=previous_root
destination=ROOT/('compatibility/rc/current-sass-spinner-snack-maintained-tests-smoke-controls-'+('21x' if line=='21.x' else 'main')+'.json')
assert not destination.exists();destination.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(line=line,current_positive_each_language=True,cold_wrong_metadata_rejected_each_language=True,compiler_calls=0)))
