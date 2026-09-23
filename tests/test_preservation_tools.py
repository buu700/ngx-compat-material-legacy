from __future__ import annotations
import hashlib
import importlib.util
import json
import subprocess
import tempfile
import unittest
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def load(name,file):
    s=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
css=load('css_compare','compare-css.py');inv=load('source_inventory','inventory-source.py')

class CSSChecks(unittest.TestCase):
    def test_exact_and_line_endings(self):
        self.assertTrue(css.compare({'x.css':css.canonical(b'.a{color:red}\r\n')},{'x.css':'.a{color:red}\n'})['ok'])
    def test_no_sorting_of_declarations(self):
        self.assertFalse(css.compare({'x.css':'.a{color:red;color:blue}'},{'x.css':'.a{color:blue;color:red}'})['ok'])
    def test_no_sorting_of_selectors(self):
        self.assertFalse(css.compare({'x.css':'.a{color:red}.b{color:blue}'},{'x.css':'.b{color:blue}.a{color:red}'})['ok'])
    def test_descendant_space_is_significant(self):
        self.assertFalse(css.compare({'x.css':'.a .b{color:red}'},{'x.css':'.a.b{color:red}'})['ok'])
    def test_missing_file_blocks(self):
        self.assertFalse(css.compare({'x.css':'a{}'},{})['ok'])
    def test_empty_comparison_not_pass(self):
        self.assertFalse(css.compare({},{})['ok'])
    def test_core_noop_detected(self):
        self.assertFalse(css.compare({'core.css':'.cdk-overlay-container{position:fixed}'},{'core.css':''})['ok'])
    def test_approval_needs_evidence_and_matching_fixture(self):
        a='.x{opacity:0}';b='.x{opacity:1}';h='a'*64
        item={'file':'x.css','baseline_sha256':css.sha(a),'candidate_sha256':css.sha(b),'fixture_sha256':h,'reason':'Synthetic approved fixture','approved_by':'test-reviewer','category':'motion','test_evidence':['test:synthetic']}
        self.assertTrue(css.compare({'x.css':a},{'x.css':b},[item],{'x.css':h})['ok'])
        self.assertEqual(css.compare({'x.css':a},{'x.css':b},[item],{'x.css':h})['reviewed_difference_count'],1)
        self.assertFalse(css.compare({'x.css':a},{'x.css':b},[item],{'x.css':'b'*64})['ok'])
        self.assertFalse(css.compare({'x.css':a},{'x.css':b},[item])['ok'])
        item.pop('test_evidence');self.assertFalse(css.compare({'x.css':a},{'x.css':b},[item],{'x.css':h})['ok'])
    def test_wildcard_approval_rejected(self):
        self.assertFalse(css.compare({'x.css':'a'},{'x.css':'b'},[{'file':'*.css'}])['ok'])
    def test_symlink_refused(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t);(p/'a.css').write_text('a{}');(p/'b.css').symlink_to(p/'a.css')
            with self.assertRaises(ValueError):css.read_css(p)

class InventoryChecks(unittest.TestCase):
    def test_named_forwards_and_wildcard(self):
        s="// comment\n@forward './one' show define-palette, $red-palette;\n@forward './two' as legacy-* show legacy-theme;\n@forward './three' as private-*;"
        r=inv.named_forwards(s)
        self.assertEqual(r['explicit_named_exports'],['$red-palette','define-palette','legacy-theme'])
        self.assertEqual(sum(x['requires_resolution'] for x in r['forwards']),1)
    def test_read_tag_without_checkout_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);subprocess.run(['git','init',str(p)],check=True,capture_output=True)
            for k,v in [('user.name','Fixture'),('user.email','fixture@example.invalid')]:inv.git(p,'config',k,v)
            d=p/'src/material/legacy-button';d.mkdir(parents=True)
            (d/'public-api.ts').write_text("export {MatLegacyButton} from './button';")
            (d/'button.ts').write_text("import {_MatButtonBase} from '@angular/material/button';\nexport class MatLegacyButton {}")
            (d/'button.spec.ts').write_text('// test fixture')
            (p/'src/material/_index.scss').write_text("@forward './palette' show $red-palette;")
            inv.git(p,'add','.');inv.git(p,'commit','-m','fixture');inv.git(p,'tag','16.2.14')
            (d/'button.ts').write_text('uncommitted working tree content')
            r=inv.inventory(p,'16.2.14')
            self.assertEqual(r['entry_point_count'],1)
            self.assertEqual(r['entries'][0]['angular_import_leads'],['@angular/material/button'])
            self.assertEqual((d/'button.ts').read_text(),'uncommitted working tree content')
            self.assertEqual(r['root_sass']['explicit_named_exports'],['$red-palette'])
    def test_unsafe_ref_rejected(self):
        with self.assertRaises(ValueError):inv.inventory(Path('.'),'--all')
        with self.assertRaises(ValueError):inv.inventory(Path('.'),'main:../../x')

