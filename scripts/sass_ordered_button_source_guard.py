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
def _check(line):
    if Path(__file__).read_bytes()!=_SELF: raise ValueError('guard changed')
    raw=(_ROOT/'fixtures/sass/ordered-button-proof-inputs.json').read_bytes()
    if hashlib.sha256(raw).hexdigest()!=_HASHES[line]:raise ValueError('manifest changed')
    m=json.loads(raw);rows=m['files']
    if m['schema_version']!=1 or type(rows) is not list or len({e['path'] for e in rows})!=len(rows):raise ValueError('invalid manifest')
    for e in rows:
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
    payload=_expected_plain(value);path=Path(root)/'scripts/sass-expected-snapshot-engine.mjs';raw=path.read_bytes()
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
