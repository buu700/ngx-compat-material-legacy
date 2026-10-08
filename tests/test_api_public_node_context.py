"""Real Angular nodes, public providers, source-factory execution and rejected incomplete factories."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class PublicApiNodeContextTests(unittest.TestCase):
    def test_real_nodes_template_scope_root_lifetime_and_emitted_source_factory(self):
        result=subprocess.run(['node','tests/api_public_node_context_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=45)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-8000:])
