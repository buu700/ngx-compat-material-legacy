# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent finite current tool references; historical programs remain data."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

SELF = 'scripts/current_sass_tool_references.py'
INPUTS = 'compatibility/rc/parent-base-class-tool-successor-inputs-v3.json'
V4_INPUTS = dict(path='compatibility/rc/parent-base-class-tool-successor-inputs-v4.json', sha256='60088525932c75c41782874396eb72f8bcec479ec2ad4d911090e1e2b3964b24', bytes=109915)
V5_INPUTS = dict(path='compatibility/rc/parent-base-class-tool-successor-inputs-v5.json', sha256='365ffeba024c5bc28705c1bc42127e2491fadcf0d76ed90bef686a83757e91af', bytes=19314)
V5_PARENT = 'c72d88c74944463d1fea960ae718fb30944818c9'
V5_COMMIT = '5b09618cde44725b8723fe4f6c63c3a4c35ad7e5'
V5_PATHS = ['scripts/rc-verify.py', 'scripts/packed-consumer-evidence.mjs']
V4_PARENT = '7870ef230c0e980d8b58eab81374358142eca065'
V4_COMMITS = {'tests/current_sass_tool_reference_probe.mjs': 'authored', 'scripts/browser-reference-source.mjs': 'authored', 'scripts/checker-reference-proposal.mjs': 'authored', 'tests/checker_reference_source_probe.mjs': 'authored', 'scripts/check-upstream-audit-disposition.mjs':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','scripts/rc-verify.py':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','scripts/rc_acceptance.py':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','compatibility/rc/matrices/full-verify.json':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','tests/test_rc_acceptance.py':'70fecd1e31cb0e2a881b3b3e803fae3fcbddefde','scripts/select-dialog-finite-source-successor.mjs':'0da0a92934ffae20098de762d78c329dc932c04c','scripts/select_dialog_finite_source_successor_v4.py':'0da0a92934ffae20098de762d78c329dc932c04c','scripts/remaining-native-tab-lifecycle-review.mjs':'b30c40a7b58513047cdf453c28ae7e33cd40d5f3','scripts/inventory-reference-owner.mjs':'948e8290b74953c83d11268368f38952d0b51fd7','scripts/inventory-reference-proposal.mjs':'948e8290b74953c83d11268368f38952d0b51fd7','scripts/inventory-finite-tool-successor.mjs':'948e8290b74953c83d11268368f38952d0b51fd7','tests/inventory_finite_source_probe.mjs':'948e8290b74953c83d11268368f38952d0b51fd7','scripts/inventory-rc-acceptance-source-successor.mjs':'authored','tests/test_current_sass_tool_references.py':'authored'}
V2_INPUTS = dict(path='compatibility/rc/current-sass-tool-reference-inputs-v2.json', sha256='d25ef6684992ececd518f7932bc68f5d43d433df23868d7a376ebf0a9e56a770', bytes=625566)
V3_CHECKPOINTS = {'21.x': 'd8ab97315b6c77b83f42c2bebcf63b2984fff255', 'main': '59ba0e2aa8b76f71b472ea2831273e44e44b5b57'}
V3_SOURCE_ANCHORS = {
    'scripts/upstream-base-class-removal-admission.cjs': dict(before=dict(path='scripts/upstream-base-class-removal-admission.cjs', sha256='013cbe4ae44ebebcf8331d2aedca972f15c824dd4e61bc795f0efa188d35b69a', bytes=14322), packet=dict(path='compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json', sha256='720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881', bytes=3578), member_key='handler'),
    'scripts/legacy-removal-canonical-stage.mjs': dict(packet=dict(path='compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', sha256='1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b', bytes=184121), transition_index=1),
    'tests/test_packed_upstream_ledger_epoch.py': dict(packet=dict(path='compatibility/rc/c04-inventory-owner-inputs.json', sha256='0d9dfac3813a6dc60644a090a2173ce56eaed1bcbdb32c2be29ce53f32413cdc', bytes=12144), source_member_index=9),
    'scripts/browser-reference-source.mjs': dict(packet=dict(path='compatibility/rc/c04-browser-owner-inputs.json', sha256='710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', bytes=15193), transition_index=2),
    'tests/checker_reference_source_probe.mjs': dict(packet=dict(path='compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', sha256='1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b', bytes=184121), transition_index=4),
    'scripts/browser-owner-source.mjs': dict(packet=dict(path='compatibility/rc/21x-legacy-removal-admission-owner-inputs.json', sha256='f64114770b458614c1251e8aae33b245999e64fee8ffa9216324e0f253bd4e0f', bytes=40975), transition_index=2),
    'scripts/checker-owner-source.mjs': dict(packet=dict(path='compatibility/rc/c04-browser-owner-inputs.json', sha256='710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', bytes=15193), transition_index=1),
    'scripts/checker-reference-proposal.mjs': dict(packet=dict(path='compatibility/rc/c04-checker-owner-inputs.json', sha256='3ae63a5b436eab901a7ff22cb8ecc9043a5aea8d2fb89ebd9e7f396ea3105bf3', bytes=12073), transition_index=2),
    'tests/browser_reference_owner_probe.mjs': dict(packet=dict(path='compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', sha256='1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b', bytes=184121), transition_index=9),
    'tests/test_browser_reference_owner.py': dict(packet=dict(path='compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', sha256='1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b', bytes=184121), transition_index=10),
}
V3_REGRESSION_SOURCE_ANCHORS = {'21.x': {'tests/browser_reference_source_probe.mjs': {'before': {'path': 'tests/browser_reference_source_probe.mjs', 'sha256': 'cca4093034ebb6932fc7e822e70e684413b55d8fff12b40dcccbfdc07713a0e7', 'bytes': 7558}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-source-inputs.json', 'sha256': '5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae', 'bytes': 115478}, 'source_member_index': 50}, 'scripts/browser-reference-proposal.mjs': {'before': {'path': 'scripts/browser-reference-proposal.mjs', 'sha256': '600a430a33955755561f018f46288acd4beed4b9ad4ca6b4daf8aa7cb5bf1d50', 'bytes': 13492}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': '710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', 'bytes': 15193}, 'transition_index': 3}}, 'main': {'tests/browser_reference_source_probe.mjs': {'before': {'path': 'tests/browser_reference_source_probe.mjs', 'sha256': 'cca4093034ebb6932fc7e822e70e684413b55d8fff12b40dcccbfdc07713a0e7', 'bytes': 7558}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-source-inputs.json', 'sha256': '4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c', 'bytes': 115393}, 'source_member_index': 48}, 'tests/checker_reference_source_probe.mjs': {'before': {'path': 'tests/checker_reference_source_probe.mjs', 'sha256': '0c1158d9c1dcbe5a33f6d8f7660e8ad0435b031020a9610f76655f4648f211a8', 'bytes': 15116}, 'packet': {'path': 'compatibility/rc/c04-checker-owner-inputs.json', 'sha256': 'f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc', 'bytes': 12073}, 'transition_index': 0}, 'scripts/browser-reference-proposal.mjs': {'before': {'path': 'scripts/browser-reference-proposal.mjs', 'sha256': '600a430a33955755561f018f46288acd4beed4b9ad4ca6b4daf8aa7cb5bf1d50', 'bytes': 13492}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': 'd22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb', 'bytes': 15192}, 'transition_index': 3}, 'scripts/checker-reference-proposal.mjs': {'before': {'path': 'scripts/checker-reference-proposal.mjs', 'sha256': '22c49ba434ee0b1253ad2815b77510adb8259cc3f307005f6b66b73e522502ac', 'bytes': 13095}, 'packet': {'path': 'compatibility/rc/c04-checker-owner-inputs.json', 'sha256': 'f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc', 'bytes': 12073}, 'transition_index': 2}, 'scripts/browser-reference-source.mjs': {'before': {'path': 'scripts/browser-reference-source.mjs', 'sha256': '59f2ac538149e0d9b2176c231a97147862881fb19b46768a5a4e450d66f9fe38', 'bytes': 10443}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': 'd22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb', 'bytes': 15192}, 'transition_index': 2}}}
for line, anchor in {'21.x': {'before': {'path': 'scripts/browser-reference-owner.mjs', 'sha256': '7f0ae434273c4d19aa1b533bfbe3a61d8ffd4e4d9eb9959ab40f31d441db28e5', 'bytes': 3026}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': '710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', 'bytes': 15193}, 'source_member_index': 0}, 'main': {'before': {'path': 'scripts/browser-reference-owner.mjs', 'sha256': '7f0ae434273c4d19aa1b533bfbe3a61d8ffd4e4d9eb9959ab40f31d441db28e5', 'bytes': 3026}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': 'd22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb', 'bytes': 15192}, 'source_member_index': 0}}.items():
    V3_REGRESSION_SOURCE_ANCHORS[line]['scripts/browser-reference-owner.mjs'] = anchor
