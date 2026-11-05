# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Regression controls for authenticated immutable Git DATA caching in both helpers."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
JS_HELPER = 'scripts/current-sass-tool-references.mjs'
PY_HELPER = ROOT / 'scripts/current_sass_tool_references.py'


JS_PROBE = r"""
const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');
const {createHash} = require('node:crypto');
const {resolve} = require('node:path');
const ts = require('typescript');
const [root1, root2, commit, helperPath] = process.argv.slice(1);
const sourceText = fs.readFileSync(helperPath, 'utf8');
const source = ts.createSourceFile(helperPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(source.parseDiagnostics.length, 0);
const declarations = source.statements.filter(node =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'gitImages');
assert.equal(declarations.length, 1, 'maintained gitImages declaration count');
let gitCalls = 0;
let truncateResponse = false;
const trackedExecFileSync = (file, args, options) => {
  if (file === 'git' && args.includes('--batch')) gitCalls++;
  const output = cp.execFileSync(file, args, options);
  return truncateResponse ? output.subarray(0, output.length - 1) : output;
};
const gitImages = Function(
  'assert', 'createHash', 'execFileSync', 'realpathSync', 'resolve',
  'const immutableGitImages = new Map();\n' + declarations[0].getText(source) +
    '\nreturn gitImages;'
)(assert, createHash, trackedExecFileSync, fs.realpathSync, resolve);
const a = {commit, path: 'one.txt'};
const b = {commit, path: 'two.txt'};
const c = {commit, path: 'three.txt'};
const key = row => row.commit + ':' + row.path;

assert.equal(gitImages(root1, []).size, 0, 'empty requests');
assert.equal(gitCalls, 0, 'empty requests invoke no Git process');
const first = gitImages(root1, [a, a]);
assert.equal(gitCalls, 1, 'cold duplicate requests use one batch');
assert.equal(first.get(key(a)).toString(), 'alpha\n');
first.get(key(a)).fill(0);
assert.equal(gitImages(root1, [a]).get(key(a)).toString(), 'alpha\n', 'returned buffers are defensive copies');
assert.equal(gitCalls, 1, 'warm hit invokes no Git process');
for (const invalid of [{commit, path: '../escape'}, {commit: 'HEAD', path: 'one.txt'}]) {
  assert.throws(() => gitImages(root1, [a, invalid]));
  assert.equal(gitCalls, 1, 'invalid warm request invokes no Git process');
}
assert.equal(gitImages(root2, [a]).get(key(a)).toString(), 'alpha\n');
assert.equal(gitCalls, 2, 'distinct resolved roots have independent caches');

truncateResponse = true;
assert.throws(() => gitImages(root2, [a, b, c]));
assert.equal(gitCalls, 3);
truncateResponse = false;
assert.equal(gitImages(root2, [a]).get(key(a)).toString(), 'alpha\n', 'previously cached row remains available');
assert.equal(gitCalls, 3);
assert.equal(gitImages(root2, [b]).get(key(b)).toString(), 'beta\n', 'valid prefix of failed batch was not published');
assert.equal(gitCalls, 4);
assert.equal(gitImages(root2, [c]).get(key(c)).toString(), 'gamma\n');
assert.equal(gitCalls, 5);
assert.equal(gitImages(root2, [a, b, c]).size, 3);
assert.equal(gitCalls, 5, 'all successfully authenticated rows are warm');
"""


