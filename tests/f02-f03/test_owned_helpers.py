#!/usr/bin/env python3
"""Behavior probes for owned numeric/DOM helpers (mirrors TS semantics)."""
from __future__ import annotations
import math
import unittest

def legacy_is_number_value(value):
    try:
        pf = float(str(value).strip()) if value is not None and value != '' else float('nan')
    except Exception:
        pf = float('nan')
    # Match JS: parseFloat(value) && Number(value)
    # In JS parseFloat(null) is NaN, Number(null) is 0 — so null is NOT a number value.
    import subprocess, json
    # Use node for exact JS semantics
    raise NotImplementedError

class NumberValueViaNode(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.code = r'''
function legacyIsNumberValue(value) {
  return !isNaN(parseFloat(value)) && !isNaN(Number(value));
}
const cases = [
  [null, false], ['', false], [' ', false], [false, false], [true, false],
  [0, true], ['0', true], [-1, true], ['1e3', true], ['0x10', true],
  [NaN, false], [Infinity, true], ['123hello', false], ['hello', false],
];
for (const [v, exp] of cases) {
  const got = legacyIsNumberValue(v);
  if (got !== exp) {
    console.log('FAIL', String(v), 'got', got, 'exp', exp);
    process.exit(1);
  }
}
console.log('ok');
'''
    def test_number_matrix(self):
        import subprocess
        r = subprocess.run(['node', '-e', self.code], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('ok', r.stdout)

class EventTargetViaNode(unittest.TestCase):
    def test_composed_path_and_fallback(self):
        code = r'''
function legacyGetEventTarget(event) {
  if (typeof event.composedPath === 'function') {
    const path = event.composedPath();
    if (path && path.length > 0) return path[0];
  }
  return event.target ?? null;
}
const t = {tag:'target'};
const c = {tag:'composed'};
console.assert(legacyGetEventTarget({target:t, composedPath:()=>[c,t]}) === c);
console.assert(legacyGetEventTarget({target:t, composedPath:()=>[]}) === t);
console.assert(legacyGetEventTarget({target:t}) === t);
console.assert(legacyGetEventTarget({target:null, composedPath:()=>[]}) === null);
console.log('ok');
'''
        import subprocess
        r = subprocess.run(['node', '-e', code], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

if __name__ == '__main__':
    raise SystemExit(unittest.main())
