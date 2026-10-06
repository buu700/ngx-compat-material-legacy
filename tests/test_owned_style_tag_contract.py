"""Owned stylesheet semantics stay equal to the untouched Material 16.2.14 tag."""
import hashlib
import json
import re
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
PINNED={'owned-style-sources/legacy-select/_select-theme.scss':'42f5d0d0aa21b2034cee66aa1b022ffd7b6d7f17ad7f636bc2490cd4ccbdccc8',
'owned-style-sources/legacy-snack-bar/_snack-bar-theme.scss':'b9a6613433a84b02035c6252dd226d31cc74eb71c5dcb68ce76e012579a848bf'}
class OwnedStyleTagContractTests(unittest.TestCase):
    def test_owned_sources_keep_tagged_semantics_and_reference_identity(self):
        provenance=json.loads((ROOT/'reference/material-16.2.14/owned-style-source-provenance.json').read_text())
        self.assertEqual(provenance['commit'],'df60e733c60e572ba538f6ad0ceff3e63e527b53')
        self.assertEqual({f['path']:f['sha256'] for f in provenance['files']},PINNED)
        for record in provenance['files']:
            sealed=ROOT/'reference/material-16.2.14'/record['path'];data=sealed.read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(),PINNED[record['path']])
            self.assertEqual(len(data),record['bytes'])
            # Only the repository's historical helper module relocation is allowed.
            expected=data.decode().replace("@use '../core/", "@use '../styles/core/")
            candidate=ROOT/'projects/ngx-material-legacy'/record['path'].removeprefix('owned-style-sources/')
            self.assertEqual(candidate.read_text(),expected)
            # Follow the actual finite public facade, not only the component-side source copy.
            family=Path(record['path']).parts[1]
            mixin=Path(record['path']).name.removeprefix('_').removesuffix('.scss')
            facade=(ROOT/'projects/ngx-material-legacy/_index.scss').read_text()
            self.assertRegex(facade, re.escape("@forward './styles/"+family+'/'+mixin+"'"))
            public_source=ROOT/'projects/ngx-material-legacy/styles'/family/Path(record['path']).name
            self.assertEqual(public_source.read_bytes(),data)

    def test_datepicker_button_compat_keeps_original_typography(self):
        reference=ROOT/'reference/material-16.2.14/owned-style-sources/button/_button-theme.scss'
        source=reference.read_bytes()
        provenance=json.loads((ROOT/'reference/material-16.2.14/button-source-provenance.json').read_text())
        self.assertEqual(hashlib.sha256(source).hexdigest(),'b93e286acf1b868ac911ad1d82adcc0d23752edea047e92e45ae3570980e034a')
        self.assertEqual(provenance['sha256'],'b93e286acf1b868ac911ad1d82adcc0d23752edea047e92e45ae3570980e034a')
        self.assertEqual(len(source),provenance['bytes'])
        self.assertEqual(provenance['package_tarball_sha256'],'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b')
        candidate=(ROOT/provenance['candidate']).read_text()
        self.assertEqual(candidate,source.decode().replace("@use '@material/", "@use '../vendor/mdc/"))
        self.assertNotIn('line-height: inherit',candidate)
        compat=(ROOT/'projects/ngx-material-legacy/styles/datepicker/_datepicker-legacy-compat.scss').read_text()
        self.assertIn('@include button-theme.theme($theme)',compat)
        self.assertIn('.mat-datepicker-content',compat)
