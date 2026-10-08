"""Actual attribute factory executes on its Angular node with original constructor inputs."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class NodeAttributeFactoryTests(unittest.TestCase):
    def test_actual_source_factory_literal_attributes_inputs_and_ignored_override_rejection(self):
        result=subprocess.run(['node','tests/api_node_attribute_factory_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=45)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-6000:])
