# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bound full source closure and immutable finite 06 inputs."""
import hashlib,json,subprocess,shutil
from pathlib import Path
from sass_ordinary_density_gate import OrdinaryDensityGateContext
from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract
_ROOT=Path(__file__).resolve().parents[1]
_SELF=Path(__file__).read_bytes()
_HASHES={'21.x':'1a3ad05466e55fe0b5779a9d38956871b2759a1e1d1c34e4f42e8dfb30234b42','main':'f746c5da35afa3a4cfe124026bd908768402c9b668fe4ec3def38fee922250d6'}
def _successors(line,rows):
    if line!='main':return {}
    path=_ROOT
    for part in ('fixtures','sass','ordered-aggregate-source-successor.json'):
        path=path/part
        if path.is_symlink():raise ValueError('linked successor packet')
    raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!='a0be2676905a677fab5e470880226449ea425de226c7312fb64f0f9fe6827fbd' or len(raw)!=2268:raise ValueError('successor packet changed')
    packet=json.loads(raw);names=['scripts/sass-ordered-aggregate-contract.mjs','scripts/sass_ordered_aggregate_admission.py','scripts/sass-ordinary-density-gate.mjs','scripts/sass_ordinary_density_gate.py']
    if packet['schema_version']!=1 or packet['role']!='main-ordered-aggregate-exact-source-successor' or packet['source_parent']!='42d02491648097656ccb3c590dbaaea066c3e603' or packet['base_commit']!='8baa761eca624c9d71293c3d31750a2b3fdeebf0' or packet['scope_only'] is not True or [r['path'] for r in packet['updates']]!=names:raise ValueError('successor scope')
    env={'PATH':'/usr/bin:/bin','LANG':'C','LC_ALL':'C','GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_SYSTEM':'/dev/null','GIT_TERMINAL_PROMPT':'0','GIT_NO_LAZY_FETCH':'1'};result={}
    for row in packet['updates']:
        old=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet['source_parent']+':'+row['path']],cwd=_ROOT,env=env)
        entry=next(x for x in rows if x['path']==row['path'])
        if entry!=row['before'] or hashlib.sha256(old).hexdigest()!=row['before']['sha256'] or len(old)!=row['before']['bytes'] or row['after']['path']!=row['path']:raise ValueError('successor preimage')
        if row['after_git']:
            if row['after_git']!=packet['base_commit']:raise ValueError('successor commit')
            data=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',row['after_git']+':'+row['path']],cwd=_ROOT,env=env)
            if hashlib.sha256(data).hexdigest()!=row['after']['sha256'] or len(data)!=row['after']['bytes']:raise ValueError('successor afterimage')
        result[row['path']]=row['after']
    vpath=_ROOT/'fixtures/sass/ordered-aggregate-density-source-successor.json'
    if vpath.is_symlink():raise ValueError('linked density successor')
    vraw=vpath.read_bytes()
    if hashlib.sha256(vraw).hexdigest()!='c2dcadcd39eb9e97cfb42d39043aa43b68ba8ef440f6621e23cf9a7a94fe09f6' or len(vraw)!=22536:raise ValueError('density successor changed')
    v=json.loads(vraw)
    if v['schema_version']!=1 or v['role']!='main-ordered-aggregate-current-density-source-successor' or v['line']!='main' or v['source_scope_only'] is not True or v['previous_packet']!=dict(path='fixtures/sass/ordered-aggregate-source-successor.json',sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw)) or [x['path'] for x in v['updates']]!=names[2:]:raise ValueError('density successor scope')
    for row in v['updates']:
        if result[row['path']]!=row['before']:raise ValueError('density predecessor')
        before=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet['base_commit']+':'+row['path']],cwd=_ROOT,env=env)
        if hashlib.sha256(before).hexdigest()!=row['before']['sha256'] or len(before)!=row['before']['bytes']:raise ValueError('density predecessor changed')
        at=0;parts=[]
        for e in row['edits']:
            if set(e)!={'offset','before','after'} or type(e['offset']) is not int or e['offset']<at:raise ValueError('density edit')
            old=e['before'].encode()
            if before[e['offset']:e['offset']+len(old)]!=old:raise ValueError('density literal')
            parts.extend((before[at:e['offset']],e['after'].encode()));at=e['offset']+len(old)
        after=b''.join([*parts,before[at:]])
        if hashlib.sha256(after).hexdigest()!=row['after']['sha256'] or len(after)!=row['after']['bytes']:raise ValueError('density afterimage')
        result[row['path']]=row['after']
    if (_ROOT/'scripts').is_symlink() or (_ROOT/'scripts/sass-aggregate-source-successor.mjs').is_symlink():raise ValueError('linked successor helper')
    if hashlib.sha256((_ROOT/'scripts/sass-aggregate-source-successor.mjs').read_bytes()).hexdigest()!='7a8d81b439bf0c3677e8be8fbfc710c68b449fdee717c38dba9cf67905f99c0c':raise ValueError('successor helper changed')
    return result
