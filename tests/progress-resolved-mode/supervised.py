# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Supervise the owned browser process group for the regression runner."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from browser_reference_owned_process import run_owned

if __name__ == '__main__':
    result = run_owned(sys.argv[1:], cwd=os.getcwd(), timeout=180)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    raise SystemExit(result.returncode)
