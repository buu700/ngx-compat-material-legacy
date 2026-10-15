# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Parse immutable upstream Starlark as syntax; never import or execute it."""
import ast
import collections
import hashlib
import json
import sys


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def syntax(text, path):
    return ast.parse(text, filename=path)


def shape(tree):
    return ast.dump(tree, annotate_fields=True, include_attributes=False)


def entities(tree):
    result = {}
    occurrences = collections.Counter()
    for node in tree.body:
        record = {'kind': type(node).__name__, 'ast_sha256': digest(shape(node))}
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            call = node.value
            callee = ast.unparse(call.func)
            names = [v.value.value for v in call.keywords if v.arg == 'name' and isinstance(v.value, ast.Constant)]
            if names:
                assert len(names) == 1
                key = 'target:' + names[0]
            elif callee == 'load':
                assert call.args and isinstance(call.args[0], ast.Constant)
                key = 'load:' + call.args[0].value
            else:
                key = 'call:' + callee
            record.update(callee=callee, args=[ast.unparse(a) for a in call.args],
                keywords={a.arg or '**': ast.unparse(a.value) for a in call.keywords})
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            key = 'function:' + node.name
            record.update(name=node.name, source=ast.unparse(node))
        else:
            key = 'statement:' + type(node).__name__
            record['source'] = ast.unparse(node)
        occurrences[key] += 1
        result[key + ':' + str(occurrences[key])] = record
    return result


