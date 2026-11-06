# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Run only against the temporary source clone created by the JS driver."""
import copy,hashlib,json,sys
from pathlib import Path
mode,root=sys.argv[1],Path(sys.argv[2]);sys.path.insert(0,str(root/'scripts'))
if mode=='measurements':
    from sass_ordinary_density_gate import OrdinaryDensityGateContext,ordinary_density_gate_match
    from sass_default_aggregate_admission import default_aggregate_assertion_ok
    ctx=OrdinaryDensityGateContext(root);payload=json.load(sys.stdin);rows=payload['rows'];run=payload['run'];assert len(rows)==3
    for body in rows:
        assert ordinary_density_gate_match(ctx,body),body['case_id']
        if body['case_id'].startswith('mixin-css/'):assert default_aggregate_assertion_ok(body)
        else:
            from types import SimpleNamespace
            from sass_mixin_argument_admission import mixin_argument_assertion_ok
            catalog_raw=(root/'fixtures/sass/mixin-argument-contracts.json').read_bytes();catalog=json.loads(catalog_raw);probe=next(p for p in catalog['cases'] if p['case_id']==body['case_id']);prov=json.loads((root/'reference/material-16.2.14/PROVENANCE.json').read_text())['isolated_environment'];lock=json.loads((root/'reference/material-16.2.14/environment-package-lock.json').read_text());binding={'source_line':body['line']};art=next(a for a in run['artifacts'] if a['id']=='library');active=SimpleNamespace(binding=binding,manifest=run);actual=body['actual'];wrong=actual['css']+'\n.wrong-nonempty-mixin { color: red; }\n';wrapped=dict(body,**probe,kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,run_id=run['run_id'],invocation_id='unit',binding=binding,tarball_sha256=art['sha256'],mutation_rejected=True,error=None,mutation=dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode())),identity=dict(material_version='16.2.14',material_manifest_sha256=prov['material_manifest_sha256'],lock_sha256=prov['package_lock_sha256'],material_integrity=lock['packages']['node_modules/@angular/material']['integrity'],catalog='fixtures/sass/mixin-argument-contracts.json',catalog_sha256=hashlib.sha256(catalog_raw).hexdigest(),sass_version=actual['sass_version'],expected_source='untouched-installed-material16',candidate_source='packed-facade'))
            assert body['identity']==wrapped['identity'] and body['mutation']==wrapped['mutation'] and body['mutation_rejected'] is True
            assert mixin_argument_assertion_ok(root,active,wrapped,'unit');altered=copy.deepcopy(wrapped);altered['actual']['css']+='\n.forged {}';assert not mixin_argument_assertion_ok(root,active,altered,'unit')
        key='actual_measurement' if body['case_id'].startswith('mixin-css/') else 'actual';bad=[]
        def candidate():return copy.deepcopy(body)
        x=candidate();x['line']='main' if x['line']=='21.x' else '21.x';bad.append(x)
        x=candidate();p=x['current_ordinary_density']['peer'];p['css']+='\n.forged {}';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode());bad.append(x)
        x=candidate();p=x['current_ordinary_density']['peer'];p['program']+=' ';p['program_sha256']=hashlib.sha256(p['program'].encode()).hexdigest();bad.append(x)
        x=candidate();x['current_ordinary_density']['peer']['sources'][0]['sha256']='0'*64;bad.append(x)
        x=candidate();p=x['current_ordinary_density']['peer'];p['sources'].append(copy.deepcopy(p['sources'][0]));bad.append(x)
        x=candidate();x[key]['sources'][0]['sha256']='0'*64;bad.append(x)
        x=candidate();x['current_ordinary_density']['source']={};bad.append(x)
        if key=='actual':
            x=candidate();x['expected']['sources'][0]['sha256']='0'*64;bad.append(x)
            x=candidate();x['expected']['sources'].append(copy.deepcopy(x['expected']['sources'][0]));bad.append(x)
            x=candidate();x['expected']['sources'].reverse();bad.append(x)
            x=candidate();x['expected']['css']+='\n.forged {}';x['expected']['css_sha256']=hashlib.sha256(x['expected']['css'].encode()).hexdigest();x['expected']['css_bytes']=len(x['expected']['css'].encode());bad.append(x)
        x=candidate();x['current_ordinary_density']['peer']['sources'][0]['extra']=True;bad.append(x)
        x=candidate();x['current_companion']['classification']='forged';bad.append(x)
        x=candidate();x[key]['css']=x[key]['css'].replace('--mat-checkbox-state-layer-size:', '--mat-checkbox-state-layer-size: forged;\n  --mat-checkbox-state-layer-size:',1);x[key]['css_sha256']=hashlib.sha256(x[key]['css'].encode()).hexdigest();x[key]['css_bytes']=len(x[key]['css'].encode());bad.append(x)
        x=candidate();scope='.sass-api-probe' if key=='actual_measurement' else '.sass-argument-probe';x[key]['css']=x[key]['css'].replace(scope,'.wrong-scope',1);x[key]['css_sha256']=hashlib.sha256(x[key]['css'].encode()).hexdigest();x[key]['css_bytes']=len(x[key]['css'].encode());bad.append(x)
        assert all(not ordinary_density_gate_match(ctx,x) for x in bad)
    print(json.dumps(dict(ok=True,cases=len(rows),negatives_per_case=len(bad))))
elif mode=='optimized':
    from sass_ordinary_density_gate import OrdinaryDensityGateContext
    try:OrdinaryDensityGateContext(root)
    except RuntimeError:print(json.dumps(dict(ok=True)))
    else:raise RuntimeError('optimized mode was accepted')
else:
    assert mode in ('baseline','pre','rehash','late');p=root/'fixtures/sass/default-aggregate-contracts.json';m=root/'fixtures/sass/ordinary-density-proof-inputs.json';orig=p.read_bytes();manifest=m.read_bytes();line='21.x' if json.loads((root/'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('21.') else 'main';rejected=False
    try:
        try:
            if mode=='pre':p.write_bytes(orig+b'\n')
            if mode=='rehash':
                data=json.loads(orig);data['peer_inputs'][line]['sources'][0]['sha256']='0'*64;b=(json.dumps(data,indent=2)+'\n').encode();p.write_bytes(b);mm=json.loads(manifest);r=next(x for x in mm['files'] if x['path']=='fixtures/sass/default-aggregate-contracts.json');r.update(sha256=hashlib.sha256(b).hexdigest(),bytes=len(b));m.write_text(json.dumps(mm,indent=2)+'\n')
            from sass_ordinary_density_gate import OrdinaryDensityGateContext
            ctx=OrdinaryDensityGateContext(root)
            if mode=='late':p.write_bytes(orig+b'\n');ctx.assert_current()
        except Exception:
            if mode=='baseline':raise
            rejected=True
        assert rejected==(mode!='baseline');print(json.dumps(dict(ok=True,mode=mode)))
    finally:p.write_bytes(orig);m.write_bytes(manifest)
