# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent finite proposal images and focused source-contract controls."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-base-class-removal-admission-'


class BaseClassRemovalAdmissionTest(unittest.TestCase):
    def test_current_source_contract(self):
        child = subprocess.run(
            ['node', 'tests/base_class_removal_admission_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['metadata_rejections'], 22)
        self.assertEqual(report['substituted_loaded_producer_rejections'], 8)
        self.assertEqual(report['metadata_reader_positive_cases'], 1)
        self.assertEqual(report['cold_metadata_reader_mutation_rejections'], 3)
        self.assertEqual(report['late_metadata_caller_mutation_rejections'], 3)
        self.assertEqual(report['late_metadata_reader_mutation_rejections'], 3)
        self.assertEqual(report['request_entry_replacement_rejections'], 1)
        self.assertEqual(report['explicit_null_proof_rejections'], 1)
        self.assertEqual(report['historical_acquisition_metadata_successor_cases'], 1)
        self.assertEqual(report['cold_physical_source_rejections'], 19)
        self.assertEqual(report['late_physical_source_rejections'], 19)
        self.assertEqual(report['projection_rejections'], 8)
        self.assertEqual(report['bound'], 1119)
        self.assertEqual(report['canonical_files_changed'], 0)
        self.assertFalse(report['full_owner_integration_qualified'])
        self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])

    def test_independent_unapplied_proposal_images(self):
        packet = json.loads((ROOT / (PREFIX + 'canonical-proposal-v6.json')).read_bytes())

        def image(key, content):
            ref = packet[key]
            raw = (ROOT / ref['path']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), ref['sha256'])
            self.assertEqual(len(raw), ref['bytes'])
            decoded = gzip.decompress(raw)
            self.assertEqual(hashlib.sha256(decoded).hexdigest(), packet[content]['sha256'])
            self.assertEqual(len(decoded), packet[content]['bytes'])
            return decoded

        before_raw = image('ledger_before_image', 'before')
        after_raw = image('ledger_after_image', 'after')
        registry_before = image('registry_before_image', 'registry_before')
        registry_after = image('registry_after_image', 'registry_after')
        before, after = json.loads(before_raw), json.loads(after_raw)
        self.assertEqual(len(before['entries']), 1697)
        self.assertEqual(len(after['entries']), 1697)
        prior = {row['sha']: row for row in before['entries']}
        current = {row['sha']: row for row in after['entries']}
        self.assertEqual(len(prior), 1697)
        self.assertEqual(list(prior), list(current))
        changed = [sha for sha in prior if prior[sha] != current[sha]]
        self.assertEqual(changed, [packet['sha']])
        self.assertEqual([row for row in before['entries'] if row['final_disposition'] == 'security-review'],
                         [row for row in after['entries'] if row['final_disposition'] == 'security-review'])
        self.assertEqual(sum(row['final_disposition'] == 'security-review' for row in after['entries']), 1)
        before_header = {key: value for key, value in before.items() if key != 'entries'}
        after_header = {key: value for key, value in after.items() if key != 'entries'}
        self.assertEqual({key for key in before_header if before_header[key] != after_header[key]},
                         {'closed_dispositions', 'open_or_deferred'})
        self.assertEqual((before_header['closed_dispositions'], before_header['open_or_deferred']), (426, 1271))
        self.assertEqual((after_header['closed_dispositions'], after_header['open_or_deferred']), (427, 1270))
        old, new = prior[packet['sha']], current[packet['sha']]
        self.assertEqual({key for key in set(old) | set(new) if old.get(key) != new.get(key)},
                         {'final_disposition', 'reason', 'read_note_disposition', 'review_depth', 'evidence_report', 'individual_proof'})
        self.assertEqual(new['final_disposition'], 'do-not-adopt')
        self.assertEqual(new['read_note_disposition'], 'owned-retained')
        self.assertEqual(new['g11_claim'], 'not-passed')
        scope = new['individual_proof']['base_class_removal_source_scope']
        # Review bytes remain current; the handler identity in the v6 proof is
        # historical DATA. Current executable admission is independently pinned
        # by the exact successor packet and checked below, never read as old.
        review = packet['review']
        review_raw = (ROOT / review['path']).read_bytes()
        self.assertEqual(hashlib.sha256(review_raw).hexdigest(), review['sha256'])
        self.assertEqual(len(review_raw), review['bytes'])
        env = dict(os.environ, GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
        for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
            env.pop(key, None)
        def git_data(parent, path):
            return subprocess.check_output([
                'git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                'show', parent + ':' + path], cwd=ROOT, env=env)
        # The immutable proposal names the original pure-stage program. It is
        # authenticated as Git DATA; the current program must equal that exact
        # prefix plus the independently owned, pinned extension template.
        leaf = (ROOT / 'scripts/base-class-removal-owner-source.mjs').read_bytes()
        pins = re.findall(rb"^const INPUTS_SHA256 = '([a-f0-9]{64})';$", leaf, re.M)
        self.assertEqual(len(pins), 1)
        owner_raw = (ROOT / (PREFIX + 'owner-inputs-v1.json')).read_bytes()
        self.assertEqual(hashlib.sha256(owner_raw).hexdigest(), pins[0].decode())
        owner = json.loads(owner_raw)
        stage_ref = owner['stage_before']
        self.assertEqual({key: stage_ref[key] for key in ('path', 'sha256', 'bytes')}, packet['stage'])
        original = git_data(owner['source_parent'], stage_ref['path'])
        self.assertEqual(hashlib.sha256(original).hexdigest(), stage_ref['sha256'])
        self.assertEqual(len(original), stage_ref['bytes'])
        self.assertEqual(hashlib.sha1(b'blob ' + str(len(original)).encode() + b'\0' + original).hexdigest(),
                         stage_ref['git_blob'])
        successor_raw = (ROOT / 'compatibility/rc/parent-base-admission-current-source-successor-v1.json').read_bytes()
        successor_pin = re.findall(rb"sha256: '([a-f0-9]{64})', bytes: 20020", leaf)
        self.assertEqual(len(successor_pin), 1)
        self.assertEqual(hashlib.sha256(successor_raw).hexdigest(), successor_pin[0].decode())
        successor = json.loads(successor_raw)
        self.assertEqual(successor['source_parent'], owner['source_parent'])
        self.assertEqual(successor['historical_proposal'], owner['proposal'])
        self.assertEqual({key: successor['code_transitions'][0]['before'][key] for key in ('path', 'sha256', 'bytes')}, packet['handler'])
        for row in successor['code_transitions']:
            old = git_data(successor['source_parent'], row['path'])
            self.assertEqual(hashlib.sha256(old).hexdigest(), row['before']['sha256'])
            self.assertEqual(len(old), row['before']['bytes'])
            self.assertEqual(hashlib.sha1(b'blob ' + str(len(old)).encode() + b'\0' + old).hexdigest(), row['before']['git_blob'])
            cursor, parts = 0, []
            for edit in row['edits']:
                offset, literal = edit['offset'], edit['before'].encode()
                self.assertGreaterEqual(offset, cursor)
                self.assertEqual(old[offset:offset + len(literal)], literal)
                parts.extend((old[cursor:offset], edit['after'].encode()))
                cursor = offset + len(literal)
            rebuilt = b''.join([*parts, old[cursor:]])
            self.assertEqual(rebuilt, (ROOT / row['path']).read_bytes())
            self.assertEqual(hashlib.sha256(rebuilt).hexdigest(), row['after']['sha256'])
            self.assertEqual(len(rebuilt), row['after']['bytes'])
        template = owner['stage_extension_template']
        transition_raw = (ROOT / 'compatibility/rc/21x-base-class-owner-guard-plan-transition-v3.json').read_bytes()
        self.assertEqual(hashlib.sha256(transition_raw).hexdigest(), '879dd05cc50b934d8cfe2a7bfa816ce598ad9cb172272ca7b5dfa2f5087feb71')
        transition = json.loads(transition_raw)
        self.assertEqual(hashlib.sha256(template.encode()).hexdigest(), transition['old_extension_template']['sha256'])
        self.assertEqual(len(template.encode()), transition['old_extension_template']['bytes'])
        for edit in transition['literal_edits']:
            self.assertEqual(template.count(edit['old']), edit['occurrences'])
            template = template.replace(edit['old'], edit['new'])
        self.assertEqual(hashlib.sha256(template.encode()).hexdigest(), transition['new_extension_template']['sha256'])
        self.assertEqual(len(template.encode()), transition['new_extension_template']['bytes'])
        self.assertEqual(template.count('__BASE_OWNER_IMAGE_SHA256__'), 1)
        extension = template.replace('__BASE_OWNER_IMAGE_SHA256__', hashlib.sha256(leaf).hexdigest()).encode()
        self.assertEqual((ROOT / stage_ref['path']).read_bytes(), original + extension)
        self.assertEqual(scope['repaired_source_or_API_paths'], 5)
        self.assertEqual(scope['historical_source_bindings'], 715)
        self.assertTrue(scope['source_scope_only'])
        self.assertFalse(scope['canonical_admission_granted'])
        self.assertFalse(scope['actual_native_packed_browser_floor_or_full_audit_qualified'])
        record = re.compile(rb"  \{sha:'([^']+)',proof_kind:'([^']+)',\n    scope_key:'([^']+)',module:'([^']+)'\},\n")
        old_records, new_records = record.findall(registry_before), record.findall(registry_after)
        self.assertEqual(len(old_records), 69)
        self.assertEqual(len(new_records), 70)
        self.assertEqual(old_records, new_records[:-1])
        added = [match for match in record.finditer(registry_after) if match.group(1) == packet['sha'].encode()]
        self.assertEqual(len(added), 1)
        self.assertEqual(registry_after[:added[0].start()] + registry_after[added[0].end():], registry_before)
        physical_ledger = (ROOT / packet['before']['path']).read_bytes()
        physical_registry = (ROOT / packet['registry_before']['path']).read_bytes()
        self.assertIn(physical_ledger, (before_raw, after_raw))
        self.assertIn(physical_registry, (registry_before, registry_after))
        if physical_ledger == after_raw:
            self.assertEqual(physical_registry, registry_after)
        self.assertFalse(packet['canonical_ledger_applied'])
        self.assertFalse(packet['canonical_registry_applied'])
        self.assertFalse(packet['full_owner_integration_qualified'])


if __name__ == '__main__':
    unittest.main()
