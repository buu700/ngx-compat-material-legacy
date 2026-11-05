#!/usr/bin/env python3
"""Bounded source inspection only. No Sass imports, compilers, or runtime admissions."""
import hashlib
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
PREFIX='compatibility/rc/parallel-ordinary-card-fab-icon-button-source-'
ROOTS={'21.x':ROOT,'main':Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
FAMILIES=['card','fab','icon-button']
RUNTIME={'card':'node_modules/@angular/material/fesm2022/card.mjs',
         'fab':'node_modules/@angular/material/fesm2022/button.mjs',
         'icon-button':'node_modules/@angular/material/fesm2022/_icon-button-chunk.mjs'}
THEME={'card':'node_modules/@angular/material/card/_card-theme.scss',
       'fab':'node_modules/@angular/material/button/_fab-theme.scss',
       'icon-button':'node_modules/@angular/material/button/_icon-button-theme.scss'}
MODEL={'card':'node_modules/@angular/material/card/_m3-card.scss',
       'fab':'node_modules/@angular/material/button/_m3-fab.scss',
       'icon-button':'node_modules/@angular/material/button/_m3-icon-button.scss'}
def digest(raw):return hashlib.sha256(raw).hexdigest()
def reference(root,p):
    raw=(root/p).read_bytes();return dict(path=p,sha256=digest(raw),bytes=len(raw))
def located(root,p,needle):
    text=(root/p).read_text();at=text.index(needle)
    return dict(path=p,line=text.count('\n',0,at)+1,needle=needle)
def styles(text):
    values=[]
    for match in re.finditer(r'styles:\s*\[\s*("(?:[^"\\]|\\.)*")',text):
        value=json.loads(match[1])
        if value not in values:values.append(value)
    assert values
    return '\n'.join(values)
def rule(css,token):
    at=css.index('var('+token);start=css.rfind('}',0,at)+1;end=css.index('}',at)+1
    return css[start:end].strip()

worksheet_path=PREFIX+'worksheet-v2.json';worksheet=json.loads((ROOT/worksheet_path).read_bytes())
def assert_inputs():
    for line,root in ROOTS.items():
        for expected in worksheet['source_inputs'][line]:assert reference(root,expected['path'])==expected,expected['path']
assert_inputs()

CARD_PAIRS=[('mdc-elevated-card-container-color','elevated-container-color'),
            ('mdc-elevated-card-container-elevation','elevated-container-elevation'),
            ('mdc-outlined-card-container-color','outlined-container-color'),
            ('mdc-outlined-card-container-elevation','outlined-container-elevation'),
            ('mdc-outlined-card-outline-color','outlined-outline-color')]
FAB_PAIRS=[('mdc-fab-container-color','container-color'),('mdc-fab-container-color','small-container-color'),
           ('mdc-fab-icon-color','foreground-color'),('mdc-fab-icon-color','small-foreground-color'),
           ('mdc-extended-fab-label-text-font','extended-label-text-font'),
           ('mdc-extended-fab-label-text-size','extended-label-text-size'),
           ('mdc-extended-fab-label-text-tracking','extended-label-text-tracking'),
           ('mdc-extended-fab-label-text-weight','extended-label-text-weight')]
ICON_PAIRS=[('mdc-icon-button-icon-color','icon-color'),('mdc-icon-button-disabled-icon-color','disabled-icon-color'),
            ('mat-mdc-button-persistent-ripple-color','state-layer-color'),('mat-mdc-button-ripple-color','ripple-color')]
PAIRS={'card':CARD_PAIRS,'fab':FAB_PAIRS,'icon-button':ICON_PAIRS}
card_mat_names=['subtitle-text-color']+[prefix+'-'+suffix for prefix in ['title-text','subtitle-text'] for suffix in ['font','line-height','size','tracking','weight']]
branches=[]
for line,root in ROOTS.items():
    census_path='compatibility/rc/parallel-ordinary-sass-bridge-census-'+('21x' if line=='21.x' else 'main')+'-v1.json'
    census=json.loads((root/census_path).read_bytes());selected=[v for v in census['entries'] if v['family'] in FAMILIES]
    assert len(selected)==12
    assert {v['symbol'] for v in selected}=={f+'-'+d for f in FAMILIES for d in ['theme','color','typography','density']}
    original=json.loads((root/'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes())
    census_refs={v['path']:v for v in census['bound_inputs']}
    export_rows=[]
    for entry in selected:
        p=entry['forward']['path'];assert reference(root,p)==census_refs[p]
        assert entry['forward']['directive'] in (root/'projects/ngx-material-legacy/_index.scss').read_text()
        assert entry['tagged_default_oracle']==original['members']['mixins'][entry['symbol']]
        export_rows.append(dict(symbol=entry['symbol'],family=entry['family'],module=reference(root,p),mixin_line=entry['mixin']['line'],
                                historical_signature=entry['mixin']['signature'],public_override_graph=entry['reachable_public_overrides'],
                                empty_body=entry['empty_source_body'],tagged_default_css_bytes=entry['tagged_default_oracle']['invocation']['css_bytes']))
    consumers={family:styles((root/RUNTIME[family]).read_text()) for family in FAMILIES}
    family_rows=[]
    for family in FAMILIES:
        css=consumers[family];theme=(root/THEME[family]).read_text();model=(root/MODEL[family]).read_text()
        public_keys={name[len(family)+1:] for name in re.findall(r'^\s+('+re.escape(family)+r'-[a-z0-9-]+)\s*:',model,re.M)}
        assert 'namespace: '+family in theme and '@mixin overrides($tokens: ())' in theme
        assert family+'-overrides' in (root/'node_modules/@angular/material/_index.scss').read_text()
        native_names=sorted(set(re.findall(r'var\((--[a-z0-9-]+)',css)))
        comparisons=[]
        for old,key in PAIRS[family]:
            current='--mat-'+family+'-'+key;assert key in public_keys and current in native_names
            comparisons.append(dict(owned_name='--'+old,current_public_key=key,current_name=current,
                                    old_name_is_native_consumer_in_selected_css='--'+old in native_names,
                                    actual_current_consumer_rule=rule(css,current),
                                    classification='source role/name translation gap; rendered/cascade effect not measured'))
        family_rows.append(dict(family=family,public_api=family+'-overrides',public_api_declaration=located(root,THEME[family],'@mixin overrides($tokens: ())'),
                                public_override_namespace=family,current_consumer=reference(root,RUNTIME[family]),decoded_consumer_css_sha256=digest(css.encode()),
                                exact_relevant_native_varnames=[v for v in native_names if v.startswith('--mat-'+family+'-')],
                                finite_role_name_pairs=comparisons))
    card_existing=[]
    for name in card_mat_names:
        token='--mat-card-'+name;assert token in consumers['card'];card_existing.append(token)
    icon_text=(root/'projects/ngx-material-legacy/styles/button/_icon-button-theme.scss').read_text()
    assert 'width: var(--mdc-icon-button-state-layer-size);' in icon_text and 'height: var(--mdc-icon-button-state-layer-size);' in icon_text
    assert 'padding: math.div($calculated-size - $_icon-size, 2);' in icon_text
    icon_runtime=(root/RUNTIME['icon-button']).read_text();fab_runtime=(root/RUNTIME['fab']).read_text()
    assert 'classAttribute: "mat-mdc-button-base"' in icon_runtime
    assert 'mdc-fab--extended' in fab_runtime and 'mat-mdc-extended-fab' in fab_runtime
    branches.append(dict(line=line,minimum_material=json.loads((root/'node_modules/@angular/material/package.json').read_bytes())['version'],
                         minimum_cdk=json.loads((root/'node_modules/@angular/cdk/package.json').read_bytes())['version'],census=reference(root,census_path),
                         selected_owned_export_count=12,all_selected_owned_module_bytes_still_equal_frozen_census=True,exports=export_rows,families=family_rows,
                         positive_counterexamples=dict(card_existing_current_names=card_existing,
                             icon_density_own_direct_css=located(root,'projects/ngx-material-legacy/styles/button/_icon-button-theme.scss','width: var(--mdc-icon-button-state-layer-size);'),
                             icon_native_matching_base_class=located(root,RUNTIME['icon-button'],'classAttribute: "mat-mdc-button-base"'),
                             fab_native_retains_historical_mdc_extended_class=located(root,RUNTIME['fab'],'mdc-fab--extended')),
                         inputs=worksheet['source_inputs'][line]))
assert_inputs()
assert [b['minimum_material'] for b in branches]==['21.2.14','22.1.7']
for family in FAMILIES:
    left=next(v for v in branches[0]['families'] if v['family']==family);right=next(v for v in branches[1]['families'] if v['family']==family)
    assert left['exact_relevant_native_varnames']==right['exact_relevant_native_varnames']
output=ROOT/(PREFIX+'paired-evidence-v1.json');assert not output.exists()
report=dict(schema_version=1,role='Paired bounded read-only source evidence for12ordinaryexports; no compile/render/output admission',
            worksheet=reference(ROOT,worksheet_path),producer=reference(ROOT,PREFIX+'inspect-v1.py'),branches=branches,
            method='Decode existing shipped component style string literals only to locate current var consumers; no compiled CSS normalization or candidate-derived goldens',
            no_rendered_failure_inferred=True,fresh_compiles=0,existing_files_modified=False,reader_review_resumed=False)
output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(output=str(output.relative_to(ROOT)),sha256=digest(output.read_bytes()),bytes=output.stat().st_size,
                     branches=[dict(line=b['line'],exports=b['selected_owned_export_count'],minimum=b['minimum_material']) for b in branches])))
