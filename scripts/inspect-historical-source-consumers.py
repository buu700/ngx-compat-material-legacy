# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Collect bounded, serial diagnostics; never turn failures into qualifications."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time


INVENTORY = 'compatibility/rc/historical-source-consumer-inventory-worksheet.json'
MARKER = 'HISTORICAL_CONSUMER_DIAGNOSTIC '
PROBE = r"""
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hash = value => createHash('sha256').update(value).digest('hex');
const summarize = value => {
  if (typeof value === 'string') return {type:'string',bytes:Buffer.byteLength(value),sha256:hash(value)};
  if (value === null || ['number','boolean','undefined'].includes(typeof value)) return {type:typeof value,value};
  return {type:Array.isArray(value)?'array':typeof value,length:Array.isArray(value)?value.length:undefined};
};
let result;
try {
  await import(pathToFileURL(process.argv[1]).href);
  result = {state:'passed',runtime:process.version};
} catch (error) {
  result = {state:'failed',runtime:process.version,error:{name:error.name,code:error.code,
    message:error.message.slice(0,500),message_bytes:Buffer.byteLength(error.message),
    message_sha256:hash(error.message),operator:error.operator,
    actual:summarize(error.actual),expected:summarize(error.expected),
    locations:(error.stack??'').split('\n').filter(line=>/^\s+at /.test(line)).slice(0,6)}};
  process.exitCode = 2;
}
console.log('HISTORICAL_CONSUMER_DIAGNOSTIC '+JSON.stringify(result));
"""


def collect(root, destination):
    root, destination = Path(root).resolve(), Path(destination).resolve()
    assert not destination.exists(), 'diagnostic output must be fresh'
    inventory_raw = (root / INVENTORY).read_bytes()
    inventory = json.loads(inventory_raw)
    assert len(inventory['candidates']) == 23
    version = json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
    line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
    assert line and inventory['inventory_line'] == line
    paths = sorted({path for row in inventory['candidates'] for path in row['direct_probe_importers']}
                   | set(inventory['additional_direct_probe_candidates']))
    assert len(paths) == 27
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY',
                'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID',
                'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'):
        env.pop(key, None)
    rows = []
    for path in paths:
        assert path.startswith('tests/') and path.endswith('.mjs')
        assert all(part not in ('', '.', '..') for part in path.split('/'))
        member = root / path
        assert member.is_file() and not member.is_symlink()
        before = member.read_bytes()
        started = time.monotonic()
        try:
            child = subprocess.run(['node', '--input-type=module', '-e', PROBE, str(member)], cwd=root,
                                   env=env, capture_output=True, text=True, timeout=45)
            messages = [text[len(MARKER):] for text in child.stdout.splitlines() if text.startswith(MARKER)]
            if len(messages) == 1:
                result = json.loads(messages[0])
                assert child.returncode == (0 if result['state'] == 'passed' else 2)
            else:
                result = dict(state='diagnostic-error', returncode=child.returncode,
                              stderr_tail=child.stderr[-1500:])
        except subprocess.TimeoutExpired:
            result = dict(state='timeout', bound_seconds=45, qualification_claim=False)
        assert member.read_bytes() == before, 'probe changed its source file'
        row = dict(path=path, sha256=hashlib.sha256(before).hexdigest(), bytes=len(before),
                   elapsed_seconds=round(time.monotonic() - started, 3), **result)
        rows.append(row)
        print(json.dumps(dict(path=path, state=row['state'], elapsed_seconds=row['elapsed_seconds'])), flush=True)
    head = subprocess.check_output(['git', '--no-replace-objects', 'rev-parse', 'HEAD'], cwd=root,
                                   env=env, text=True).strip()
    counts = {state: sum(row['state'] == state for row in rows)
              for state in ('passed', 'failed', 'timeout', 'diagnostic-error')}
    report = dict(schema_version=1, line=line, source_parent=head,
                  role='First-failure diagnostics of unchanged current source probes; no historical replay or acceptance.',
                  inventory=dict(path=INVENTORY, sha256=hashlib.sha256(inventory_raw).hexdigest()),
                  producer=dict(path='scripts/inspect-historical-source-consumers.py',
                                sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()),
                  serial=True, per_probe_bound_seconds=45, counts=counts, probes=rows,
                  original_assertions_changed=False, product_or_consumer_changes=False,
                  native_artifact_browser_floor_or_full_audit_qualified=False, g13_claim='not-passed')
    with destination.open('x') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    print(json.dumps(dict(line=line, counts=counts, full_qualification_claim=False)), flush=True)


if __name__ == '__main__':
    assert len(sys.argv) == 3, 'expected repository root and fresh diagnostic report path'
    collect(*sys.argv[1:])
