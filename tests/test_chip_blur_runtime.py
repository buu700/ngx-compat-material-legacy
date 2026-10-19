# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete original chip-blur assertions at their immutable source epoch.

Current NgZone/focus behavior is checked independently by chip_zone_use_probe.
"""
from pathlib import Path
import unittest
from tests.chip_blur_history import assert_original_chip_blur
ROOT = Path(__file__).resolve().parents[1]


class ChipBlurRuntimeTests(unittest.TestCase):
    def test_blur_form_state_and_request_lifetimes(self):
        assert_original_chip_blur(self, ROOT, self.id())


if __name__ == '__main__':
    unittest.main()
