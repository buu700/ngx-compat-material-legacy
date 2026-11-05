#!/usr/bin/env python3
"""Independent current gate composition review: retained CSS, modeled envelopes, no compiler."""
import ast
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from types import SimpleNamespace

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'scripts'), str(ROOT / 'tests')]
PREFIX = 'compatibility/rc/parallel-spinner-snack-gate-independent-'
ROUTES = {'21.x': ROOT, 'main': Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}

def digest(raw):
    return hashlib.sha256(raw.encode() if type(raw) is str else raw).hexdigest()

def ref(root, path):
    raw = (root / path).read_bytes()
    return dict(path=path, sha256=digest(raw), bytes=len(raw))

def measured(css):
    return dict(css=css, css_sha256=digest(css), css_bytes=len(css.encode()))

def assert_frozen(packet):
    """The owner supplies explicit per-line refs; refuse unknown/unpinned execution."""
    assert packet['role'] == 'independent exact input cut'
    for line, root in ROUTES.items():
        assert line in packet['lines']
        for row in packet['lines'][line]:
            assert ref(root, row['path']) == row, row['path']

def model_inputs():
    from sass_default_aggregate_fixture import default_aggregate_receipt
    from sass_mixin_fixture import mixin_receipt
    spec = importlib.util.spec_from_file_location('review_direct_fixture', ROOT / 'tests/test_sass_spinner_snack_bridge_admission.py')
    fixture = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fixture)
    packet = json.loads((ROOT / 'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes())
    assert digest((ROOT / 'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes()) == 'fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8'
    outputs = []
    for line, root in ROUTES.items():
        branch = packet['branches'][line]
        observation = branch['observation']
        assert ref(root, observation['path']) == observation
        direct = json.loads((root / observation['path']).read_bytes())
        aggregate_path = 'compatibility/rc/parent-spinner-snack-aggregate-integration-' + ('21' if line == '21.x' else 'main') + '-v1.json'
        aggregate = json.loads((root / aggregate_path).read_bytes())
        owner = fixture.SpinnerSnackBridgeAdmissionTests()
        owner.packet, owner.line, owner.branch = packet, line, branch
        for name, key in [('catalog', 'catalog'), ('provenance', 'provenance'), ('lock', 'reference_lock')]:
            setattr(owner, name, json.loads((root / packet[key]['path']).read_bytes()))
        seed = owner.model(direct['rows'][0])
        active = SimpleNamespace(**seed['active'])
        descriptor = dict(contract='historical-spinner-snack-css-with-positioned-public-tokens', source_line=line,
                          source_subject=packet['source_subject'], source_packet=packet['source_packet'],
                          source_modules=branch['source_modules'], compiler_inputs=packet['compiler_inputs'])
        bodies = []
        for row in direct['rows']:
            value = owner.model(row)
            body = value['body']
            if row['case_id'].startswith('mixin-argument/'):
                body.update(next(p for p in owner.catalog['cases'] if p['case_id'] == row['case_id']))
            else:
                body.update(oracle=packet['oracle']['path'], oracle_sha256=packet['oracle']['sha256'],
                            expected_sha256=body['expected']['css_sha256'], expected_bytes=body['expected']['css_bytes'],
                            actual_sha256=body['actual']['css_sha256'], actual_bytes=body['actual']['css_bytes'],
                            actual_measurement=copy.deepcopy(body['actual']))
            assert body['current_spinner_snack_bridge'] == descriptor
            bodies.append(body)
        for row in aggregate['rows']:
            case = row['case_id']
            body = default_aggregate_receipt(active, case, seed['invocation']) if case.startswith('mixin-css/') else mixin_receipt(root, active, case, seed['invocation'])
            current = dict(**measured(row['current']['css']), program_sha256=row['current']['logical_program_sha256'],
                           line=line, sass_version=branch['compiler'], sources=copy.deepcopy(next(iter(branch['source_sets'].values()))))
            body.update(current_spinner_snack_bridge=copy.deepcopy(descriptor), error=None)
            if case.startswith('mixin-css/'):
                body.update(actual_measurement=current, actual_sha256=current['css_sha256'], actual_bytes=current['css_bytes'])
            else:
                body['identity']['sass_version'] = branch['compiler']
                body.update(actual=current, mutation=measured(current['css'] + '\n.wrong-nonempty-mixin { color: red; }\n'))
            bodies.append(body)
        assert len(bodies) == len({b['case_id'] for b in bodies}) == 24
        outputs.append(dict(root=str(root), line=line, active=seed['active'], invocation=seed['invocation'], bodies=bodies,
                            descriptor=descriptor, retained_inputs=[ref(root, observation['path']), ref(root, aggregate_path)]))
    return outputs

def rehash(body, css):
    actual = body.get('actual_measurement', body.get('actual'))
    actual.update(measured(css))
    if 'actual' in body:
        body['actual'].update(measured(css))
        body['mutation'] = measured(css + '\n.wrong-nonempty-mixin { color: red; }\n')
    if 'actual_sha256' in body:
        body.update(actual_sha256=actual['css_sha256'], actual_bytes=actual['css_bytes'])

def run(cut, inputs, *, helpers_only=False):
    from sass_spinner_snack_gate_integration import SpinnerSnackGateContext, SPINNER_SNACK_GATE_CASES, spinner_snack_gate_assertion_ok, spinner_snack_gate_descriptor
    if not helpers_only:
        from sass_mixin_argument_admission import mixin_argument_assertion_ok
    report = dict(schema_version=1, role='Independent physical current helpers and extracted exact actual dispatcher; retained CSS plus modeled run/artifact envelopes',
                  input_cut=cut, helpers_only=helpers_only, fresh_compiles=0, source_producers=0, actual_packed_assertions=0, lines=[])
    for value in inputs:
        root, line = Path(value['root']), value['line']
        active = SimpleNamespace(**value['active'])
        controls = dict(hook=None, bad_path=None)
        observed = set()
        permitted_inputs = {r['path'] for r in cut['lines'][line]}
        def read(path):
            assert path in permitted_inputs and path not in cut.get('forbidden_concurrent_paths', [])
            observed.add(path)
            if controls['hook'] is not None:
                item = controls['hook']
                if path == item['path']:
                    item['count'] -= 1
                    if item['count'] == 0:
                        controls['hook'] = None; item['fn']()
            return b'nonphysical' if path == controls['bad_path'] else (root / path).read_bytes()
        context = SpinnerSnackGateContext(root, read=read)
        assert spinner_snack_gate_descriptor(context) == value['descriptor']
        dispatcher = dispatcher_body = None
        if not helpers_only:
            tree = ast.parse((root / 'scripts/rc-verify.py').read_text())
            dispatcher_node, = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == '_sass_seal_assertion_ok']
            namespace = dict(ROOT=root, ACTIVE_RUN=active, SPINNER_SNACK_GATE_CASES=SPINNER_SNACK_GATE_CASES,
                             spinner_snack_gate_assertion_ok=spinner_snack_gate_assertion_ok, mixin_argument_assertion_ok=mixin_argument_assertion_ok)
            exec(compile(ast.Module(body=[dispatcher_node], type_ignores=[]), str(root / 'scripts/rc-verify.py'), 'exec'), namespace)
            dispatcher = namespace['_sass_seal_assertion_ok']
            dispatcher_body = ast.get_source_segment((root / 'scripts/rc-verify.py').read_text(), dispatcher_node)
        checks = []
        def check(name, condition):
            assert condition, name
            checks.append(name)
        match = lambda b, **kw: spinner_snack_gate_assertion_ok(root, active, b, value['invocation'], context=context, **kw)
        css_negatives = {'mixin-css/progress-spinner-color', 'mixin-css/snack-bar-typography',
                         'mixin-argument/progress-spinner-theme/custom-dark-theme', 'mixin-argument/snack-bar-color/raw-color-config',
                         'mixin-css/all-component-colors', 'mixin-css/all-component-themes', 'mixin-css/all-component-typographies',
                         'mixin-argument/all-component-colors/raw-color-config', 'mixin-argument/all-component-themes/custom-dark-theme',
                         'mixin-argument/all-component-typographies/raw-typography-config'}
        shapes = {value['bodies'][i]['case_id'] for i in [0, 5, 15, 18]}
        direct_contradictions = {value['bodies'][i]['case_id'] for i in [0, 4, 7, 10]}
        for original in value['bodies']:
            case = original['case_id']
            check('helper positive ' + case, match(original))
            if dispatcher is not None:check('actual dispatcher positive ' + case, dispatcher(original, value['invocation']))
            if case in css_negatives:
                wrong = copy.deepcopy(original)
                rehash(wrong, wrong.get('actual_measurement', wrong.get('actual'))['css'] + '\n.independent-unrelated { color: red; }\n')
                check('complete CSS negative ' + case, not match(wrong))
            for key, mutate in {
                'loaded omission': lambda b: b.get('actual_measurement', b.get('actual'))['sources'].pop(),
                'compiler': lambda b: b.get('actual_measurement', b.get('actual')).__setitem__('sass_version', 'foreign compiler'),
                'measurement line': lambda b: b.get('actual_measurement', b.get('actual')).__setitem__('line', 'main' if line == '21.x' else '21.x'),
                'program': lambda b: b.get('actual_measurement', b.get('actual')).__setitem__('program_sha256', '0' * 64),
                'descriptor': lambda b: b['current_spinner_snack_bridge'].__setitem__('source_line', 'main' if line == '21.x' else '21.x'),
            }.items():
                if key in ['compiler', 'measurement line']:
                    if case not in direct_contradictions:continue
                elif case not in shapes:continue
                wrong = copy.deepcopy(original); mutate(wrong)
                if key != 'descriptor' and 'actual_measurement' in wrong and 'actual' in wrong:
                    wrong['actual'] = copy.deepcopy(wrong['actual_measurement'])
                check(key + ' negative ' + case, not match(wrong))
        selected = [value['bodies'][0], value['bodies'][5], value['bodies'][15], value['bodies'][18]]
        for body in selected:
            case = body['case_id']
            for key, replacement in [('run_id', 'foreign-run'), ('invocation_id', 'foreign-invocation'), ('tarball_sha256', '0' * 64), ('binding', {'foreign': 'binding'}),
                                     ('line', 'foreign-line'), ('current_spinner_snack_bridge', {}), ('case_id', 'mixin-css/all-legacy-component-themes')]:
                wrong = copy.deepcopy(body); wrong[key] = replacement
                check('envelope ' + key + ' ' + case, not match(wrong))
                if dispatcher is not None:check('dispatcher envelope ' + key + ' ' + case, not dispatcher(wrong, value['invocation']))
            for key in ['case_id', 'actual_measurement' if 'actual_measurement' in body else 'actual']:
                for phase, count in [('first', 1), ('last', 2)]:
                    wrong = copy.deepcopy(body)
                    controls['hook'] = dict(path='scripts/sass_spinner_snack_gate_integration.py', count=count,
                                            fn=lambda w=wrong, k=key: w.__setitem__(k, {} if k != 'case_id' else 'foreign'))
                    check('late live ' + phase + ' ' + key + ' ' + case, not match(wrong))
                    assert controls['hook'] is None
            check('authentic restoration ' + case, match(body))
        for path in ['scripts/sass_spinner_snack_gate_integration.py', 'scripts/sass_ripple_color_admission.py', 'scripts/sass_spinner_snack_bridge_admission.py']:
            controls['bad_path'] = path
            check('late nonphysical tool ' + path, not match(selected[0]))
            controls['bad_path'] = None
            check('physical restoration ' + path, match(selected[0]))
        check('unknown context', not spinner_snack_gate_assertion_ok(root, active, selected[0], value['invocation'], context=object()))
        other_root = ROUTES['main' if line == '21.x' else '21.x']
        check('wrong root', not spinner_snack_gate_assertion_ok(other_root, active, selected[0], value['invocation'], context=context))
        if dispatcher is not None:
            for body in value['bodies']:
                wrong = copy.deepcopy(body); wrong['case_id'] = 'foreign/unknown'
                check('unknown current flag actual dispatcher ' + body['case_id'], not dispatcher(wrong, value['invocation']))
        context.assert_current()
        report['lines'].append(dict(line=line, checks_passed=len(checks), checks=checks, retained_inputs=value['retained_inputs'],
                                   actual_dispatcher_body=dispatcher_body, actual_provided_reader_paths=sorted(observed),
                                   concurrent_mutable_path_intersection=sorted(observed.intersection(cut.get('forbidden_concurrent_paths', []))),
                                   selection=dict(all_positive_ids=24, css_negative_ids=sorted(css_negatives), generic_metadata_shapes=sorted(shapes),
                                                  direct_measurement_contradictions=sorted(direct_contradictions),
                                                  policy='Risk weighted; prior immutable comparator and owner fixed receipts cover duplicated Cartesian variants')))
    assert_frozen(cut)
    return report

if __name__ == '__main__':
    assert len(sys.argv) in (4, 5), 'cut.json controls.json fixture.json [--helpers-only]'
    helpers_only = len(sys.argv) == 5
    if helpers_only:assert sys.argv[4] == '--helpers-only'
    cut = json.loads(Path(sys.argv[1]).read_bytes())
    assert_frozen(cut)
    inputs = model_inputs()
    result = run(cut, inputs, helpers_only=helpers_only)
    for index, (target, value) in enumerate([(Path(sys.argv[2]), result), (Path(sys.argv[3]), inputs)]):
        encoded = json.dumps(value, indent=2) + '\n'
        if target.exists():
            assert index == 1 and target.read_text() == encoded, 'only exact retained fixture reuse is allowed'
        else:target.write_text(encoded)
    print(json.dumps(dict(outputs=[str(v) for v in sys.argv[2:4]], checks=[dict(line=r['line'], checks=r['checks_passed']) for r in result['lines']])))
