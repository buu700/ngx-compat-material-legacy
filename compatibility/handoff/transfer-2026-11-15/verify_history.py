#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Read-only verification of the histories used by the continuation handoff."""
import argparse
import json
import os
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    args = parser.parse_args()
    data = json.loads((Path(__file__).resolve().parent / 'payload/history/commits.json').read_text())
    env = {key: value for key, value in os.environ.items() if not key.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1', GIT_CONFIG_GLOBAL='/dev/null',
               GIT_CONFIG_NOSYSTEM='1', GIT_TERMINAL_PROMPT='0')
    command = ['git', '-c', 'protocol.allow=never', '-c', 'gc.auto=0',
               '-c', 'maintenance.auto=0', '-C', str(args.repo)]
    def git(*arguments, input=None):
        return subprocess.check_output(command + list(arguments), env=env, input=input, text=True)
    if git('rev-parse', '--is-shallow-repository').strip() != 'false':
        raise SystemExit('Full history is required; unshallow the clone first')
    commits = data['all_referenced_commits']
    output = git('cat-file', '--batch-check=%(objectname) %(objecttype)', input='\n'.join(commits)+'\n')
    expected = [sha + ' commit' for sha in commits]
    if output.splitlines() != expected:
        raise SystemExit('Missing referenced commit; fetch public branches/tags and supplemental bundle')
    roots = list(dict.fromkeys(data['base_commits'] + list(data['refs'].values())))
    objects = git('rev-list', '--objects', '--missing=print', '--stdin', input='\n'.join(roots)+'\n').splitlines()
    if any(line.startswith('?') for line in objects):
        raise SystemExit('Referenced histories contain missing objects')
    print(f'Verified {len(commits)} referenced commits and {len(objects)} reachable objects; no missing objects')
    print('Historical object availability grants no implementation, test or audit approval.')


if __name__ == '__main__':
    main()
