"""Admit exact artifact-bound custom mixin arguments measured against untouched16."""
import hashlib
import json
import re

def mixin_argument_measurements_ok(root,body,*,owned=False):
    try:
        path='fixtures/sass/owned-aggregate-contracts.json' if owned else 'fixtures/sass/mixin-argument-contracts.json';raw=(root/path).read_bytes();catalog=json.loads(raw)
        if owned:
            if hashlib.sha256(raw).hexdigest()!='b83f5ee9e898004e2fce2ae49719dbed923dd2b5eabf06f3f463a8ad33f24c7a':return False
            membership=catalog['original_membership']
            if hashlib.sha256((root/membership['path']).read_bytes()).hexdigest()!=membership['sha256']:return False
        probes=[p for p in catalog['cases'] if p['case_id']==body['case_id']]
        if len(probes)!=1:return False
        probe=probes[0]
        if any(body.get(k)!=v for k,v in probe.items()) or body.get('error') is not None:return False
        identity=body['identity'];provenance=json.loads((root/'reference/material-16.2.14/PROVENANCE.json').read_text())['isolated_environment']
        lock=json.loads((root/'reference/material-16.2.14/environment-package-lock.json').read_text())
        original=json.loads((root/'fixtures/sass/function-contracts.json').read_text())['original_entry_identity']
        if catalog['original_entry_identity']!=original:return False
        expected_identity=dict(material_version='16.2.14',material_manifest_sha256=provenance['material_manifest_sha256'],
            lock_sha256=provenance['package_lock_sha256'],material_integrity=lock['packages']['node_modules/@angular/material']['integrity'],
            catalog=path,catalog_sha256=hashlib.sha256(raw).hexdigest(),expected_source='untouched-installed-material16',candidate_source='packed-facade')
        if any(identity.get(k)!=v for k,v in expected_identity.items()):return False
        compiler=json.loads((root/'package.json').read_text())['devDependencies']['sass']
        if not isinstance(identity['sass_version'],str) or not identity['sass_version'].startswith('dart-sass\t'+compiler+'\t'):return False
        program="@use '__entry__' as m;\n"+catalog['setup']+'\n'+probe['call']+'\n'
        program_sha=hashlib.sha256(program.encode()).hexdigest()
        values=[]
        for role in ('expected','actual'):
            measured=body[role];css=measured['css']
            if not isinstance(css,str) or measured['css_sha256']!=hashlib.sha256(css.encode()).hexdigest() or type(measured['css_bytes']) is not int or measured['css_bytes']!=len(css.encode()):return False
            role_program="@use '__entry__' as m;\n"+catalog['setup']+'\n'+(probe['reference_call'] if owned and role=='expected' else probe['call'])+'\n'
            if measured['program_sha256']!=hashlib.sha256(role_program.encode()).hexdigest():return False
            sources=measured['sources']
            if not sources or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/') or '\\' in s['path'] or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in sources):return False
            if len({(s['root'],s['path']) for s in sources})!=len(sources):return False
            if role=='expected':
                if any(s['root']!=0 for s in sources) or dict(root=0,**original) not in sources:return False
            elif not any(s['root']==0 and s['path']=='_index.scss' for s in sources):return False
            values.append(css)
        return True
    except (KeyError,TypeError,ValueError,OSError):return False

def mixin_argument_assertion_ok(root,active,body,invocation):
    owned=str(body.get('case_id','')).startswith('owned-aggregate/')
    if not owned and not str(body.get('case_id','')).startswith('mixin-argument/'):
        return True
    try:
        envelope=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,
            line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
            mutation_rejected=True,error=None)
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in envelope.items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        if len(library)!=1 or body['tarball_sha256']!=library[0]['sha256'] or not mixin_argument_measurements_ok(root,body,owned=owned):return False
        original=body['expected']['css'];actual=body['actual']['css']
        if original!=actual:return False
        wrong=actual+'\n.wrong-nonempty-mixin { color: red; }\n'
        return wrong!=original and body['mutation']==dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode()))
    except (KeyError,TypeError,ValueError,OSError):return False
