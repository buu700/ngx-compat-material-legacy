"""Helper aggregation must retain child failure and stop subsequent work."""
import contextlib
import importlib.util
import io
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('helper_runner', ROOT / 'scripts/run-helper-checks.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class HelperCheckRunnerTests(unittest.TestCase):
    def test_real_child_failure_stops_later_commands(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            commands = [
                [sys.executable, '-c', "from pathlib import Path; Path('first').write_text('ran')"],
                [sys.executable, '-c', "from pathlib import Path; Path('failed').write_text('ran'); raise SystemExit(7)"],
                [sys.executable, '-c', "from pathlib import Path; Path('later').write_text('ran')"],
            ]
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                status = helper.run_checks(commands, root=root)
            self.assertEqual(status, 7)
            self.assertTrue((root / 'first').is_file())
            self.assertTrue((root / 'failed').is_file())
            self.assertFalse((root / 'later').exists())

    def test_real_successful_children_all_run(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            commands = [[sys.executable, '-c', "from pathlib import Path; Path('" + name + "').write_text('ran')"]
                        for name in ['first', 'second']]
            with contextlib.redirect_stdout(io.StringIO()):
                status = helper.run_checks(commands, root=root)
            self.assertEqual(status, 0)
            self.assertTrue((root / 'first').is_file())
            self.assertTrue((root / 'second').is_file())
