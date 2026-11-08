# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent finite current tool references; historical programs remain data."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import stat
import functools
import threading
import sys
from contextlib import contextmanager

DOMAIN_PACKET = dict(path='compatibility/rc/current-tool-domain-source-successor-v1.json', sha256='8995184d9e73a6a9aaaebd4c17df00913f12f59ba19a8b1ef3c639777d32d18b', bytes=158538)
CHECKER_PACKET = dict(path='compatibility/rc/current-tool-checker-source-successor-v1.json', sha256='f295a815a7723fba08656833fe4b2796fd9ce6e126ee2a245c54dc96bdded517', bytes=9056)
MATRIX_OWNER = dict(path='scripts/current_tool_matrix_source.py', sha256='8ec79d30626ed3c5a3bee9b654e1a8a27701e2d77b73ec5875b1714bc6b42341', bytes=26609)
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


# Module aliases share closure-owned transaction state within this interpreter.
def _new_tool_registry():
    roots = {}
    lock = threading.RLock()
    @contextmanager
    def transaction(root):
        key = os.path.realpath(root)
        with lock:
            active = roots.get(key)
            if active is not None:
                active['poisoned'] = True
                raise RuntimeError('reentrant current tool root transaction')
            state = {'poisoned': False}
            roots[key] = state
        try:
            yield
            if state['poisoned']:
                raise RuntimeError('reentrant current tool root transaction')
        finally:
            with lock:
                del roots[key]
    def check(root):
        with lock:
            state = roots.get(os.path.realpath(root))
            if state is None or state['poisoned']:
                raise RuntimeError('reentrant current tool root transaction')
    return transaction, check

_registry_key = '_ngx_compat_material_legacy_current_tool_root_transactions_v1'
_registry = sys.modules.setdefault(_registry_key, _new_tool_registry())
if type(_registry) is not tuple or len(_registry) != 2 or not all(callable(item) for item in _registry):
    raise RuntimeError('invalid current tool root registry')
_tool_transaction, _check_tool_transaction = _registry

def _public_tool_method(fn):
    @functools.wraps(fn)
    def wrapped(self, *args, **kwargs):
        with _tool_transaction(self.root):
            return fn(self, *args, **kwargs)
    return wrapped

