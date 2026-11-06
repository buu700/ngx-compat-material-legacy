# Copyright Google LLC All Rights Reserved.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.dev/license
# Copyright (c) 2026 Ryan Lester.

"""Synthetic packaged CLI for admission tests; never execution evidence."""
import hashlib
import io
import tarfile

CLI_MEMBERS = (
    'package/package.json', 'package/bin/migrate-legacy.js', 'package/lib/ts-rewrite.js',
    'package/lib/sass-rewrite.js', 'package/lib/transaction-write.js', 'package/LICENSE',
)

def cli_payload(name):
    return ('synthetic fixture member: ' + name + '\n').encode()

def write_cli_archive(run_dir):
    path = run_dir / 'migrate-cli.tgz'
    with tarfile.open(path, 'w:gz') as archive:
        for name in CLI_MEMBERS:
            data = cli_payload(name)
            member = tarfile.TarInfo(name)
            member.size = len(data)
            archive.addfile(member, io.BytesIO(data))
    data = path.read_bytes()
    return {'id':'migrate-cli', 'path':path.name, 'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest()}

def cli_identities():
    return [{'path':name, 'bytes':len(cli_payload(name)), 'sha256':hashlib.sha256(cli_payload(name)).hexdigest()} for name in CLI_MEMBERS]
