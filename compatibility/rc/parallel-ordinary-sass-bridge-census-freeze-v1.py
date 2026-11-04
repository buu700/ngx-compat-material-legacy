#!/usr/bin/env python3
"""Freeze the bounded census and cached-evidence index; no Sass/compiler invocation."""
import collections
import datetime
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy')
ROOTS = {'21.x':ROOT, 'main':pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
P = 'compatibility/rc/parallel-ordinary-sass-bridge-census-'

def ref(root,path):
    b=(root/path).read_bytes()
    return {'path':path,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}

def write(suffix,obj):
    path=ROOT/(P+suffix)
    assert not path.exists(),str(path)
    path.write_text(json.dumps(obj,indent=2)+'\n')
    return ref(ROOT,P+suffix)

def strings(value):
    if isinstance(value,str):
        yield value
    elif isinstance(value,list):
        for child in value:
            yield from strings(child)
    elif isinstance(value,dict):
        for key,child in value.items():
            yield key
            yield from strings(child)

if __name__=='__main__':
    data={line:json.loads((ROOT/(P+('21x' if line=='21.x' else 'main')+'-v1.json')).read_text()) for line in ROOTS}
    # Every captured physical source must still match its census, on its own line.
    for line,d in data.items():
        for r in d['bound_inputs']:
            assert ref(ROOTS[line],r['path'])==r,(line,r['path'])
    a,b=data['21.x'],data['main']
    assert a['counts']==b['counts']
    assert [e['symbol'] for e in a['entries']]==[e['symbol'] for e in b['entries']]
    ar={r['path']:r for r in a['bound_inputs'] if r['path'].startswith('projects/')}
    br={r['path']:r for r in b['bound_inputs'] if r['path'].startswith('projects/')}
    assert set(ar)==set(br)
    differences=[{'path':p,'21x':ar[p],'main':br[p]} for p in ar if ar[p]!=br[p]]
    assert [x['path'] for x in differences]==['projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss']
    catalog_names=[
        'default-companion-contract-review.json',
        'default-mapped-companion-contract-review.json',
        'default-variant-companion-contract-review.json',
        'companion-addition-contract-review.json',
        'variant-companion-addition-review.json',
        'sort-current-companion-contract-review.json',
        'tree-current-companion-contract-review.json',
        'companion-historical-include-21-port-proof.json',
        'form-field-state-token-bridge-source-proof.json',
        'parallel-spinner-snack-public-bridge-integration-report.json',
        'parallel-spinner-snack-public-bridge-source-independent-findings-v2.json',
        '21x-c04-control-m3-theme-source-review.json',
    ]
    catalog={}
    for line,root in ROOTS.items():
        items=[]
        for name in catalog_names:
            path='compatibility/rc/'+name
            if not (root/path).is_file():
                items.append({'path':path,'present':False,'limit':'This cached record is not present on this root; no failure inferred.'})
                continue
            d=json.loads((root/path).read_text())
            ids=sorted({match for s in strings(d) for match in re.findall(r'mixin-css/([a-z0-9-]+)',s) if match in {e['symbol'] for e in a['entries']}})
            items.append({'reference':ref(root,path),'present':True,
                          'role':d.get('role'), 'declared_scope':d.get('scope'),
                          'explicit_mixin_case_names_mentioned':ids,
                          'family_review_keys':sorted(d.get('family_reviews',{})),
                          'limit':'Cached self-declared scope/mentions only. Not rerun or promoted to current full integration/runtime/floor evidence.'})
        catalog[line]=items
    catalog_ref=write('cached-evidence-v1.json',{'schema_version':1,'role':'Read-only index of existing finite source/compiled-CSS receipts; no new compiler execution','roots':catalog})

    no=[e for e in a['entries'] if not e['reachable_public_overrides']]
    partitions=collections.Counter(('vendor-and-token' if e['reachable_vendor_include_count'] and e['reachable_token_utility_sites'] else
                                    'vendor-endpoint' if e['reachable_vendor_include_count'] else
                                    'owned-token-utility' if e['reachable_token_utility_sites'] else
                                    'empty-body' if e['empty_source_body'] else 'other-owned-or-direct-path') for e in no)
    matrix=[]
    pure_mat={'autocomplete','option','optgroup','menu','paginator','select','table'}
    mixed={'card','radio','slide-toggle'}
    mdc_priority={'button','checkbox','chips','dialog','fab','icon-button','list','slider','tabs','tooltip'}
    assert len(pure_mat|mixed|mdc_priority|{'input'})==21
    for f in a['families']:
        family=f['family']
        if family in mdc_priority:
            focus='Prioritize exact current-consumer/name/value/selector proof for the historical MDC path; include all dimensions and primary/accent/warn + disabled/state cases. This source census alone does not declare rendered failure.'
        elif family in pure_mat:
            focus='Confirm emitted owned MAT token values, current selector/cascade scope and intended empty dimensions against current public API/consumer source; matching names alone are insufficient.'
        elif family in mixed:
            focus='Separate matching owned MAT helper tokens from historical MDC component tokens; prove both parts, including density/typography and relevant states.'
        elif family=='input':
            focus='Confirm historical no-output responsibility and form-field/transitive styling relationship; do not invent a modern input theme mirror just because the current peer exposes more knobs.'
        else:
            focus='Review the existing finite bridge receipt scope against current source hashes; prove uncovered direct/config/variant/dimension paths and actual component integration separately.'
        es=[e for e in a['entries'] if e['family']==family]
        matrix.append({'family':family,'aggregate_companion':f['aggregate_companion'],'exports':len(es),
                       'public_override_graph_exports':len(f['public_override_symbols']),
                       'no_public_override_graph_exports':len(es)-len(f['public_override_symbols']),
                       'empty_source_bodies':f['empty_source_symbols'],
                       'vendor_reachable_exports':[e['symbol'] for e in es if e['reachable_vendor_include_count']],
                       'current_literal_token_hits':{path:len(t['literal_current_consumers']) for path,t in f['imported_owned_token_modules'].items()},
                       'focus':focus})
    findings={
      'schema_version':1,'recorded_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'decision':'Complete bounded source census; no product/gate/audit admission. Focused proof needs identified, not blanket failure findings.',
      'worksheet':ref(ROOT,P+'worksheet-v1.json'),
      'censuses':{line:ref(ROOT,P+('21x' if line=='21.x' else 'main')+'-v1.json') for line in ROOTS},
      'cached_evidence':catalog_ref,'counts_per_line':a['counts'],
      'minimum_installed_peers':{line:{'material':d['material_version'],'cdk':d['cdk_version']} for line,d in data.items()},
      'contract':{
        'ordinary_export_obligation':'docs/03-sass-contract.md:42 covers all historical ordinary/current component mixins. The13 all-legacy ordinary companions in lines49ff are an aggregate membership subset, not a cap on the154 ordinary export obligations.',
        'source_vs_output':'Historical ordinary call syntax and independently owned M2 intent must reach current official components. Old ordinary CSS equality is not current integration proof (doc03:45,117).',
        'no_false_negative':'A missing direct overrides include is not a failure. Transitive public calls, matching current public tokens, direct CSS, and intentionally empty historical dimensions require individual interpretation.'},
      'public_graph':{
        'symbols_reaching_public_override':61,
        'aggregate_companion_symbols_reaching_public_override':52,
        'other_ordinary_symbols_reaching_public_override':9,
        'distinct_public_override_apis':sorted({c['call'] for e in a['entries'] for c in e['reachable_public_overrides']}),
        'direct_export_body_public_calls':[e['symbol'] for e in a['entries'] if any(c['kind']=='public-peer-override' for c in e['direct_includes'])],
        'same_module_direct_or_local_helper_public_calls':[e['symbol'] for e in a['entries'] if any(c['path']==e['forward']['path'] for c in e['reachable_public_overrides'])],
        'interpretation':'The remaining53 public-reachable exports reach public overrides through companion/state helpers. icon-color is the53rd aggregate companion export and emits the already current --mat-icon-color token through owned token-utils instead.'},
      'no_override_graph_partition':dict(sorted(partitions.items())),
      'empty_source_bodies':{'symbols':[e['symbol'] for e in a['entries'] if e['empty_source_body']],
                             'all_tagged_default_oracle_css_bytes_zero':all(e['tagged_default_oracle']['invocation']['css_bytes']==0 for e in a['entries'] if e['empty_source_body']),
                             'limit':'Retained original no-output metadata is not proof that every current state/dimension needs no integration.'},
      'concrete_source_observations':[
        {'family':'checkbox','owned':'styles/checkbox/_checkbox-theme.scss:10 includes owned vendored MDC checkbox.theme, backed by m2/mdc/_checkbox.scss prefix(mdc,checkbox). Vendor checkbox theme prefix is checkbox; it calls keys.declare-custom-properties at line123.',
         'current':'Both installed runtime checkbox modules consume --mat-checkbox-selected-icon-color; no literal --mdc-checkbox-selected-icon-color consumer was found in shipped non-testing Material FESM JS.',
         'status':'Concrete token-name discrepancy; highest priority focused current checkbox proof. No compile/render failure claimed.'},
        {'family':'button','owned':'styles/button/_button-theme.scss:41 reaches vendor button-text-theme.theme. Vendor button-text-theme.scss:33 uses text-button prefix and line74 calls keys.declare-custom-properties.',
         'current':'Both installed button runtimes consume --mat-button-text-label-text-color, not the old --mdc-text-button-label-text-color.',
         'status':'Concrete token-name discrepancy; prove full variant/typography/density path rather than only old ordinary CSS parity.'},
        {'family':'option/optgroup/icon','owned':'Owned prefixes(mat,option),(mat,optgroup),(mat,icon) have10/6/1 lexical token keys, respectively.',
         'current':'Every one of these names appears as a literal var consumer in both installed peers, including --mat-icon-color used by icon-color despite no public override include.',
         'status':'Counterexample to classifying missing overrides as failure. Exact values, scope/state/cascade and public-API boundary still need proof.'},
        {'family':'form-field','owned':'color/theme reach the public state helper with exactly three state-layer tokens; typography/density retain separate historical paths.',
         'status':'Existing three-token state proof cannot be generalized to every filled/outlined current form-field token or every ordinary form-field dimension.'},
        {'family':'dialog-legacy-padding/input','owned':'dialog-legacy-padding emits specific current-looking .mat-mdc-dialog-* selectors; input color/typography wrappers have empty content and density is empty.',
         'status':'Direct CSS and transitive/no-output contracts need targeted responsibility/selector checks; neither becomes a required API mirror merely because current peer APIs expose more configuration.'}
      ],
      'family_matrix':matrix,
      'cross_line_owned_sources':{'captured_owned_input_count':len(ar),'differences':differences,
                                 'interpretation':'All39 export module bytes and their forward/mixin graph agree. The companion helper intentionally differs at three existing21/22 public-peer mappings: expansion and sidenav elevation dimension placement; stepper focus/hover shape0vs4px.'},
      'validation':{'physical_source_bindings_rehashed':{line:len(d['bound_inputs']) for line,d in data.items()},
                    'unique_exact_forward_to_local_mixin':154,'installed_public_override_exports_and_mixin_definitions_checked_per_line':38,
                    'unresolved_owned_include_sites':0,'new_sass_compiles':0,'runtime_or_native_runs':0,
                    'build_install_network_owner_matrix_actions':False,'existing_files_changed':False,
                    'acceptance_claims':{'runtime':False,'native':False,'floor_qualification':False,'C02':False,'C04':False,'full_audit':False,'canonical':False}},
      'remaining':'Separate bounded current bridge source/CSS proofs from required current component browser/lifecycle/coexistence evidence. No154-wide integration closure follows from cached old ordinary CSS equality.'
    }
    findings_ref=write('findings-v1.json',findings)
    print(json.dumps(findings_ref))
    files=sorted(p for p in (ROOT/'compatibility/rc').glob('parallel-ordinary-sass-bridge-census-*') if p.is_file())
    manifest=write('manifest-v1.json',{'schema_version':1,'role':'Frozen NEW-only census evidence; primary-root files only',
      'findings':findings_ref,'files':[ref(ROOT,str(p.relative_to(ROOT))) for p in files],
      'no_runtime_native_audit_canonical_acceptance':True})
    print(json.dumps(manifest))
