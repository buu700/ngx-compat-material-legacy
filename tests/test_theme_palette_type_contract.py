"""ThemePalette label types do not silently acquire modern or runtime uses."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ThemePaletteTypeContractTests(unittest.TestCase):
    def test_original_minimum_domains_and_source_bindings(self):
        result = subprocess.run(
            ['node', 'tests/theme_palette_type_probe.mjs'], cwd=ROOT,
            text=True, capture_output=True, timeout=60,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])


if __name__ == '__main__':
    unittest.main()
