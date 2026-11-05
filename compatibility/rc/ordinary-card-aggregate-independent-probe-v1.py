# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Pure independent card expected-CSS review; no compiler or product constructor."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from current_sass_card_aggregate import CARD_AGGREGATE_CASES, insert_card_into_aggregate_model
from sass_ordinary_aggregate_admission import insert_ordinary_checkbox_button_into_aggregate_model

OLD = ['--mdc-elevated-card-container-color', '--mdc-elevated-card-container-elevation', '--mdc-outlined-card-container-color', '--mdc-outlined-card-outline-color', '--mdc-outlined-card-container-elevation', '--mat-card-subtitle-text-color']
NEW = ['--mat-card-elevated-container-color', '--mat-card-elevated-container-elevation', '--mat-card-outlined-container-color', '--mat-card-outlined-container-elevation', '--mat-card-outlined-outline-color']
TYPE = ['--mat-card-' + k for k in ['title-text-font', 'title-text-line-height', 'title-text-size', 'title-text-tracking', 'title-text-weight', 'subtitle-text-font', 'subtitle-text-line-height', 'subtitle-text-size', 'subtitle-text-tracking', 'subtitle-text-weight']]
EXPECTED_IDS = ['mixin-css/all-component-colors', 'mixin-css/all-component-themes', 'mixin-css/all-component-typographies',
                'mixin-argument/all-component-colors/custom-full-theme', 'mixin-argument/all-component-colors/raw-color-config',
                'mixin-argument/all-component-themes/custom-full-theme', 'mixin-argument/all-component-themes/custom-dark-theme',
                'mixin-argument/all-component-typographies/custom-full-theme', 'mixin-argument/all-component-typographies/raw-typography-config']


def ref(path):
    raw = (ROOT / path).read_bytes()
    return dict(path=path, sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))


def image(css):
    return dict(sha256=hashlib.sha256(css.encode()).hexdigest(), bytes=len(css.encode()))


def independent(case, css):
    # Exact own header offsets and declaration lines, not the production regex.
    selector = ('.sass-api-probe' if case.startswith('mixin-css/') else '.sass-argument-probe') + ' .mat-mdc-card'
    header = selector + ' {\n'
    starts, at = [], 0
    while True:
        at = css.find(header, at)
        if at < 0:
            break
        assert at == 0 or css[at - 1] == '\n'
        starts.append(at)
        at += len(header)
    dim = 'typography' if 'typographies' in case else 'theme' if 'themes' in case else 'color'
    assert len(starts) == (2 if dim == 'theme' else 1)
    spans = [(start, css.index('\n}', start) + 2) for start in starts]
    blocks = [css[a:b] for a, b in spans]
    if dim == 'theme':
        assert spans[0][1] + 1 == spans[1][0]
    def values(block, keys):
        lines = block.splitlines()
        assert lines[0] == selector + ' {' and lines[-1] == '}' and len(lines) == len(keys) + 2
        result = []
        for key, line in zip(keys, lines[1:-1]):
            p = '  ' + key + ': '
            assert line.startswith(p) and line.endswith(';')
            v = line[len(p):-1]
            assert v and not any(c in v for c in '{};\n')
            result.append(v)
        return result
    if dim == 'typography':
        values(blocks[0], TYPE)
        return css, (spans[0][0], spans[-1][1]), selector, blocks
    v = values(blocks[0], OLD)
    assert v[0] == v[2]
    if dim == 'theme':
        values(blocks[1], TYPE)
    # Values come only from authenticated prior declarations; base geometry from
    # unchanged original owned get-unthemable-tokens literals (4px/4px/1px).
    insert = ''.join('  ' + k + ': ' + value + ';\n' for k, value in zip(NEW, (v[0], v[1], v[2], v[4], v[3])))
    before_subtitle = blocks[0].index('  --mat-card-subtitle-text-color: ')
    blocks_new = [blocks[0][:before_subtitle] + insert + blocks[0][before_subtitle:], *blocks[1:]]
    base = selector + ' {\n  --mat-card-elevated-container-shape: 4px;\n  --mat-card-outlined-container-shape: 4px;\n  --mat-card-outlined-outline-width: 1px;\n}\n'
    result = css[:spans[0][0]] + base + '\n'.join(blocks_new) + css[spans[-1][1]:]
    return result, (spans[0][0], spans[-1][1]), selector, blocks