class CurrentSassToolReferences:
    def __init__(self, root, *, read=None):
        if not __debug__:
            raise RuntimeError('current tool source guards require Python assertions enabled')
        with _tool_transaction(root):
            if read is None:
                self._construct(root)
            else:
                self._construct(root)
                frame = self._snapshot_frame()
                self._construct(root, read=read, prebound=frame)

    def _construct(self, root, *, read=None, prebound=None):
        if not __debug__:
            raise RuntimeError('current tool source guards require Python assertions enabled')
        self.root = Path(root).absolute()
        assert self.root.is_dir() and not self.root.is_symlink()
        assert read is None or callable(read)
        self._provided, self._bound, self._rows = read, ({} if prebound is None else prebound[0]), {}
        self._prebound = prebound is not None
        frame_images = {} if prebound is None else prebound[1]
        scratch = bytearray(1)
        def bind_image(path, raw):
            assert type(raw) is bytes, 'nonphysical current tool image ' + path
            if path in frame_images:
                assert frame_images[path] == raw, 'changed current tool image ' + path
            else:
                assert not self._prebound, 'unbound current tool input ' + path
                frame_images[path] = raw
        def sweep_physical():
            nonlocal scratch
            root_stat = os.lstat(self.root)
            assert stat.S_ISDIR(root_stat.st_mode) and not stat.S_ISLNK(root_stat.st_mode)
            checked = set()
            for relative, image in frame_images.items():
                assert type(image) is bytes, 'invalid current tool image ' + relative
                assert type(relative) is str and relative and '\\' not in relative and '\x00' not in relative, repr(relative)
                parts = relative.split('/')
                assert all(part and part not in ('.', '..') for part in parts)
                cursor = self.root
                for part in parts[:-1]:
                    cursor = cursor / part
                    if cursor in checked: continue
                    mode = os.lstat(cursor).st_mode
                    assert stat.S_ISDIR(mode) and not stat.S_ISLNK(mode), 'invalid current tool directory ' + relative
                    checked.add(cursor)
                path = cursor / parts[-1]
                mode = os.lstat(path).st_mode
                assert stat.S_ISREG(mode) and not stat.S_ISLNK(mode), 'invalid current tool member ' + relative
                if len(scratch) < len(image): scratch = bytearray(len(image))
                fd = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_BINARY', 0))
                try:
                    current = os.fstat(fd)
                    assert stat.S_ISREG(current.st_mode) and current.st_size == len(image), 'late physical current tool input ' + relative
                    pos = 0
                    while pos < len(image):
                        if hasattr(os, 'readv'):
                            count = os.readv(fd, [memoryview(scratch)[pos:len(image)]])
                        else:
                            part = os.read(fd, len(image) - pos); count = len(part); scratch[pos:pos+count] = part
                        assert count > 0, 'short current tool input ' + relative
                        pos += count
                    assert (scratch == image if len(scratch) == len(image) else bytes(memoryview(scratch)[:len(image)]) == image), 'late physical current tool input ' + relative
                    assert not os.read(fd, 1), 'extra current tool input ' + relative
                    current = os.fstat(fd)
                    assert stat.S_ISREG(current.st_mode) and current.st_size == len(image), 'late physical current tool input ' + relative
                finally:
                    os.close(fd)
        self._bind_image = bind_image
        self._sweep_physical = sweep_physical
        self._snapshot_frame = lambda: (copy.deepcopy(self._bound), frame_images.copy())
        package_path = 'projects/ngx-material-legacy/package.json'
        package_image = _physical(self.root, package_path)
        version = json.loads(package_image)['version']
        self.line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert self.line is not None
        planner_before = None
        planner_old = dict(path='scripts/canonical-source-guard-plan.mjs', sha256='4f632a3fe97975804edf5b89c1cc5abadc002ef78fe16c3a40edbadde460fc9f', bytes=4609)
        planner_current = dict(path=planner_old['path'], sha256='3a3663ce06af2107f55c410fff458100a808593fa9a968e18a94d8490c7fc664', bytes=5014)
        if self.line == 'main':
            _matches(_physical(self.root, planner_old['path']), planner_current)
            assert self._read(package_path) == package_image
            plan = json.loads(self._member(dict(path='compatibility/rc/current-tool-planner-source-successor-v1.json', sha256='7a986f7e700c45cc7137432e0573705f6aed6245c3963e9aa8953f93f8eec7fb', bytes=1162)))
            parent, commit = '2fbecd1b2687e26515c205cbd5c0024e9474b4b8', '8baa761eca624c9d71293c3d31750a2b3fdeebf0'
            assert plan['schema_version'] == 1 and plan['role'] == 'current-tool-planner-source-successor' and plan['source_parent'] == parent and plan['source_commit'] == commit and plan['historical_programs_executed'] is False
            assert plan['before'] == planner_old and plan['after'] == planner_current
            env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
            ancestry = subprocess.check_output(['git', '--no-replace-objects', 'rev-list', '--parents', '-n', '1', commit], cwd=self.root, env=env, text=True).strip()
            assert ancestry == commit + ' ' + parent
            images = _git_images(self.root, [dict(commit=c, path=planner_old['path']) for c in (parent, commit)])
            planner_before = images[(parent, planner_old['path'])]
            _matches(planner_before, planner_old)
            after = _edited(planner_before, plan['edits'])
            _matches(after, planner_current)
            assert after == images[(commit, planner_old['path'])] and self._member(planner_current) == after
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
        assert self._read(package_path) == package_image
        domain_overlays = {}
        self._matrix_owner = None
        if self.line == 'main':
            owner_raw = _physical(self.root, MATRIX_OWNER['path']); _matches(owner_raw, MATRIX_OWNER)
            local_path = Path(__file__).with_name('current_tool_matrix_source.py'); local_raw = local_path.read_bytes(); _matches(local_raw, MATRIX_OWNER)
            spec = importlib.util.spec_from_file_location('_current_tool_matrix_source_guard', local_path)
            if spec is None or spec.loader is None: raise RuntimeError('missing current matrix source loader')
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
            assert module._IMAGE == local_raw and self._member(MATRIX_OWNER) == owner_raw
            self._matrix_owner = module.CurrentToolMatrixSource(self.root, read=self._read)
            domain = json.loads(self._member(DOMAIN_PACKET))
            assert domain['schema_version'] == 1 and domain['role'] == 'current-tool-domain-source-successor' and domain['line'] == 'main'
            assert domain['source_scope_only'] is True and domain['historical_programs_executed'] is False and domain['artifact_or_audit_admission_granted'] is False
            assert domain['domain_counts'] == {'Sass gate and source-authentication frame':10, 'Sass graph, focus infrastructure and seal frame':14, 'sandboxed browser launcher cells':1, 'stepper peer-output and historical-model source':5}
            assert len(domain['updates']) == len({row['path'] for row in domain['updates']}) == 30 and len(domain['supports']) == 7
            sass_review, domain_review, browser_review, density_v1, density_v2, domain_executable, stepper = [json.loads(self._member(ref)) for ref in domain['supports']]
            assert sass_review['line'] == 'main' and sass_review['source_parent'] == '2fbecd1b2687e26515c205cbd5c0024e9474b4b8' and sass_review['actual_full_sass_pass'] is False and sass_review['g11_claim'] == 'not-passed'
            assert domain_review['parent'] == '5f93a4dd74f3fc58a529ce9999abc3143405c300' and browser_review['parent'] == 'fdcdadee28c4552e3500b5099de9f42e456adb5c'
            assert density_v1['role'] == 'main-ordinary-density-exact-source-successor' and density_v2['line'] == domain_executable['line'] == stepper['line'] == 'main'
            assert stepper['focused_tests']['count'] == 11 and stepper['focused_tests']['result'] == 'pass' and stepper['artifact_or_audit_admission_granted'] is False
            parents = {'33d7d9e31fd96cbfa6c4e1f592c0bade985c0878':'dfa4dfe18a17a117aaae3af1a8089f4615840cb0', '8baa761eca624c9d71293c3d31750a2b3fdeebf0':'2fbecd1b2687e26515c205cbd5c0024e9474b4b8', '19ee6343365c391deb97362caec413b113665e1b':'5f93a4dd74f3fc58a529ce9999abc3143405c300', '8e9e7316806fe9266373865b0784e9917659e5e8':'fdcdadee28c4552e3500b5099de9f42e456adb5c'}
            env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
            for commit, parent in parents.items():
                assert subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',commit],cwd=self.root,env=env,text=True).strip() == commit + ' ' + parent
            requests = [dict(commit=commit,path=row['path']) for row in domain['updates'] for step in row['steps'] for commit in (step['parent'],step['commit'])]
            images = _git_images(self.root, requests)
            for row in domain['updates']:
                path = row['path']; assert _tool_path(path) and row['before']['path'] == row['after']['path'] == path and 1 <= len(row['steps']) <= 2
                expected, prior, identities = row['before'], None, []
                for step in row['steps']:
                    assert parents.get(step['commit']) == step['parent'] and step['before'] == dict(sha256=expected['sha256'],bytes=expected['bytes'])
                    old = images[(step['parent'],path)]; after = _edited(old,step['edits']); _matches(old,step['before']); _matches(after,step['after'])
                    assert after == images[(step['commit'],path)] and (prior is None or prior == old)
                    identities.extend([(dict(path=path,**step['before']),old),(dict(path=path,**step['after']),after)])
                    prior, expected = after, dict(path=path,**step['after'])
                    if step['commit'] == '8baa761eca624c9d71293c3d31750a2b3fdeebf0': assert path in sass_review['patch']['paths']
                assert expected == row['after'] and self._member(row['after']) == prior
                if row['domain'] == 'Sass graph, focus infrastructure and seal frame':
                    found = [x for x in domain_review['afterimages_verified'] if x['path'] == path]; assert len(found) == 1 and found[0]['sha256'] == row['after']['sha256'] and found[0]['bytes'] == row['after']['bytes']
                elif row['domain'] == 'Sass gate and source-authentication frame': assert path in sass_review['patch']['paths']
                elif row['domain'] == 'sandboxed browser launcher cells':
                    found = [x for x in browser_review['sources'] if x['path'] == path]; assert len(found) == 1 and found[0]['before_sha256'] == row['before']['sha256'] and found[0]['after_sha256'] == row['after']['sha256']
                elif row['domain'] == 'stepper peer-output and historical-model source':
                    found = [x for x in stepper['paths'] if x['path'] == path]; assert len(found) == 1 and found[0]['before'] == row['before'] and found[0]['after'] == row['after']
                else: raise AssertionError('unknown current tool domain')
                domain_overlays[path] = (row, identities)
            checker = json.loads(self._member(CHECKER_PACKET))
            assert checker['schema_version'] == 1 and checker['role'] == 'current-tool-individual-checker-source-successor' and checker['line'] == 'main' and checker['source_scope_only'] is True and checker['historical_programs_executed'] is False and checker['artifact_or_audit_admission_granted'] is False
            checker_path = 'scripts/check-upstream-audit-disposition.mjs'; checker_commits=['8647ee8a69167ae432313bda47e502f2416c450d','6c5d7a2ba37204074d7d212f8e839621d2a4988d','547abe83d86c4682a173a6e01d2c783b6bb1d855']
            assert checker['before']['path'] == checker['after']['path'] == checker_path and len(checker['steps']) == 3 and len(checker['supports']) == 7
            reviews = [json.loads(self._member(ref)) for ref in checker['supports']]
            ids = ['1dcc195853a74d1e0b724b742673eb5fd744cb67','1de6a3aa37118e4153fb995a8c8f4daecdf6d0b5','4d0a3eff7c5d5186516fe5c8f1af8c003d02882d','6962c858378b52e0a90f7e2cada0f71c297840ed','ef14c286986f9451addeada26ab7b51402aa143f']
            for review, sha in zip(reviews[:5], ids): assert review['sha'] == sha and review['review_depth'] == 'individual-compatibility' and type(review['decision']) is str and bool(review['decision'])
            assert reviews[5]['parent'] == '107ccae1864dc4cbc56c4af1b8e70983a1fe947f' and reviews[6]['parent'] == '4c29be143432bcb5b2ca99d4f83ca6ff162b4554'
            images = _git_images(self.root, [dict(commit=c,path=checker_path) for step in checker['steps'] for c in (step['parent'],step['commit'])])
            expected, prior, identities = checker['before'], None, []
            for index, step in enumerate(checker['steps']):
                assert step['commit'] == checker_commits[index] and subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',step['commit']],cwd=self.root,env=env,text=True).strip() == step['commit'] + ' ' + step['parent']
                assert step['before'] == dict(sha256=expected['sha256'],bytes=expected['bytes'])
                old = images[(step['parent'],checker_path)]; after = _edited(old,step['edits']); _matches(old,step['before']); _matches(after,step['after'])
                assert after == images[(step['commit'],checker_path)] and (prior is None or prior == old)
                identities.extend([(dict(path=checker_path,**step['before']),old),(dict(path=checker_path,**step['after']),after)]); expected, prior = dict(path=checker_path,**step['after']), after
            # Replay the live coordinator checker separately from the committed
            # predecessor; this binds source bytes and grants no audit result.
            epoch = json.loads(self._member(dict(path='compatibility/rc/current-tool-ledger-source-epoch-21-successor-v1.json',sha256='1bc33b626f1cdd75ade57bb4b9c6370df0a775b2a40e39f84d46894653919f31',bytes=10511)))
            assert epoch['schema_version']==1 and epoch['role']=='current-tool-ledger-source-epoch-21-successor' and epoch['source_only'] is True and epoch['historical_programs_executed'] is False and epoch['artifact_or_audit_admission_granted'] is False and epoch['g11_claim']=='not-passed'
            assert epoch['before']==dict(path='scripts/inventory-reference-live-source-epoch.mjs',sha256='3836c4358edc6c5a15d0578f5df06b19beed563fbd4b094d694cfa9e5cc1175e',bytes=18156)
            assert epoch['after']==dict(path=epoch['before']['path'],sha256='bbb222bf919e88e294f70d4d1b94caa1934a8a0e36303fd6a42d08e0197bc6bc',bytes=24685)
            old_epoch=self._member(epoch['archive']); _matches(old_epoch,epoch['before']); new_epoch=_edited(old_epoch,epoch['edits']); _matches(new_epoch,epoch['after']); assert self._member(epoch['after'])==new_epoch
            assert epoch['source_commit']=='252689f364aee65c5d755d4b16e91987f6e305a5' and epoch['source_parent']=='862f511840c7bbeb81236ac6d74ba1a8a2d5f7a7'
            assert subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',epoch['source_commit']],cwd=self.root,env=env,text=True).strip()==epoch['source_commit']+' '+epoch['source_parent']
            subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',epoch['source_commit'],'HEAD'],cwd=self.root,env=env)
            assert epoch['ledger_before']==dict(path='compatibility/f10/disposition-ledger/ledger.json',sha256='4a59fbfc14cc0f11c1563f5b4de51adc8cd0a58bfca186069ffc25b03635f068',bytes=5068290)
            ledger_images=_git_images(self.root,[dict(commit=c,path=epoch['ledger_before']['path']) for c in ('e28364f10bc9c1f9219c9a18f0dbf9cffb267f57',epoch['source_commit'])]); _matches(ledger_images[('e28364f10bc9c1f9219c9a18f0dbf9cffb267f57',epoch['ledger_before']['path'])],epoch['ledger_before']); live_ledger=ledger_images[(epoch['source_commit'],epoch['ledger_after']['path'])]; _matches(live_ledger,epoch['ledger_after']); assert self._member(epoch['ledger_after'])==live_ledger
            for ref in epoch['receipts']: self._member(ref)
            def epoch_member(ref):
                if ref['path']==epoch['before']['path']:
                    assert ref==epoch['before']; return self._member(epoch['after'])
                if ref['path']==epoch['ledger_before']['path']:
                    assert ref==epoch['ledger_before']; return self._member(epoch['ledger_after'])
                return self._member(ref)
            live_checker = json.loads(self._member(dict(path='compatibility/rc/current-tool-live-checker-source-successor-v1.json',sha256='639574a3836d851ba8917db3091cc62e819951f80b1f92190cd6002c39bfc4a1',bytes=2481)))
            assert expected == checker['after'] == live_checker['before']
            assert live_checker['schema_version'] == 1 and live_checker['role'] == 'current-tool-live-checker-source-successor' and live_checker['base_head'] == 'a798ff9c58cdd539f115eda00b7cdd898d035353'
            assert live_checker['source_only'] is True and live_checker['historical_programs_executed'] is False and live_checker['artifact_or_audit_admission_granted'] is False and live_checker['g11_claim'] == 'not-passed'
            subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',live_checker['base_head'],'HEAD'],cwd=self.root,env=env)
            assert _git_images(self.root,[dict(commit=live_checker['base_head'],path=checker_path)])[(live_checker['base_head'],checker_path)] == prior
            live_bytes = _edited(prior,live_checker['edits']); _matches(live_bytes,live_checker['after']); assert self._member(live_checker['after']) == live_bytes
            epoch_member(live_checker['helper']); identities.append((live_checker['after'],live_bytes))
            domain_overlays[checker_path] = ({**checker,'after':live_checker['after'],'path':checker_path,'domain':'reviewed checker dispatch source'}, identities)
            cva_path = 'scripts/packed-cva-source-requalification.mjs'
            cva_before = dict(path=cva_path, sha256='be8c26049e58848d0b7b0ac1e1dba78151d3d8e867ec49b9dc523f28cb304e33', bytes=27417)
            cva_after = dict(path=cva_path, sha256='ac955ef53f1c530572d82d6b58f2e736787b04757a72a498a3a77bbcdcad3ad5', bytes=27422)
            matches = [x for x in reviews[6]['root_forwarding_manifest']['callsite_changes'] if x['path'] == cva_path]
            assert matches == [dict(path=cva_path, calls=1, before_sha256=cva_before['sha256'], after_sha256=cva_after['sha256'])]
            parent, commit = '4c29be143432bcb5b2ca99d4f83ca6ff162b4554', '547abe83d86c4682a173a6e01d2c783b6bb1d855'
            images = _git_images(self.root, [dict(commit=c,path=cva_path) for c in (parent,commit)])
            old, new = images[(parent,cva_path)], images[(commit,cva_path)]
            _matches(old,cva_before); _matches(new,cva_after)
            before_call = b'currentAuthoredUseAdmission({current: live, frozen: frozen.symbol_uses, candidate: added, line, readMember: proposed})'
            after_call = b'currentAuthoredUseAdmission({root,current: live, frozen: frozen.symbol_uses, candidate: added, line, readMember: proposed})'
            assert old.count(before_call) == 1 and old.replace(before_call,after_call) == new
            cva_next = json.loads(self._member(dict(path='compatibility/rc/current-tool-retired-adapter-checker-source-successor-v1.json', sha256='c15eb5d8be6bed62d9dfe3476b16fdf2a4eee6e9d4a337cee551848fe7a9c62a', bytes=2094)))
            assert cva_next['schema_version'] == 1 and cva_next['role'] == 'current-tool-retired-adapter-checker-source-successor' and cva_next['source_parent'] == '3be4d6b7aa54e97ee6622bc869d564313f1f7743' and cva_next['source_commit'] == 'df6213c96e19af5c4a0c68f49e010d89e15f0c2c' and cva_next['historical_programs_executed'] is False and cva_next['artifact_or_audit_admission_granted'] is False and cva_next['before'] == cva_after
            assert subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',cva_next['source_commit']],cwd=self.root,env=env,text=True).strip() == cva_next['source_commit'] + ' ' + cva_next['source_parent']
            review = json.loads(self._member(cva_next['review']))
            assert review['base_head'] == cva_next['source_parent'] and review['independent_review']['sha256'] == 'a015a5f5570d98557454eee86bfbed635edc1f4fc9a586885a3d12085f3c63f2'
            next_images = _git_images(self.root, [dict(commit=c,path=cva_path) for c in (cva_next['source_parent'],cva_next['source_commit'])])
            base = next_images[(cva_next['source_parent'],cva_path)]; final = _edited(base,cva_next['edits'])
            assert base == new; _matches(final,cva_next['after']); assert final == next_images[(cva_next['source_commit'],cva_path)] and self._member(cva_next['after']) == final
            domain_overlays[cva_path] = (dict(path=cva_path,before=cva_before,after=cva_next['after']), [(cva_before,old),(cva_after,new),(cva_next['after'],final)])
            test_packet = json.loads(self._member(dict(path='compatibility/rc/current-tool-maintained-test-source-successor-v1.json', sha256='bc88fc8797fe8f96a8d97077c6f6945c013394087bcec9d2e70cfaae51b14c27', bytes=5156)))
            assert test_packet['schema_version'] == 1 and test_packet['role'] == 'current-tool-maintained-test-source-successor' and test_packet['source_parent'] == '1cb122d2d4ee39949d0be4203aedea0131c20f75' and test_packet['historical_programs_executed'] is False and test_packet['artifact_or_audit_admission_granted'] is False
            test_path = 'tests/test_current_sass_tool_references.py'
            assert test_packet['before']['path'] == test_packet['after']['path'] == test_path
            old = _git_images(self.root, [dict(commit=test_packet['source_parent'],path=test_path)])[(test_packet['source_parent'],test_path)]
            new = _edited(old,test_packet['edits']); _matches(old,test_packet['before']); _matches(new,test_packet['after'])
            assert self._member(test_packet['after']) == new
            domain_overlays[test_path] = (dict(path=test_path,before=test_packet['before'],after=test_packet['after']), [(test_packet['before'],old),(test_packet['after'],new)])
            main_probe = json.loads(self._member(dict(path='compatibility/rc/current-tool-maintained-main-probe-source-successor-v1.json', sha256='c0c575f6295fa85d0bf4236b8f9a246e917651e64ef38b1afa80bf0b8466ae16', bytes=10547)))
            assert main_probe['schema_version'] == 1 and main_probe['role'] == 'current-tool-maintained-main-probe-source-successor' and main_probe['source_parent'] == test_packet['source_parent'] and main_probe['historical_programs_executed'] is False and main_probe['artifact_or_audit_admission_granted'] is False
            main_path = 'tests/current_sass_tool_reference_probe.mjs'
            assert main_probe['before']['path'] == main_probe['after']['path'] == main_path
            old = _git_images(self.root, [dict(commit=main_probe['source_parent'],path=main_path)])[(main_probe['source_parent'],main_path)]
            new = _edited(old,main_probe['edits']); _matches(old,main_probe['before']); _matches(new,main_probe['after'])
            assert self._member(main_probe['after']) == new
            domain_overlays[main_path] = (dict(path=main_path,before=main_probe['before'],after=main_probe['after']), [(main_probe['before'],old),(main_probe['after'],new)])
            probe = json.loads(self._member(dict(path='compatibility/rc/current-tool-maintained-probe-source-successor-v1.json', sha256='b1809b6d89c9cdbd29f9355ed11d82e995d77a8f549be7f69bca0e785b8b428f', bytes=1924)))
            assert probe['schema_version'] == 1 and probe['role'] == 'current-tool-maintained-probe-source-successor' and probe['source_parent'] == test_packet['source_parent'] and probe['historical_programs_executed'] is False and probe['artifact_or_audit_admission_granted'] is False
            probe_path = 'tests/current_sass_tool_reference_v4_probe.mjs'
            assert probe['before']['path'] == probe['after']['path'] == probe_path
            old = _git_images(self.root, [dict(commit=probe['source_parent'],path=probe_path)])[(probe['source_parent'],probe_path)]
            new = _edited(old,probe['edits']); _matches(old,probe['before']); _matches(new,probe['after'])
            assert self._member(probe['after']) == new
            live_tests = json.loads(self._member(dict(path='compatibility/rc/current-tool-live-matrix-test-source-successor-v1.json',sha256='48c790715a8ae0d154bd5db0968675fe4031c84f80a70207de8411861bc8e1e7',bytes=1887)))
            assert live_tests['schema_version'] == 1 and live_tests['role'] == 'current-tool-live-matrix-test-source-successor' and live_tests['source_only'] is True and live_tests['historical_programs_executed'] is False and live_tests['artifact_or_audit_admission_granted'] is False
            assert live_tests['matrix_owner'] == dict(path='scripts/current-tool-matrix-source.mjs',sha256='42d5d1251e8cacf69f0d1519bd6ba9a356c9c9eaac0bf5c5af1eb8aba5b20f1c',bytes=24939)
            assert [x['path'] for x in live_tests['updates']] == ['tests/test_current_sass_tool_reference_v5.py','tests/test_current_tool_planner_successor.py']
            def test_member(update, next_image):
                live = next((x for x in live_tests['updates'] if x['path'] == update['path']),None)
                if live is None: assert self._member(update['after']) == next_image; return
                assert live['before'] == update['after']; final = _edited(next_image,live['edits']); _matches(final,live['after']); assert self._member(live['after']) == final
            v5_tests = json.loads(self._member(dict(path='compatibility/rc/current-tool-maintained-v5-tests-source-successor-v1.json', sha256='61b144081fd0aa72065962b283110951c4f9af54a359c4887191938b4513d444', bytes=6833)))
            assert v5_tests['schema_version'] == 1 and v5_tests['role'] == 'current-tool-maintained-v5-tests-source-successor' and v5_tests['source_parent'] == test_packet['source_parent'] and v5_tests['historical_programs_executed'] is False and v5_tests['artifact_or_audit_admission_granted'] is False
            assert [update['path'] for update in v5_tests['updates']] == ['tests/test_current_sass_tool_reference_v5.py','tests/current_sass_tool_reference_v5_probe.mjs']
            images = _git_images(self.root, [dict(commit=v5_tests['source_parent'],path=update['path']) for update in v5_tests['updates']])
            for update in v5_tests['updates']:
                assert update['before']['path'] == update['after']['path'] == update['path']
                old = images[(v5_tests['source_parent'],update['path'])]; new = _edited(old,update['edits']); _matches(old,update['before']); _matches(new,update['after']); test_member(update,new)
            planner_tests = json.loads(self._member(dict(path='compatibility/rc/current-tool-maintained-planner-tests-source-successor-v1.json', sha256='92e8b053bab86a45ccad938be30a81678be921ae5dbfbd48e89059b605cf9379', bytes=15282)))
            assert planner_tests['schema_version'] == 1 and planner_tests['role'] == 'current-tool-maintained-planner-tests-source-successor' and planner_tests['source_parent'] == test_packet['source_parent'] and planner_tests['historical_programs_executed'] is False and planner_tests['artifact_or_audit_admission_granted'] is False
            assert [update['path'] for update in planner_tests['updates']] == ['tests/test_current_tool_planner_successor.py','tests/current_tool_planner_successor_probe.mjs']
            images = _git_images(self.root, [dict(commit=planner_tests['source_parent'],path=update['path']) for update in planner_tests['updates']])
            for update in planner_tests['updates']:
                assert update['before']['path'] == update['after']['path'] == update['path']
                old = images[(planner_tests['source_parent'],update['path'])]; new = _edited(old,update['edits']); _matches(old,update['before']); _matches(new,update['after']); test_member(update,new)
            repair = json.loads(self._member(dict(path='compatibility/rc/current-tool-historical-repair-source-successor-v1.json', sha256='6b036e7da92ffa3046aaf575ee487253c51508a50c12d3655257b479a3a11473', bytes=15104)))
            assert repair['schema_version'] == 1 and repair['role'] == 'current-tool-historical-repair-source-successor' and repair['source_parent'] == '68606c1ee64a6f529ef71b4576cc13c7863dbc85' and repair['historical_programs_executed'] is False and repair['artifact_or_audit_admission_granted'] is False
            repair_path='scripts/historical-contract-repair-source.mjs'
            assert repair['before'] == dict(path=repair_path,sha256='bd7cfbf2235438c604fdc6bc7c4b37e7c365c755d1f8287ce51393389ce6f78d',bytes=22621)
            assert repair['after'] == dict(path=repair_path,sha256='00beaadf9fb7dac4ce3981c60d04cadc84b7d23607ffcbc47c4b3d764b9f20cd',bytes=31620)
            assert [ref['path'] for ref in repair['supports']] == ['compatibility/rc/historical-repair-table-signature-source-successor-v1.json','compatibility/rc/parent-main-table-column-diagnostic-v1.json','compatibility/rc/api/signature-differences.json','tests/historical_repair_table_planner_successor_probe.mjs','compatibility/rc/current-tool-historical-repair-source-review-v1.json']
            images = _git_images(self.root,[dict(commit=repair['source_parent'],path=repair_path)])
            old = images[(repair['source_parent'],repair_path)]; new = _edited(old,repair['edits']); _matches(old,repair['before']); _matches(new,repair['after'])
            live_repair = json.loads(self._member(dict(path='compatibility/rc/current-tool-historical-repair-live-source-successor-v1.json',sha256='12a0cadacb08783923c3c40a99cbcd51b1727f6758090d3870f8351b05d0c675',bytes=2605)))
            assert live_repair['schema_version'] == 1 and live_repair['role'] == 'current-tool-historical-repair-live-source-successor' and live_repair['source_parent'] == '1c8111243f93811083c8490d9fdf260a80a29a86' and live_repair['source_commit'] == 'a5aa2d7f08ec6e01f3d24fe0a0a23c9187c851d4'
            assert live_repair['source_only'] is True and live_repair['historical_programs_executed'] is False and live_repair['artifact_or_audit_admission_granted'] is False and live_repair['before'] == repair['after']
            assert subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',live_repair['source_commit']],cwd=self.root,env=env,text=True).strip() == live_repair['source_commit'] + ' ' + live_repair['source_parent']
            subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',live_repair['source_commit'],'HEAD'],cwd=self.root,env=env)
            live_images = _git_images(self.root,[dict(commit=c,path=repair_path) for c in (live_repair['source_parent'],live_repair['source_commit'])]); final_repair = _edited(new,live_repair['edits']); assert new == live_images[(live_repair['source_parent'],repair_path)]; _matches(final_repair,live_repair['after']); assert final_repair == live_images[(live_repair['source_commit'],repair_path)]
            repair_composition=json.loads(self._member(dict(path='compatibility/rc/current-tool-historical-repair-composition-successor-v1.json',sha256='f48bc079216f0e13a342696eadcb9fe2742d922a70e45e363958252245f25480',bytes=15572)))
            assert repair_composition['schema_version']==1 and repair_composition['role']=='current-tool-historical-repair-composition-successor' and repair_composition['source_only'] is True and repair_composition['historical_programs_executed'] is False and repair_composition['artifact_or_audit_admission_granted'] is False and repair_composition['g11_claim']=='not-passed' and repair_composition['before']==live_repair['after']
            assert repair_composition['intermediate']==dict(path=repair_path,sha256='bc58e869db60240b973094b985f64ee0feda29ff0935b7fab9d5f3ae7134bce7',bytes=36206) and repair_composition['after']==dict(path=repair_path,sha256='b63c419933c0015c8ac7b9fb6238ad3c14a43a384af29a4f346954ac75900855',bytes=37024) and repair_composition['focus_patch']['sha256']=='cb287796debf160898772f625c1d194dd8424511b52b6f425e3c45107bdc613d'
            assert self._member(repair_composition['archive'])==final_repair; self._member(repair_composition['focus_patch']); self._member(repair_composition['independent_review'])
            focused_repair=_edited(final_repair,repair_composition['focus_edits']); _matches(focused_repair,repair_composition['intermediate']); composed_repair=_edited(focused_repair,repair_composition['composition_edits']); _matches(composed_repair,repair_composition['after']); assert self._member(repair_composition['after'])==composed_repair
            for ref in repair_composition['supports']: self._member(ref)
            # Keep table support as historical Git evidence; bind the separately
            # reviewed successor's physical final source and receipts.
            sig = json.loads(self._member(dict(path='compatibility/rc/current-tool-signature-differences-live-source-successor-v1.json',sha256='d27970b1fd18bd836dc9dcb0e0382fbc7fde0f568ab3f1738049364925519efa',bytes=8907)))
            assert sig['schema_version'] == 1 and sig['role'] == 'current-tool-signature-differences-live-source-successor' and sig['source_only'] is True and sig['historical_programs_executed'] is False and sig['artifact_or_audit_admission_granted'] is False and len(sig['steps']) == 2
            commits=[('356eb587f706c07f213553c8c8edb086b33e1e4e','87ba1a73bfb5fad632b7232a7ed0e98f2ad7ad14'),('a798ff9c58cdd539f115eda00b7cdd898d035353','66875e0e810e0b2b7173c05fe4597a1809e57374')]; sig_expected=repair['supports'][2]; sig_prior=None
            for step, (parent, commit) in zip(sig['steps'],commits):
                assert (step['source_parent'],step['source_commit']) == (parent,commit) and step['before'] == sig_expected
                assert subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',commit],cwd=self.root,env=env,text=True).strip() == commit+' '+parent
                subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],cwd=self.root,env=env)
                ims=_git_images(self.root,[dict(commit=c,path=step['before']['path']) for c in (parent,commit)]); sig_old=ims[(parent,step['before']['path'])]; sig_new=_edited(sig_old,step['edits']); _matches(sig_old,step['before']); _matches(sig_new,step['after']); assert sig_new == ims[(commit,step['after']['path'])] and (sig_prior is None or sig_old == sig_prior)
                self._member(step['receipt']); sig_expected=step['after']; sig_prior=sig_new
            assert self._member(sig_expected) == sig_prior
            supports = [None if i == 2 else self._member(ref) for i,ref in enumerate(repair['supports'])]; table, receipt, independent = json.loads(supports[0]), json.loads(supports[1]), json.loads(supports[4])
            assert table['schema_version'] == 1 and table['role'] == 'historical-repair-table-signature-source-successor' and table['source_parent'] == 'c394ef616bfae381e0676c8f84af01e0553cad1d' and table['source_commit'] == '68606c1ee64a6f529ef71b4576cc13c7863dbc85' and table['historical_programs_executed'] is False and table['artifact_or_audit_admission_granted'] is False
            assert table['review'] == repair['supports'][1] and table['after'] == repair['supports'][2]
            assert receipt['base_head'] == table['source_parent'] and receipt['independent_review']['sha256'] == 'e9bb997595db0a8d165a30fbf38c54ddb4e572402f27d9cb842d4aae8714fe85' and receipt['root_preflight']['before'][table['before']['path']] == table['before']['sha256'] and receipt['root_preflight']['after'][table['after']['path']] == table['after']['sha256']
            assert independent['schema_version'] == 1 and independent['role'] == 'embedded-independent-historical-repair-table-planner-review' and independent['historical_programs_executed'] is False and independent['artifact_or_audit_admission_granted'] is False
            assert independent['original_sha256'] == '3f37b9ad190072bebc30e198b06ad7d49fc09f05a9183f22c58ae8240c6617e4' and len(independent['text'].encode()) == independent['original_bytes'] and _hash(independent['text'].encode()) == independent['original_sha256']
            assert subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',table['source_commit']],cwd=self.root,env=env,text=True).strip() == table['source_commit'] + ' ' + table['source_parent']
            table_images = _git_images(self.root,[dict(commit=table['source_parent'],path=table['before']['path']),dict(commit=table['source_commit'],path=table['after']['path'])])
            table_old = table_images[(table['source_parent'],table['before']['path'])]; table_new = _edited(table_old,table['edits']); _matches(table_old,table['before']); _matches(table_new,table['after']); assert table_new == table_images[(table['source_commit'],table['after']['path'])]; _matches(table_new,repair['supports'][2])
            old_table, new_table = json.loads(table_old), json.loads(table_new); assert len(old_table['differences']) == 113 and len(new_table['differences']) == 114
            first = new_table['differences'][0]; assert first['symbol_id'] == 'legacy-table/primary/MatLegacyColumnDef' and first['historical_signature'] == 'protected method _updateColumnCssClassName():*' and first['owned_signature'] is None
            assert {**new_table,'differences':new_table['differences'][1:]} == old_table
            domain_overlays[repair_path] = (dict(path=repair_path,before=repair['before'],after=repair_composition['after']), [(repair['before'],old),(repair['after'],new),(live_repair['after'],final_repair),(repair_composition['intermediate'],focused_repair),(repair_composition['after'],composed_repair)])
            guard = json.loads(self._member(dict(path='compatibility/rc/current-tool-inventory-guard-live-source-successor-v1.json',sha256='77ff8036af2be230586ea8ef9aead9f5b6d36357d2398b3b5d9befb052816db0',bytes=43066)))
            assert guard['schema_version'] == 1 and guard['role'] == 'current-tool-inventory-guard-live-source-successor' and guard['source_parent'] == 'a798ff9c58cdd539f115eda00b7cdd898d035353' and guard['source_only'] is True and guard['historical_programs_executed'] is False and guard['artifact_or_audit_admission_granted'] is False
            assert [x['path'] for x in guard['transitions']] == ['scripts/inventory-reference-proposal.mjs','scripts/inventory-finite-tool-successor.mjs','tests/inventory_finite_source_probe.mjs'] and len(guard['support']) == 7
            subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',guard['source_parent'],'HEAD'],cwd=self.root,env=env)
            for ref in guard['support']: epoch_member(ref)
            guard_images = _git_images(self.root,[dict(commit=guard['source_parent'],path=x['path']) for x in guard['transitions']])
            for update in guard['transitions']:
                assert update['before']['path'] == update['after']['path'] == update['path'] and update['path'] not in domain_overlays
                before=guard_images[(guard['source_parent'],update['path'])]; after=_edited(before,update['edits']); _matches(before,update['before']); _matches(after,update['after']); assert self._member(update['after']) == after
                domain_overlays[update['path']] = (update,[(update['before'],before),(update['after'],after)])
        inventory_prior = dict(path='testing/legacy-runner/historical-inventory.json', sha256='a3ebe782d8757db92b392c9c5ced70de7f25cca550a705363ccab825037d6403', bytes=106309)
        inventory_current = dict(path=inventory_prior['path'], sha256='912def47c1e171f9c2a01906dcc0968b91c5288d9b8f73714247b0319f3a2b15', bytes=113388)
        def current_comparison(ref):
            if self._matrix_owner and ref['path'] == inventory_prior['path']:
                assert _metadata(ref) == inventory_prior
                self._matrix_owner.assert_current()
                self._member(inventory_current)
                commit = '948e8290b74953c83d11268368f38952d0b51fd7'
                old = _git_images(self.root, [dict(commit=commit, path=inventory_prior['path'])])[(commit, inventory_prior['path'])]
                _matches(old, inventory_prior)
                return old
            if self._matrix_owner and ref['path'] == self._matrix_owner.after['path']:
                meta = _metadata(ref)
                if meta == self._matrix_owner.after: return self._member(self._matrix_owner.after)
                return self._matrix_owner.comparison_bytes(meta)
            overlay = domain_overlays.get(ref['path'])
            if overlay is None: return self._member(ref)
            row, identities = overlay; meta = _metadata(ref)
            matches = [data for identity, data in identities if identity == meta]
            assert matches and all(data == matches[0] for data in matches), 'unknown current domain comparison'
            self._member(row['after']); return bytes(matches[0])
        rc_successors = {}
        if self.line == 'main':
            rc_packet = dict(path='compatibility/rc/current-tool-rc-verify-source-successor-v1.json', sha256='35834cc2d98bb4a05e4bae35f3a1f51199ab81e86027858214a0144e911d2826', bytes=6911)
            data = json.loads(self._member(rc_packet))
            parent, commit, path = 'dfa4dfe18a17a117aaae3af1a8089f4615840cb0', '33d7d9e31fd96cbfa6c4e1f592c0bade985c0878', 'scripts/rc-verify.py'
            assert data['schema_version'] == 1 and data['role'] == 'current-tool-rc-verify-source-successor' and data['source_parent'] == parent and data['source_commit'] == commit and data['historical_programs_executed'] is False
            assert data['before'] == dict(path=path, sha256='3a3a68dd67abf6b0c535853beea818f003867b5a1a1734e6bea683c82b51521c', bytes=103517)
            assert data['after'] == dict(path=path, sha256='92b12b9f95207d32160a6a8df98e09a1ac9ee5264fdaf6a2f9057ff8bc3deadd', bytes=103230)
            env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
            ancestry = subprocess.check_output(['git', '--no-replace-objects', 'rev-list', '--parents', '-n', '1', commit], cwd=self.root, env=env, text=True).strip()
            assert ancestry == commit + ' ' + parent
            images = _git_images(self.root, [dict(commit=c, path=path) for c in (parent, commit)])
            before = images[(parent, path)]; _matches(before, data['before'])
            after = _edited(before, data['edits']); _matches(after, data['after'])
            assert after == images[(commit, path)] and current_comparison(data['after']) == after
            rc_successors[path] = (data, before, after)
            assert [row['path'] for row in data['authored_updates']] == ['tests/test_current_sass_tool_references.py', 'tests/current_sass_tool_reference_probe.mjs']
            v5 = json.loads(self._member(V5_INPUTS))
            for update in data['authored_updates']:
                assert update['before']['path'] == update['after']['path'] == update['path']
                v5update = next(row for row in v5['authored_updates'] if row['path'] == update['path'])
                assert v5update['after'] == update['before']
                base = _git_images(self.root, [dict(commit=V5_COMMIT, path=update['path'])])[(V5_COMMIT, update['path'])]
                _matches(base, v5update['before'])
                historical = _edited(base, v5update['edits']); _matches(historical, update['before'])
                current = _edited(historical, update['edits']); _matches(current, update['after'])
                assert current_comparison(update['after']) == current
                rc_successors[update['path']] = (update, historical, current)
        def v5_member(ref):
            if ref['path'] in rc_successors:
                data, before, after = rc_successors[ref['path']]
                assert _metadata(ref) == data['before'], 'unknown rc predecessor'
                assert current_comparison(data['after']) == after
                return before
            return current_comparison(ref)
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
                assert after == images[(V5_COMMIT, path)] and v5_member(update['after']) == after
                v5_overlays[path] = (update, before, after)
            for update in v5['authored_updates']:
                path = update['path']
                assert set(update) == {'path', 'before', 'after', 'edits'} and update['before']['path'] == update['after']['path'] == path
                before = images[(V5_COMMIT, path)]
                _matches(before, update['before'])
                after = _edited(before, update['edits'])
                _matches(after, update['after'])
                assert v5_member(update['after']) == after
                v5_overlays[path] = (update, before, after)
            assert len(v5['authored_support']) == 1 and v5['authored_support'][0]['path'] == 'compatibility/rc/current-native-tab-downstream-source-epochs-v5.json'
            self._member(v5['authored_support'][0])
            ref = v5['additional_inputs'][0]
            assert self._member(ref) == images[(V5_COMMIT, ref['path'])]

        # Historical comparison bytes are never returned by the physical reader.
        def v4_comparison(ref):
            if self.line == 'main' and ref['path'] == planner_old['path']:
                assert _metadata(ref) == planner_old, 'unknown planner predecessor'
                self._member(planner_current)
                return planner_before
            overlay = v5_overlays.get(ref['path'])
            if overlay is None:
                return current_comparison(ref)
            update, before, after = overlay
            assert _metadata(ref) == update['before'], 'unknown V4 comparison identity'
            assert v5_member(update['after']) == after
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
        for update, before, after in rc_successors.values():
            row = self._rows[update['before']['path']]
            assert dict(path=row['path'], **row['after']) == update['before'], 'rc successor must follow V5'
            self._add(row, update['before'], before)
            self._add(row, update['after'], after)
            row['after'] = dict(sha256=update['after']['sha256'], bytes=update['after']['bytes'])
        if self._matrix_owner:
            matrix = self._matrix_owner; row = self._rows[matrix.after['path']]
            assert dict(path=row['path'],**row['after']) == matrix.before
            self._add(row,matrix.before,matrix.comparison_bytes(matrix.before)); self._add(row,matrix.intermediate,matrix.comparison_bytes(matrix.intermediate)); self._add(row,matrix.after,self._member(matrix.after)); row['after'] = dict(sha256=matrix.after['sha256'],bytes=matrix.after['bytes'])
        for update, identities in domain_overlays.values():
            path=update['path']; row=self._rows.get(path)
            if row is not None: assert dict(path=path,**row['after']) == update['before'], 'domain successor must follow previous frame'
            else:
                assert update['before'] in next_branch['additional_inputs'], 'domain predecessor is not an existing input'
                row=dict(path=path,before=dict(sha256=update['before']['sha256'],bytes=update['before']['bytes']),identities={}); self._rows[path]=row
            for ref, raw in identities: self._add(row,ref,raw)
            row['after']=dict(sha256=update['after']['sha256'],bytes=update['after']['bytes'])
        for row in self._rows.values():
            self._member(dict(path=row['path'], **row['after']))
        self.epoch = 7 if self.line == 'main' else 3
        self._assert_current_core()

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
            assert not self._prebound, 'unbound current tool input ' + path
            self._bound[path] = ref
        self._bind_image(path, raw)
        if self._provided is not None:
            self._assert_physical()
            provided = self._provided(path)
            _check_tool_transaction(self.root)
            assert type(provided) is bytes and provided == raw
            self._assert_physical()
        assert _physical(self.root, path) == raw
        return raw

    def _member(self, ref):
        raw = self._read(ref['path'])
        _matches(raw, ref)
        return raw

    def _assert_physical(self):
        self._sweep_physical()

    @property
    @_public_tool_method
    def bound(self):
        return copy.deepcopy(list(self._bound.values()))

    @property
    @_public_tool_method
    def transitions(self):
        return [dict(path=row['path'], before=dict(row['before']), after=dict(row['after'])) for row in self._rows.values()]

    @_public_tool_method
    def assert_current(self):
        return self._assert_current_core()

    def _assert_current_core(self):
        if self._matrix_owner: self._matrix_owner.assert_current()
        for ref in list(self._bound.values()):
            self._member(ref)
        self._assert_physical()
        if self._matrix_owner: self._matrix_owner.assert_current()

    @_public_tool_method
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

    @_public_tool_method
    def qualify(self, ref):
        return self._side(ref, 'after')

    @_public_tool_method
    def predecessor_reference(self, ref):
        return self._side(ref, 'before')

    @_public_tool_method
    def comparison_bytes(self, incoming):
        snapshot = _metadata(incoming)
        row = self._rows[snapshot['path']]
        raw = row['identities'][snapshot['sha256']]
        _matches(raw, snapshot)
        self._member(dict(path=row['path'], **row['after']))
        assert _metadata(incoming) == snapshot
        self._assert_physical()
        return raw