# Exact Git predecessors anchored by the untouched T14 source-input rows.
V3_REGRESSION_SOURCE_ANCHORS['21.x'].update({'scripts/companion-bridge-peer-oracle.mjs': {'before': {'path': 'scripts/companion-bridge-peer-oracle.mjs', 'sha256': '0bb0c5bc31c6e00b7e60346a008d0ce1a7c1a649c9c64bff504d14ac08554838', 'bytes': 13994}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-21-final-compat-v1.json', 'sha256': '5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287', 'bytes': 387987}, 'source_input_index': 174}, 'scripts/sass-companion-addition-contract.mjs': {'before': {'path': 'scripts/sass-companion-addition-contract.mjs', 'sha256': '6ebac00c6000aeade23d08d25b9bb3679b3497cfc8986fe51df1bc753befaf44', 'bytes': 3002}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-21-final-compat-v1.json', 'sha256': '5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287', 'bytes': 387987}, 'source_input_index': 530}})
PREVIOUS_INPUTS = dict(path='compatibility/rc/current-sass-tool-reference-inputs-v1.json',
                       sha256='ffb8fb98babb084a86e4d49f13ef17069f784eb732365c566f6c764efd62e64f', bytes=478008)
CHECKPOINTS = {'21.x': 'b25aedd02f7b53e8cd8dfcdad369a806a1301619',
               'main': '5e9f8e51fd53b63500ce9f292a3b0bd9e8b4e2d8'}