class HandoffDataChecks(unittest.TestCase):
    def test_sass_seed_names_unique(self):
        r=json.loads((ROOT/'research/sass-symbols.json').read_text())['entries'];names=[x['symbol'] for x in r]
        self.assertEqual(len(names),len(set(names)))
        for n in ['$red-palette','core','legacy-core','all-legacy-component-themes','legacy-paginator-theme','legacy-table-theme']:
            self.assertIn(n,names)
    def test_every_entry_has_worksheet(self):
        r=json.loads((ROOT/'research/scope.json').read_text())['preserved_entry_points']
        self.assertEqual(len(r),22)
        for ep in r:self.assertTrue((ROOT/'work-items'/f'{ep}.md').is_file())
    def test_fixture_module_replacement_is_unambiguous(self):
        m=json.loads((ROOT/'fixtures/sass/manifest.json').read_text());seen=set()
        for c in m['cases']:
            self.assertNotIn(c['id'],seen);seen.add(c['id'])
            s=(ROOT/'fixtures/sass'/c['file']).read_text();self.assertEqual(s.count("'@angular/material'"),1)
            self.assertIn(c['comparison'],['strict','bridge-review'])
    def test_legacy_migration_cases_do_not_rewrite_palette(self):
        r=json.loads((ROOT/'fixtures/migration/cases.json').read_text())['cases']
        case=next(c for c in r if c['id']=='explicit-sass-namespace')
        self.assertEqual(case['before'].replace('@angular/material','@ngx-compat/material-legacy'),case['expected_after'])
    def test_bootstrap_default_makes_no_write(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'not-created'
            r=subprocess.run([sys.executable,str(ROOT/'scripts/bootstrap-material.py'),'--destination',str(p)],text=True,capture_output=True)
            self.assertEqual(r.returncode,0,r.stderr);self.assertFalse(p.exists());self.assertEqual(json.loads(r.stdout)['mode'],'dry-run')

class SassRunnerWiringChecks(unittest.TestCase):
    def test_runner_wiring_with_fake_compiler_not_sass_validation(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);env=p/'environment';env.mkdir();(env/'package.json').write_text('{"private":true}')
            module=env/'node_modules/sass';module.mkdir(parents=True)
            (module/'package.json').write_text('{"name":"sass","version":"0.0.0-synthetic","main":"index.js"}')
            (module/'index.js').write_text("exports.info='SYNTHETIC TEST DOUBLE';exports.compileString=(s,o)=>{if(!s.includes('@ngx-compat/material-legacy'))throw Error('bad target');return {css:'.synthetic {color:red;}\\n'};};")
            fixtures=p/'fixtures';fixtures.mkdir()
            (fixtures/'one.scss').write_text("@use '@angular/material' as mat;")
            (fixtures/'manifest.json').write_text(json.dumps({'cases':[{'id':'one','file':'one.scss','comparison':'strict'}]}))
            cmd=['node',str(ROOT/'scripts/run-sass-fixtures.mjs'),'--environment',str(env),'--module','@ngx-compat/material-legacy','--output',str(p/'output'),'--fixtures',str(fixtures)]
            r=subprocess.run(cmd,text=True,capture_output=True);self.assertEqual(r.returncode,0,r.stderr)
            report=json.loads((p/'output/compile-report.json').read_text());self.assertEqual(report['sass'],'SYNTHETIC TEST DOUBLE');self.assertEqual(report['failures'],0)
            r2=subprocess.run(cmd,text=True,capture_output=True);self.assertNotEqual(r2.returncode,0)
    def test_help_works_without_dependencies(self):
        r=subprocess.run(['node',str(ROOT/'scripts/run-sass-fixtures.mjs'),'--help'],text=True,capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)

if __name__=='__main__':unittest.main()