def analyze(subjects):
    result = []
    for review in subjects['reviews']:
        members = []
        for member in review['members']:
            path = member['path']
            if not (path.endswith('BUILD.bazel') or path.endswith('.bzl')):
                continue
            before = syntax(member['before']['text'], path)
            after = syntax(member['after']['text'], path)
            left, right = entities(before), entities(after)
            changes = [{'key': key, 'before': left.get(key), 'after': right.get(key)}
                for key in sorted(left.keys() | right.keys()) if left.get(key) != right.get(key)]
            assert changes, 'Empty syntax delta: ' + path
            if path == 'tools/defaults.bzl':
                assert [n.name for n in before.body if isinstance(n, ast.FunctionDef) and n.name == 'ng_test_library'] == ['ng_test_library']
                before.body = [n for n in before.body if not isinstance(n, ast.FunctionDef) or n.name != 'ng_test_library']
                assert shape(before) == shape(after), 'Unexpected defaults change'
            if path == 'tools/bazel/ts_project_interop.bzl':
                old = member['before']['text']
                new = member['after']['text']
                expected = 'path = "%s/%s" % (ctx.bin_dir.path, ctx.label.package),'
                restored = new.replace(expected,
                    'path = "%s/%s/%s" % (ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package),')
                assert restored != new and shape(syntax(old, path)) == shape(syntax(restored, path)), 'Unexpected interop change'
            members.append({'path': path, 'before_ast_sha256': digest(shape(syntax(member['before']['text'], path))),
                'after_ast_sha256': digest(shape(after)), 'changed_entities': changes})
        result.append({'sha': review['sha'], 'parsed_starlark_members': len(members), 'members': members})
    assert [r['parsed_starlark_members'] for r in result] == [37, 151]
    transitions = []
    for index, review in enumerate(result):
        counts = collections.Counter()
        for member in review['members']:
            for change in member['changed_entities']:
                before, after = change['before'], change['after']
                pair = (before.get('callee') if before else None, after.get('callee') if after else None)
                counts[pair] += 1
                if pair == ('load', 'load'):
                    assert before['keywords'] == after['keywords']
                    symbol = "'extract_tokens'" if index == 0 else "'ng_test_library'"
                    augmented, original = (after['args'], before['args']) if index == 0 else (before['args'], after['args'])
                    assert augmented.count(symbol) == 1 and [a for a in augmented if a != symbol] == original
                elif pair == (None, 'extract_tokens'):
                    assert not after['args'] and set(after['keywords']) == {'name', 'srcs'}
                    assert ast.literal_eval(after['keywords']['name']) == 'tokens'
                    inputs = ast.literal_eval(after['keywords']['srcs'])
                    assert len(inputs) == 1 and inputs[0].startswith(':') and inputs[0].endswith('_scss_lib')
                elif pair == ('sass_library', 'sass_library'):
                    assert before['args'] == after['args']
                    expected = dict(before['keywords'], deps="['//src/material/core:core_scss_lib']")
                    assert after['keywords'] == expected and 'deps' not in before['keywords']
                elif pair == ('package_docs_content', 'package_docs_content'):
                    expected = dict(before['keywords'])
                    values = ast.literal_eval(expected['srcs']); values['//src/material:tokens'] = 'tokens/material'
                    assert ast.literal_eval(after['keywords']['srcs']) == values
                    expected.pop('srcs'); observed = dict(after['keywords']); observed.pop('srcs')
                    assert expected == observed and before['args'] == after['args']
                elif pair == ('ng_test_library', 'ts_project'):
                    changed = {k for k in before['keywords'].keys() | after['keywords'].keys()
                        if before['keywords'].get(k) != after['keywords'].get(k)}
                    assert before['args'] == after['args'] and changed in [
                        {'deps', 'interop_deps', 'testonly'}, {'deps', 'interop_deps', 'testonly', 'tsconfig'}]
                    assert before['keywords']['srcs'] == after['keywords']['srcs']
                    assert after['keywords']['testonly'] == 'True'
                elif pair == ('ts_project', 'ts_project'):
                    changed = {k for k in before['keywords'].keys() | after['keywords'].keys()
                        if before['keywords'].get(k) != after['keywords'].get(k)}
                    assert changed <= {'deps', 'testonly'} and before['args'] == after['args']
                    values = ast.literal_eval(after['keywords']['deps'])
                    assert values.count('//:node_modules/@angular/core') == 1
                    assert [v for v in values if v != '//:node_modules/@angular/core'] == ast.literal_eval(before['keywords']['deps'])
                    assert 'testonly' not in changed or after['keywords']['testonly'] == 'True'
                elif pair == (None, 'load'):
                    assert (after['args'], after['keywords']) in [
                        (["'//tools:defaults2.bzl'", "'ts_project'"], {}),
                        (["'@aspect_rules_ts//ts:defs.bzl'"], {'rules_js_tsconfig': "'ts_config'"})]
                elif pair == (None, 'rules_js_tsconfig'):
                    assert after['keywords']['name'] == "'tsconfig-test'"
                    assert after['keywords']['src'] == "'tsconfig-test.json'"
                elif pair == (None, 'filegroup'):
                    assert member['path'] == 'src/material/BUILD.bazel'
                    assert after['keywords']['name'] == "'tokens'"
                elif pair == (None, None):
                    assert member['path'] in ['tools/defaults.bzl', 'tools/bazel/ts_project_interop.bzl']
                else:
                    raise AssertionError('Unreviewed Starlark transition: ' + repr(pair))
        expected = {('load', 'load'): 35, (None, 'extract_tokens'): 35,
            ('sass_library', 'sass_library'): 2, ('package_docs_content', 'package_docs_content'): 1, (None, 'filegroup'): 1} if index == 0 else {
            ('ng_test_library', 'ts_project'): 145, ('load', 'load'): 144, (None, 'load'): 107,
            ('ts_project', 'ts_project'): 5, (None, 'rules_js_tsconfig'): 2, (None, None): 2}
        assert counts == expected
        transitions.append([{'before': pair[0], 'after': pair[1], 'count': count} for pair, count in counts.items()])
    return {'schema_version': 1, 'role': 'Complete syntax inventory; no upstream code executed',
        'parsed_member_versions': 376, 'transition_inventory': transitions, 'reviews': result}


if __name__ == '__main__':
    print(json.dumps(analyze(json.load(sys.stdin)), separators=(',', ':')))
