#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Authenticate the nine-spec source-identity epoch, without execution credit.

The 13-member predecessor verifier remains authoritative for its own epoch.
This main-only successor verifies its immutable committed inventory as data,
then checks every nine-member source transition independently. It does not
qualify runtime behavior, style, historical execution, or a release gate.
"""
from __future__ import annotations
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
HEAD = '9665df520e4f8644422203b6cb82a5412a483a33'
INVENTORY = 'testing/legacy-runner/historical-inventory.json'
REFERENCE = 'compatibility/handoff/codex-closeout/reference/historical-paths.csv'
SELECTION = 'testing/legacy-runner/historical-specs.json'
BASE_HASH = 'baecc3ac539fe5ade1796c8647089588daa23d43d426358bd17038cc3933561c'
PREVIOUS_VERIFIER = 'scripts/historical_inventory_rebinding.py'
PREVIOUS_VERIFIER_HASH = '1014fae26c962bf8934d93bca44d30dfe49575b2b9e23288e8eb930323f48ce1'
REFERENCE_HASH = '33e24c7a3350004bda35236d5e643ae0d6f67bad5149faaf85e81cd108368d74'
SELECTION_HASH = '520d88c578fb20393b45e4ab7d98be0c9b4953707cd84f093a3fae1ce262ed8d'
MEMBERS = [{'candidate': 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts', 'historical_path': 'src/material/legacy-autocomplete/autocomplete.spec.ts', 'historical_sha256': 'e38aae3cfa3f9f3151e812020f345a447b209c4d77843683e27f9b5fc72b9d31', 'predecessor_commit': '8b2a12324f3fbfd02d970654b98fe9e7f86469c9', 'predecessor_sha256': '2610d311569c9a6fdb063dc0652b423414622cf1370b2434f13ba86070293236', 'current_sha256': 'abc2ec1a6ceeb69b2410eb9827dabf3623e6592c035ec3b19f17321bf3b85a09', 'diff_sha256': 'b54b5182961c095741972657d92f49c28facfdff62718e412ab5c5b8de66729e'}, {'candidate': 'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts', 'historical_path': 'src/material/legacy-chips/chip-list.spec.ts', 'historical_sha256': 'a64a9468dd842c9a944c381b466d135497baa7d25f1d7503b5a1aefd0e363053', 'predecessor_commit': 'd3fb5698f356c65b9003257e6b07e6a102d6f3d2', 'predecessor_sha256': '26263b1efa46119fc7a8ea1b8693af78401cb2b78a3a4a6fb1dc7b0c78618750', 'current_sha256': 'b41c1b2911e20ffa95853e5ec438b3c684919ce920129429f76dabadc206cbe2', 'diff_sha256': '41335f6786ac622ad9d64abbcfb1480ebb43befef716edc61358d7d763368ba7'}, {'candidate': 'projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts', 'historical_path': 'src/material/legacy-dialog/dialog.spec.ts', 'historical_sha256': '087bbf3243717176fc54cc0dddc8b4f3a55b2f453b41a51a50a4701c5633f701', 'predecessor_commit': '81dfb13933a06986f2b7f77155bd6a2a87d36de4', 'predecessor_sha256': 'dfc5961661c06ae15f186d25846f4a40f61880ac2c09e9975e0d9faabbbdea2b', 'current_sha256': 'd1938bb0ab51a94fc7dc1e4d0f28d9e08f5280492565a9577f0db08b39b4b985', 'diff_sha256': '053daa84c99bcc0de4bb1e3f2f2aaa7c00b08bbe024c1aec7deb663e2347caf3'}, {'candidate': 'projects/ngx-material-legacy/legacy-input/input.spec.ts', 'historical_path': 'src/material/legacy-input/input.spec.ts', 'historical_sha256': 'd0fd5517f8136c2a57b6e303c1169c2382e5a315da857f89551cc4cc73fe9b36', 'predecessor_commit': '9cab27809f007332f6ebc2be62c8952cf2bb7eeb', 'predecessor_sha256': 'ed4f565e8ee1b853e1f1d469468cd8db70730c7585693d654ada3f6f0cc394ba', 'current_sha256': '025f4fa2579ce0d93e95dc7cfe266081d3d0d771bb31c9ccc71ff8970c478eae', 'diff_sha256': '4e9e8660ee506f79fba840623bd64b9712a8caa209ae10be2c88fffee1847a7e'}, {'candidate': 'projects/ngx-material-legacy/legacy-menu/menu.spec.ts', 'historical_path': 'src/material/legacy-menu/menu.spec.ts', 'historical_sha256': '7cb0d741bbc9ab2b6a3a99fd227082962b8770917a32cc7f4a9910cf8185898c', 'predecessor_commit': 'cfa3b5cc24d380f6e5af60fa031d2875a3f6b3d9', 'predecessor_sha256': '38b0486a0bc5053bda428540bd9059858ca50d4549bc277c698d42dc1cc0e7e6', 'current_sha256': 'fefc0509a3c6597aa78b68ec885a14f9c4eae5f8d0742d8055b1fdc4e5f4ce0a', 'diff_sha256': 'da28b236f6dd694a6bf0ebb6404a6f1cb2b510671fde75082c80c1358637c690'}, {'candidate': 'projects/ngx-material-legacy/legacy-select/select.spec.ts', 'historical_path': 'src/material/legacy-select/select.spec.ts', 'historical_sha256': '66dac59c4e445319aee912d5c4361acc1e51eb7894351a8cc6f81fc87756e43b', 'predecessor_commit': '00063bad4f0b46ff5575347f5a297377ceff9962', 'predecessor_sha256': 'f96cb38f85bcbb73138f7a2f05eb713087181ca09037a7832f1c271e2ec63a13', 'current_sha256': 'cad39a56a0e7843734ecfaf0454d6cbf91bba63501a09402cf9d6bcf31484cd7', 'diff_sha256': 'dad259e81f78b446d49780ec3fe6f4078dd54deee7ab3c5c93d43ae2df290871'}, {'candidate': 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar.spec.ts', 'historical_path': 'src/material/legacy-snack-bar/snack-bar.spec.ts', 'historical_sha256': '0440e01c99e87bf7ae5b4117efaf6f314b619b71baf63c95e486f59f406b5b2c', 'predecessor_commit': 'f2659b716c972a47d822ef6c16dd8cd9abfee531', 'predecessor_sha256': '15708b86b3aae3773bb5f0bfad8e6f952dce281e6722e7b5a2f6f06fcd105fd3', 'current_sha256': '92425afa5ddcb406c75b4af69ea9dd795f3b3d10ef8898b909a7bd1ad69f7230', 'diff_sha256': '56819f8d62cdd0ece0ff46c8a3073f6b351b8c22a8f8f29a727c50bed0390016'}, {'candidate': 'projects/ngx-material-legacy/legacy-table/table.spec.ts', 'historical_path': 'src/material/legacy-table/table.spec.ts', 'historical_sha256': '33b475b1c51bcdcdc47d026abc0efc9ed3658e24ddd4512477d55dc3cf1605cc', 'predecessor_commit': '918e0e7958d93aee33221e95cfa14eb3af1a9550', 'predecessor_sha256': 'f61e8eab5779d3e745b075308331394f56b6b75d6cb73a43d14acf0c836dbdad', 'current_sha256': '6987ae268b614e3d445852fe9eb99e05d1f7c6c5669505079ed142586ab47d1e', 'diff_sha256': '1b18233a37eddb641dffbd9369095f0815b4e8cb1b215145130bb1fd0dc61db3'}, {'candidate': 'projects/ngx-material-legacy/legacy-tabs/tab-group.spec.ts', 'historical_path': 'src/material/legacy-tabs/tab-group.spec.ts', 'historical_sha256': 'ec9dac9881b0d270432fa030b9a875b67f8e5cab771343462b58420fc2849ba4', 'predecessor_commit': '06b5d7556620364f8f4a861dfa1568763dd7fe14', 'predecessor_sha256': '4bb7e40a519eae2697f2ef01afd8f36b9a0f7b1dde017f517ce9b6c0e093bc2e', 'current_sha256': 'fbe51f8fd03841b2dbef0f5b814148edd97a7188a2de803835ce17064afc1145', 'diff_sha256': '90c30b84b274d36c7000ef9d083d5d90feb26d82d7e6b7223eb67e5d75b5f88c'}]
RECEIPTS = {'compatibility/rc/parent-autocomplete-panel-closing-v2.json': '85e8ec208fbbfe0fbe39d20256374b0f24ce7cc868b475e895675d19a91f0c54', 'compatibility/rc/parent-four-historical-fixture-repairs-v1.json': 'd137d50e9aba701e2857ba513dc6ebc21196cb6b23cfdd79f79cd6cc37f3f81f', 'compatibility/rc/parent-input-select-historical-repair-v1.json': '72bdeb5c9d83195746746736e7672c1a870c523d9f638dd191764f9a37364aa3', 'compatibility/rc/parent-menu-binding-lifecycle-integration-v1.json': 'd1d29364c836febdc8ae2999dfd40127e30fd16c1bd17a663c5ccc9cd54b3619', 'compatibility/rc/parent-menu-lifecycle-integration-v1.json': '7ee6382362819071f77b9e49cdb2017ad441b3696c8d8bdbba342a8079eb9abd', 'compatibility/rc/parent-select-navigation-integration-v1.json': 'e5c8e71ac87b4d2ccd88de2e91cd365a8dff913359523c514ec729bbc90fcf9b', 'compatibility/rc/parent-snack-lifecycle-integration-v1.json': '0a3ce97f654c6fd17b5f3474dbf218a906fa134855cb20a00a3699b3ba43163d'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def need(condition, message):
    if not condition:
        raise ValueError(message)


def git(root, *args):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
                                    '-c', 'maintenance.auto=0', *args], cwd=root, env=env)


def encoded(obj):
    return (json.dumps(obj, indent=2) + '\n').encode()


def expected_successor(root=ROOT, *, read_member=None):
    read = read_member or (lambda path: (root / path).read_bytes())
    need(json.loads(read('projects/ngx-material-legacy/package.json'))['version'].startswith('22.'),
         'wrong package line for main-only epoch')
    base = git(root, 'show', HEAD + ':' + INVENTORY)
    need(sha(base) == BASE_HASH, 'immutable inventory predecessor changed')
    need(sha(read(PREVIOUS_VERIFIER)) == PREVIOUS_VERIFIER_HASH and
         read(PREVIOUS_VERIFIER) == git(root, 'show', HEAD + ':' + PREVIOUS_VERIFIER),
         'previous thirteen-member authority changed')
    need(sha(read(REFERENCE)) == REFERENCE_HASH, 'historical CSV changed')
    need(sha(read(SELECTION)) == SELECTION_HASH, 'historical selection changed')
    for path, digest in RECEIPTS.items():
        need(sha(read(path)) == digest and read(path) == git(root, 'show', HEAD + ':' + path),
             'source review receipt changed: ' + path)
    inventory = json.loads(base)
    need(inventory['candidate_snapshot']['line'] == 'main', 'wrong predecessor line')
    targets = {m['candidate'] for m in MEMBERS}
    need(len(targets) == 9 and sum(r['candidate'] in targets for r in inventory['rows']) == 9,
         'wrong reviewed membership')
    for member in MEMBERS:
        path = member['candidate']
        row = next(r for r in inventory['rows'] if r['candidate'] == path)
        need(row['historical_path'] == member['historical_path'] and
             row['historical_sha256'] == member['historical_sha256'], 'historical row changed: ' + path)
        tag = git(root, 'show', 'baseline/angular-components-16.2.x:' + member['historical_path'])
        need(sha(tag) == member['historical_sha256'], 'historical tag changed: ' + path)
        predecessor = git(root, 'show', member['predecessor_commit'] + ':' + path)
        current = git(root, 'show', HEAD + ':' + path)
        delta = git(root, 'diff', member['predecessor_commit'], HEAD, '--', path)
        need(sha(predecessor) == member['predecessor_sha256'] == row['candidate_sha256'],
             'predecessor bytes changed: ' + path)
        need(sha(current) == member['current_sha256'] and sha(delta) == member['diff_sha256'] and
             read(path) == current, 'reviewed candidate bytes changed: ' + path)
        need(row['execution']['bound_to_current_head'] is False,
             'predecessor has current execution credit: ' + path)
        snapshot = {key: copy.deepcopy(row[key]) for key in ('candidate_sha256', 'adaptation', 'execution')}
        snapshot.update(current_source_binding=False,
                        reason='Prior candidate identity retained before the individually reviewed historical spec source transition; no execution credit.')
        row.setdefault('prior_candidate_snapshots', []).append(snapshot)
        row['candidate_sha256'] = member['current_sha256']
        row['execution'] = {'state': 'not-executed', 'bound_to_current_head': False, 'receipt': None,
                            'note': 'Source identity refreshed; no current-HEAD execution receipt.'}
    return inventory


def verify_successor(root=ROOT, *, read_member=None):
    read = read_member or (lambda path: (root / path).read_bytes())
    expected = expected_successor(root, read_member=read)
    need(read(INVENTORY) == encoded(expected), 'inventory is not exact nine-spec successor')
    # All 57 source identities, 21 shim identities, reference and selection must still agree.
    # This function reports failure via SystemExit; never converts it into acceptance.
    from historical_inventory_source import check_inventory_source_bindings
    check_inventory_source_bindings(expected, json.loads(read(SELECTION)), root=root)
    return {'epoch': 'main-nine-spec-source-identities', 'members': 9,
            'historical_reference_changed': False, 'execution_credit': False,
            'source_behavior_admission': False, 'full_suite_pass': False,
            'unresolved_audit_concerns': [
                'table test no longer directly asserts one definition per owner injector',
                'dialog assertions run after additional render and microtask turns',
                'autocomplete fake accepts unrelated breakpoint queries',
            ]}


if __name__ == '__main__':
    print(json.dumps(verify_successor(), indent=2))
