"""Pre-repair frozen CSS is negative where tagged-16 Stepper output differs."""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from sass_default_companion_admission import DEFAULT_COMPANION_CASES, default_companion_expected_css
from sass_default_aggregate_admission import DEFAULT_AGGREGATE_CASES, default_aggregate_expected_css
from sass_ordered_aggregate_admission import ordered_aggregate_expected_css
from sass_companion_addition_admission import COMPANION_ADDITION_CASES, companion_addition_expected_css
from sass_aggregate_density_admission import AGGREGATE_DENSITY_CASES, aggregate_density_expected_css
from sass_aggregate_color_theme_admission import AGGREGATE_COLOR_THEME_CASES, aggregate_color_theme_expected_css
from sass_aggregate_typography_admission import AGGREGATE_TYPOGRAPHY_CASES, aggregate_typography_expected_css
from sass_default_companion_fixture import default_companion_receipt
from sass_default_aggregate_fixture import default_aggregate_receipt
from sass_ordered_aggregate_fixture import ordered_aggregate_receipt
from sass_mixin_fixture import mixin_receipt
from stepper_repaired_snapshot import repaired_stepper_css


class StepperRepairedSnapshotTests(unittest.TestCase):
    def test_all_74_tagged_expectations_and_56_stale_measurements(self):
        rows = []
        for line in ('main', '21.x'):
            active = SimpleNamespace(binding={'source_line': line}, manifest={'run_id': 'synthetic', 'artifacts': [{'id': 'library', 'sha256': 'c' * 64}]})
            for case, entry in DEFAULT_COMPANION_CASES.items():
                if entry['family'] != 'stepper':
                    continue
                body = default_companion_receipt(active, case, 'default-companion')
                frozen = body['actual_measurement']['css']
                expected = default_companion_expected_css(case, body['current_companion']['peer'], line)
                rows.append((line, case, frozen, expected))
            for case in DEFAULT_AGGREGATE_CASES:
                body = default_aggregate_receipt(active, case, 'default-aggregate')
                frozen = body['actual_measurement']['css']
                expected = default_aggregate_expected_css(case, body['current_companion']['peer'], line)
                rows.append((line, case, frozen, expected))
            body = ordered_aggregate_receipt(active, '06-aggregate-and-companions', 'ordered')
            rows.append((line, '06-aggregate-and-companions', body['actual_measurement']['css'], ordered_aggregate_expected_css(body['current_companion']['peers'], line)))
            for cases, model in (
                (dict((key, value) for key, value in COMPANION_ADDITION_CASES.items() if key.startswith('mixin-argument/stepper-')), companion_addition_expected_css),
                (AGGREGATE_DENSITY_CASES, aggregate_density_expected_css),
                (AGGREGATE_COLOR_THEME_CASES, aggregate_color_theme_expected_css),
                (AGGREGATE_TYPOGRAPHY_CASES, aggregate_typography_expected_css),
            ):
                for case in cases:
                    body = mixin_receipt(ROOT, active, case, 'one')
                    rows.append((line, case, body['actual']['css'], model(body)))
        self.assertEqual(len(rows), 74)
        self.assertEqual(sum(frozen != expected for _, _, frozen, expected in rows), 56)
        for line, case, frozen, expected in rows:
            self.assertIsNotNone(expected, (line, case))
            self.assertEqual(repaired_stepper_css(frozen, line), expected, (line, case))
            # The original measurement bytes are retained; changed cases are
            # negative examples of the repaired expected model.
            if frozen != expected:
                self.assertNotEqual(frozen, expected, (line, case))


if __name__ == '__main__':
    unittest.main()
