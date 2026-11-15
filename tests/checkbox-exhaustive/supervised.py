# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Run each browser fixture in the workspace's owned process group."""
import os
import sys

workspace = sys.argv[1]
sys.path.insert(0, os.path.join(workspace, 'tests'))
from browser_reference_owned_process import run_owned

if __name__ == '__main__':
    result = run_owned(sys.argv[2:], cwd=workspace, timeout=180)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    raise SystemExit(result.returncode)
