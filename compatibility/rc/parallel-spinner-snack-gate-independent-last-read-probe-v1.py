#!/usr/bin/env python3
"""Actual NEW Python helper copied-dependency callback triage; no real writes/compiler."""
import hashlib
import inspect
import json
from pathlib import Path
import shutil
import sys
import tempfile
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from sass_spinner_snack_gate_integration import SpinnerSnackGateContext
import historical_contract_repair_source as mirror
packet=json.loads((ROOT/'compatibility/rc/parallel-spinner-snack-gate-integration-helper-cut-v2.json').read_bytes())
paths=next(v for v in packet['lines'] if v['line']=='21.x')['python_guarded_paths']
with tempfile.TemporaryDirectory(prefix='parallel-spinner-snack-gate-independent-last-read-fixture-',dir=ROOT/'compatibility/rc') as directory:
    fixture=Path(directory)
    for p in paths:
        out=fixture/p;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/p,out)
    state=dict(armed=False,changed=False);target='scripts/sass_ripple_color_admission.py'
    def read(path):
        raw=(fixture/path).read_bytes()
        if state['armed'] and path==target:
            state.update(armed=False,changed=True);(fixture/path).write_bytes(raw+b'\n# independent copied-only post-snapshot mutation\n')
        return raw
    context=SpinnerSnackGateContext(fixture,read=read);before=(fixture/target).read_bytes();state['armed']=True
    accepted=True
    try:context.assert_current()
    except AssertionError:accepted=False
    assert state['changed'] and (fixture/target).read_bytes()!=before
    next_rejected=False
    try:context.assert_current()
    except AssertionError:next_rejected=True
    assert next_rejected
def ref(path):
    raw=(ROOT/path).read_bytes();return dict(path=path,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw))
report=dict(schema_version=1,role='Independent actual Python NEW helper callback triage on owned copied current-byte inputs',
            accepted_guard_during_callback_physical_mutation=accepted,next_guard_rejected=next_rejected,target=target,copied_paths=len(paths),real_inputs_mutated=False,
            sources=[ref('scripts/sass_spinner_snack_gate_integration.py'),ref('tests/historical_contract_repair_source.py')],
            shared_mirror_no_supplied_reader_callback=all('read' not in inspect.signature(getattr(mirror,name)).parameters for name in ['qualify_tool_reference','tool_comparison_bytes']),
            shared_mirror_limitation='Python shared mirror has direct physical reads with no supplied-read argument; no analogous synchronous callback route exposed by these functions',fresh_compiles=0,packed_or_owner_credit=False)
output=Path(sys.argv[1]);assert not output.exists();output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(dict(output=str(output),accepted=accepted,next_rejected=next_rejected)))
