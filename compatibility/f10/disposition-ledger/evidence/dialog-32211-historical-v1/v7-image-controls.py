#!/usr/bin/env python3
"""Independent packed-image and mapped-source comparison; not API acceptance."""
import hashlib
import io
import json
import pathlib
import tarfile

BASE = pathlib.Path('/home/parallels/.codex/closeout-state/2026-11-07-recovery')
ROOT = pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')
OLD = BASE / 'root-disabled-composition-v1/ngx-compat-material-legacy-22.0.0-rc.0.tgz'
NEW = BASE / 'root-main-product-candidate-v7/pack/ngx-compat-material-legacy-22.0.0-rc.0.tgz'
sha = lambda data: hashlib.sha256(data).hexdigest()

def image(path, expected):
    data = path.read_bytes()
    if sha(data) != expected:
        raise ValueError('wrong artifact')
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tf:
        members = tf.getmembers()
        if any(not m.isfile() or not m.name.startswith('package/') or '..' in pathlib.PurePosixPath(m.name).parts for m in members):
            raise ValueError('unsafe member')
        files = {m.name: tf.extractfile(m).read() for m in members}
        if len(files) != len(members) or len(files) != 512:
            raise ValueError('duplicate or missing member')
        return files

old = image(OLD, 'a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2')
new = image(NEW, '66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca')
assert old.keys() == new.keys()
changes = {k: {'before': sha(old[k]), 'after': sha(new[k])} for k in old if old[k] != new[k]}
record = json.loads((BASE/'root-main-product-candidate-v7/a488-member-diff.json').read_text())
expected = {x['path']: {'before': x['before_sha256'], 'after': x['after_sha256']} for x in record['changed_members']}
assert changes == expected and len(changes) == 9
sources = {}
for family, source in [('legacy-tabs', 'legacy-tabs/internal/tab-nav-bar-base.ts'), ('legacy-form-field', 'legacy-form-field/form-field.ts')]:
    mapping = json.loads(new[f'package/fesm2022/ngx-compat-material-legacy-{family}.mjs.map'])
    indexes = [i for i, name in enumerate(mapping['sources']) if name.endswith('/'+source)]
    assert len(indexes) == 1
    mapped = mapping['sourcesContent'][indexes[0]].encode()
    actual = (ROOT/'projects/ngx-material-legacy'/source).read_bytes()
    assert mapped == actual
    sources[source] = sha(mapped)

def exact_member(files, name, expected_sha):
    return name in files and sha(files[name]) == expected_sha

member = 'package/fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs'
modified = dict(new)
modified[member] += b'\n'
controls = {
    'wrong_artifact_rejected': sha(OLD.read_bytes()) != sha(NEW.read_bytes()),
    'wrong_member_rejected': not exact_member(modified, member, sha(new[member])),
    'wrong_mapped_source_rejected': sha(b'wrong source') != sources['legacy-tabs/internal/tab-nav-bar-base.ts'],
}
assert all(controls.values())
print(json.dumps({'old_members':len(old),'new_members':len(new),'unchanged_members':len(old)-len(changes),'changed_members':changes,'mapped_sources_match_checkout':sources,'negative_controls':controls,'limits':'Image comparison only; no DI, declaration, actual peer-closure, or acceptance claim.'}, indent=2))
