#!/usr/bin/env python3
"""Independent Python replay of finite CSS observations and modeled metadata."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
sys.dont_write_bytecode = True
PRIMARY=Path('/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy')
ROOTS={'21.x':PRIMARY,'main':Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
spec=importlib.util.spec_from_file_location('independent_finite_subject',PRIMARY/'scripts/sass_spinner_snack_bridge_admission.py')
s=importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)
def digest(raw):
    return hashlib.sha256(raw.encode() if isinstance(raw,str) else raw).hexdigest()
def measured(css):
    return dict(css=css,css_sha256=digest(css),css_bytes=len(css.encode()))
def independent_expected(row):
    output=[]
    text={}
    container=None
    for line in row['historical']['css'].split('\n'):
        output.append(line)
        if match:=re.fullmatch('  --mdc-circular-progress-active-indicator-color: (.+);',line):
            output.append('  --mat-progress-spinner-active-indicator-color: '+match[1]+';')
        if match:=re.fullmatch('  --mdc-snackbar-container-color: (.+);',line):
            container=match[1]
        if match:=re.fullmatch('  --mdc-snackbar-supporting-text-color: (.+);',line):
            output += ['  --mat-snack-bar-container-color: '+container+';','  --mat-snack-bar-supporting-text-color: '+match[1]+';']
        if match:=re.fullmatch('  --mdc-snackbar-supporting-text-(font|line-height|size|weight): (.+);',line):
            text[match[1]]=match[2]
            if match[1]=='weight':
                output += ['  --mat-snack-bar-supporting-text-'+name+': '+text[name]+';' for name in ['font','line-height','size','weight']]
    return '\n'.join(output)
report=dict(schema_version=1,python=sys.version,role='Independent Python finite replay; existing CSS and modeled envelopes only',lines=[],new_compiles=0,actual_packed_assertions=0)
for line,root in ROOTS.items():
    read=lambda path:(root/path).read_bytes()
    packet=json.loads(read('compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'))
    branch=packet['branches'][line]
    obs=json.loads(read(branch['observation']['path']))
    catalog=json.loads(read(packet['catalog']['path']))
    provenance=json.loads(read(packet['provenance']['path']))
    lock=json.loads(read(packet['reference_lock']['path']))
    checks=[]
    results=[]
    def check(name,value):
        assert value,name
        checks.append(name)
    assert tuple(row['case_id'] for row in obs['rows'])==s.SPINNER_SNACK_BRIDGE_CASES
    for row in obs['rows']:
        independent=independent_expected(row)
        args=dict(case_id=row['case_id'],line=line,original=row['historical'],actual=row['current'])
        check('independent exact insertion '+row['case_id'],independent==row['current']['css']==s.spinner_snack_bridge_expected_css(case_id=row['case_id'],line=line,original=row['historical']) and s.spinner_snack_bridge_results_match(**args))
        alias=next(text for text in row['current']['css'].split('\n') if re.match('  --mat-(progress-spinner-active-indicator|snack-bar-(container|supporting-text))',text))
        css=row['current']['css']
        mutants=dict(alias_missing=css.replace(alias+'\n','',1),alias_duplicate=css.replace(alias,alias+'\n'+alias,1),alias_value=css.replace(alias,alias.replace(': ',': wrong-'),1),alias_first=css.replace(alias+'\n','',1).replace('{\n','{\n'+alias+'\n',1),old_value=re.sub('(--mdc-[^:]+: )[^;]+',r'\1wrong',css,count=1),old_selector=css.replace('.mat-mdc-','.other-',1),trailing=css+'\n',new_rule=css+'\n.x { color: red; }',unrelated=css.replace('{\n','{\n  color: red;\n',1))
        for name,mutant in mutants.items():
            check('CSS '+name+' '+row['case_id'],not s.spinner_snack_bridge_results_match(**{**args,'actual':measured(mutant)}))
        for name in ['old_hash','old_bytes','old_css','actual_hash','actual_bytes','wrong_id','wrong_line']:
            value=copy.deepcopy(args)
            if name=='old_hash':value['original']['css_sha256']='0'*64
            if name=='old_bytes':value['original']['css_bytes']+=1
            if name=='old_css':value['original']=measured(value['original']['css']+'\n')
            if name=='actual_hash':value['actual']['css_sha256']='0'*64
            if name=='actual_bytes':value['actual']['css_bytes']+=1
            if name=='wrong_id':value['case_id']+='/other'
            if name=='wrong_line':value['line']='unknown'
            check('measurement '+name+' '+row['case_id'],not s.spinner_snack_bridge_results_match(**value))
        results.append(dict(case_id=row['case_id'],expected_sha256=digest(independent),added_declarations=row['added_declarations']))
    def model(row):
        spec=next(value for value in branch['cases'] if value['case_id']==row['case_id'])
        manifest=dict(run_id='independent-modeled-'+line,source=dict(line=line,commit='2'*40,git_tree_sha='3'*40,content_sha256='4'*64),artifacts=[dict(id='library',sha256='1'*64)])
        binding=dict(run_id=manifest['run_id'],source_line=line,source_commit=manifest['source']['commit'],source_tree=manifest['source']['git_tree_sha'],source_content_sha256=manifest['source']['content_sha256'],artifacts_sha256=digest(json.dumps(manifest['artifacts'],sort_keys=True,separators=(',',':'))))
        invocation='independent-modeled-invocation'
        default=row['case_id'].startswith('mixin-css/')
        original={**measured(row['historical']['css']),'program_sha256':spec['program_sha256'],'sources':[dict(root=0,**catalog['original_entry_identity'])]}
        actual={**measured(row['current']['css']),'program_sha256':spec['program_sha256'],'sources':copy.deepcopy(branch['source_sets'][spec['source_set_sha256']])}
        body=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=line,run_id=manifest['run_id'],invocation_id=invocation,binding=copy.deepcopy(binding),mutation_rejected=True,error=None,case_id=row['case_id'],mixin=row['mixin'],variant=row['variant'],call=row['call'],comparison=s.SPINNER_SNACK_BRIDGE_CONTRACT,tarball_sha256=manifest['artifacts'][0]['sha256'],identity=dict(material_version='16.2.14',material_manifest_sha256=provenance['isolated_environment']['material_manifest_sha256'],lock_sha256=packet['reference_lock']['sha256'],material_integrity=lock['packages']['node_modules/@angular/material']['integrity'],catalog=packet['oracle' if default else 'catalog']['path'],catalog_sha256=packet['oracle' if default else 'catalog']['sha256'],expected_source='untouched-installed-material16',candidate_source='packed-facade',sass_version=branch['compiler']),current_spinner_snack_bridge=dict(contract=s.SPINNER_SNACK_BRIDGE_CONTRACT,source_line=line,source_subject=packet['source_subject'],source_packet=packet['source_packet'],source_modules=branch['source_modules'],compiler_inputs=packet['compiler_inputs']),expected=original,actual=actual,mutation=measured(actual['css']+'\n.wrong-nonempty-mixin { color: red; }\n'))
        return dict(body=body,active=dict(manifest=manifest,binding=binding),invocation=invocation)
    controls=dict(target=None,hook=None)
    def callback(path):
        if controls['hook']:
            fn=controls['hook'];controls['hook']=None;fn()
        return b'fault' if path==controls['target'] else read(path)
    context=s.SpinnerSnackBridgeContract(root,read=callback)
    check('physical line',context.line==line)
    for row in obs['rows']:
        check('modeled envelope '+row['case_id'],s.spinner_snack_bridge_assertion_ok(context=context,**model(row)))
    original=model(obs['rows'][0])
    mutations={
      'known_line':(['body','line'],'main' if line=='21.x' else '21.x'),
      'active_line':(['active','manifest','source','line'],'main' if line=='21.x' else '21.x'),
      'id':(['body','case_id'],'mixin-css/all-component-colors'),'call':(['body','call'],'foreign'),
      'variant':(['body','variant'],'foreign'),'before_program':(['body','expected','program_sha256'],'0'*64),
      'after_program':(['body','actual','program_sha256'],'0'*64),'expected_entry':(['body','expected','sources',0,'sha256'],'0'*64),
      'loaded':(['body','actual','sources',0,'sha256'],'0'*64),'compiler':(['body','current_spinner_snack_bridge','compiler_inputs',0,'sha256'],'0'*64),
      'oracle':(['body','identity','catalog_sha256'],'0'*64),'run':(['body','run_id'],'foreign'),
      'invocation':(['body','invocation_id'],'foreign'),'artifact':(['body','tarball_sha256'],'0'*64),
      'binding':(['body','binding','source_tree'],'0'*40),'active_source':(['active','manifest','source','content_sha256'],'0'*64),
      'active_artifact':(['active','manifest','artifacts',0,'sha256'],'0'*64)}
    for name,(path,replacement) in mutations.items():
        value=copy.deepcopy(original);cursor=value
        for key in path[:-1]:cursor=cursor[key]
        cursor[path[-1]]=replacement
        check('metadata '+name,not s.spinner_snack_bridge_assertion_ok(context=context,**value))
    paths=[packet['oracle']['path'],packet['catalog']['path'],packet['compiler_inputs'][2]['path']]+[r['path'] for r in branch['source_modules']]+[packet['source_subject']['path'],packet['source_packet']['path']]
    for path in paths:
        try:s.SpinnerSnackBridgeContract(root,read=lambda p,target=path:b'fault' if p==target else read(p))
        except AssertionError:checks.append('cold callback '+path)
        else:raise AssertionError('Cold callback accepted '+path)
    for path in paths:
        controls['target']=path
        check('late callback '+path,not s.spinner_snack_bridge_assertion_ok(context=context,**original))
        controls['target']=None
        context.assert_current()
    for name,(path,replacement) in list(mutations.items())[:8]:
        value=copy.deepcopy(original)
        def mutate(value=value,path=path,replacement=replacement):
            cursor=value
            for key in path[:-1]:cursor=cursor[key]
            cursor[path[-1]]=replacement
        controls['hook']=mutate
        check('live mutation '+name,not s.spinner_snack_bridge_assertion_ok(context=context,**value))
    class AccessorDict(dict):
        calls=0
        def __getitem__(self,key):
            type(self).calls+=1
            return super().__getitem__(key)
    accessor=copy.deepcopy(original)
    accessor['body']=AccessorDict(accessor['body'])
    check('dict subclass rejects without getter',not s.spinner_snack_bridge_assertion_ok(context=context,**accessor) and AccessorDict.calls==0)
    check('authentic restoration',s.spinner_snack_bridge_assertion_ok(context=context,**original))
    extra=copy.deepcopy(original)
    extra['body']['expected']['sources'].append(dict(root=0,path='foreign.scss',sha256='0'*64,bytes=1))
    check('documented original closure parent boundary',s.spinner_snack_bridge_assertion_ok(context=context,**extra))
    js=json.loads((PRIMARY/'compatibility/rc/parallel-spinner-snack-c02-independent-js-v1.json').read_text())
    check('all15 independent JS/Python CSS fingerprints match',next(r for r in js['lines'] if r['line']==line)['case_results']==results)
    report['lines'].append(dict(line=line,checks_passed=len(checks),checks=checks,case_results=results,modeled_envelope_positives=15,actual_packed_assertions=0,parent_original_closure_boundary_observed=True))
path=PRIMARY/'compatibility/rc/parallel-spinner-snack-c02-independent-python-v1.json'
assert not path.exists()
path.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([dict(line=r['line'],checks=r['checks_passed']) for r in report['lines']]))
