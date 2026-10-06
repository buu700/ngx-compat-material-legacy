"""The schematic and parity routes retain distinct, fixed fixture rosters."""
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class PackagedSchematicTests(unittest.TestCase):
    def test_both_frontend_rosters_cover_all_source_fixtures_and_have_distinct_ids(self):
        fixtures=json.loads((ROOT/'fixtures/migration/cases.json').read_text())['cases']
        selected=[c['id'] for c in fixtures if isinstance(c.get('expected_after'),str) and c['expected_after']!=c['before'] and c.get('expect_ok') is not False]
        line='main' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('22.') else '21.x'
        matrix=json.loads((ROOT/'compatibility/rc/matrices/full-verify.json').read_text());row=next(r for r in matrix['checks'] if r['check_id']=='migration-packaged');groups=row['acceptance']['cases_by_line'][line]
        for group in ['frontend-parity','packaged-schematic']:self.assertEqual(groups[group],[group+'/'+id for id in selected])
        self.assertFalse(set(groups['frontend-parity'])&set(groups['packaged-schematic']))
        self.assertEqual(row['acceptance']['subject_ids'],['library','migrate-cli'])
if __name__=='__main__':unittest.main()
