# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""V5 downstream closure and physical drift controls in a disposable tree."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NODE = 'node'

class NativeTabV5Tests(unittest.TestCase):
    def test_closure_and_physical_mutation_controls(self):
        with tempfile.TemporaryDirectory(prefix='t03-v5-fixture-') as temp:
            root = Path(temp)
            names = [f'compatibility/rc/current-native-tab-downstream-source-epochs-v{n}.json' for n in range(1, 6)]
            paths = set(names + ['scripts/current-native-tab-downstream-source.mjs', 'compatibility/rc/remaining-native-admission-tab-repair-source-inputs.json'])
            v4 = json.loads((ROOT / names[3]).read_bytes())['lines']['main']
            inputs = json.loads((ROOT / 'compatibility/rc/remaining-native-admission-tab-repair-source-inputs.json').read_bytes())
            paths.update(r['path'] for r in inputs['current_sources'])
            paths.update(r['path'] for r in v4['historical_controls'].values())
            paths.update(r['path'] for r in v4['typeahead_sources'])
            paths.update((v4['typeahead_receipt']['path'], v4['typeahead_archive']['path']))
            v5 = json.loads((ROOT / names[4]).read_bytes())
            paths.update(r['path'] for r in v5['additional_inputs'])
            for path in sorted(paths):
                dest = root / path
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes((ROOT / path).read_bytes())
            gitdir = subprocess.check_output(['git','rev-parse','--absolute-git-dir'], cwd=ROOT, text=True).strip()
            (root / '.git').write_text('gitdir: ' + gitdir + '\n')
            child = subprocess.run([NODE, str(ROOT / 'tests/current_native_tab_source_composition_v5_probe.mjs'), str(root)], cwd=ROOT, text=True, capture_output=True, timeout=90)
            self.assertEqual(child.returncode, 0, child.stderr)
            result = json.loads(child.stdout)
            self.assertEqual((result['result'], result['historical'], result['closure_sources'], result['cold'], result['late']), ('pass',41,24,4,4))
            self.assertEqual((result['source_only'], result['g11']), (True,'not-passed'))

if __name__ == '__main__': unittest.main()
