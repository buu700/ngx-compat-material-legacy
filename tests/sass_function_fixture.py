"""Synthetic function receipts for validator tests; never execution evidence."""
import hashlib
import json

def function_receipt(root,active,case,invocation):
    raw=(root/'fixtures/sass/function-contracts.json').read_bytes();catalog=json.loads(raw)
    probe=next(p for p in catalog['cases'] if p['case_id']==case)
    provenance=json.loads((root/'reference/material-16.2.14/PROVENANCE.json').read_text())['isolated_environment']
    lock=json.loads((root/'reference/material-16.2.14/environment-package-lock.json').read_text())
    value='synthetic independently supplied value; not execution evidence'
    measured=dict(value=value,value_sha256=hashlib.sha256(value.encode()).hexdigest(),value_bytes=len(value.encode()),program_sha256='a'*64)
    original={**measured,'sources':[dict(root=0,**catalog['original_entry_identity'])]}
    actual={**measured,'sources':[dict(root=0,path='_index.scss',sha256='b'*64,bytes=13000)]}
    identity=dict(material_version='16.2.14',material_manifest_sha256=provenance['material_manifest_sha256'],lock_sha256=provenance['package_lock_sha256'],material_integrity=lock['packages']['node_modules/@angular/material']['integrity'],catalog='fixtures/sass/function-contracts.json',catalog_sha256=hashlib.sha256(raw).hexdigest(),expected_source='untouched-installed-material16',candidate_source='packed-facade',sass_version='dart-sass\t1.104.1\tsynthetic')
    library=next(a for a in active.manifest['artifacts'] if a['id']=='library')
    return dict(case_id=case,kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,function=probe['function'],expression=probe['expression'],mutation_rejected=True,expected=original,actual=actual,error=None,identity=identity,tarball_sha256=library['sha256'])
