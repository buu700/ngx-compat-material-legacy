from __future__ import annotations
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);assert spec and spec.loader
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m

closure=load('source_closure','source-closure.py')
policy=load('api_policy','check-upstream-api-policy.py')
pins=load('workflow_pins','check-workflow-pins.py')
seal=load('seal_reference','seal-reference.py')
deltas=load('upstream_deltas','list-upstream-deltas.py')

class SourceClosureChecks(unittest.TestCase):
    def test_relative_styles_sass_and_boundary_edges(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);subprocess.run(['git','init','-b','main',str(p)],check=True,capture_output=True)
            subprocess.run(['git','-C',str(p),'config','user.name','Fixture'],check=True)
            subprocess.run(['git','-C',str(p),'config','user.email','fixture@example.invalid'],check=True)
            legacy=p/'src/material/legacy-select';legacy.mkdir(parents=True)
            ordinary=p/'src/material/select';ordinary.mkdir(parents=True)
            (legacy/'select.ts').write_text("import {Thing} from '../select/thing';\nimport {Overlay} from '@angular/cdk/overlay';\n@Component({templateUrl:'./select.html', styleUrls:['./select.scss']}) export class X {}\n")
            (legacy/'select.html').write_text('<div></div>')
            (legacy/'select.scss').write_text("@use '../select/shared';\n.x{}\n")
            (ordinary/'thing.ts').write_text('export class Thing {}\n')
            (ordinary/'_shared.scss').write_text('.shared{}\n')
            subprocess.run(['git','-C',str(p),'add','.'],check=True)
            subprocess.run(['git','-C',str(p),'commit','-m','fixture'],check=True,capture_output=True)
            subprocess.run(['git','-C',str(p),'tag','16.2.14'],check=True)
            r=closure.inventory(p,'16.2.14',['src/material/legacy-select/select.ts','src/material/legacy-select/select.scss'])
            targets={e['to'] for e in r['edges']}
            self.assertIn('src/material/select/thing.ts',targets)
            self.assertIn('src/material/select/_shared.scss',targets)
            self.assertIn('src/material/legacy-select/select.html',targets)
            classes={e['classification'] for e in r['boundary_edges']}
            self.assertIn('ordinary-material-tree',classes)
            self.assertIn('cdk-package',classes)

class UpstreamPolicyChecks(unittest.TestCase):
    def policy_data(self):return json.loads((ROOT/'research/upstream-api-policy.json').read_text())
    def test_stable_public_allowed(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);(p/'x.ts').write_text("import {Overlay} from '@angular/cdk/overlay';\nimport {MatRipple} from '@angular/material/core';")
            self.assertTrue(policy.scan(p,self.policy_data())['ok'])
    def test_private_animation_and_m2_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);(p/'x.ts').write_text("import {_MatSelectBase} from '@angular/material/select';\nimport {trigger} from '@angular/animations';")
            (p/'x.scss').write_text("@use '@angular/material' as mat;\n$x: mat.m2-define-palette(());")
            r=policy.scan(p,self.policy_data());self.assertFalse(r['ok'])
            rules={v['rule'] for v in r['violations']}
            self.assertIn('forbidden-module',rules);self.assertIn('forbidden-symbol-prefix',rules);self.assertIn('forbidden-sass-pattern',rules)

class WorkflowPinChecks(unittest.TestCase):
    def test_sha_and_local_allowed_tag_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);w=p/'.github/workflows';w.mkdir(parents=True)
            (w/'ci.yml').write_text("steps:\n - uses: actions/checkout@v4\n - uses: ./local-action\n - uses: owner/action@0123456789abcdef0123456789abcdef01234567\n")
            r=pins.scan(p);self.assertFalse(r['ok']);self.assertEqual(r['violation_count'],1)
            (w/'ci.yml').write_text("steps:\n - uses: actions/checkout@0123456789abcdef0123456789abcdef01234567\n - uses: ./local-action\n")
            self.assertTrue(pins.scan(p)['ok'])

    def test_docker_action_requires_digest(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td); w=p/'.github/workflows'; w.mkdir(parents=True)
            (w/'ci.yml').write_text('steps:\n - uses: docker://alpine:latest\n')
            self.assertFalse(pins.scan(p)['ok'])
            (w/'ci.yml').write_text('steps:\n - uses: docker://alpine@sha256:'+'a'*64+'\n')
            self.assertTrue(pins.scan(p)['ok'])

class ReferenceSealChecks(unittest.TestCase):
    def test_create_verify_and_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);(p/'api.txt').write_text('v16 api')
            self.assertTrue(seal.create(p)['ok']);self.assertTrue(seal.verify(p)['ok'])
            (p/'api.txt').write_text('changed');self.assertFalse(seal.verify(p)['ok'])
    def test_symlink_refused(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);(p/'a').write_text('x');(p/'b').symlink_to(p/'a')
            with self.assertRaises(ValueError):seal.create(p)

