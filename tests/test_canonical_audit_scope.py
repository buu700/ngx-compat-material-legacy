"""The common frozen population is authenticated, complete and never a floor selection."""
import hashlib
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
PINS={'compatibility/f10/upstream-sha-risk-bootstrap.json':'400e89f53e41975dd5056158c60bdac2e4a2c9dcabaee1204eda782492f5f456','compatibility/f10/authored-dependency-inventory-seed.json':'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b','compatibility/inventories/upstream-delta-inventory-16.2.14-to-v22.2.0.json':'6ddec0dcf4fd1c03b648d89d37f3c6e62c6f256d248c38e0e1c8221802e1cdd6'}
class CanonicalAuditScopeTests(unittest.TestCase):
    def test_exact_frozen_inputs_and_population(self):
        scope=json.loads((ROOT/'compatibility/f10/canonical-audit-scope.json').read_text())
        self.assertFalse(scope['selects_release_baseline'])
        self.assertEqual({r['path']:r['sha256'] for r in scope['inputs']},PINS)
        for record in scope['inputs']:
            data=(ROOT/record['path']).read_bytes();self.assertEqual(hashlib.sha256(data).hexdigest(),PINS[record['path']]);self.assertEqual(len(data),record['bytes'])
        seed=json.loads((ROOT/'compatibility/f10/upstream-sha-risk-bootstrap.json').read_text())
        delta=json.loads((ROOT/seed['source_inventory']).read_text())
        ledger=json.loads((ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_text())
        sets=[{r['sha'] for r in value} for value in [seed['commits'],delta['commits'],ledger['entries']]]
        self.assertEqual(len(sets[0]),1697);self.assertEqual(sets[0],sets[1]);self.assertEqual(sets[0],sets[2]);self.assertEqual(len(ledger['entries']),1697)
        symbols=json.loads((ROOT/'compatibility/f10/authored-dependency-inventory-seed.json').read_text())
        self.assertEqual(len(symbols['symbol_uses']),1736);self.assertTrue(all(u['disposition']!='closed' for u in symbols['symbol_uses']))
        self.assertEqual(scope['g11_claim'],'not-passed')
        line='main' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('22.') else '21.x'
        floor=scope['release_floors'][line]
        manifest=json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())
        self.assertEqual(manifest['peerDependencies']['@angular/material'],'^'+floor['material'])
        self.assertEqual(manifest['peerDependencies']['@angular/cdk'],'^'+floor['cdk'])
        self.assertEqual(manifest['peerDependencies']['@angular/core'],'^'+floor['framework'])
        if line=='21.x':
            final=[e for e in ledger['entries'] if e['final_disposition']!='needs-individual-review']
            self.assertEqual(ledger['closed_dispositions'],len(final));self.assertEqual(ledger['open_or_deferred'],1697-len(final))
            for entry in final:
                evidence=json.loads((ROOT/entry['evidence_report']).read_text())
                if 'reviews' in evidence:
                    self.assertTrue(any(r['sha']==entry['sha'] and r['decision']==entry['reason'] for r in evidence['reviews']))
                else:
                    # An individual compatibility review has one SHA subject,
                    # not a documentation batch with a reviews array.
                    self.assertEqual(evidence['sha'],entry['sha'])
                    self.assertEqual(evidence['decision'],entry['reason'])
                    self.assertEqual(evidence['line'],line)
                    self.assertEqual(evidence['review_depth'],'individual-compatibility')
                    self.assertEqual(evidence['diff_sha256'],entry['individual_proof']['diff_sha256'])
                    self.assertEqual(evidence['final_disposition'],entry['final_disposition'])
                    self.assertEqual(evidence['g11_claim'],'not-passed')
