#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete CI helper partitioning; no product or release gate qualification."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
RETAINED_METHOD = ('test_packed_upstream_ledger_epoch.PackedUpstreamLedgerEpochTests.'
                   'test_current_subjects_gate_the_exact_historical_ledger')
DISCOVERY_COMMANDS = (
    ['python3', '-m', 'unittest', 'discover', '-s', 'tests'],
    ['python3', '-m', 'unittest', 'discover', '-s', 'tests', '-v'],
)
DEPENDENCIES = {'helper-plan', 'helper-static', 'helper-unit-tests', 'helper-retained-phases'}
MODULES_PER_GROUP = 4


def need(condition, message):
    if not condition:
        raise ValueError(message)


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def source(root, path):
    raw = (root / path).read_bytes()
    return {'path': path, 'sha256': digest(raw), 'bytes': len(raw)}


def flatten(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from flatten(item)
        else:
            yield item


def discover_tests(root):
    """Use public unittest loading; collect cases without running test methods."""
    root = root.resolve()
    sys.path.insert(0, str(root))
    directory = root / 'tests'
    files = sorted(p.relative_to(root).as_posix() for p in directory.rglob('test_*.py'))
    need(files, 'empty helper test census')
    need(len({Path(p).stem for p in files}) == len(files), 'duplicate test module basename')
    loaded = {}

    class Loader(unittest.TestLoader):
        def loadTestsFromModule(self, module, *, pattern=None):
            suite = super().loadTestsFromModule(module, pattern=pattern)
            path = Path(module.__file__).resolve().relative_to(root).as_posix()
            need(path in files, 'unexpected discovered module: ' + path)
            need(path not in loaded, 'duplicate discovered module: ' + path)
            loaded[path] = list(flatten(suite))
            return suite

    loader = Loader()
    loader.discover(str(directory))
    need(not loader.errors, '\n'.join(loader.errors))
    baseline = sorted(loaded)
    # unittest skips non-package subdirectories. Explicitly load every remaining
    # census file; the original root-discovery coverage remains a recorded set.
    for path in files:
        if path not in loaded:
            loader = Loader()
            loader.discover(str((root / path).parent), pattern=Path(path).name)
            need(not loader.errors, '\n'.join(loader.errors))
    need(sorted(loaded) == files, 'incomplete test-file coverage')
    ids = [case.id() for path in files for case in loaded[path]]
    need(len(ids) == len(set(ids)), 'duplicate test case identity')
    need(all(loaded[path] for path in files), 'empty test module')
    return loaded, baseline


def groups_for(paths):
    need(paths and len(paths) == len(set(paths)), 'empty or duplicate module partition')
    # Isolate the orchestration regression tests so they finish independently
    # of expensive source/behavior modules. All remaining modules stay intact.
    early = ['tests/test_helper_ci.py'] if 'tests/test_helper_ci.py' in paths else []
    remaining = [path for path in paths if path not in early]
    count = math.ceil(len(remaining) / MODULES_PER_GROUP)
    offset = len(early)
    need(count + offset <= 256, 'helper unit matrix exceeds Actions limit')
    groups = [{'id': 'group-001', 'modules': early}] if early else []
    groups += [{'id': f'group-{i + offset + 1:03d}', 'modules': remaining[i::count]} for i in range(count)]
    need(all(0 < len(g['modules']) <= MODULES_PER_GROUP for g in groups), 'unbounded group')
    need(sorted(p for g in groups for p in g['modules']) == sorted(paths), 'partition lost modules')
    return groups


def load_script(root, path, name):
    sys.path.insert(0, str(root / 'scripts'))
    spec = importlib.util.spec_from_file_location(name, root / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def static_configuration(root):
    """Keep branch-specific commands and only move root unit discovery out."""
    if (root / 'scripts/run-helper-checks.py').exists():
        path = 'scripts/run-helper-checks.py'
        original = load_script(root, path, 'ci_original_helper')
        extra = []
        coherence = None
    else:
        path = 'scripts/rc-verify-lite.py'
        original = load_script(root, path, 'ci_original_lite')
        extra = [
            ['python3', '-B', 'compatibility/handoff/codex-closeout/tools/validate_handoff.py'],
            ['python3', '-B', '-m', 'unittest', 'discover', '-s',
             'compatibility/handoff/codex-closeout/tools', '-p', 'test_*.py'],
            ['node', 'scripts/motion-lifecycle-smoke.mjs'],
        ]
        coherence = original.check_coherence
    removed = [command for command in original.CHECKS if command in DISCOVERY_COMMANDS]
    need(len(removed) == 1, 'original helper discovery command changed')
    commands = [command for command in original.CHECKS if command not in DISCOVERY_COMMANDS] + extra
    return path, commands, coherence


def current_commit(root):
    commit = subprocess.check_output(['git', '--no-replace-objects', 'rev-parse', 'HEAD'],
                                     cwd=root, text=True).strip()
    need(re.fullmatch('[a-f0-9]{40}', commit), 'invalid Git commit')
    if os.environ.get('GITHUB_SHA'):
        need(commit == os.environ['GITHUB_SHA'], 'checkout differs from workflow SHA')
    return commit


def build_plan(root):
    loaded, baseline = discover_tests(root)
    all_ids = [case.id() for cases in loaded.values() for case in cases]
    need(all_ids.count(RETAINED_METHOD) == 1, 'exact retained-method replacement missing')
    child = subprocess.run(['node', 'tests/packed_upstream_ledger_epoch_probe.mjs', '--catalog'],
                           cwd=root, capture_output=True, text=True, timeout=30)
    need(child.returncode == 0, child.stdout + child.stderr)
    retained = json.loads(child.stdout)
    partition = json.loads((root / 'compatibility/rc/c04-retained-ledger-phases-partition.json').read_bytes())
    need(retained['mode'] == 'catalogue' and retained['source_preparation_executed'] is False,
         'catalogue prepared product sources')
    need([p['id'] for p in retained['phases']] == partition['phase_ids'], 'retained phase coverage changed')
    need(retained['line'] == partition['line'], 'retained line mismatch')
    for key in ['cases', 'rejected']:
        ids = [item for phase in retained['phases'] for item in phase[key]]
        need(len(ids) == len(set(ids)), 'duplicate retained case/control identity')
    need(sum(len(p['cases']) for p in retained['phases']) == partition['positive_cases'], 'retained cases lost')
    need(sum(len(p['rejected']) for p in retained['phases']) == partition['negative_controls'], 'retained controls lost')
    path, commands, _ = static_configuration(root)
    modules = []
    for path_name, cases in sorted(loaded.items()):
        ids = [case.id() for case in cases]
        modules.append({**source(root, path_name), 'test_ids': [i for i in ids if i != RETAINED_METHOD],
                        'original_test_ids_sha256': digest(encoded(ids)), 'original_count': len(ids)})
    groups = groups_for([row['path'] for row in modules])
    need(len(groups) + len(retained['phases']) + 6 <= 256, 'combined helper job count exceeds limit')
    bindings = {row['path']: {k: row[k] for k in ['path', 'sha256', 'bytes']} for row in modules}
    for row in retained['subjects']:
        need(source(root, row['path']) == row, 'stale retained catalogue source')
        bindings[row['path']] = row
    for filename in ['scripts/helper_ci.py', path, '.github/workflows/ci.yml', 'chainman.toml',
                     'chainman.lock', 'justfile', 'toolchain-lock.json', '.node-version', '.npm-version',
                     'compatibility/rc/c04-retained-ledger-phases-partition.json']:
        bindings[filename] = source(root, filename)
    plan = {'schema_version': 1, 'source_commit': current_commit(root), 'line': retained['line'],
            'modules': modules, 'original_discovery_modules': baseline,
            'additional_nested_modules': sorted(set(loaded) - set(baseline)),
            'original_case_count': len(all_ids), 'scheduled_unit_case_count': len(all_ids) - 1,
            'replaced_method': RETAINED_METHOD, 'groups': groups, 'retained': retained,
            'static_commands': commands, 'static_owner': path,
            'sources': [bindings[key] for key in sorted(bindings)],
            'full_helper_execution_qualified': False, 'product_or_release_gate_qualified': False}
    need(sum(len(row['test_ids']) for row in modules) + 1 == len(all_ids), 'test-case partition incomplete')
    return plan, loaded


def check_sources(root, plan):
    if 'source_commit' in plan:
        need(current_commit(root)==plan['source_commit'],'checkout commit changed during helper execution')
    for row in plan['sources']:
        need(source(root, row['path']) == row, 'source changed during helper execution: ' + row['path'])


def run_unit_group(root, plan, loaded, group_id, *, stream=None):
    groups = [g for g in plan['groups'] if g['id'] == group_id]
    need(len(groups) == 1, 'unknown helper unit group')
    check_sources(root, plan)
    rows = {row['path']: row for row in plan['modules']}
    cases = {case.id(): case for tests in loaded.values() for case in tests}
    ids = [i for path in groups[0]['modules'] for i in rows[path]['test_ids']]
    need(ids and len(ids) == len(set(ids)), 'empty or duplicate unit group cases')
    need(all(i in cases and i != RETAINED_METHOD for i in ids), 'unknown or full retained case in unit group')
    start = time.monotonic()
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(unittest.TestSuite(cases[i] for i in ids))
    check_sources(root, plan)
    passed = result.wasSuccessful() and result.testsRun == len(ids)
    return {'result': 'pass' if passed else 'fail', 'group': group_id, 'modules': groups[0]['modules'],
            'test_ids': ids, 'tests_run': result.testsRun, 'elapsed_seconds': round(time.monotonic() - start, 3),
            'failures': [{'id': case.id(), 'traceback': trace} for case, trace in result.failures],
            'errors': [{'id': case.id(), 'traceback': trace} for case, trace in result.errors],
            'skipped': [{'id': case.id(), 'reason': why} for case, why in result.skipped],
            'expected_failures': [case.id() for case, _ in result.expectedFailures],
            'unexpected_successes': [case.id() for case in result.unexpectedSuccesses]}


def run_retained_phase(root, plan, phase_id):
    phases = [p for p in plan['retained']['phases'] if p['id'] == phase_id]
    need(len(phases) == 1, 'unknown retained phase')
    check_sources(root, plan)
    start = time.monotonic()
    child = subprocess.run(['node', 'tests/packed_upstream_ledger_epoch_probe.mjs', phase_id],
                           cwd=root, capture_output=True, text=True,
                           timeout=1800 if plan['line'] == '21.x' else 180)
    report = {'phase': phase_id, 'child_exit_code': child.returncode, 'stdout': child.stdout,
              'stderr': child.stderr, 'elapsed_seconds': round(time.monotonic() - start, 3), 'result': 'fail'}
    try:
        need(child.returncode == 0, 'retained child failed')
        observed = json.loads(child.stdout)
        need(observed['result'] == 'pass' and observed['line'] == plan['line'], 'retained result/line mismatch')
        need(observed['phase'] == phase_id, 'retained phase mismatch')
        need(observed['cases'] == phases[0]['cases'] and observed['rejected'] == phases[0]['rejected'],
             'retained case/control membership changed')
        need(observed['subjects'] == plan['retained']['subjects'], 'retained subjects changed')
        for flag in ['full_retained_roster_executed', 'actual_native_artifact_browser_floor_or_full_audit_qualified',
                     'current_native_packed_or_floor_or_g11_credit']:
            need(observed[flag] is False, 'standalone phase overclaims qualification')
        if phase_id in ['canonical', 'stage-population']:
            owner = load_script(root, 'tests/test_packed_upstream_ledger_epoch.py', 'ci_retained_contract')
            owner.verify_ci_phase_contract(observed, plan['retained'])
        check_sources(root, plan)
        report['result'] = 'pass'
    except (ValueError, KeyError, OSError, AssertionError) as error:
        report['error'] = str(error)
    return report


def verify_needs(needs, *, commit, phase_ids):
    need(set(needs) == DEPENDENCIES, 'missing or unexpected helper job dependency')
    need(all(row.get('result') == 'success' for row in needs.values()), 'helper job failed,cancelled or skipped')
    outputs = needs['helper-plan']['outputs']
    need(outputs['source_commit'] == commit, 'planning checkout differs from aggregate checkout')
    need(re.fullmatch('[a-f0-9]{64}', outputs['plan_digest']), 'missing plan digest')
    groups = json.loads(outputs['test_matrix'])['group']
    phases = json.loads(outputs['phase_matrix'])['phase']
    need(groups and len(groups) == len(set(groups)) and len(groups) <= 256, 'empty or duplicate unit matrix')
    need(all(re.fullmatch(r'group-\d{3}', item) for item in groups), 'invalid group matrix')
    need(phases == phase_ids and len(phases) == len(set(phases)), 'phase matrix incomplete')


def write_report(path, report):
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('x') as stream:
            stream.write(json.dumps(report, indent=2) + '\n')
    else:
        print(json.dumps(report, sort_keys=True))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    planning = sub.add_parser('plan')
    planning.add_argument('--out', type=Path, required=True)
    planning.add_argument('--github-output', type=Path)
    for command in ['unit', 'phase', 'static']:
        item = sub.add_parser(command)
        item.add_argument('--expected-plan', required=True)
        item.add_argument('--report', type=Path, required=True)
        if command == 'unit':
            item.add_argument('--group', required=True)
        if command == 'phase':
            item.add_argument('--phase', required=True)
    sub.add_parser('gate')
    args = parser.parse_args(argv)
    if args.command == 'gate':
        partition = json.loads((ROOT / 'compatibility/rc/c04-retained-ledger-phases-partition.json').read_bytes())
        verify_needs(json.loads(os.environ['HELPER_NEEDS']), commit=current_commit(ROOT), phase_ids=partition['phase_ids'])
        print('helper-checks: every planned helper job succeeded; product gates remain separate')
        return 0
    destination = args.out if args.command == 'plan' else args.report
    need(not destination.exists(), 'refusing to reuse a helper report path')
    plan, loaded = build_plan(ROOT)
    plan_digest = digest(encoded(plan))
    if args.command == 'plan':
        write_report(args.out, plan)
        if args.github_output:
            outputs = {'plan_digest': plan_digest, 'source_commit': plan['source_commit'],
                       'test_matrix': json.dumps({'group': [g['id'] for g in plan['groups']]}, separators=(',', ':')),
                       'phase_matrix': json.dumps({'phase': [p['id'] for p in plan['retained']['phases']]}, separators=(',', ':'))}
            with args.github_output.open('a') as stream:
                stream.write(''.join(key + '=' + value + '\n' for key, value in outputs.items()))
        print(json.dumps({'plan_digest': plan_digest, 'modules': len(plan['modules']),
                          'unit_cases': plan['scheduled_unit_case_count'], 'groups': len(plan['groups']),
                          'phases': len(plan['retained']['phases'])}))
        return 0
    need(args.expected_plan == plan_digest, 'helper plan changed since planning job')
    check_sources(ROOT, plan)
    if args.command == 'unit':
        report = run_unit_group(ROOT, plan, loaded, args.group)
    elif args.command == 'phase':
        report = run_retained_phase(ROOT, plan, args.phase)
    else:
        _, commands, coherence = static_configuration(ROOT)
        if coherence:
            coherence()
        status = 0
        for command in commands:
            print('helper-static:', ' '.join(command), flush=True)
            child = subprocess.run(command, cwd=ROOT)
            if child.returncode:
                status = child.returncode
                break
        report = {'result': 'pass' if status == 0 else 'fail', 'child_exit_code': status,
                  'commands': commands, 'coherence_executed': coherence is not None}
    check_sources(ROOT, plan)
    report.update(schema_version=1, source_commit=plan['source_commit'], plan_digest=plan_digest, line=plan['line'],
                  full_helper_execution_qualified=False, product_or_release_gate_qualified=False, g11_claim='not-passed')
    write_report(args.report, report)
    return 0 if report['result'] == 'pass' else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as error:
        print('helper-ci: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