for line, anchors in {'21.x': {'tests/test_checker_reference_source.py': {'before': {'path': 'tests/test_checker_reference_source.py', 'sha256': '96a98e5f871d6c2bc586938a08fbcd11205df6b10df9ce14395b38f73ed8c23c', 'bytes': 4657}, 'packet': {'path': 'compatibility/rc/c04-checker-owner-inputs.json', 'sha256': '3ae63a5b436eab901a7ff22cb8ecc9043a5aea8d2fb89ebd9e7f396ea3105bf3', 'bytes': 12073}, 'transition_index': 1}, 'tests/test_browser_reference_source.py': {'before': {'path': 'tests/test_browser_reference_source.py', 'sha256': 'e5fadb22854af2a821b0a7b21a296eb2cb3c133054e515716ebfa5594747b677', 'bytes': 2926}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': '710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', 'bytes': 15193}, 'transition_index': 4}, 'tests/test_browser_reference_proposal.py': {'before': {'path': 'tests/test_browser_reference_proposal.py', 'sha256': '3abdbc8221cc4609dfef856affdc790f1b4848815049ab8ec34d50b9a6313c07', 'bytes': 3283}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-proposal.json', 'sha256': '52d231aca902638226f5065c6622a6f857745990cdd23ee9df211aaf5e5ee56e', 'bytes': 18691}, 'source_member_index': 8}}, 'main': {'tests/test_checker_reference_source.py': {'before': {'path': 'tests/test_checker_reference_source.py', 'sha256': '96a98e5f871d6c2bc586938a08fbcd11205df6b10df9ce14395b38f73ed8c23c', 'bytes': 4657}, 'packet': {'path': 'compatibility/rc/c04-checker-owner-inputs.json', 'sha256': 'f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc', 'bytes': 12073}, 'transition_index': 1}, 'tests/test_browser_reference_source.py': {'before': {'path': 'tests/test_browser_reference_source.py', 'sha256': 'e5fadb22854af2a821b0a7b21a296eb2cb3c133054e515716ebfa5594747b677', 'bytes': 2926}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': 'd22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb', 'bytes': 15192}, 'transition_index': 4}, 'tests/test_browser_reference_proposal.py': {'before': {'path': 'tests/test_browser_reference_proposal.py', 'sha256': '3abdbc8221cc4609dfef856affdc790f1b4848815049ab8ec34d50b9a6313c07', 'bytes': 3283}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-proposal.json', 'sha256': '6a5ed7a82947ac170e3a051c3f7801ee1a72797fc0d679e78f959fe483255c07', 'bytes': 20093}, 'source_member_index': 8}}}.items():
    V3_REGRESSION_SOURCE_ANCHORS[line].update(anchors)
for line, anchor in {'21.x': {'before': {'path': 'compatibility/rc/consumer-floor-plan.json', 'sha256': '93f50163001b16d9aea5df9fe381bae7518cebbea229896d66ac139ad011327b', 'bytes': 5273}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-source-inputs.json', 'sha256': '5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae', 'bytes': 115478}, 'source_member_index': 4}, 'main': {'before': {'path': 'compatibility/rc/consumer-floor-plan.json', 'sha256': '93f50163001b16d9aea5df9fe381bae7518cebbea229896d66ac139ad011327b', 'bytes': 5273}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-source-inputs.json', 'sha256': '4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c', 'bytes': 115393}, 'source_member_index': 4}}.items():
    V3_REGRESSION_SOURCE_ANCHORS[line]['compatibility/rc/consumer-floor-plan.json'] = anchor
for line, anchor in {'21.x': {'before': {'path': 'scripts/consumer-floor-roster.mjs', 'sha256': 'a715032338cbeb1a51ad72799281c29697cfc1bc4f0d414a26333371d56c2b84', 'bytes': 3317}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-source-inputs.json', 'sha256': '5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae', 'bytes': 115478}, 'source_member_index': 21}, 'main': {'before': {'path': 'scripts/consumer-floor-roster.mjs', 'sha256': 'a715032338cbeb1a51ad72799281c29697cfc1bc4f0d414a26333371d56c2b84', 'bytes': 3317}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-source-inputs.json', 'sha256': '4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c', 'bytes': 115393}, 'source_member_index': 21}}.items():
    V3_REGRESSION_SOURCE_ANCHORS[line]['scripts/consumer-floor-roster.mjs'] = anchor
for line, anchor in {'21.x': {'before': {'path': 'scripts/upstream-chip-lifecycle-admission.mjs', 'sha256': '492d8a39f326e1af47eb0bf04c1c8b6d3505738a2161a1f50ecc34900dde21ab', 'bytes': 13489}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-21-final-compat-v1.json', 'sha256': '5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287', 'bytes': 387987}, 'source_input_index': 690}, 'main': {'before': {'path': 'scripts/upstream-chip-lifecycle-admission.mjs', 'sha256': '492d8a39f326e1af47eb0bf04c1c8b6d3505738a2161a1f50ecc34900dde21ab', 'bytes': 13489}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-main-final-compat-v1.json', 'sha256': 'b2340423afc90abef7c86ec7c748a23e9bcf13be416bc75b3b87fb900a31a090', 'bytes': 346656}, 'source_input_index': 664}}.items():
    V3_REGRESSION_SOURCE_ANCHORS[line]['scripts/upstream-chip-lifecycle-admission.mjs'] = anchor
for line, anchor in {'21.x': {'before': {'path': 'scripts/current-sass-inspection-scope.mjs', 'sha256': '23cb0ecaa69b6e7e606498a59d390a57c83e8e8132d31f59b9f68343121461e4', 'bytes': 17456}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-21-final-compat-v1.json', 'sha256': '5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287', 'bytes': 387987}, 'source_input_index': 211}, 'main': {'before': {'path': 'scripts/current-sass-inspection-scope.mjs', 'sha256': '23cb0ecaa69b6e7e606498a59d390a57c83e8e8132d31f59b9f68343121461e4', 'bytes': 17456}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-main-final-compat-v1.json', 'sha256': 'b2340423afc90abef7c86ec7c748a23e9bcf13be416bc75b3b87fb900a31a090', 'bytes': 346656}, 'source_input_index': 206}}.items():
    V3_REGRESSION_SOURCE_ANCHORS[line]['scripts/current-sass-inspection-scope.mjs'] = anchor
