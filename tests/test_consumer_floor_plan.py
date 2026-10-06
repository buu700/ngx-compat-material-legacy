"""Floor source-policy derivation rejects drift and unqualified runtime inputs."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ConsumerFloorPlanTests(unittest.TestCase):
    def test_reviewed_configurations_and_mutations(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {floorConfigurations} from './scripts/consumer-floor-roster.mjs';
const plan = JSON.parse(readFileSync('compatibility/rc/consumer-floor-plan.json', 'utf8'));
const manifest = JSON.parse(readFileSync('projects/ngx-material-legacy/package.json', 'utf8'));
const line = manifest.version.startsWith('22.') ? 'main' : '21.x';
const configurations = floorConfigurations(plan, line, manifest);
assert.equal(configurations.filter(c => c.group === 'library-runtime').length, 7);
assert.equal(configurations.filter(c => c.group === 'cli-runtime-floors').length, 3);
assert.ok(configurations.some(c => c.node === '18.0.0' && c.group === 'cli-runtime-floors'));
assert.ok(!configurations.some(c => c.node === '18.0.0' && c.group === 'library-runtime'));
for (const mutate of [
 p => {p.node_sources['18.0.0'].sha256 = 'unverified';},
 p => {p.node_sources['18.0.0'].url = 'https://example.com/node.tar.xz';},
 p => {p.rxjs_minima = ['7.8.2'];},
 p => {p.lines[line].library_node_minima = ['24.21.0'];},
]) {
 const bad = structuredClone(plan); mutate(bad);
 assert.throws(() => floorConfigurations(bad, line, manifest));
}
assert.throws(() => floorConfigurations(plan, line === 'main' ? '21.x' : 'main', manifest));
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