class SassValueRunnerChecks(unittest.TestCase):
    def test_help_without_dependencies(self):
        r=subprocess.run(['node',str(ROOT/'scripts/run-sass-value-fixtures.mjs'),'--help'],text=True,capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)
    def test_fake_compiler_debug_capture(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);env=p/'env';(env/'node_modules/sass').mkdir(parents=True)
            (env/'package.json').write_text('{}')
            (env/'node_modules/sass/package.json').write_text(json.dumps({'name':'sass','version':'0.0.0-test','main':'index.js'}))
            (env/'node_modules/sass/index.js').write_text("exports.info='SYNTHETIC';exports.compileString=(s,o)=>{o.logger.debug('MAP:(primary: red)');return {css:'.x{}\\n'};};")
            f=p/'fixtures';f.mkdir();(f/'v.scss').write_text("@use '@angular/material' as mat;\n@debug 1;")
            (f/'manifest.json').write_text(json.dumps({'cases':[{'id':'v','file':'v.scss','capture_debug':True}]}))
            out=p/'out';r=subprocess.run(['node',str(ROOT/'scripts/run-sass-value-fixtures.mjs'),'--environment',str(env),'--module','@angular/material','--output',str(out),'--fixtures',str(f)],text=True,capture_output=True)
            self.assertEqual(r.returncode,0,r.stderr)
            report=json.loads((out/'sass-value-report.json').read_text())
            self.assertEqual(report['fixtures'][0]['debug'],['MAP:(primary: red)'])


class UpstreamDeltaChecks(unittest.TestCase):
    def test_lists_only_relevant_path_commits(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);subprocess.run(['git','init','-b','main',str(p)],check=True,capture_output=True)
            for k,v in [('user.name','Fixture'),('user.email','fixture@example.invalid')]:subprocess.run(['git','-C',str(p),'config',k,v],check=True)
            a=p/'src/material/select';a.mkdir(parents=True);(a/'x.ts').write_text('one\n')
            subprocess.run(['git','-C',str(p),'add','.'],check=True);subprocess.run(['git','-C',str(p),'commit','-m','baseline'],check=True,capture_output=True);subprocess.run(['git','-C',str(p),'tag','16.2.14'],check=True)
            (a/'x.ts').write_text('two\n');subprocess.run(['git','-C',str(p),'commit','-am','select fix'],check=True,capture_output=True)
            b=p/'unrelated';b.mkdir();(b/'x').write_text('x');subprocess.run(['git','-C',str(p),'add','.'],check=True);subprocess.run(['git','-C',str(p),'commit','-m','unrelated'],check=True,capture_output=True)
            r=deltas.inventory(p,'16.2.14','HEAD',['src/material/select'])
            self.assertEqual(r['commit_count'],1);self.assertEqual(r['commits'][0]['subject'],'select fix')
            self.assertEqual(r['inventory_role'],'research-only')
            self.assertFalse(r['selects_release_baseline'])
            self.assertEqual(r['commits'][0]['review_status'],'unreviewed')
            self.assertEqual(r['review_policy_file'],'research/upstream-audit-policy.json')

class PolicyDataChecks(unittest.TestCase):
    def test_legacy_version_semantics(self):
        data=json.loads((ROOT/'research/legacy-core-delegation.json').read_text())
        items=data if isinstance(data,list) else data.get('aliases',data.get('items',data.get('symbols',[])))
        matches=[x for x in items if x.get('historical_export')=='LEGACY_VERSION' or x.get('symbol')=='LEGACY_VERSION' or x.get('name')=='LEGACY_VERSION']
        self.assertTrue(matches)
        self.assertTrue(any('VERSION' in json.dumps(x) and 'peer material version' in json.dumps(x).lower() for x in matches))
        theme=[x for x in items if x.get('historical_export')=='LegacyThemePalette']
        self.assertTrue(theme)
        self.assertTrue(all(x.get('initial_disposition')=='owned-structural-type' and x.get('candidate_module') is None for x in theme))
    def test_support_policy_and_pnpm_age(self):
        s=json.loads((ROOT/'research/support-policy.json').read_text());self.assertEqual([x['package_major'] for x in s['lines']],[22,21])
        y=(ROOT/'templates/pnpm-workspace.yaml').read_text();self.assertRegex(y,r'minimumReleaseAge:\s*10080')
    def test_current_bridge_worksheets_complete(self):
        names={'badge','bottom-sheet','button-toggle','datepicker','divider','expansion','grid-list','icon','sidenav','stepper','sort','toolbar','tree'}
        present={p.stem.removeprefix('current-bridge-') for p in (ROOT/'work-items').glob('current-bridge-*.md')}
        self.assertEqual(present,names)

if __name__=='__main__':unittest.main()