for line, anchors in {'21.x': {'scripts/sass-ordinary-card-gate.mjs': {'before': {'path': 'scripts/sass-ordinary-card-gate.mjs', 'sha256': '39ad6a5a0d0d43748ef14fed2cb716af7f4cd05149c16f287856fbbb01f14633', 'bytes': 24949}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-21-final-compat-v1.json', 'sha256': '5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287', 'bytes': 387987}, 'source_input_index': 545}, 'scripts/sass_ordinary_card_gate.py': {'before': {'path': 'scripts/sass_ordinary_card_gate.py', 'sha256': '979d3a33c0a60ea77240a2614b0b78fa447f737a72052d99916b5330eadfc165', 'bytes': 15552}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-21-final-compat-v1.json', 'sha256': '5bd0e2501e2346c9028e69c7c5397ba58ca9cf600634375dace8802e9d77a287', 'bytes': 387987}, 'source_input_index': 577}}, 'main': {'scripts/sass-ordinary-card-gate.mjs': {'before': {'path': 'scripts/sass-ordinary-card-gate.mjs', 'sha256': '39ad6a5a0d0d43748ef14fed2cb716af7f4cd05149c16f287856fbbb01f14633', 'bytes': 24949}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-main-final-compat-v1.json', 'sha256': 'b2340423afc90abef7c86ec7c748a23e9bcf13be416bc75b3b87fb900a31a090', 'bytes': 346656}, 'source_input_index': 526}, 'scripts/sass_ordinary_card_gate.py': {'before': {'path': 'scripts/sass_ordinary_card_gate.py', 'sha256': '979d3a33c0a60ea77240a2614b0b78fa447f737a72052d99916b5330eadfc165', 'bytes': 15552}, 'packet': {'path': 'compatibility/rc/parent-t14-focused-main-final-compat-v1.json', 'sha256': 'b2340423afc90abef7c86ec7c748a23e9bcf13be416bc75b3b87fb900a31a090', 'bytes': 346656}, 'source_input_index': 560}}}.items():
    V3_REGRESSION_SOURCE_ANCHORS[line].update(anchors)
INPUTS_SHA = '51dd68c4a501f1994e2db726abcac3844b08b27bec7cb076ec079c7193cb5c24'
_IMAGE = Path(__file__).read_bytes()


def _hash(raw):
    return hashlib.sha256(raw).hexdigest()


def _ref(path, raw):
    return dict(path=path, sha256=_hash(raw), bytes=len(raw))


def _plain(value):
    if value is None or type(value) in (str, bool):
        return value
    if type(value) is int:
        assert abs(value) <= 9007199254740991
        return value
    if type(value) is list:
        return [_plain(row) for row in value]
    assert type(value) is dict
    assert all(type(key) is str for key in value)
    return {key: _plain(item) for key, item in value.items()}


def _metadata(value):
    snapshot = _plain(value)
    assert type(snapshot) is dict and type(snapshot['path']) is str
    assert type(snapshot['sha256']) is str and re.fullmatch('[0-9a-f]{64}', snapshot['sha256'])
    if 'bytes' in snapshot:
        assert type(snapshot['bytes']) is int and snapshot['bytes'] >= 0
    return snapshot


def _physical(root, path):
    assert type(path) is str and path and '\\' not in path and '\0' not in path
    assert root.is_dir() and not root.is_symlink()
    cursor = root
    for part in path.split('/'):
        assert part and part not in ('.', '..')
        cursor /= part
        assert not cursor.is_symlink()
    assert cursor.is_file()
    return cursor.read_bytes()


def _matches(raw, ref):
    assert _hash(raw) == ref['sha256']
    if 'bytes' in ref:
        assert type(ref['bytes']) is int and len(raw) == ref['bytes']


def _tool_path(path):
    return type(path) is str and re.fullmatch(r'(?:scripts|tests)/[a-zA-Z0-9_.-]+\.(?:mjs|cjs|py)', path)


# Process-local authenticated immutable Git blobs only; current inputs are never cached.
_GIT_IMAGES = {}


def _git_images(root, requests):
    unique = {}
    for row in requests:
        commit, path = row['commit'], row['path']
        assert type(commit) is str and re.fullmatch('[0-9a-f]{40}', commit)
        assert type(path) is str and path and '..' not in path and '\n' not in path and '\0' not in path and not path.startswith('/')
        unique[(commit, path)] = row
    if not unique:
        return {}
    resolved_root = str(Path(root).resolve(strict=True))
    cached = _GIT_IMAGES.get(resolved_root, {})
    missing = [key for key in unique if key not in cached]
    if missing:
        env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null',
                   GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
        raw = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                       'cat-file', '--batch'], cwd=resolved_root, env=env,
                                      input=('\n'.join(commit + ':' + path for commit, path in missing) + '\n').encode())
        verified, cursor = {}, 0
        for key in missing:
            end = raw.index(b'\n', cursor)
            fields = raw[cursor:end].decode().split(' ')
            assert len(fields) == 3
            blob, kind, length = fields
            assert re.fullmatch('[0-9a-f]{40}', blob) and kind == 'blob' and re.fullmatch(r'(?:0|[1-9][0-9]*)', length)
            size = int(length)
            body = raw[end + 1:end + size + 1]
            assert len(body) == size and raw[end + size + 1] == 10
            assert hashlib.sha1(b'blob ' + str(size).encode() + b'\0' + body).hexdigest() == blob
            verified[key] = body
            cursor = end + size + 2
        assert cursor == len(raw)
        cached.update(verified)
        _GIT_IMAGES[resolved_root] = cached
    return {key: cached[key] for key in unique}


def _edited(before, edits):
    assert type(edits) is list
    parts, cursor = [], 0
    for edit in edits:
        assert set(edit) == {'offset', 'before', 'after'}
        assert type(edit['offset']) is int and edit['offset'] >= cursor
        assert type(edit['before']) is type(edit['after']) is str and edit['before'] != edit['after']
        old, after, offset = edit['before'].encode(), edit['after'].encode(), edit['offset']
        assert before[offset:offset + len(old)] == old
        parts.extend([before[cursor:offset], after])
        cursor = offset + len(old)
    return b''.join([*parts, before[cursor:]])


