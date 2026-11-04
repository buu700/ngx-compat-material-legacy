"""Reconstruct frozen v1 manifest bytes from authenticated before images; no code execution."""
from pathlib import Path
import copy
import difflib
import gzip
import hashlib
import json
import os
import subprocess
import sys
root = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
assert str(output).startswith(str(root / 'compatibility/rc/parallel-spinner-snack-c04-independent-'))
sha = lambda b: hashlib.sha256(b).hexdigest()
cut = json.loads((root / 'compatibility/rc/parallel-spinner-snack-public-bridge-c04-frozen-inputs-v2.json').read_bytes())
ref = cut['metadata_only_successor']
raw = (root / ref['path']).read_bytes()
assert sha(raw) == ref['sha256'] and len(raw) == ref['bytes']
packet = json.loads(gzip.decompress(raw))
prior_raw = (root / cut['prior_frozen_cut']['path']).read_bytes()
assert sha(prior_raw) == cut['prior_frozen_cut']['sha256']
prior = json.loads(prior_raw)
def git(r, commit, path):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', commit + ':' + path], cwd=r, env=env)
images = {row['path']: row for row in packet['images']}
for row in images.values():
    before = row['before_text'].encode()
    assert sha(before) == row['before_sha256'] and len(before) == row['before_bytes']
    text = row['before_text']
    for edit in row['literal_edits']:
        assert text.count(edit['before']) == 1
        text = text.replace(edit['before'], edit['after'])
    after = text.encode()
    assert sha(after) == row['after_sha256'] and len(after) == row['after_bytes']
    for line, branch in cut['branches'].items():
        old_ref = next(ref for ref in prior['branches'][line]['physical_inputs'] if ref['path'] == row['path'])
        assert old_ref['sha256'] == row['before_sha256'] and old_ref['bytes'] == row['before_bytes']
        assert (Path(branch['root']) / row['path']).read_bytes() == after
results = []
for line, branch in cut['branches'].items():
    r = Path(branch['root'])
    mf_ref = packet['branches'][line]
    current_raw = (r / mf_ref['after_manifest']['path']).read_bytes()
    assert sha(current_raw) == mf_ref['after_manifest']['sha256']
    restored = copy.deepcopy(json.loads(current_raw))
    for row in restored['tool_transitions']:
        if row['path'] not in images:
            continue
        old_after = images[row['path']]['before_text']
        original = git(r, row.get('source_parent', restored['source_parent']), row['path']).decode()
        assert sha(original.encode()) == row['before']['sha256']
        aa, bb = original.splitlines(keepends=True), old_after.splitlines(keepends=True)
        text = original
        edits = []
        for group in reversed(list(difflib.SequenceMatcher(None, aa, bb, autojunk=False).get_grouped_opcodes(3))):
            before = ''.join(aa[group[0][1]:group[-1][2]])
            after = ''.join(bb[group[0][3]:group[-1][4]])
            assert before and text.count(before) == 1
            edits.append(dict(before=before, after=after))
            text = text.replace(before, after)
        assert text == old_after
        row['literal_edits'] = edits
        row['after'] = dict(sha256=sha(old_after.encode()), bytes=len(old_after.encode()))
    for ref in restored['support_inputs']:
        if ref['path'] in images:
            row = images[ref['path']]
            ref['sha256'], ref['bytes'] = row['before_sha256'], row['before_bytes']
    restored_raw = (json.dumps(restored, indent=2) + '\n').encode()
    assert sha(restored_raw) == mf_ref['before_manifest']['sha256']
    assert len(restored_raw) == mf_ref['before_manifest']['bytes']
    results.append(dict(line=line, reconstructed_prior_manifest_sha256=sha(restored_raw), bytes=len(restored_raw), exact_v1_manifest_reconstruction=True))
body = dict(schema_version=1, status='exact-v1-preimages-and-v2-literals-authenticated', tool_images=4, image_paths=list(images), manifests=results,
            old_programs_executed=False, source_producers_or_compilers_executed=False, files_modified=False, g11_claim='not-passed')
output.write_text(json.dumps(body, indent=2) + '\n')
print(json.dumps(dict(status=body['status'], exact_manifest_reconstructions=len(results))))
