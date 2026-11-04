import datetime
import hashlib
import json
import os
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
PREFIX = 'compatibility/rc/parallel-spinner-snack-public-bridge-source-independent-'
AGENT = 'compatibility/rc/parallel-spinner-snack-public-bridge-integration-'


def sha(raw):
    return hashlib.sha256(raw if isinstance(raw, bytes) else raw.encode()).hexdigest()


def ref(root, path):
    raw = (root / path).read_bytes()
    return {'path': path, 'sha256': sha(raw), 'bytes': len(raw)}


def git(root, *args):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    return subprocess.run(['nice', '-n', '19', 'git', '--no-replace-objects', '-c',
                           'gc.auto=0', '-c', 'maintenance.auto=0', *args], cwd=root,
                          env=env, check=True, capture_output=True).stdout


mapping = json.loads((ROOT / (AGENT + 'map.json')).read_text())
catalog_path = 'fixtures/sass/mixin-argument-contracts.json'
oracle_path = 'compatibility/rc/oracles/material-16.2.14-sass-api.json'
catalog = json.loads((ROOT / catalog_path).read_text())
oracle = json.loads((ROOT / oracle_path).read_text())
assert ref(ROOT, oracle_path)['sha256'] == '76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d'
assert ref(ROOT, oracle['provenance']['lock_path'])['sha256'] == oracle['provenance']['lock_sha256']
assert catalog['original_entry_identity']['sha256'] == oracle['provenance']['index_sha256']
names = ['progress-spinner-color', 'progress-spinner-theme', 'snack-bar-color',
         'snack-bar-theme', 'snack-bar-typography']
aggregates = ['all-component-colors', 'all-component-themes', 'all-component-typographies']
direct_defaults = ['mixin-css/' + name for name in names]
direct_args = [row['case_id'] for row in catalog['cases'] if row['mixin'] in names]
indirect_defaults = ['mixin-css/' + name for name in aggregates]
indirect_args = [row['case_id'] for row in catalog['cases'] if row['mixin'] in aggregates]
populations = [direct_defaults, direct_args, indirect_defaults, indirect_args]
for key, expected in zip(['direct_default_cases', 'direct_argument_cases',
                          'indirect_ordinary_aggregate_default_cases',
                          'indirect_ordinary_aggregate_argument_cases'], populations):
    assert [row['case_id'] for row in mapping[key]] == expected
assert [len(rows) for rows in populations] == [5, 10, 3, 6]
assert len(set(sum(populations, []))) == 24
catalog_by_id = {row['case_id']: row for row in catalog['cases']}
for key in ['direct_argument_cases', 'indirect_ordinary_aggregate_argument_cases']:
    for row in mapping[key]:
        assert row['call'] == catalog_by_id[row['case_id']]['call']


def positioned_model(css, family):
    count = 0
    rules = list(re.finditer(r'([^{}]+)\{([^{}]*)\}', css))
    assert len(rules) > 0
    out = []
    end = 0
    for rule in rules:
        selector, body = rule.groups()
        out.append(css[end:rule.start()])
        end = rule.end()
        if family == 'progress-spinner':
            assert any(selector.strip().endswith('.mat-mdc-progress-spinner' + tail)
                       for tail in ['', '.mat-accent', '.mat-warn'])
            matches = list(re.finditer(r'\n  --mdc-circular-progress-active-indicator-color: ([^;\n]+);\n', body))
            assert len(matches) == 1
            match = matches[0]
            body = body[:match.end()] + '  --mat-progress-spinner-active-indicator-color: ' + match[1] + ';\n' + body[match.end():]
            count += 1
        else:
            assert selector.strip().endswith('.mat-mdc-snack-bar-container')
            colors = list(re.finditer(r'\n  --mdc-snackbar-container-color: ([^;\n]+);\n  --mdc-snackbar-supporting-text-color: ([^;\n]+);\n', body))
            typography = list(re.finditer(r'\n  --mdc-snackbar-supporting-text-font: ([^;\n]+);\n  --mdc-snackbar-supporting-text-line-height: ([^;\n]+);\n  --mdc-snackbar-supporting-text-size: ([^;\n]+);\n  --mdc-snackbar-supporting-text-weight: ([^;\n]+);\n', body))
            assert len(colors) + len(typography) == 1
            if colors:
                match = colors[0]
                addition = '  --mat-snack-bar-container-color: ' + match[1] + ';\n  --mat-snack-bar-supporting-text-color: ' + match[2] + ';\n'
                count += 2
            else:
                match = typography[0]
                addition = ''.join('  --mat-snack-bar-supporting-text-' + name + ': ' + value + ';\n'
                                   for name, value in zip(['font', 'line-height', 'size', 'weight'], match.groups()))
                count += 4
            body = body[:match.end()] + addition + body[match.end():]
        out.append(selector + '{' + body + '}')
    out.append(css[end:])
    return ''.join(out), count


before_commits = {'21.x': '2ed7cc4fdc897d046f347a54a6caf1656f45b87b',
                  'main': '1fed9f8540407bbeb11638799d133f63b11c1522'}
