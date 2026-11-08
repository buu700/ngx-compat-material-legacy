# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""A supplied bytes subclass cannot replace a physical source image."""
from pathlib import Path
import json
import sys
root = Path.cwd().resolve()
sys.path.insert(0, str(root / 'scripts'))
from current_sass_tool_references import CurrentSassToolReferences
called = []
class Hostile(bytes):
    def __eq__(self, other):
        called.append(True)
        raise RuntimeError('hostile equality invoked')
def read(path):
    return Hostile((root / path).read_bytes())
try:
    CurrentSassToolReferences(root, read=read)
except AssertionError:
    pass
else:
    raise AssertionError('bytes subclass accepted')
assert not called
print(json.dumps(dict(result='pass', subclass_rejected=True, equality_not_invoked=True, g11_claim='not-passed')))
