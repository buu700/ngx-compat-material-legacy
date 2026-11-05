#!/usr/bin/env python3
"""Prepared helper controls from existing observations; zero compiler execution."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from sass_spinner_snack_gate_integration import SpinnerSnackGateContext,spinner_snack_gate_descriptor,spinner_snack_gate_assertion_ok
from sass_default_aggregate_fixture import default_aggregate_receipt
from sass_mixin_fixture import mixin_receipt
spec=importlib.util.spec_from_file_location('frozen_direct_test_fixture',ROOT/'tests/test_sass_spinner_snack_bridge_admission.py')
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
PREFIX='compatibility/rc/parallel-spinner-snack-gate-integration-'
NODE='/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'
def measured(css):
    return dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
def rehash(body,css):
    default=body['case_id'].startswith('mixin-css/') and 'actual_measurement' in body and 'actual' not in body
    actual=body['actual_measurement'] if default else body['actual']
    actual.update(measured(css))
    if not default and 'actual_measurement' in body:
        body['actual_measurement']=copy.deepcopy(actual);body.update(actual_sha256=actual['css_sha256'],actual_bytes=actual['css_bytes'])
    if default:body.update(actual_sha256=actual['css_sha256'],actual_bytes=actual['css_bytes'])
    else:body['mutation']=measured(css+'\n.wrong-nonempty-mixin { color: red; }\n')
packet=json.loads((ROOT/'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes())
rootmap={'21.x':ROOT,'main':Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
report=dict(schema_version=1,role='NEW helper-only modeled integration controls; existing15direct+9aggregate observations perline, no untouched16 or packed execution',fresh_compiles=0,actual_packed_assertions=0,existing_gate_edits=False,lines=[])
allcases=[]
for line,root in rootmap.items():
    branch=packet['branches'][line]
    direct=json.loads((root/branch['observation']['path']).read_bytes())
    aggregate=json.loads((root/('compatibility/rc/parent-spinner-snack-aggregate-integration-'+('21' if line=='21.x' else 'main')+'-v1.json')).read_bytes())
    owner=fixture.SpinnerSnackBridgeAdmissionTests()
    owner.packet=packet;owner.line=line;owner.branch=branch;owner.catalog=json.loads((root/packet['catalog']['path']).read_bytes());owner.provenance=json.loads((root/packet['provenance']['path']).read_bytes());owner.lock=json.loads((root/packet['reference_lock']['path']).read_bytes())
    seed=owner.model(direct['rows'][0]);active=SimpleNamespace(**seed['active'])
    controls=dict(hook=None,target=None)
    def read(path):
        if controls['hook'] is not None:
            fn=controls['hook'];controls['hook']=None;fn()
        return b'fault' if controls['target']==path else (root/path).read_bytes()
    context=SpinnerSnackGateContext(root,read=read)
    descriptor=spinner_snack_gate_descriptor(context)
    bodies=[]
    for row in direct['rows']:
        value=owner.model(row)
        if row['case_id'].startswith('mixin-argument/'):
            probe=next(p for p in owner.catalog['cases'] if p['case_id']==row['case_id']);value['body'].update(probe)
        else:
            value['body'].update(oracle=packet['oracle']['path'],oracle_sha256=packet['oracle']['sha256'],expected_sha256=value['body']['expected']['css_sha256'],expected_bytes=value['body']['expected']['css_bytes'],actual_sha256=value['body']['actual']['css_sha256'],actual_bytes=value['body']['actual']['css_bytes'],actual_measurement=copy.deepcopy(value['body']['actual']))
        bodies.append(value['body'])
    for row in aggregate['rows']:
        case=row['case_id']
        body=default_aggregate_receipt(active,case,seed['invocation']) if case.startswith('mixin-css/') else mixin_receipt(root,active,case,seed['invocation'])
        current={**measured(row['current']['css']),'program_sha256':row['current']['logical_program_sha256'],'line':line,'sass_version':branch['compiler'],'sources':copy.deepcopy(next(iter(branch['source_sets'].values())))}
        body['current_spinner_snack_bridge']=copy.deepcopy(descriptor)
        body['error']=None
        if case.startswith('mixin-css/'):
            body['actual_measurement']=current;body.update(actual_sha256=current['css_sha256'],actual_bytes=current['css_bytes'])
        else:
            body['identity']['sass_version']=branch['compiler']
            body['actual']=current;body['mutation']=measured(current['css']+'\n.wrong-nonempty-mixin { color: red; }\n')
        bodies.append(body)
    assert len(bodies)==24 and len({b['case_id'] for b in bodies})==24
    checks=[]
    def check(name,value):
        assert value,name
        checks.append(name)
    for body in bodies:
        check('prepared helper positive '+body['case_id'],spinner_snack_gate_assertion_ok(root,active,body,seed['invocation'],context=context))
        changed=copy.deepcopy(body)
        actual=changed.get('actual_measurement',changed.get('actual'))
        rehash(changed,actual['css']+'\n.unrelated { color: red; }\n')
        check('whole CSS mutation '+body['case_id'],not spinner_snack_gate_assertion_ok(root,active,changed,seed['invocation'],context=context))
        missing=copy.deepcopy(body);missing.pop('current_spinner_snack_bridge')
        check('bridge metadata missing '+body['case_id'],not spinner_snack_gate_assertion_ok(root,active,missing,seed['invocation'],context=context))
    example=bodies[0]
    for name,path,value in [('loaded',['actual','sources',0,'sha256'],'0'*64),('run',['run_id'],'foreign'),('invocation',['invocation_id'],'foreign'),('artifact',['tarball_sha256'],'0'*64),('case',['case_id'],'mixin-css/all-legacy-component-themes'),('descriptor',['current_spinner_snack_bridge','source_packet','sha256'],'0'*64)]:
        wrong=copy.deepcopy(example);cursor=wrong
        for key in path[:-1]:cursor=cursor[key]
        cursor[path[-1]]=value
        check('metadata '+name,not spinner_snack_gate_assertion_ok(root,active,wrong,seed['invocation'],context=context))
    for body in [bodies[0],next(b for b in bodies if b['case_id']=='mixin-css/all-component-colors'),next(b for b in bodies if b['case_id']=='mixin-argument/all-component-colors/custom-full-theme')]:
        live=copy.deepcopy(body)
        controls['hook']=lambda:live.__setitem__('case_id','foreign')
        check('late live '+body['case_id'],not spinner_snack_gate_assertion_ok(root,active,live,seed['invocation'],context=context))
        controls['target']='scripts/sass_spinner_snack_gate_integration.py'
        check('late helper source '+body['case_id'],not spinner_snack_gate_assertion_ok(root,active,body,seed['invocation'],context=context))
        controls['target']=None;context.assert_current()
    check('restore',spinner_snack_gate_assertion_ok(root,active,example,seed['invocation'],context=context))
    report['lines'].append(dict(line=line,checks_passed=len(checks),checks=checks,case_ids=[b['case_id'] for b in bodies],modeled_envelope_positives=24,old_expected_models_unchanged=True))
    allcases.append(dict(root=str(root),line=line,descriptor=descriptor,active=seed['active'],invocation=seed['invocation'],bodies=bodies))
result=subprocess.run([NODE,str(ROOT/(PREFIX+'focused-probe-v1.mjs'))],input=json.dumps(allcases),text=True,capture_output=True,cwd=ROOT,check=False)
assert result.returncode==0,result.stderr
report['JS']=json.loads(result.stdout)
path=ROOT/(PREFIX+'focused-controls-v3.json');assert not path.exists();path.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(output=str(path),python=[dict(line=r['line'],checks=r['checks_passed']) for r in report['lines']],JS=report['JS'])))
