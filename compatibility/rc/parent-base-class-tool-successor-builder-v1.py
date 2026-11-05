# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Build exact V3 source successors from authenticated Git DATA and literal edits.

Default is read-only. --write changes only the NEW V3 packet and its two maintained
factory SHA literals in each root. V1/V2 packets and builders are immutable.
The explicit source roster is bounded to the base-class composition and current
reference dispatch/tests. New leaf/stage/owner inputs are physical support only.
"""
import argparse
import difflib
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOTS = {'21.x': Path('/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy'),
         'main': Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
CHECKPOINTS = {'21.x': 'd8ab97315b6c77b83f42c2bebcf63b2984fff255',
               'main': '59ba0e2aa8b76f71b472ea2831273e44e44b5b57'}
V1 = dict(path='compatibility/rc/current-sass-tool-reference-inputs-v1.json', sha256='ffb8fb98babb084a86e4d49f13ef17069f784eb732365c566f6c764efd62e64f', bytes=478008)
V2 = dict(path='compatibility/rc/current-sass-tool-reference-inputs-v2.json', sha256='d25ef6684992ececd518f7932bc68f5d43d433df23868d7a376ebf0a9e56a770', bytes=625566)
OUTPUT = 'compatibility/rc/parent-base-class-tool-successor-inputs-v3.json'
SELF = 'compatibility/rc/parent-base-class-tool-successor-builder-v1.py'
FACTORIES = ('scripts/current-sass-tool-references.mjs', 'scripts/current_sass_tool_references.py')
SHARED_UPDATES = ('scripts/rc-verify.py', 'scripts/historical-contract-repair-readers.mjs', 'tests/current_sass_tool_reference_probe.mjs', 'tests/test_current_sass_tool_references.py')
TEST_COMPATIBILITY_UPDATES = (
    'tests/current_sass_canonical_test_scope.mjs',
    'tests/current_sass_canonical_test_scope.py',
    'tests/legacy_removal_admission_probe.mjs',
    'tests/test_button_token_repairs_admission.py',
    'tests/test_button_tokenization_admission.py',
    'tests/test_control_m3_theme_admission.py',
    'tests/test_core_tokenization_admission.py',
    'tests/test_foundation_m3_theme_admission.py',
    'tests/test_inspection_compatibility_admission.py',
    'tests/test_legacy_removal_admission.py',
    'tests/test_legacy_removal_source.py',
    'tests/test_remaining_unthemable_admission.py',
    'tests/test_selector_density_admission.py',
    'tests/test_slider_m3_repairs_admission.py',
    'tests/test_surface_m3_theme_admission.py',
    'tests/test_theming_inspection_admission.py',
    'tests/m3_theme_boundary_admission_probe.mjs',
    'tests/test_m3_theme_boundary_admission.py',
)
UPDATES = {'21.x': (*SHARED_UPDATES, 'tests/browser_reference_source_probe.mjs', 'scripts/browser-reference-proposal.mjs', 'scripts/inventory-reference-owner.mjs', 'tests/test_packed_upstream_ledger_epoch.py', 'scripts/packed-upstream-ledger-epoch.mjs', 'scripts/table-local-compilation-owner-source.mjs', 'scripts/table-local-compilation-canonical-stage.mjs', 'scripts/legacy-removal-canonical-stage.mjs', 'scripts/legacy-removal-owner-source.mjs', 'scripts/upstream-legacy-removal-source.mjs', 'scripts/browser-owner-source.mjs', 'scripts/checker-owner-source.mjs', 'scripts/checker-reference-proposal.mjs', 'tests/browser_reference_owner_probe.mjs', 'tests/test_browser_reference_owner.py', 'tests/historical_contract_repair_source.py', 'tests/checker_reference_source_probe.mjs', 'scripts/browser-reference-source.mjs', *TEST_COMPATIBILITY_UPDATES),
           'main': (*SHARED_UPDATES, 'scripts/browser-reference-source.mjs', 'tests/browser_reference_source_probe.mjs', 'tests/checker_reference_source_probe.mjs', 'scripts/browser-reference-proposal.mjs', 'scripts/checker-reference-proposal.mjs')}
SUPPORT = {'21.x': ('tests/test_title_owner_physical_reference.py', 'tests/test_current_tool_git_data_cache.py', 'tests/test_base_class_source_inspector_identity.py', 'tests/checker_reference_metadata_owner_probe.mjs', 'tests/historical_chip_wrapper_metadata_probe.mjs', 'tests/historical_consumer_wrapper_metadata_probe.mjs', 'tests/test_historical_chip_wrapper_metadata.py', 'tests/test_historical_consumer_wrapper_metadata.py', 'scripts/historical-metadata-data-controls.mjs', 'tests/test_historical_metadata_data_controls.py', 'tests/packed_upstream_ledger_epoch_probe.mjs', 'compatibility/rc/parent-packed-ledger-retained-test-source-transition-v2.json', 'compatibility/rc/c04-inventory-owner-inputs.json', 'scripts/base-class-removal-owner-source.mjs', 'scripts/base-class-removal-canonical-stage.mjs', 'compatibility/rc/21x-base-class-removal-admission-owner-inputs-v1.json', 'tests/current_sass_c04_tool_integration_probe.mjs', 'tests/m3_theme_boundary_historical_epoch_data.mjs', 'tests/m3_theme_boundary_ledger_patch.py', 'tests/dialog_title_canonical_ledger_patch.py', 'compatibility/rc/21x-legacy-removal-admission-owner-inputs.json', 'compatibility/rc/c04-browser-owner-inputs.json', 'compatibility/rc/c04-checker-owner-inputs.json', 'compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', 'tests/checker_reference_metadata_patch.py', 'tests/test_legacy_sass_entrypoint_ledger.py', 'tests/test_checker_reference_metadata.py', 'tests/test_token_build_admission.py', 'tests/test_unthemable_token_admission.py', 'tests/test_modern_control_base_admission.py', 'tests/test_theme_token_root_admission.py', 'tests/test_form_field_tokenization_admission.py', 'tests/test_dialog_title_canonical_owner.py', 'tests/unthemable_token_ledger_probe.mjs', 'tests/token_build_ledger_probe.mjs', 'tests/legacy_sass_entrypoint_ledger_probe.mjs', 'tests/modern_control_base_admission_probe.mjs', 'tests/theme_token_root_admission_probe.mjs', 'tests/form_field_tokenization_admission_probe.mjs', SELF),
           'main': ('tests/test_current_tool_git_data_cache.py', 'tests/current_sass_c04_tool_integration_probe.mjs', SELF)}
UPDATES = {line: (*paths, 'scripts/current-sass-source.mjs', 'scripts/current_sass_source.py', 'scripts/historical-contract-repair-source.mjs', 'scripts/current-sass-spinner-snack-contract.mjs', 'scripts/current_sass_spinner_snack_admission.py') for line, paths in UPDATES.items()}
UPDATES['21.x'] = (*UPDATES['21.x'], 'scripts/upstream-legacy-removal-admission.cjs')
UPDATES = {line: (*paths, 'scripts/sass-spinner-snack-c04-source.mjs', 'scripts/sass_spinner_snack_gate_integration.py') for line, paths in UPDATES.items()}
UPDATES = {line: (*paths, 'scripts/sass-ordinary-control-gate.mjs', 'scripts/sass-spinner-snack-gate-integration.mjs', 'scripts/sass_ordinary_control_gate.py') for line, paths in UPDATES.items()}
REGRESSION_SOURCE_ANCHORS = {'21.x': {'tests/browser_reference_source_probe.mjs': {'before': {'path': 'tests/browser_reference_source_probe.mjs', 'sha256': 'cca4093034ebb6932fc7e822e70e684413b55d8fff12b40dcccbfdc07713a0e7', 'bytes': 7558}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-source-inputs.json', 'sha256': '5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae', 'bytes': 115478}, 'source_member_index': 50}, 'scripts/browser-reference-proposal.mjs': {'before': {'path': 'scripts/browser-reference-proposal.mjs', 'sha256': '600a430a33955755561f018f46288acd4beed4b9ad4ca6b4daf8aa7cb5bf1d50', 'bytes': 13492}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': '710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', 'bytes': 15193}, 'transition_index': 3}}, 'main': {'tests/browser_reference_source_probe.mjs': {'before': {'path': 'tests/browser_reference_source_probe.mjs', 'sha256': 'cca4093034ebb6932fc7e822e70e684413b55d8fff12b40dcccbfdc07713a0e7', 'bytes': 7558}, 'packet': {'path': 'compatibility/rc/c04-browser-reference-source-inputs.json', 'sha256': '4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c', 'bytes': 115393}, 'source_member_index': 48}, 'tests/checker_reference_source_probe.mjs': {'before': {'path': 'tests/checker_reference_source_probe.mjs', 'sha256': '0c1158d9c1dcbe5a33f6d8f7660e8ad0435b031020a9610f76655f4648f211a8', 'bytes': 15116}, 'packet': {'path': 'compatibility/rc/c04-checker-owner-inputs.json', 'sha256': 'f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc', 'bytes': 12073}, 'transition_index': 0}, 'scripts/browser-reference-proposal.mjs': {'before': {'path': 'scripts/browser-reference-proposal.mjs', 'sha256': '600a430a33955755561f018f46288acd4beed4b9ad4ca6b4daf8aa7cb5bf1d50', 'bytes': 13492}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': 'd22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb', 'bytes': 15192}, 'transition_index': 3}, 'scripts/checker-reference-proposal.mjs': {'before': {'path': 'scripts/checker-reference-proposal.mjs', 'sha256': '22c49ba434ee0b1253ad2815b77510adb8259cc3f307005f6b66b73e522502ac', 'bytes': 13095}, 'packet': {'path': 'compatibility/rc/c04-checker-owner-inputs.json', 'sha256': 'f909f0a47fa49c1c3ba9e84718ad7ba461216cb7da12b61b972be87aa3ba7afc', 'bytes': 12073}, 'transition_index': 2}, 'scripts/browser-reference-source.mjs': {'before': {'path': 'scripts/browser-reference-source.mjs', 'sha256': '59f2ac538149e0d9b2176c231a97147862881fb19b46768a5a4e450d66f9fe38', 'bytes': 10443}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': 'd22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb', 'bytes': 15192}, 'transition_index': 2}}}
for line, anchor in {'21.x': {'before': {'path': 'scripts/browser-reference-owner.mjs', 'sha256': '7f0ae434273c4d19aa1b533bfbe3a61d8ffd4e4d9eb9959ab40f31d441db28e5', 'bytes': 3026}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': '710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', 'bytes': 15193}, 'source_member_index': 0}, 'main': {'before': {'path': 'scripts/browser-reference-owner.mjs', 'sha256': '7f0ae434273c4d19aa1b533bfbe3a61d8ffd4e4d9eb9959ab40f31d441db28e5', 'bytes': 3026}, 'packet': {'path': 'compatibility/rc/c04-browser-owner-inputs.json', 'sha256': 'd22d4c657197ee2640dd1079861e54fde35e55b9091b7d44f4e024d4b37b46cb', 'bytes': 15192}, 'source_member_index': 0}}.items():
    REGRESSION_SOURCE_ANCHORS[line]['scripts/browser-reference-owner.mjs'] = anchor
    UPDATES[line] = (*UPDATES[line], 'scripts/browser-reference-owner.mjs')
SUPPORT = {line: (*paths, *('scripts/check-source-contract-regressions.py', 'scripts/rc_acceptance.py', 'compatibility/rc/matrices/full-verify.json', 'tests/test_source_contract_regressions.py', 'tests/test_source_contract_regression_gate.py', 'tests/test_rc_acceptance.py')) for line, paths in SUPPORT.items()}
SUPPORT = {line: tuple(dict.fromkeys((*paths, *(anchor['packet']['path'] for anchor in REGRESSION_SOURCE_ANCHORS[line].values())))) for line, paths in SUPPORT.items()}
SUPPORT = {line: (*paths, 'scripts/canonical-source-guard-plan.mjs', 'tests/canonical_source_guard_plan_probe.mjs', 'tests/test_canonical_source_guard_plan.py', *(('tests/base_class_guard_plan_probe.mjs', 'tests/test_base_class_guard_plan.py', 'compatibility/rc/21x-base-class-owner-guard-plan-transition-v2.json', 'compatibility/rc/21x-base-class-owner-guard-plan-transition-v3.json') if line == '21.x' else ())) for line, paths in SUPPORT.items()}
SUPPORT = {line: (*paths, 'tests/finite_reference_batch_probe.mjs', 'tests/test_finite_reference_batch.py', 'scripts/current-authored-roster-source.mjs', 'tests/roster_source_guard_node_probe.mjs', 'tests/current_roster_grouped_review_conformance.mjs', 'tests/test_current_roster_guard_node.py', 'tests/current_tool_guard_graph_probe.mjs', 'tests/test_current_tool_guard_graph.py') for line, paths in SUPPORT.items()}
SUPPORT['21.x'] = (*SUPPORT['21.x'], 'tests/table_static_reference_batch_probe.mjs', 'tests/table_guard_graph_probe.mjs', 'tests/source_lane_production_route_probe.mjs', 'tests/test_table_guard_graph.py', 'tests/legacy_stage_guard_graph_probe.mjs', 'tests/test_legacy_stage_guard_graph.py', 'tests/roster_source_lane_production_route_probe.mjs', 'tests/test_roster_source_lane_production_route.py')
SUPPORT = {line: (*paths, 'tests/test_current_sass_source.py', 'tests/current_sass_guard_node_probe.mjs', 'tests/test_current_sass_guard_node.py', 'tests/historical_repair_guard_node_probe.mjs', 'tests/test_historical_repair_guard_node.py') for line, paths in SUPPORT.items()}
SUPPORT['21.x'] = (*SUPPORT['21.x'], 'tests/legacy_original_source_guard_node_probe.mjs')
SUPPORT = {line: (*paths, 'tests/test_current_sass_ordinary_aggregate_gate.py') for line, paths in SUPPORT.items()}
UPDATES['21.x'] = (*UPDATES['21.x'], 'scripts/upstream-base-class-removal-admission.cjs')
SUPPORT['21.x'] = (*SUPPORT['21.x'], 'compatibility/rc/parent-base-admission-current-source-successor-v1.json', 'compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json')
SUPPORT['21.x'] = (*SUPPORT['21.x'], 'tests/test_base_class_removal_admission.py')
SUPPORT['21.x'] = (*SUPPORT['21.x'], 'scripts/upstream-base-class-removal-source.mjs', 'compatibility/rc/21x-base-class-removal-source-final-review.mjs')
SUPPORT = {line: (*paths, 'scripts/browser-required-cells.mjs', 'scripts/browser-zone-source-successor.mjs', 'compatibility/rc/parent-zone-binder-finite-transition-v1.json', 'tests/browser_zone_source_successor_probe.mjs', 'tests/test_browser_zone_source_successor.py') for line, paths in SUPPORT.items()}
SUPPORT['21.x'] = (*SUPPORT['21.x'], 'tests/source_binding_guard_graph_probe.mjs')
SUPPORT = {line: (*paths, 'scripts/tabs-finite-source-successor.mjs', 'compatibility/rc/parent-tabs-finite-source-successor-v1.json', 'compatibility/rc/parent-tabs-affected-source-use-reviews-v1.json.gz', 'compatibility/rc/c04-tabs-reversal-packet-v3.json', 'compatibility/rc/c04-tabs-reversal-evidence-eb68852f896222b29bfb08bdb4583b77b16bcbb3f907786144c8a467f31b5410.tar.gz', 'compatibility/rc/parent-tabs-authored-use-scan-' + ('21' if line == '21.x' else 'main') + '-v1.json.gz', 'tests/tabs_finite_source_successor_probe.mjs', 'tests/tabs_finite_source_successor_runner.py') for line, paths in SUPPORT.items()}
SUPPORT['21.x'] = (*SUPPORT['21.x'], 'compatibility/rc/parent-base-admission-tabs-source-successor-v1.json', 'tests/tabs_finite_source_successor_t16_probe.mjs', 'tests/tabs_finite_source_successor_t16_runner.py')
TABLE_STAGE = dict(path='scripts/table-local-compilation-canonical-stage.mjs', sha256='bdb3137f6db42ed2611ac3a41e400478defed7f0076d203061d1e12d03f63b7c', bytes=8231)
LEGACY_SOURCE = dict(path='scripts/legacy-removal-owner-source.mjs', sha256='b88708bb7ed441e24c6ed623371330426d6a947df83452ca343487767d2c9122', bytes=6628)
TABLE_PACKET = dict(path='compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', sha256='1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b', bytes=184121)
SOURCE_ANCHORS = {
    'scripts/upstream-base-class-removal-admission.cjs': dict(before=dict(path='scripts/upstream-base-class-removal-admission.cjs', sha256='013cbe4ae44ebebcf8331d2aedca972f15c824dd4e61bc795f0efa188d35b69a', bytes=14322), packet=dict(path='compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json', sha256='720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881', bytes=3578), member_key='handler'),
    'scripts/legacy-removal-canonical-stage.mjs': dict(before=dict(path='scripts/legacy-removal-canonical-stage.mjs', sha256='9b5021340fcab66f2c2b45447b5162f0e25b002b45c7ea7c062c8087dfb80d6c', bytes=8412), packet=dict(TABLE_PACKET), transition_index=1),
    'tests/test_packed_upstream_ledger_epoch.py': dict(before=dict(path='tests/test_packed_upstream_ledger_epoch.py', sha256='f7b3ae0ede9bd62fb033c49017a84d5b4ca81ce8b7920d72a105b1df1393e6df', bytes=17868), packet=dict(path='compatibility/rc/c04-inventory-owner-inputs.json', sha256='0d9dfac3813a6dc60644a090a2173ce56eaed1bcbdb32c2be29ce53f32413cdc', bytes=12144), source_member_index=9),
    'scripts/browser-reference-source.mjs': dict(before=dict(path='scripts/browser-reference-source.mjs', sha256='59f2ac538149e0d9b2176c231a97147862881fb19b46768a5a4e450d66f9fe38', bytes=10443), packet=dict(path='compatibility/rc/c04-browser-owner-inputs.json', sha256='710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', bytes=15193), transition_index=2),
    'tests/checker_reference_source_probe.mjs': dict(before=dict(path='tests/checker_reference_source_probe.mjs', sha256='d15e169d07033f25f089c2f50d78aa77f924879256674431d9c1cfa20660fe47', bytes=17054), packet=dict(TABLE_PACKET), transition_index=4),
    'scripts/browser-owner-source.mjs': dict(before=dict(path='scripts/browser-owner-source.mjs', sha256='f3eed08c7bc7d385a53ba2cabfeb35e4656e7f41871fab08b685104b1f0f84ad', bytes=6019), packet=dict(path='compatibility/rc/21x-legacy-removal-admission-owner-inputs.json', sha256='f64114770b458614c1251e8aae33b245999e64fee8ffa9216324e0f253bd4e0f', bytes=40975), transition_index=2),
    'scripts/checker-owner-source.mjs': dict(before=dict(path='scripts/checker-owner-source.mjs', sha256='0788290595d4c776ae958ebf8e0c110b281c3840f349d1be93b7e5b988a3567c', bytes=5220), packet=dict(path='compatibility/rc/c04-browser-owner-inputs.json', sha256='710201dd63bfb326485cd2933a9747d53f54b2cf833c47ce332816b0e0db526a', bytes=15193), transition_index=1),
    'scripts/checker-reference-proposal.mjs': dict(before=dict(path='scripts/checker-reference-proposal.mjs', sha256='22c49ba434ee0b1253ad2815b77510adb8259cc3f307005f6b66b73e522502ac', bytes=13095), packet=dict(path='compatibility/rc/c04-checker-owner-inputs.json', sha256='3ae63a5b436eab901a7ff22cb8ecc9043a5aea8d2fb89ebd9e7f396ea3105bf3', bytes=12073), transition_index=2),
    'tests/browser_reference_owner_probe.mjs': dict(before=dict(path='tests/browser_reference_owner_probe.mjs', sha256='4f5d024bfd072129ec819374131795fb3d77e3e6e419d5d1617eade28ff25463', bytes=13406), packet=dict(TABLE_PACKET), transition_index=9),
    'tests/test_browser_reference_owner.py': dict(before=dict(path='tests/test_browser_reference_owner.py', sha256='ffa0cb70dddc77825e971788b271a6caf6c3ad126f65c41e6b53d321fba50e64', bytes=4074), packet=dict(TABLE_PACKET), transition_index=10),
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def ref(path, raw):
    return dict(path=path, sha256=sha(raw), bytes=len(raw))


def physical(root, path):
    assert type(path) is str and path and '\\' not in path and '\0' not in path
    cursor = root
    assert cursor.is_dir() and not cursor.is_symlink()
    for part in path.split('/'):
        assert part not in ('', '.', '..')
        cursor /= part
        assert not cursor.is_symlink()
    assert cursor.is_file()
    return cursor.read_bytes()


def git_images(root, commit, paths):
    assert re.fullmatch('[0-9a-f]{40}', commit)
    assert len(set(paths)) == len(paths)
    for path in paths:
        assert path and '..' not in path and '\n' not in path and '\0' not in path and not path.startswith('/')
    env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null',
               GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
    raw = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'cat-file', '--batch'], cwd=root, env=env,
                                  input=('\n'.join(commit + ':' + path for path in paths) + '\n').encode())
    out, cursor = {}, 0
    for path in paths:
        end = raw.index(b'\n', cursor)
        blob, kind, length = raw[cursor:end].decode().split(' ')
        assert kind == 'blob'
        size = int(length)
        assert size >= 0
        body = raw[end + 1:end + size + 1]
        assert len(body) == size and raw[end + size + 1] == 10
        assert hashlib.sha1(b'blob ' + str(size).encode() + b'\0' + body).hexdigest() == blob
        out[path] = body
        cursor = end + size + 2
    assert cursor == len(raw)
    return out


def recipe(before, after):
    a, b = before.decode().splitlines(keepends=True), after.decode().splitlines(keepends=True)
    offsets, edits = [0], []
    for line in a:
        offsets.append(offsets[-1] + len(line.encode()))
    for tag, i, j, k, l in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag != 'equal':
            edits.append(dict(offset=offsets[i], before=''.join(a[i:j]), after=''.join(b[k:l])))
    cursor, parts = 0, []
    for edit in edits:
        offset, old = edit['offset'], edit['before'].encode()
        assert offset >= cursor and before[offset:offset + len(old)] == old
        parts.extend([before[cursor:offset], edit['after'].encode()])
        cursor = offset + len(old)
    assert b''.join([*parts, before[cursor:]]) == after
    return edits


def build(roots):
    packet = dict(schema_version=3, role='finite-current-sass-tool-reference-successor', previous_epoch=V2,
                  product_paths=[], historical_programs_executed=False, historical_reports_rewritten=0,
                  artifact_or_audit_admission_granted=False, branches={})
    snapshots = []
    for line, root in roots.items():
        paths = sorted(UPDATES[line])
        originals = git_images(root, CHECKPOINTS[line], [V1['path'], V2['path'], *paths])
        for frozen in (V1, V2):
            raw = physical(root, frozen['path'])
            assert ref(frozen['path'], raw) == frozen
            assert raw == originals[frozen['path']]
            snapshots.append((root, frozen, raw))
        previous = json.loads(originals[V2['path']])['branches'][line]
        registry = json.loads(physical(root, previous['historical_registry']['path']))
        assert ref(previous['historical_registry']['path'], physical(root, previous['historical_registry']['path'])) == {k: previous['historical_registry'][k] for k in ('path', 'sha256', 'bytes')}
        identities = {row['path']: dict(path=row['path'], **row['after']) for row in registry['tool_transitions']}
        identities[registry['unchanged_source_subject']['path']] = registry['unchanged_source_subject']
        identities.update({row['path']: row['after'] for row in previous['updates']})
        if line == '21.x':
            table_raw = physical(root, TABLE_PACKET['path'])
            assert ref(TABLE_PACKET['path'], table_raw) == TABLE_PACKET
            assert json.loads(table_raw)['code_transitions'][0]['after'] == LEGACY_SOURCE
            snapshots.append((root, TABLE_PACKET, table_raw))
            for anchor in SOURCE_ANCHORS.values():
                anchor_raw = physical(root, anchor['packet']['path'])
                assert ref(anchor['packet']['path'], anchor_raw) == anchor['packet']
                anchor_body = json.loads(anchor_raw)
                expected = anchor_body['source_members'][anchor['source_member_index']] if 'source_member_index' in anchor else (anchor_body[anchor['member_key']] if 'member_key' in anchor else anchor_body['code_transitions'][anchor['transition_index']]['after'])
                assert expected == anchor['before']
                snapshots.append((root, anchor['packet'], anchor_raw))
        for anchor in REGRESSION_SOURCE_ANCHORS[line].values():
            anchor_raw = physical(root, anchor['packet']['path'])
            assert ref(anchor['packet']['path'], anchor_raw) == anchor['packet']
            anchor_body = json.loads(anchor_raw)
            expected = anchor_body['source_members'][anchor['source_member_index']] if 'source_member_index' in anchor else (anchor_body[anchor['member_key']] if 'member_key' in anchor else anchor_body['code_transitions'][anchor['transition_index']]['after'])
            assert expected == anchor['before']
            snapshots.append((root, anchor['packet'], anchor_raw))
        updates = []
        for path in paths:
            before, after = originals[path], physical(root, path)
            predecessor = ref(path, before)
            exact_new = {TABLE_STAGE['path']: TABLE_STAGE, LEGACY_SOURCE['path']: LEGACY_SOURCE,
                         **{path: anchor['before'] for path, anchor in SOURCE_ANCHORS.items()},
                         **{path: anchor['before'] for path, anchor in REGRESSION_SOURCE_ANCHORS[line].items()}}
            assert predecessor == (exact_new[path] if path in exact_new else identities[path])
            updates.append(dict(path=path, before=predecessor, after=ref(path, after), edits=recipe(before, after)))
            snapshots.append((root, ref(path, after), after))
        additional = []
        for path in SUPPORT[line]:
            assert path not in FACTORIES and path != OUTPUT
            raw = physical(root, path)
            additional.append(ref(path, raw))
            snapshots.append((root, ref(path, raw), raw))
        packet['branches'][line] = dict(source_parent=CHECKPOINTS[line], updates=updates, additional_inputs=additional)
    for root, identity, raw in snapshots:
        assert physical(root, identity['path']) == raw
    return (json.dumps(packet, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root-21', type=Path, default=ROOTS['21.x'])
    parser.add_argument('--root-main', type=Path, default=ROOTS['main'])
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    roots = {'21.x': args.root_21, 'main': args.root_main}
    body = build(roots)
    digest = sha(body)
    if args.write:
        for root in roots.values():
            (root / OUTPUT).write_bytes(body)
            for path in FACTORIES:
                text = (root / path).read_text()
                pattern = r"(INPUTS_SHA = ')[0-9a-f]{64}(')" if path.endswith('.py') else r"(const INPUTS_SHA=')[0-9a-f]{64}(';)"
                text, count = re.subn(pattern, lambda match: match[1] + digest + match[2], text)
                assert count == 1
                (root / path).write_text(text)
        assert build(roots) == body
    packet = json.loads(body)
    print(json.dumps(dict(path=OUTPUT, sha256=digest, bytes=len(body), written=args.write,
                          branches={line: dict(updates=len(branch['updates']), additional_inputs=len(branch['additional_inputs'])) for line, branch in packet['branches'].items()}), indent=2))


if __name__ == '__main__':
    main()