class CurrentSassToolReferences:
    def __init__(self, root, *, read=None):
        self.root = Path(root).absolute()
        assert self.root.is_dir() and not self.root.is_symlink()
        assert read is None or callable(read)
        self._provided, self._bound, self._rows = read, {}, {}
        assert self._read(SELF) == _IMAGE
        successor = json.loads(self._member(dict(path=INPUTS, sha256=INPUTS_SHA)))
        assert successor['schema_version'] == 3 and successor['role'] == 'finite-current-sass-tool-reference-successor'
        assert successor['previous_epoch'] == V2_INPUTS and successor['product_paths'] == []
        assert successor['historical_programs_executed'] is False and successor['historical_reports_rewritten'] == 0
        assert successor['artifact_or_audit_admission_granted'] is False
        v2_raw = self._member(V2_INPUTS)
        packet = json.loads(v2_raw)
        assert packet['schema_version'] == 2 and packet['role'] == 'finite-current-sass-tool-reference-successor'
        assert packet['previous_epoch'] == PREVIOUS_INPUTS
        previous_raw = self._member(PREVIOUS_INPUTS)
        previous = json.loads(previous_raw)
        assert previous['schema_version'] == 1 and previous['role'] == packet['role']
        assert packet['product_paths'] == [] and packet['historical_programs_executed'] is False
        assert packet['historical_reports_rewritten'] == 0 and packet['artifact_or_audit_admission_granted'] is False
        version = json.loads(self._read('projects/ngx-material-legacy/package.json'))['version']
        self.line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert self.line is not None
        v5_overlays = {}
        if self.line == 'main':
            v5 = json.loads(self._member(V5_INPUTS))
            assert v5['schema_version'] == 5 and v5['role'] == successor['role'] and v5['previous_epoch'] == V4_INPUTS
            assert v5['source_parent'] == V5_PARENT and v5['source_commit'] == V5_COMMIT and v5['product_paths'] == []
            assert v5['historical_programs_executed'] is False and v5['historical_reports_rewritten'] == 0 and v5['artifact_or_audit_admission_granted'] is False
            assert [u['path'] for u in v5['updates']] == V5_PATHS
            assert len(v5['additional_inputs']) == 1 and v5['additional_inputs'][0]['path'] == 'compatibility/rc/fixed-report-catalog.json'
            env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
            ancestry = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'rev-list', '--parents', '-n', '1', V5_COMMIT], cwd=self.root, env=env, text=True).strip()
            assert ancestry == V5_COMMIT + ' ' + V5_PARENT, 'V5 source commit has unexpected parent'
            requests = [dict(commit=commit, path=u['path']) for u in v5['updates'] for commit in (V5_PARENT, V5_COMMIT)]
            assert [u['path'] for u in v5['authored_updates']] == ['tests/test_current_sass_tool_references.py', 'tests/current_sass_tool_reference_probe.mjs', 'scripts/current-native-tab-downstream-source.mjs']
            requests.extend(dict(commit=V5_COMMIT, path=u['path']) for u in v5['authored_updates'])
            requests.append(dict(commit=V5_COMMIT, path=v5['additional_inputs'][0]['path']))
            images = _git_images(self.root, requests)
            for update in v5['updates']:
                path = update['path']
                assert set(update) == {'path', 'before', 'after', 'edits'} and update['before']['path'] == update['after']['path'] == path
                before = images[(V5_PARENT, path)]
                _matches(before, update['before'])
                after = _edited(before, update['edits'])
                _matches(after, update['after'])
                assert after == images[(V5_COMMIT, path)] and self._member(update['after']) == after
                v5_overlays[path] = (update, before, after)
            for update in v5['authored_updates']:
                path = update['path']
                assert set(update) == {'path', 'before', 'after', 'edits'} and update['before']['path'] == update['after']['path'] == path
                before = images[(V5_COMMIT, path)]
                _matches(before, update['before'])
                after = _edited(before, update['edits'])
                _matches(after, update['after'])
                assert self._member(update['after']) == after
                v5_overlays[path] = (update, before, after)
            assert len(v5['authored_support']) == 1 and v5['authored_support'][0]['path'] == 'compatibility/rc/current-native-tab-downstream-source-epochs-v5.json'
            self._member(v5['authored_support'][0])
            ref = v5['additional_inputs'][0]
            assert self._member(ref) == images[(V5_COMMIT, ref['path'])]

        # Historical comparison bytes are never returned by the physical reader.
        def v4_comparison(ref):
            overlay = v5_overlays.get(ref['path'])
            if overlay is None:
                return self._member(ref)
            update, before, after = overlay
            assert _metadata(ref) == update['before'], 'unknown V4 comparison identity'
            assert self._member(update['after']) == after
            return before

        v4_overlays = {}
        if self.line == 'main':
            v4 = json.loads(self._member(V4_INPUTS))
            assert v4['schema_version'] == 4 and v4['role'] == successor['role']
            assert v4['source_parent'] == V4_PARENT
            assert v4['previous_epoch'] == dict(path=INPUTS, sha256=INPUTS_SHA, bytes=len(self._read(INPUTS)))
            assert v4['product_paths'] == [] and v4['historical_programs_executed'] is False
            assert v4['historical_reports_rewritten'] == 0 and v4['artifact_or_audit_admission_granted'] is False
            assert sorted(row['path'] for row in v4['updates']) == sorted(V4_COMMITS)
            requests = [dict(commit=V4_PARENT, path=row['path']) for row in v4['updates']]
            requests += [dict(commit=row['source_commit'], path=row['path']) for row in v4['updates'] if row['source_commit'] != 'authored']
            images = _git_images(self.root, requests)
            for update in v4['updates']:
                path = update['path']
                assert set(update) == {'path', 'before', 'after', 'edits', 'source_commit'}
                assert update['source_commit'] == V4_COMMITS[path]
                assert update['before']['path'] == update['after']['path'] == path
                before = images[(V4_PARENT, path)]
                _matches(before, update['before'])
                after = _edited(before, update['edits'])
                _matches(after, update['after'])
                if update['source_commit'] != 'authored':
                    assert images[(update['source_commit'], path)] == after
                assert v4_comparison(update['after']) == after
                v4_overlays[path] = (update, before, after)
            browser = json.loads(self._member(dict(path='compatibility/rc/c04-browser-owner-inputs.json', sha256='d22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb', bytes=15192)))
            audit = next(row for row in v4['updates'] if row['path'] == 'scripts/check-upstream-audit-disposition.mjs')
            assert next(ref for ref in browser['source_members'] if ref['path'] == audit['path']) == audit['before']
            for receipt in v4['receipts']:
                self._member(receipt)
            native = json.loads(self._member(v4['receipts'][4]))
            assert native['role'] == 'main-native-tab-source-composition-qualification'
            assert native['source_parent'] == '70fecd1e31cb0e2a881b3b3e803fae3fcbddefde'
            assert native['sources'][0] == next(row['after'] for row in v4['updates'] if row['path'] == 'scripts/remaining-native-tab-lifecycle-review.mjs')
            assert native['archive'] == v4['receipts'][5]
            for ref in native['sources']:
                v4_comparison(ref)
            inventory = json.loads(self._member(v4['receipts'][6]))
            assert inventory['role'] == 'main-nine-spec-inventory-source-qualification'
            assert inventory['source_parent'] == '70fecd1e31cb0e2a881b3b3e803fae3fcbddefde'
            assert inventory['archive'] == v4['receipts'][7]
            for ref in inventory['sources']:
                update = next ( (row for row in v4['updates'] if row['path'] == ref['path']), None)
                if update is not None:
                    assert update['after'] == ref
                v4_comparison(ref)

        def v3_member(ref):
            overlay = v4_overlays.get(ref['path'])
            if overlay is None:
                return v4_comparison(ref)
            update, before, after = overlay
            assert _metadata(ref) == update['before'], 'unknown V3 predecessor identity'
            assert v4_comparison(update['after']) == after
            return before

        branch = packet['branches'][self.line]
        prior_branch = previous['branches'][self.line]
        next_branch = successor['branches'][self.line]
        assert next_branch['source_parent'] == V3_CHECKPOINTS[self.line]
        assert v2_raw == _git_images(self.root, [dict(commit=V3_CHECKPOINTS[self.line], path=V2_INPUTS['path'])])[(V3_CHECKPOINTS[self.line], V2_INPUTS['path'])]
        assert len({row['path'] for row in next_branch['updates']}) == len(next_branch['updates'])
        assert len({row['path'] for row in next_branch['additional_inputs']}) == len(next_branch['additional_inputs'])
        successor_images = _git_images(self.root, [dict(commit=V3_CHECKPOINTS[self.line], path=row['path']) for row in next_branch['updates']])
        overlays = {}
        for update in next_branch['updates']:
            path = update['path']
            assert set(update) == {'path', 'before', 'after', 'edits'}
            assert (_tool_path(path) or path == 'compatibility/rc/consumer-floor-plan.json') and path not in (SELF, 'scripts/current-sass-tool-references.mjs')
            assert update['before']['path'] == update['after']['path'] == path
            assert type(update['before']['bytes']) is int and type(update['after']['bytes']) is int
            before = successor_images[(V3_CHECKPOINTS[self.line], path)]
            _matches(before, update['before'])
            after = _edited(before, update['edits'])
            _matches(after, update['after'])
            assert v3_member(update['after']) == after
            overlays[path] = (update, before, after)

        def v2_member(ref):
            overlay = overlays.get(ref['path'])
            if overlay is None:
                return v3_member(ref)
            update, before, after = overlay
            assert {key: ref[key] for key in ('path', 'sha256', 'bytes')} == update['before'], 'unknown V2 predecessor identity'
            assert v3_member(update['after']) == after
            return before

        assert branch['previous_epoch_source_parent'] == CHECKPOINTS[self.line]
        assert branch['historical_registry'] == prior_branch['historical_registry']
        assert branch['intermediate_inputs'] == prior_branch['intermediate_inputs']
        previous_git = _git_images(self.root, [dict(commit=CHECKPOINTS[self.line], path=PREVIOUS_INPUTS['path'])])[(CHECKPOINTS[self.line], PREVIOUS_INPUTS['path'])]
        assert previous_raw == previous_git, 'V1 epoch differs from committed comparison data'
        assert len({r['path'] for r in branch['updates']}) == len(branch['updates'])
        assert len({r['path'] for r in branch['additional_inputs']}) == len(branch['additional_inputs'])
        archived = branch['historical_registry']
        registry = _git_images(self.root, [dict(commit=archived['source_parent'], path=archived['path'])])[(archived['source_parent'], archived['path'])]
        _matches(registry, archived)
        assert v3_member(archived) == registry
        historical = json.loads(registry)
        assert historical['line'] == self.line and historical['extension_kind'] == 'spinner-snack-c04-source'
        assert historical['gate_tool_successor'] and len(historical['tool_transitions']) == (45 if self.line == '21.x' else 17)
        assert historical['canonical_dispositions_changed'] == historical['product_changes'] == 0
        assert historical['old_programs_executed'] is False and historical['g11_claim'] == 'not-passed'
        requests = [dict(commit=r.get('source_parent', historical['source_parent']), path=r['path']) for r in historical['tool_transitions']]
        requests += [dict(commit=r['source_parent'], path=r['path']) for r in branch['intermediate_inputs']]
        requests += [dict(commit=r.get('source_parent', archived['source_parent']), path=r['path']) for r in branch['updates']]
        requests += [dict(commit=CHECKPOINTS[self.line], path=r['path']) for r in prior_branch['updates']]
        for old in prior_branch['updates']:
            latest = next((r for r in branch['updates'] if r['path'] == old['path']), None)
            assert latest is not None, 'missing V1 current tool ' + old['path']
            assert latest['before'] == old['before']
            assert latest.get('source_parent', archived['source_parent']) == archived['source_parent']
        images = _git_images(self.root, requests)
        for source in historical['tool_transitions']:
            path = source['path']
            assert _tool_path(path) and path not in self._rows
            before = images[(source.get('source_parent', historical['source_parent']), path)]
            _matches(before, source['before'])
            after = before.decode()
            assert source['literal_edits']
            for edit in source['literal_edits']:
                assert after.count(edit['before']) == 1
                after = after.replace(edit['before'], edit['after'])
            row = dict(path=path, before=dict(source['before']), after=dict(source['after']), identities={})
            self._add(row, source['before'], before)
            self._add(row, source['after'], after.encode())
            self._rows[path] = row
        support = {row['path']: row for row in historical['support_inputs']}
        for update in branch['updates']:
            path = update['path']
            assert _tool_path(path)
            parent = update.get('source_parent', archived['source_parent'])
            assert parent in (archived['source_parent'], CHECKPOINTS[self.line])
            before = images[(parent, path)]
            _matches(before, update['before'])
            row = self._rows.get(path)
            if row is not None:
                assert update['before'] == dict(path=path, **row['after'])
            elif path in support:
                assert update['before'] == support[path]
            after = _edited(before, update['edits'])
            _matches(after, update['after'])
            assert v2_member(update['after']) == after
            if row is None:
                row = dict(path=path, before=dict(sha256=update['before']['sha256'], bytes=update['before']['bytes']), identities={})
            self._add(row, update['before'], before)
            self._add(row, update['after'], after)
            row['after'] = dict(sha256=update['after']['sha256'], bytes=update['after']['bytes'])
            self._rows[path] = row
        # Latest rows must exist before registering V1 current/intermediate identities.
        for source in branch['intermediate_inputs']:
            self._add(self._rows[source['path']], source, images[(source['source_parent'], source['path'])])
        for source in prior_branch['updates']:
            self._add(self._rows[source['path']], source['after'], images[(CHECKPOINTS[self.line], source['path'])])
        v2_member(historical['unchanged_source_subject'])
        for ref in historical['support_inputs']:
            if not any(row['path'] == ref['path'] for row in branch['updates']):
                v2_member(ref)
        for ref in branch['additional_inputs']:
            assert _tool_path(ref['path']) or ref['path'].startswith('compatibility/rc/')
            v2_member(ref)
        for path, (update, before, after) in overlays.items():
            row = self._rows.get(path)
            if row is not None:
                assert update['before'] == dict(path=path, **row['after']), 'V3 overlay does not follow exact V2 current row'
            else:
                assert self.line == '21.x' or path == 'scripts/historical-contract-repair-source.mjs' or path in V3_REGRESSION_SOURCE_ANCHORS[self.line], 'unknown non-21.x V3 new-row path'
                finite_before = {
                    'scripts/upstream-base-class-removal-admission.cjs': dict(path=path, sha256='013cbe4ae44ebebcf8331d2aedca972f15c824dd4e61bc795f0efa188d35b69a', bytes=14322),
                    'scripts/historical-contract-repair-source.mjs': dict(path=path, sha256='d4870c2cc12609da71b03c1745996693dd26444b2dfd848260cfda1ac3514da5', bytes=13052),
                    'scripts/legacy-removal-canonical-stage.mjs': dict(path=path, sha256='9b5021340fcab66f2c2b45447b5162f0e25b002b45c7ea7c062c8087dfb80d6c', bytes=8412),
                    'tests/test_packed_upstream_ledger_epoch.py': dict(path=path, sha256='f7b3ae0ede9bd62fb033c49017a84d5b4ca81ce8b7920d72a105b1df1393e6df', bytes=17868),
                    'scripts/browser-reference-source.mjs': dict(path=path, sha256='59f2ac538149e0d9b2176c231a97147862881fb19b46768a5a4e450d66f9fe38', bytes=10443),
                    'tests/checker_reference_source_probe.mjs': dict(path=path, sha256='d15e169d07033f25f089c2f50d78aa77f924879256674431d9c1cfa20660fe47', bytes=17054),
                    'scripts/table-local-compilation-canonical-stage.mjs': dict(path=path, sha256='bdb3137f6db42ed2611ac3a41e400478defed7f0076d203061d1e12d03f63b7c', bytes=8231),
                    'scripts/legacy-removal-owner-source.mjs': dict(path=path, sha256='b88708bb7ed441e24c6ed623371330426d6a947df83452ca343487767d2c9122', bytes=6628),
                    'scripts/browser-owner-source.mjs': dict(path=path, sha256='f3eed08c7bc7d385a53ba2cabfeb35e4656e7f41871fab08b685104b1f0f84ad', bytes=6019),
                    'scripts/checker-owner-source.mjs': dict(path=path, sha256='0788290595d4c776ae958ebf8e0c110b281c3840f349d1be93b7e5b988a3567c', bytes=5220),
                    'scripts/checker-reference-proposal.mjs': dict(path=path, sha256='22c49ba434ee0b1253ad2815b77510adb8259cc3f307005f6b66b73e522502ac', bytes=13095),
                    'tests/browser_reference_owner_probe.mjs': dict(path=path, sha256='4f5d024bfd072129ec819374131795fb3d77e3e6e419d5d1617eade28ff25463', bytes=13406),
                    'tests/test_browser_reference_owner.py': dict(path=path, sha256='ffa0cb70dddc77825e971788b271a6caf6c3ad126f65c41e6b53d321fba50e64', bytes=4074),
                }
                finite_before.update({key: anchor['before'] for key, anchor in V3_REGRESSION_SOURCE_ANCHORS[self.line].items()})
                assert path in finite_before, 'unknown V3 new-row path'
                assert update['before'] == finite_before[path]
                if path == 'scripts/historical-contract-repair-source.mjs':
                    assert update['before'] == historical['unchanged_source_subject'], 'historical repair overlay must follow the immutable source identity'
                anchor = V3_REGRESSION_SOURCE_ANCHORS[self.line].get(path) or V3_SOURCE_ANCHORS.get(path)
                if anchor is not None:
                    anchor_packet = json.loads(v3_member(anchor['packet']))
                    expected = anchor_packet['source_inputs'][anchor['source_input_index']] if 'source_input_index' in anchor else (anchor_packet['source_members'][anchor['source_member_index']] if 'source_member_index' in anchor else (anchor_packet[anchor['member_key']] if 'member_key' in anchor else anchor_packet['code_transitions'][anchor['transition_index']]['after']))
                    assert expected == update['before'], 'V3 new source row differs from immutable owner anchor'
                row = dict(path=path, before=dict(sha256=update['before']['sha256'], bytes=update['before']['bytes']), identities={})
                self._rows[path] = row
            self._add(row, update['before'], before)
            self._add(row, update['after'], after)
            row['after'] = dict(sha256=update['after']['sha256'], bytes=update['after']['bytes'])
        for ref in next_branch['additional_inputs']:
            assert _tool_path(ref['path']) or ref['path'].startswith('compatibility/rc/')
            assert ref['path'] not in (SELF, 'scripts/current-sass-tool-references.mjs')
            v3_member(ref)
        for update, before, after in v4_overlays.values():
            path = update['path']
            row = self._rows.get(path)
            if row is not None:
                assert update['before'] == dict(path=path, **row['after']), 'V4 overlay does not follow exact V3 current row'
            else:
                assert update['before'] in next_branch['additional_inputs'] or path == 'scripts/check-upstream-audit-disposition.mjs', 'unknown V4 predecessor'
                row = dict(path=path, before=dict(sha256=update['before']['sha256'], bytes=update['before']['bytes']), identities={})
                self._rows[path] = row
            self._add(row, update['before'], before)
            self._add(row, update['after'], after)
            row['after'] = dict(sha256=update['after']['sha256'], bytes=update['after']['bytes'])
        for update, before, after in v5_overlays.values():
            path = update['path']
            row = self._rows.get(path)
            if row is not None:
                assert update['before'] == dict(path=path, **row['after']), 'V5 overlay does not follow exact V4 current row'
            else:
                if path == 'scripts/current-native-tab-downstream-source.mjs':
                    assert update['before'] == dict(path=path, sha256='86e46cca50f8c3658cfaf12bdd94f0475452ce8e5e1f4da35d953f81e72f21fa', bytes=12850)
                else:
                    assert path == 'scripts/packed-consumer-evidence.mjs'
                row = dict(path=path, before=dict(sha256=update['before']['sha256'], bytes=update['before']['bytes']), identities={})
                self._rows[path] = row
            self._add(row, update['before'], before)
            self._add(row, update['after'], after)
            row['after'] = dict(sha256=update['after']['sha256'], bytes=update['after']['bytes'])
        for row in self._rows.values():
            self._member(dict(path=row['path'], **row['after']))
        self.epoch = 5 if self.line == 'main' else 3
        self.assert_current()

    def _add(self, row, ref, raw):
        _matches(raw, ref)
        if ref['sha256'] in row['identities']:
            assert row['identities'][ref['sha256']] == raw
        row['identities'][ref['sha256']] = raw

    def _read(self, path):
        raw = _physical(self.root, path)
        ref = _ref(path, raw)
        if path in self._bound:
            assert self._bound[path] == ref
        else:
            self._bound[path] = ref
        if self._provided is not None:
            provided = self._provided(path)
            assert type(provided) is bytes and provided == raw
        assert _physical(self.root, path) == raw
        return raw

    def _member(self, ref):
        raw = self._read(ref['path'])
        _matches(raw, ref)
        return raw

    def _assert_physical(self):
        for ref in self._bound.values():
            assert _ref(ref['path'], _physical(self.root, ref['path'])) == ref

    @property
    def bound(self):
        return copy.deepcopy(list(self._bound.values()))

    @property
    def transitions(self):
        return [dict(path=row['path'], before=dict(row['before']), after=dict(row['after'])) for row in self._rows.values()]

    def assert_current(self):
        for ref in list(self._bound.values()):
            self._member(ref)
        self._assert_physical()

    def owns_reference(self, incoming):
        try:
            ref = _metadata(incoming)
            row = self._rows.get(ref['path'])
            raw = None if row is None else row['identities'].get(ref['sha256'])
            return raw is not None and ('bytes' not in ref or ref['bytes'] == len(raw))
        except (AssertionError, KeyError, TypeError, ValueError):
            return False

    def _side(self, incoming, target):
        snapshot = _metadata(incoming)
        row = self._rows.get(snapshot['path'])
        if row is None or snapshot['sha256'] not in row['identities']:
            return None
        _matches(row['identities'][snapshot['sha256']], snapshot)
        self._member(dict(path=row['path'], **row['after']))
        result = {**snapshot, 'sha256': row[target]['sha256'], **({'bytes': row[target]['bytes']} if 'bytes' in snapshot else {})}
        assert _metadata(incoming) == snapshot
        self._assert_physical()
        return result

    def qualify(self, ref):
        return self._side(ref, 'after')

    def predecessor_reference(self, ref):
        return self._side(ref, 'before')

    def comparison_bytes(self, incoming):
        snapshot = _metadata(incoming)
        row = self._rows[snapshot['path']]
        raw = row['identities'][snapshot['sha256']]
        _matches(raw, snapshot)
        self._member(dict(path=row['path'], **row['after']))
        assert _metadata(incoming) == snapshot
        self._assert_physical()
        return raw
