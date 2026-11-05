#!/usr/bin/env python3
"""Risk-weighted exact actual dispatcher function with real finite-route dependencies."""
import ast
import copy
import gzip
import hashlib
import json
from pathlib import Path
import sys
from types import SimpleNamespace
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from sass_spinner_snack_gate_integration import SPINNER_SNACK_GATE_CASES,spinner_snack_gate_assertion_ok
from sass_mixin_argument_admission import mixin_argument_assertion_ok
def hash(value):return hashlib.sha256(value.encode() if type(value)is str else value).hexdigest()
def frozen(cut):
    for branch in cut['branches'].values():
        root=Path(branch['root'])
        for ref in branch['physical_refs']:
            raw=(root/ref['path']).read_bytes();assert hash(raw)==ref['sha256'] and len(raw)==ref['bytes'],ref['path']
def rehash(body,css):
    for name in ['actual','actual_measurement']:
        if name in body:body[name].update(css=css,css_sha256=hash(css),css_bytes=len(css.encode()))
    if 'actual_sha256' in body:body.update(actual_sha256=hash(css),actual_bytes=len(css.encode()))
    if 'mutation' in body:
        wrong=css+'\n.wrong-nonempty-mixin { color: red; }\n';body['mutation']=dict(css=wrong,css_sha256=hash(wrong),css_bytes=len(wrong.encode()))
if __name__=='__main__':
    assert len(sys.argv)==4
    cut_path,fixture_path,output=map(Path,sys.argv[1:]);cut=json.loads(cut_path.read_bytes());inputs=json.loads(gzip.decompress(fixture_path.read_bytes()) if fixture_path.suffix=='.gz' else fixture_path.read_bytes());frozen(cut);results=[]
    for input in inputs:
        root=Path(input['root']);source=(root/'scripts/rc-verify.py').read_text();tree=ast.parse(source)
        function,=[v for v in tree.body if isinstance(v,ast.FunctionDef) and v.name=='_sass_seal_assertion_ok']
        globals=dict(ROOT=root,ACTIVE_RUN=SimpleNamespace(**input['active']),SPINNER_SNACK_GATE_CASES=SPINNER_SNACK_GATE_CASES,
                     spinner_snack_gate_assertion_ok=spinner_snack_gate_assertion_ok,mixin_argument_assertion_ok=mixin_argument_assertion_ok)
        exec(compile(ast.Module(body=[function],type_ignores=[]),str(root/'scripts/rc-verify.py'),'exec'),globals)
        dispatcher=globals['_sass_seal_assertion_ok'];checks=[]
        def check(name,condition):assert condition,name;checks.append(name)
        for body in input['bodies']:check('actual dispatcher '+body['case_id'],dispatcher(body,input['invocation']))
        representatives=[input['bodies'][v] for v in [0,4,7,10,15,16,17,19,21,23]]
        for body in representatives:
            wrong=copy.deepcopy(body);rehash(wrong,wrong.get('actual_measurement',wrong.get('actual'))['css']+'\n.independent-unrelated { color: red; }\n')
            check('whole CSS mutation '+body['case_id'],not dispatcher(wrong,input['invocation']))
        for body in [input['bodies'][v] for v in [0,5,15,18]]:
            for field,value in [('line','foreign-line'),('sass_version','foreign compiler')]:
                wrong=copy.deepcopy(body)
                for alias in ['actual','actual_measurement']:
                    if alias in wrong:wrong[alias][field]=value
                check('contradictory actual '+field+' '+body['case_id'],not dispatcher(wrong,input['invocation']))
            for field,value in [('invocation_id','foreign-invocation'),('tarball_sha256','0'*64),('current_spinner_snack_bridge',{})]:
                wrong=copy.deepcopy(body);wrong[field]=value
                check('capsule '+field+' '+body['case_id'],not dispatcher(wrong,input['invocation']))
        foreign=copy.deepcopy(input['bodies'][0]);foreign['case_id']='foreign/unknown'
        check('foreign flagged case rejects before generic fallback',not dispatcher(foreign,input['invocation']))
        results.append(dict(line=input['line'],checks_passed=len(checks),checks=checks,
                            actual_dispatcher_body_sha256=hash(ast.get_source_segment(source,function)),
                            actual_dispatcher_module_sha256=hash(source),actual_mixin_delegate_sha256=hash((root/'scripts/sass_mixin_argument_admission.py').read_bytes()),
                            method='Exact current _sass_seal_assertion_ok AST body, real finite-route imports and modeled active envelope; no rc CLI or outer run validator execution',
                            actual_packed_gate=False,fresh_compiles=0))
    frozen(cut);assert not output.exists();report=dict(schema_version=1,role='Independent actual dispatcher body integration, risk weighted and source-only',input_cut=dict(path=str(cut_path),sha256=hash(cut_path.read_bytes())),branches=results)
    output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(dict(output=str(output),sha256=hash(output.read_bytes()),checks=[dict(line=x['line'],checks=x['checks_passed']) for x in results])))