def main():
    started = time.monotonic()
    subjects = ['scripts/current-sass-card-aggregate-contract.mjs', 'scripts/current_sass_card_aggregate.py',
                'scripts/sass-ordinary-aggregate-contract.mjs', 'scripts/sass_ordinary_aggregate_admission.py',
                'compatibility/rc/ordinary-card-public-bridge-model-v1.mjs',
                'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_elevated-card.scss',
                'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_outlined-card.scss']
    before = [ref(p) for p in subjects]
    assert list(CARD_AGGREGATE_CASES) == EXPECTED_IDS
    rows, inputs, results, failures = [], [], [], []
    for line, suffix in [('21.x', '21'), ('main', 'main')]:
        path = 'compatibility/rc/parent-spinner-snack-aggregate-integration-' + suffix + '-v1.json'
        receipt = json.loads((ROOT / path).read_bytes())
        assert [r['case_id'] for r in receipt['rows']] == EXPECTED_IDS
        inputs.append(ref(path))
        for row in receipt['rows']:
            old = row['current']
            assert image(old['css']) == dict(sha256=old['css_sha256'], bytes=old['css_bytes'])
            prior = insert_ordinary_checkbox_button_into_aggregate_model(case_id=row['case_id'], css=old['css'])
            assert prior is not None
            expected, span, selector, blocks = independent(row['case_id'], prior)
            actual = insert_card_into_aggregate_model(case_id=row['case_id'], css=prior)
            assert actual == expected, (line, row['case_id'], 'Python whole CSS')
            decorated = '/* independent outside prefix */\n' + prior + '\n/* independent outside suffix */'
            assert insert_card_into_aggregate_model(case_id=row['case_id'], css=decorated) == '/* independent outside prefix */\n' + expected + '\n/* independent outside suffix */'
            record = dict(line=line, case_id=row['case_id'], prior=image(prior), expected=image(expected), unchanged_typography='typographies' in row['case_id'], whole_outer_bytes_retained=True)
            results.append(record)
            variants = dict(missing=prior[:span[0]] + prior[span[1]:], duplicate=prior + '\n' + '\n'.join(blocks),
                            wrong_selector=prior.replace(selector + ' {', selector + ':hover {'),
                            unexpected_card_minified=prior + '\n' + selector + '{color:red}',
                            unexpected_card_header_newline=prior + '\n' + selector + '\n{\n  color: red;\n}',
                            unexpected_card_nested=prior + '\n' + selector + ' {\n  .nested {color:red}\n}',
                            already_expanded=expected if expected != prior else prior + '\n' + blocks[0],
                            carriage_return=prior + '\r')
            key = TYPE[0] if 'typographies' in row['case_id'] else OLD[0]
            variants['wrong_key'] = prior.replace(key + ':', '--unexpected-card-token:')
            for name, css in variants.items():
                rejected = insert_card_into_aggregate_model(case_id=row['case_id'], css=css) is None
                if not rejected:
                    failures.append(dict(language='Python', line=line, case_id=row['case_id'], control=name, required='reject', observed='accepted expected transform'))
            rows.append(dict(line=line, caseId=row['case_id'], css=prior, expected=expected, variants=variants))
    child = subprocess.run(['/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node', str(ROOT / 'compatibility/rc/ordinary-card-aggregate-independent-js-probe-v1.mjs')],
                           input=json.dumps(rows), text=True, capture_output=True, cwd=ROOT, timeout=30)
    assert child.returncode == 0, child.stderr
    js = json.loads(child.stdout)
    for row in js['rows']:
        for control, rejected in row['mutations'].items():
            if not rejected:
                failures.append(dict(language='JavaScript', line=row['line'], case_id=row['case_id'], control=control, required='reject', observed='accepted expected transform'))
    assert [ref(p) for p in subjects] == before
    result = dict(schema_version=1, subject_refs=before, retained_input_refs=inputs, exact_case_ids=EXPECTED_IDS,
                  prior_observed_rows=18, fresh_compiler_calls=0, new_candidate_CSS_used_for_expected=False,
                  rows=results, JS_metadata_controls=js['metadata'], pure_mutation_count_per_language=len(rows) * len(rows[0]['variants']),
                  failures=failures, current_four_models_unchanged=True, elapsed_seconds=time.monotonic()-started,
                  scope='Pure expected CSS only; no source/artifact/renderer/floor/fullowner admission')
    destination = Path(sys.argv[1])
    assert not destination.exists()
    destination.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(dict(path=str(destination), failures=len(failures), positive_rows=18, elapsed_seconds=result['elapsed_seconds'])))


if __name__ == '__main__':
    main()
