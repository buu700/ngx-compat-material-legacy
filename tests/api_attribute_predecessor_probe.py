# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT.
"""Authenticate predecessor map bytes used for narrow source transformations."""
import gzip
import hashlib
from pathlib import Path
import sys
import tarfile

archive = Path(sys.argv[1])
assert hashlib.sha256(archive.read_bytes()).hexdigest() == '877c8b62e1ea9b134d838043dda436abb4ccf9515041640fdb05dc6113727b0b'
root = Path(__file__).resolve().parents[1] / 'compatibility/rc/qualification/api-attribute-owned-mode-v1'
families = ['legacy-checkbox', 'legacy-chips', 'legacy-radio', 'legacy-slide-toggle', 'legacy-slider']
with tarfile.open(archive) as tar:
    members = tar.getmembers()
    assert len(members) == 512 and len({m.name for m in members}) == 512
    assert all(m.isfile() and m.name.startswith('package/') and all(p not in ('', '.', '..') for p in m.name.split('/')) for m in members)
    for family in families:
        path = f'package/fesm2022/ngx-compat-material-legacy-{family}.mjs.map'
        assert tar.extractfile(path).read() == gzip.decompress((root / f'{family}-prior-map.gz').read_bytes())
print('pass: exact predecessor archive, 512 regular members, five embedded source maps')