def _check(line):
    if Path(__file__).read_bytes()!=_SELF: raise ValueError('guard changed')
    raw=(_ROOT/'fixtures/sass/ordered-button-proof-inputs.json').read_bytes()
    if hashlib.sha256(raw).hexdigest()!=_HASHES[line]:raise ValueError('manifest changed')
    m=json.loads(raw);rows=m['files']
    if m['schema_version']!=1 or type(rows) is not list or len({e['path'] for e in rows})!=len(rows):raise ValueError('invalid manifest')
    updates=_successors(line,rows)
    for original in rows:
        e=updates.get(original['path'],original)
        p=_ROOT
        for part in e['path'].split('/'):
            if part in ('','.','..'):raise ValueError('invalid path')
            p=p/part
            if p.is_symlink():raise ValueError('linked input')
        b=p.read_bytes()
        if len(b)!=e['bytes'] or hashlib.sha256(b).hexdigest()!=e['sha256']:raise ValueError('changed input')
_EXPECTED_ENGINE='356337aa30fed58fcc25afeaabca5ebb3695623c0f17a0aff497a3bd92b4a383'
def _expected_plain(value):
    if value is None or type(value) in (str,bool):return value
    if type(value) is int and abs(value)<=9007199254740991:return value
    if type(value) is list:return [_expected_plain(v) for v in value]
    if type(value) is dict and all(type(k) is str for k in value):return {k:_expected_plain(v) for k,v in value.items()}
    raise ValueError('plain expected input required')
def _isolated_expected_computation(root,line,operation,value):
    if not __debug__:raise ValueError('assertions required')
    payload=_expected_plain(value)
    if line=='main' and operation=='ordered-aggregate-06':
        path=Path(root)/'scripts/sass-aggregate-source-successor.mjs';raw=path.read_bytes();digest='7a8d81b439bf0c3677e8be8fbfc710c68b449fdee717c38dba9cf67905f99c0c'
        if hashlib.sha256(raw).hexdigest()!=digest:raise ValueError('successor helper changed')
        node=shutil.which('node')
        if not node:raise ValueError('pinned Node unavailable')
        suffix="\nconst __root=process.argv[1],__input=JSON.parse(readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(aggregateExpectedSuccessor(__root,'main',__input.peers)));"
        result=subprocess.run([node,'--input-type=module','--eval',raw.decode()+suffix,str(root)],input=json.dumps(payload,separators=(',',':'),ensure_ascii=False),text=True,capture_output=True,cwd=root,env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','TZ':'UTC'},timeout=150)
        if result.returncode!=0 or hashlib.sha256(path.read_bytes()).hexdigest()!=digest:raise ValueError('successor expected failed: '+result.stderr[:1000])
        return _expected_plain(json.loads(result.stdout))
    path=Path(root)/'scripts/sass-expected-snapshot-engine.mjs';raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=_EXPECTED_ENGINE:raise ValueError('trusted expected bootstrap changed')
    node=shutil.which('node')
    if not node:raise ValueError('pinned Node unavailable')
    result=subprocess.run([node,'--input-type=module','--eval',raw.decode(),str(root),line,operation],input=json.dumps(payload,separators=(',',':'),ensure_ascii=False),text=True,capture_output=True,cwd=root,env={'LANG':'C.UTF-8','LC_ALL':'C.UTF-8','TZ':'UTC'},timeout=150)
    if result.returncode!=0:raise ValueError('expected isolation failed: '+result.stderr[:1000])
    out=_expected_plain(json.loads(result.stdout))
    if out['line']!=line or out['operation']!=operation or out['schema_version']!=1 or type(out['css']) is not str or out['css_sha256']!=hashlib.sha256(out['css'].encode()).hexdigest() or out['css_bytes']!=len(out['css'].encode()) or payload!=_expected_plain(value):raise ValueError('expected output identity')
    if path.read_bytes()!=raw:raise ValueError('bootstrap changed during evaluation')
    return out

def ordered_button_source_guard(line,sources,peers,actual_css):
    if not __debug__:return False
    try:
        _check(line);d=OrdinaryDensityGateContext(_ROOT);s=CurrentSpinnerSnackContract(_ROOT);sets=list(s.source_sets.values())
        if s.line!=line or len(sets)!=1 or type(sources) is not list or sources!=sets[0]:return False
        d.assert_current();s.assert_current();result=_isolated_expected_computation(_ROOT,line,'ordered-aggregate-06',dict(peers=peers))['css']==actual_css;d.assert_current();s.assert_current();_check(line);return result
    except Exception:return False
