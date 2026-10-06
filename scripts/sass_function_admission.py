"""Argument-bearing function evidence must match the fixed original-source probes."""
import hashlib
import json
import re

def function_assertion_ok(root,active,body,invocation):
    if not str(body.get('case_id','')).startswith('function-value/'):
        return True
    try:
        path='fixtures/sass/function-contracts.json';raw=(root/path).read_bytes();catalog=json.loads(raw)
        probes=[p for p in catalog['cases'] if p['case_id']==body['case_id']]
        if len(probes)!=1:return False
        probe=probes[0]
        expected=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,
            line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
            function=probe['function'],expression=probe['expression'],mutation_rejected=True)
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in expected.items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        if len(library)!=1 or body['tarball_sha256']!=library[0]['sha256']:return False
        identity=body['identity'];provenance=json.loads((root/'reference/material-16.2.14/PROVENANCE.json').read_text())['isolated_environment']
        lock=json.loads((root/'reference/material-16.2.14/environment-package-lock.json').read_text())
        required=dict(material_version='16.2.14',material_manifest_sha256=provenance['material_manifest_sha256'],lock_sha256=provenance['package_lock_sha256'],material_integrity=lock['packages']['node_modules/@angular/material']['integrity'],catalog=path,catalog_sha256=hashlib.sha256(raw).hexdigest(),expected_source='untouched-installed-material16',candidate_source='packed-facade')
        if any(identity.get(k)!=v for k,v in required.items()) or not isinstance(identity['sass_version'],str) or not identity['sass_version'].startswith('dart-sass\t'+json.loads((root/'package.json').read_text())['devDependencies']['sass']+'\t'):return False
        values=[]
        for role in ['expected','actual']:
            measured=body[role];value=measured['value']
            if not isinstance(value,str) or not value or measured['value_sha256']!=hashlib.sha256(value.encode()).hexdigest() or measured['value_bytes']!=len(value.encode()):return False
            if not re.fullmatch('[0-9a-f]{64}',measured['program_sha256']):return False
            sources=measured['sources']
            if not sources or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/') or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in sources):return False
            if role=='expected':
                if any(s['root']!=0 for s in sources):return False
                original=catalog['original_entry_identity']
                if dict(root=0,**original) not in sources:return False
            elif not any(s['root']==0 and s['path']=='_index.scss' for s in sources):return False
            values.append(value)
        return values[0]==values[1] and body.get('error') is None
    except (KeyError,TypeError,ValueError,OSError):return False
