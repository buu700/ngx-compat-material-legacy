# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Independent Python replay of the exact current rules-js program change."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from current_sass_tool_references import CurrentSassToolReferences

physical = lambda path: (ROOT / path).read_bytes()
packet_path = 'compatibility/rc/main-retained-rules-js-program-source-v1.json'
packet = json.loads(physical(packet_path))
source = CurrentSassToolReferences(ROOT, read=physical)
before, after = packet['update']['before'], packet['update']['after']
assert source.qualify(before) == source.qualify(after) == after
assert source.predecessor_reference(after) == before
assert hashlib.sha256(source.comparison_bytes(before)).hexdigest() == before['sha256']
assert hashlib.sha256(source.comparison_bytes(after)).hexdigest() == after['sha256']
assert source.qualify(dict(before, sha256='0'*64)) is None
try:
    source.qualify(dict(before, bytes=before['bytes']+1))
except AssertionError:
    pass
else:
    raise AssertionError('wrong length qualified')
targets = [packet_path, packet['usage']['path'], after['path'], *[ref['path'] for ref in packet['support']]]
assert len(set(targets)) == 12
for target in targets:
    bad = False
    def read(path):
        raw = physical(path)
        return raw + b' ' if bad and path == target else raw
    live = CurrentSassToolReferences(ROOT, read=read)
    bad = True
    for action in (live.assert_current, lambda: CurrentSassToolReferences(ROOT, read=read)):
        try:
            action()
        except (AssertionError, ValueError):
            pass
        else:
            raise AssertionError('changed program input accepted: ' + target)
    bad = False
    live.assert_current()
result = dict(result='pass', bound=source.bound, transitions=source.transitions, targets=targets,
              cold_rejections=12, late_rejections=12, recoveries=12,
              unknown_hash_not_qualified=True, wrong_length_rejected=True,
              historical_programs_executed=False, artifact_or_audit_admission_granted=False)
if len(sys.argv) > 1:
    with Path(sys.argv[1]).open('x') as output:
        json.dump(result, output, indent=2)
        output.write('\n')
print(json.dumps(dict(result='pass', bound=len(source.bound), transitions=len(source.transitions),
                      cold_rejections=12, late_rejections=12, recoveries=12)))
