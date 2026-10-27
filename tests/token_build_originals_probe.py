# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete original patch round trips and individual hunk coverage, independently."""
import gzip
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-c04-token-test-build-'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def verify_originals():
    raw = (ROOT / (PREFIX + 'originals.json.gz')).read_bytes()
    assert HASH(raw) == 'fb72581a66231022c7748b229394aaba010fe5fe25a688c97e9cbb99a6eb74a0'
    data = json.loads(gzip.decompress(raw))
    commit = data['raw_commit'].encode()
    assert hashlib.sha1(b'commit ' + str(len(commit)).encode() + b'\0' + commit).hexdigest() == data['sha'] == '7ed70fe4422e4324ea450604514337fa5e0ad880'
    review = json.loads((ROOT / (PREFIX + 'individual-review.json')).read_bytes())
    assert review['sha'] == data['sha'] and review['line'] == '21.x' and review['status'] == 'reviewed'
    assert review['canonical_disposition_applied'] is False
    assert len(data['sections']) == len(data['before_after_blobs']) == 4
    assert ''.join(row['patch'] for row in data['sections']) == data['diff'] == review['diff']
    assert HASH(data['diff'].encode()) == data['diff_sha256'] == review['diff_sha256']
    assert review['full_original_paths'] == [row['path'] for row in data['sections']]
    hunk_count, blob_count = 0, 0
    for section, blob in zip(data['sections'], data['before_after_blobs']):
        assert section['path'] == blob['path']
        assert HASH(section['patch'].encode()) == section['patch_sha256']
        index = re.search(r'(?m)^index ([0-9a-f]{40})\.\.([0-9a-f]{40}) 100644$', section['patch'])
        assert index
        for side, expected in [('before', index[1]), ('after', index[2])]:
            body = blob[side].encode()
            assert hashlib.sha1(b'blob ' + str(len(body)).encode() + b'\0' + body).hexdigest() == expected
            assert HASH(body) == blob[side + '_sha256']
            blob_count += 1
        lines, chunks, cursor = blob['before'].splitlines(keepends=True), [], 0
        assert re.split(r'(?=^@@ )', section['patch'], flags=re.M)[1:] == [row['text'] for row in section['hunks']]
        for hunk in section['hunks']:
            text = hunk['text']
            assert HASH(text.encode()) == hunk['sha256']
            header, *body = text.splitlines(keepends=True)
            match = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', header)
            assert match
            start = int(match[1]) - 1
            assert start >= cursor
            old = [line[1:] for line in body if line[0] in ' -']
            new = [line[1:] for line in body if line[0] in ' +']
            assert all(line[0] in ' +-' for line in body)
            assert len(old) == int(match[2] or 1) and len(new) == int(match[4] or 1)
            assert lines[start:start + len(old)] == old
            chunks.extend(lines[cursor:start])
            chunks.extend(new)
            cursor = start + len(old)
            decision = review['complete_original_hunk_reviews'][hunk_count]
            assert (decision['path'], decision['hunk_index'], decision['header'], decision['hunk_sha256']) == (
                section['path'], hunk['index'], hunk['header'], hunk['sha256'])
            assert len(decision['decision']) > 100
            hunk_count += 1
        chunks.extend(lines[cursor:])
        assert ''.join(chunks) == blob['after']
    assert hunk_count == len(review['complete_original_hunk_reviews']) == 6 and blob_count == 8
    reference = next(row for row in data['tagged_reference']['members'] if row['path'].endswith('test-validate-tokens.scss'))
    assert HASH(reference['body'].encode()) == 'e81e448dfbdeb02b955cd30d461d327db107b0dba1cd0602d3c67d95e9a016ab'
    assert data['tagged_reference']['commit'] == 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
    assert len(re.findall(r'\$component:', reference['body'])) == 19
    return dict(original_files=4, original_hunks=6, authenticated_blob_ids=8, exact_patch_roundtrips=4,
                authentic_reference_cases=19, canonical_decisions_changed=0, g11_claim='not-passed')


if __name__ == '__main__':
    print(json.dumps(verify_originals()))
