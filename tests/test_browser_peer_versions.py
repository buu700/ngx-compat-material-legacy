# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Inspect real browser CLI install inputs without installing or launching anything."""
import copy
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
RUNNERS = ('browser-dialog-escape.mjs', 'browser-overlay-families.mjs', 'browser-form-families.mjs',
           'browser-control-families.mjs', 'browser-surface-families.mjs')


def manifest(line):
    plan = json.loads((ROOT / 'compatibility/rc/consumer-floor-plan.json').read_bytes())
    row = plan['lines'][line]
    pkg = copy.deepcopy(json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes()))
    pkg['version'] = ('21' if line == '21.x' else '22') + '.0.0-rc.0'
    pkg['engines']['node'] = ' || '.join('^' + version for version in row['library_node_minima'])
    for name in ('core', 'common', 'forms', 'platform-browser'):
        pkg['peerDependencies']['@angular/' + name] = '^' + row['framework']
    pkg['peerDependencies']['@angular/cdk'] = '^' + row['cdk']
    pkg['peerDependencies']['@angular/material'] = '^' + row['material']
    pkg['peerDependencies']['rxjs'] = ' || '.join('^' + version for version in plan['rxjs_minima'])
    return pkg


def versions(pkg, options=None):
    return subprocess.run(['node', 'tests/browser_peer_versions_probe.mjs', '--versions', json.dumps(pkg), json.dumps(options or {})],
                          cwd=ROOT, capture_output=True, text=True, timeout=30)


class BrowserPeerVersionsTests(unittest.TestCase):
    def test_real_cli_describes_both_artifact_lines_and_zones_without_spawning(self):
        observations = []
        rejected = []
        source_line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
        with tempfile.TemporaryDirectory(prefix='ngx-browser-peer-inputs-') as temporary:
            temporary = Path(temporary)
            preload = temporary / 'no-install-or-browser.mjs'
            preload.write_text("""import {createRequire,syncBuiltinESMExports} from 'node:module';
const cp=createRequire(import.meta.url)('node:child_process'),actual=cp.spawnSync;
cp.spawn=()=>{throw Error('describe-install spawned a process');};
cp.execFile=()=>{throw Error('describe-install executed a process');};
cp.execFileSync=()=>{throw Error('describe-install executed a process');};
cp.spawnSync=(name,args,options)=>{if(name!=='tar')throw Error('describe-install spawned '+name);return actual(name,args,options);};
syncBuiltinESMExports();
""")
            for line in ('21.x', 'main'):
                pkg = manifest(line)
                archive = temporary / (line.replace('.', '') + '.tgz')
                data = json.dumps(pkg).encode()
                with tarfile.open(archive, 'w:gz') as output:
                    info = tarfile.TarInfo('package/package.json')
                    info.size = len(data)
                    output.addfile(info, io.BytesIO(data))
                for runner in RUNNERS:
                    for zoneless in (False, True):
                        command = ['node', '--import', str(preload), 'scripts/' + runner, '--tarball', str(archive), '--describe-install']
                        if zoneless:
                            command.append('--zoneless')
                        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=30,
                                               env={**os.environ, 'CHROME_BIN': '/not-a-browser'})
                        if line != source_line:
                            self.assertNotEqual(child.returncode, 0, (runner, line, child.stdout))
                            self.assertIn('browser artifact line differs', child.stderr)
                            rejected.append(dict(line=line, runner=runner, zoneless=zoneless))
                            continue
                        self.assertEqual(child.returncode, 0, (runner, line, child.stdout, child.stderr))
                        actual = json.loads(child.stdout)
                        deps = actual['dependencies']
                        for name in ('core', 'common', 'forms', 'platform-browser', 'cdk', 'material'):
                            self.assertEqual(deps['@angular/' + name], pkg['peerDependencies']['@angular/' + name][1:])
                        self.assertEqual(deps['@angular/compiler'], deps['@angular/core'])
                        self.assertEqual(deps['@angular/compiler-cli'], deps['@angular/core'])
                        self.assertEqual(deps['rxjs'], '7.8.2')
                        self.assertNotIn('@angular/animations', deps)
                        self.assertEqual('zone.js' not in deps, zoneless)
                        self.assertTrue(actual['compilerOptions']['strict'])
                        self.assertFalse(actual['compilerOptions']['skipLibCheck'])
                        self.assertEqual('ignoreDeprecations' in actual['compilerOptions'], line == 'main')
                        observations.append(dict(line=line, runner=runner, zoneless=zoneless, **actual))
            self.assertEqual(len(list(temporary.iterdir())), 3)
        self.assertEqual(len(observations), 10)
        self.assertEqual(len(rejected), 10)
        if os.environ.get('BROWSER_PEER_INPUT_REPORT'):
            with open(os.environ['BROWSER_PEER_INPUT_REPORT'], 'x') as output:
                json.dump(dict(schema_version=1, observations=observations, wrong_line_artifacts_rejected=rejected, actual_npm_install_or_browser_execution=False,
                               actual_native_artifact_browser_floor_or_full_audit_qualified=False), output, indent=2)
                output.write('\n')

    def test_invalid_or_unreviewed_artifact_minima_are_rejected(self):
        base = manifest('21.x')
        faults = [None, {}, {**base, 'name': 'other'}, {**base, 'version': '23.0.0'}, {**base, 'version': '21broken'},
                  {**base, 'engines': {'node': '^24.0.0'}}, {**base, 'version': '21.bad'}, {**base, 'version': '21.00.0'}]
        for name, value in [('@angular/core', '^22.1.7'), ('@angular/common', '^21.2.24'), ('@angular/cdk', '^22.1.7'),
                            ('@angular/material', '^21.2.15'), ('rxjs', '^7.8.2')]:
            bad = copy.deepcopy(base)
            bad['peerDependencies'][name] = value
            faults.append(bad)
        missing = copy.deepcopy(base)
        del missing['peerDependencies']['@angular/core']
        faults.append(missing)
        for bad in faults:
            child = versions(bad)
            self.assertNotEqual(child.returncode, 0, child.stdout)
        self.assertNotEqual(versions(base, {'rxjsProfile': 'latest'}).returncode, 0)
        self.assertNotEqual(versions(base, {'expectedLine': 'main'}).returncode, 0)
        for line in ('21.x', 'main'):
            child = versions(manifest(line))
            self.assertEqual(child.returncode, 0, child.stderr)
            self.assertEqual(json.loads(child.stdout)['rxjs'], '6.5.3')
        self.assertEqual(len(faults), 14)

    def test_runtime_assertions_lab_sources_and_required_predicates_are_unchanged(self):
        child = subprocess.run(['node', 'tests/browser_peer_versions_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        result = json.loads(child.stdout)
        self.assertEqual(result['unchanged_mini_runtime_and_lab_bodies'], 5)
        self.assertGreater(result['unchanged_required_cell_function_bodies'], 10)
        self.assertFalse(result['native_or_product_execution'])


if __name__ == '__main__':
    unittest.main()
