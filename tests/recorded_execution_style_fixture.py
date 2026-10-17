# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Synthetic style data for reader controls, never rendered execution evidence."""
import json
from pathlib import Path
import sys
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from owned_rendered_admission import owned_schema
from owned_style_fixture import style_receipt

if __name__=='__main__':
    payload=json.load(sys.stdin)
    active=SimpleNamespace(binding=payload['binding'],manifest=payload['manifest'])
    print(json.dumps([style_receipt(ROOT,active,id,payload['invocation_id']) for id in owned_schema()]))