def _load_python_helper():
    spec = importlib.util.spec_from_file_location('_current_sass_tool_references_cache_probe', PY_HELPER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _git(cwd, *args, env):
    return subprocess.check_output(['git', *args], cwd=cwd, env=env, stderr=subprocess.PIPE).decode().strip()


def _make_repository(path):
    path.mkdir()
    env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C')
    env.update({
        'GIT_CONFIG_GLOBAL': '/dev/null',
        'GIT_CONFIG_SYSTEM': '/dev/null',
        'GIT_TERMINAL_PROMPT': '0',
        'GIT_AUTHOR_NAME': 'Cache Fixture',
        'GIT_AUTHOR_EMAIL': 'cache-fixture@example.invalid',
        'GIT_COMMITTER_NAME': 'Cache Fixture',
        'GIT_COMMITTER_EMAIL': 'cache-fixture@example.invalid',
        'GIT_AUTHOR_DATE': '2001-01-01T00:00:00+0000',
        'GIT_COMMITTER_DATE': '2001-01-01T00:00:00+0000',
    })
    _git(path, 'init', '--quiet', env=env)
    for name, body in [('one.txt', b'alpha\n'), ('two.txt', b'beta\n'), ('three.txt', b'gamma\n')]:
        (path / name).write_bytes(body)
    _git(path, 'add', 'one.txt', 'two.txt', 'three.txt', env=env)
    _git(path, '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'immutable fixture', env=env)
    return env, _git(path, 'rev-parse', 'HEAD', env=env)


class ImmutableGitDataCacheTests(unittest.TestCase):
    def test_python_helper_controls(self):
        module = _load_python_helper()
        with tempfile.TemporaryDirectory(prefix='immutable-git-cache-') as directory:
            base = Path(directory)
            root1, root2 = base / 'repo-one', base / 'repo-two'
            _, commit1 = _make_repository(root1)
            _, commit2 = _make_repository(root2)
            self.assertEqual(commit1, commit2, 'fixtures must share the exact immutable commit')
            requests = [dict(commit=commit1, path='one.txt'),
                        dict(commit=commit1, path='two.txt'),
                        dict(commit=commit1, path='three.txt')]
            a, b, c = requests
            key = lambda row: (row['commit'], row['path'])
            real_check_output = subprocess.check_output
            calls = []
            corrupt = [False]

            def tracked_check_output(command, **options):
                if command[0] == 'git' and 'cat-file' in command:
                    calls.append((Path(options['cwd']).resolve(), tuple(command)))
                output = real_check_output(command, **options)
                return output[:-1] if corrupt[0] else output

            cache = module._GIT_IMAGES
            saved_cache = dict(cache)
            cache.clear()
            try:
                with mock.patch.object(module.subprocess, 'check_output', side_effect=tracked_check_output):
                    self.assertEqual(module._git_images(root1, []), {})
                    self.assertEqual(calls, [], 'empty requests invoke no Git process')
                    first = module._git_images(root1, [a, a])
                    self.assertEqual(first[key(a)], b'alpha\n')
                    self.assertIs(type(first[key(a)]), bytes, 'cached Python image is immutable bytes')
                    with self.assertRaises(TypeError):
                        first[key(a)][0] = 0
                    first[key(a)] = b'caller replacement'
                    self.assertEqual(module._git_images(root1, [a])[key(a)], b'alpha\n')
                    self.assertEqual(len(calls), 1, 'warm hit invokes no Git process')
                    for invalid in [dict(commit=commit1, path='../escape'),
                                    dict(commit='HEAD', path='one.txt')]:
                        with self.assertRaises(AssertionError):
                            module._git_images(root1, [a, invalid])
                        self.assertEqual(len(calls), 1, 'invalid warm request invokes no Git process')
                    self.assertEqual(module._git_images(root2, [a])[key(a)], b'alpha\n')
                    self.assertEqual(len(calls), 2, 'distinct resolved roots have independent caches')

                    corrupt[0] = True
                    with self.assertRaises((AssertionError, IndexError, ValueError)):
                        module._git_images(root2, [a, b, c])
                    self.assertEqual(len(calls), 3)
                    corrupt[0] = False
                    self.assertEqual(module._git_images(root2, [a])[key(a)], b'alpha\n')
                    self.assertEqual(len(calls), 3, 'preexisting cached row survives failed batch')
                    self.assertEqual(module._git_images(root2, [b])[key(b)], b'beta\n')
                    self.assertEqual(len(calls), 4, 'valid prefix of failed batch was not published')
                    self.assertEqual(module._git_images(root2, [c])[key(c)], b'gamma\n')
                    self.assertEqual(len(calls), 5)
                    self.assertEqual(len(module._git_images(root2, requests)), 3)
                    self.assertEqual(len(calls), 5, 'all authenticated rows are warm')
            finally:
                cache.clear()
                cache.update(saved_cache)

    def test_javascript_helper_controls(self):
        with tempfile.TemporaryDirectory(prefix='immutable-git-cache-js-') as directory:
            base = Path(directory)
            root1, root2 = base / 'repo-one', base / 'repo-two'
            _, commit1 = _make_repository(root1)
            _, commit2 = _make_repository(root2)
            self.assertEqual(commit1, commit2, 'fixtures must share the exact immutable commit')
            result = subprocess.run(
                ['node', '-e', JS_PROBE, str(root1), str(root2), commit1, JS_HELPER],
                cwd=ROOT, capture_output=True, text=True, timeout=30,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
