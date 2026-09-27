#!/usr/bin/env python3
"""The committed chainman pin and reserved update holds stay explicit."""
from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PIN = ROOT / 'chainman.lock'
HOLDS = ROOT / 'chainman' / 'future-update-holds.toml'
LAUNCHER = ROOT / 'chainman.toml'


class ChainmanPinTests(unittest.TestCase):
    def test_lock_is_a_full_lowercase_sha(self):
        text = PIN.read_text(encoding='utf-8')
        self.assertEqual(len(text), 41)
        self.assertTrue(text.endswith('\n'))
        sha = text.strip()
        self.assertEqual(len(sha), 40)
        self.assertTrue(all(c in '0123456789abcdef' for c in sha))
        self.assertNotIn('\r', text)

    def test_future_update_holds_are_recorded_and_not_active(self):
        note = HOLDS.read_text(encoding='utf-8')
        launcher = LAUNCHER.read_text(encoding='utf-8')
        for required in (
            'chainman-verified-update',
            'reserved-not-enabled',
            'node = "24.21.0"',
            'pnpm = "12.4.2"',
            'peer_floor = "^22.1.7"',
            'framework_peer_floor = "^21.2.23"',
            'material_cdk_peer_floor = "^21.2.14"',
        ):
            self.assertIn(required, note)
        self.assertNotIn('include', launcher)
        self.assertNotIn('[updates]', launcher)
        self.assertNotIn('deps-update', launcher)


if __name__ == '__main__':
    raise SystemExit(unittest.main())