lines = []
for line, state in mapping['branches'].items():
    root = pathlib.Path(state['root'])
    modules = []
    for row in state['modules']:
        assert ref(root, row['path']) == {key: row[key] for key in ['path', 'sha256', 'bytes']}
        old = git(root, 'show', before_commits[line] + ':' + row['path'])
        oid = git(root, 'rev-parse', before_commits[line] + ':' + row['path']).decode().strip()
        assert hashlib.sha1(b'blob ' + str(len(old)).encode() + b'\0' + old).hexdigest() == oid
        assert sha(old) == row['before_sha256'] and len(old) == row['before_bytes']
        modules.append({'path': row['path'], 'before_commit': before_commits[line],
                        'before_git_blob': oid, 'before_sha256': sha(old),
                        'current': ref(root, row['path'])})
    tag = '21' if line == '21.x' else 'main'
    receipt_path = AGENT + 'cases-' + tag + '.json'
    receipt = json.loads((ROOT / receipt_path).read_text())
    assert receipt['line'] == line and receipt['case_count'] == 15 and receipt['compile_calls'] == 30
    assert [row['case_id'] for row in receipt['rows']] == direct_defaults + direct_args
    for item in receipt['input_refs']:
        assert ref(root, item['path']) == item
    for path, digest, size in receipt['compiler_inputs']:
        assert ref(root, path) == {'path': path, 'sha256': digest, 'bytes': size}
    rows = []
    negatives = 0
    for row in receipt['rows']:
        family = 'progress-spinner' if row['mixin'].startswith('progress-spinner') else 'snack-bar'
        historical, current = row['historical'], row['current']
        for value in [historical, current]:
            assert sha(value['css']) == value['css_sha256']
            assert len(value['css'].encode()) == value['css_bytes']
        if row['case_id'] in direct_defaults:
            invocation = oracle['members']['mixins'][row['mixin']]['invocation']
            assert historical['css_sha256'] == invocation['css_sha256']
            assert historical['css_bytes'] == invocation['css_bytes']
            assert row['setup_sha256'] == sha(oracle['standard_theme'])
        else:
            assert row['call'] == catalog_by_id[row['case_id']]['call']
            assert row['setup_sha256'] == sha(catalog['setup'])
        expected, additions = positioned_model(historical['css'], family)
        assert current['css'] == expected and row['added_declarations'] == additions
        expected_count = 3 if family == 'progress-spinner' else 6 if row['mixin'].endswith('-theme') else 2 if row['mixin'].endswith('-color') else 4
        assert additions == expected_count
        # Exact equality disallows additional current properties, moved token
        # declarations, wrong values and altered historical text.
        token = next(line for line in current['css'].splitlines(keepends=True)
                     if line.startswith('  --mat-') and ('progress-spinner-' in line or 'snack-bar-supporting-' in line or 'snack-bar-container-' in line))
        mutants = [current['css'] + '\n.extra { --mat-arbitrary-token: red; }',
                   current['css'].replace(token, '', 1) + '\n.wrong-selector {\n' + token + '}',
                   current['css'].replace(token, token.replace(': ', ': invalid-'), 1),
                   current['css'].replace('--mdc-', '--unexpected-', 1)]
        assert all(mutant != expected for mutant in mutants)
        negatives += len(mutants)
        rows.append({'case_id': row['case_id'], 'added_declarations': additions,
                     'independent_whole_css_model_matches': True})
    lines.append({'line': line, 'modules': modules, 'receipt': ref(ROOT, receipt_path),
                  'reviewed_existing_compiler_calls': receipt['compile_calls'],
                  'independent_literal_replay_rows': rows,
                  'literal_mutation_controls_rejected': negatives})

result = {'schema_version': 1, 'recorded_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'status': 'map-populations-and-existing-direct-css-receipts-independently-verified',
          'worksheet': ref(ROOT, PREFIX + 'worksheet-v1.json'),
          'inputs': [ref(ROOT, path) for path in [AGENT + 'map.json', AGENT + 'design.json',
                     AGENT + 'case-probe.mjs', catalog_path, oracle_path,
                     oracle['provenance']['lock_path']]],
          'case_population': {'direct_defaults': direct_defaults, 'direct_arguments': direct_args,
                              'indirect_defaults': indirect_defaults, 'indirect_arguments': indirect_args},
          'lines': lines,
          'indirect_cases_freshly_compiled': False,
          'compiler_execution_by_this_reviewer': False,
          'meaning': 'Independent source/Git and literal replay of existing compiled CSS evidence. Default before CSS equals the immutable oracle. Custom argument before CSS uses authenticated before modules and the existing owned dependency model; no fresh untouched16 custom-argument compilation by this reviewer.',
          'new_source_subject_qualified': False,
          'full_matrix_build_owner_browser_rendering_or_floor_qualification': False,
          'existing_shared_files_edited': False}
path = PREFIX + 'population-result-v1.json'
(ROOT / path).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': ref(ROOT, path), 'population': [len(rows) for rows in populations],
                  'literal_rows': sum(len(line['independent_literal_replay_rows']) for line in lines),
                  'negative_controls': sum(line['literal_mutation_controls_rejected'] for line in lines)}))
