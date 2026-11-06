# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Authenticated tagged Material-16 values for six finite Stepper bridge tokens."""
import hashlib,json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FIXTURE_SHA256='a952c70fbb725c5ec0bd78d8b6bb7b54ac506c5dcf0600616c29e328f8bf67d9'
MANIFEST_SHA256='ed9b9c8e69c63bb134b71a25ded9d68d21f1d120cdd513ba423126864986fe74'
SHAPE_SHA256='9834806bacc495276bfeae3c36c6e583daff0ee35919b3f373ccd31c404ca805'
SCENARIOS=('contract','alternate','closeout-custom-2018-light','closeout-custom-2018-dark','closeout-custom-legacy-light','closeout-custom-legacy-dark')
COLORS=('--mat-stepper-header-hover-state-layer-color','--mat-stepper-header-focus-state-layer-color',
        '--mat-stepper-header-error-state-label-text-color','--mat-stepper-header-error-state-icon-foreground-color')
SHAPES=('--mat-stepper-header-focus-state-layer-shape','--mat-stepper-header-hover-state-layer-shape')
TOKENS=frozenset(COLORS+SHAPES)
_sha=lambda b:hashlib.sha256(b).hexdigest()
_fixture_bytes=(ROOT/'fixtures/sass/stepper-historical-bridge-oracle.json').read_bytes()
_manifest_bytes=(ROOT/'tests/fixtures/stepper-material-16/source-manifest.json').read_bytes()
_shape_bytes=(ROOT/'tests/fixtures/stepper-material-16/shape-observation.json').read_bytes()
if (_sha(_fixture_bytes)!=FIXTURE_SHA256 or _sha(_manifest_bytes)!=MANIFEST_SHA256 or _sha(_shape_bytes)!=SHAPE_SHA256):
    raise ValueError('tagged Stepper oracle bytes changed')
_fixture=json.loads(_fixture_bytes);_manifest=json.loads(_manifest_bytes);_shape=json.loads(_shape_bytes)
if (_fixture['schema_version']!=1 or _fixture['archive_sha256']!=_manifest['archive_sha256']
    or _fixture['source_manifest_sha256']!=MANIFEST_SHA256 or list(_fixture['scenarios'])!=list(SCENARIOS)
    or len(_fixture['sources'])!=163 or len(_manifest['source_files'])!=163
    or any(s['path']!=m['path'] or s['sha256']!=m['sha256'] or type(s['bytes']) is not int or s['bytes']<1
           for s,m in zip(_fixture['sources'],_manifest['source_files']))
    or any(states.get(k)!='0px' for states in _shape['cases'].values() for k in ('normal','hover','focus'))):
    raise ValueError('tagged Stepper oracle provenance differs')
_colors={}
for scenario,entry in _fixture['scenarios'].items():
    if _sha(entry['source'].encode())!=entry['source_sha256'] or _sha(entry['css'].encode())!=entry['css_sha256']:
        raise ValueError('tagged Stepper scenario bytes changed')
    values={}
    for token in COLORS:
        found=re.findall(re.escape(token)+r':\s*([^;]+);',entry['css'])
        if len(found)!=1:raise ValueError('tagged Stepper scenario token incomplete')
        values[token]=found[0]
    _colors[scenario]=values

PROOF=dict(fixture_sha256=FIXTURE_SHA256,source_manifest_sha256=MANIFEST_SHA256,
           shape_sha256=SHAPE_SHA256,archive_sha256=_fixture['archive_sha256'])

def stepper_historical_value(line,scenario,token):
    if line not in ('main','21.x') or scenario not in _colors or token not in TOKENS:return None
    return '0' if token in SHAPES else _colors[scenario][token]
