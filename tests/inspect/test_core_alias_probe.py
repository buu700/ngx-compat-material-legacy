#!/usr/bin/env python3
"""The packed core-alias probe reads the tarball's declaration export names."""
from __future__ import annotations

import io
import json
import subprocess
import sys
import tarfile
import tempfile
import textwrap
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROBE = ROOT / 'scripts' / 'check-packed-core-aliases.py'
ALIASES = ROOT / 'research' / 'core-alias-recovery.csv'


def pack(types_source: str) -> Path:
    payload = types_source.encode()
    manifest = json.dumps(
        {
            'name': '@ngx-compat/material-legacy',
            'exports': {
                './legacy-core': {
                    'types': './types/core.d.ts',
                    'default': './fesm2022/core.mjs',
                }
            },
        }
    ).encode()
    directory = tempfile.mkdtemp()
    path = Path(directory) / 'pkg.tgz'
    with tarfile.open(path, 'w:gz') as archive:
        for name, data in (
            ('package/package.json', manifest),
            ('package/types/core.d.ts', payload),
        ):
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    return path


class CoreAliasProbeTests(unittest.TestCase):
    def test_missing_historical_alias_fails(self):
        names = [
            line.split(',', 1)[0]
            for line in ALIASES.read_text(encoding='utf-8').splitlines()[1:]
            if line.strip()
        ]
        present = ',\n  '.join(names[:-1])
        source = textwrap.dedent(
            f'''
            export {{
              {present}
            }};
            '''
        )
        tarball = pack(source)
        result = subprocess.run(
            [sys.executable, str(PROBE), str(tarball)],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload['missing'], [names[-1]])
        self.assertFalse(payload['ok'])


if __name__ == '__main__':
    raise SystemExit(unittest.main())
