"""Reject real bundled-declaration and namespace annotation bypasses."""
import json
import importlib.util
from pathlib import Path
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('source_policy',ROOT/'scripts/check-source-policy.py')
POLICY=importlib.util.module_from_spec(spec);spec.loader.exec_module(POLICY)

class PeerAnnotationTests(unittest.TestCase):
    def fixture(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup);root=Path(temp.name)
        authored=root/'src';authored.mkdir();peers=root/'node_modules/@angular';peers.mkdir(parents=True)
        for package in ('core','cdk','material'):
            (peers/package).mkdir()
            (peers/package/'package.json').write_text(json.dumps({'exports':{'.':{'types':'./index.d.ts'},'./dialog':{'types':'./index.d.ts'}}}))
        (peers/'core/index.d.ts').write_text('/** @deprecated use stable motion */\ndeclare const OLD_MOTION: unknown;\nexport { OLD_MOTION };\n')
        (peers/'cdk/index.d.ts').write_text('/**\n * Internal container.\n * @docs-private\n */\ndeclare class InternalContainer {}\nexport { InternalContainer };\n')
        (peers/'material/index.d.ts').write_text('declare class InternalContainer {}\nexport { InternalContainer };\n')
        return authored,peers

    def observe(self,authored,peers):
        result=POLICY.evaluate(authored,{'version':1},None,peers)
        case=next(c for c in result['cases'] if c['case_id'].endswith('/installed-annotation-comparison'))
        return result,case

    def test_bundled_declare_and_export_list_cannot_hide_annotations(self):
        authored,peers=self.fixture()
        (authored/'use.ts').write_text("import {InternalContainer as Renamed} from '@angular/cdk/dialog';\nimport {OLD_MOTION} from '@angular/core';\n")
        result,case=self.observe(authored,peers);self.assertEqual(case['result'],'fail')
        self.assertEqual([(x['package'],x['name']) for x in result['annotation_private_hits']],[('@angular/cdk','InternalContainer')])
        self.assertEqual([(x['package'],x['name']) for x in result['annotation_deprecated_hits']],[('@angular/core','OLD_MOTION')])
        states={c['case_id'].split('/')[-1]:c['result'] for c in result['cases']}
        self.assertEqual(states['no-docs-private-symbol'],'fail')
        self.assertEqual(states['no-deprecated-symbol'],'fail')

    def test_namespace_dot_and_bracket_access_are_observed(self):
        for expression in ('core.OLD_MOTION', "core['OLD_MOTION']"):
            with self.subTest(expression=expression):
                authored,peers=self.fixture();(authored/'use.ts').write_text("import * as core from '@angular/core';\nconst x="+expression+';\n')
                result,case=self.observe(authored,peers);self.assertEqual(case['result'],'fail')
                self.assertEqual(result['annotation_deprecated_hits'][0]['access'],'namespace')

    def test_unrelated_package_and_comment_do_not_classify_an_import(self):
        authored,peers=self.fixture();(authored/'use.ts').write_text("import { InternalContainer } from '@angular/material/dialog';\n// import { OLD_MOTION } from '@angular/core';\n")
        result,case=self.observe(authored,peers);self.assertEqual(case['result'],'pass');self.assertEqual(result['annotation_private_hits'],[])

    def test_missing_imported_package_stays_unknown(self):
        authored,peers=self.fixture();(authored/'use.ts').write_text("import { Router } from '@angular/router';\n")
        result,case=self.observe(authored,peers);self.assertEqual(case['result'],'fail');self.assertEqual(result['annotation_missing_packages'],['@angular/router'])

    def test_only_attached_top_level_declaration_is_classified(self):
        authored,peers=self.fixture();file=peers/'material/index.d.ts'
        file.write_text('declare class WithMembers {\n/** @deprecated */\noldMember(): void;\n}\ndeclare class Good {}\n/** @docs-private-ish not the marker */\ndeclare class AlsoGood {}\n/**\n * @docs-private\n'+''.join(' * Padding line\n' for _ in range(20))+' */\ndeclare class ActualPrivate {}\nexport { Good, AlsoGood, ActualPrivate };\n')
        names,files=POLICY.annotated_names(peers/'material','@deprecated');self.assertEqual(names,set());self.assertEqual(files,1)
        names,_=POLICY.annotated_names(peers/'material','@docs-private');self.assertEqual(names,{'ActualPrivate'})

    def test_same_name_internal_interface_does_not_classify_public_export(self):
        authored,peers=self.fixture();directory=peers/'material'
        (directory/'package.json').write_text(json.dumps({'exports':{'./form-field':{'types':'./index.d.ts'}}}))
        (directory/'index.d.ts').write_text("export { Control as PublicControl } from './public.js';\nimport './internal.js';\n")
        (directory/'public.d.ts').write_text('/** Public contract. */\ndeclare abstract class Control {}\nexport {Control};\n')
        (directory/'internal.d.ts').write_text('/** @docs-private */\ninterface Control {}\n')
        (authored/'use.ts').write_text("import { PublicControl } from '@angular/material/form-field';\n")
        result,case=self.observe(authored,peers);self.assertEqual(case['result'],'pass')
        self.assertEqual(result['annotation_private_hits'],[])
        (directory/'public.d.ts').write_text('/** @docs-private */\ndeclare abstract class Control {}\nexport {Control};\n')
        result,case=self.observe(authored,peers);self.assertEqual(case['result'],'fail')
        self.assertEqual(result['annotation_private_hits'][0]['declaration'],'public.d.ts')

    def test_missing_or_ambiguous_export_is_unknown(self):
        for content in ("export {Absent};", "export * from './a.js';\nexport * from './b.js';"):
            with self.subTest(content=content):
                authored,peers=self.fixture();directory=peers/'material'
                (directory/'index.d.ts').write_text(content)
                for name in ('a','b'):(directory/(name+'.d.ts')).write_text('export declare class Absent {}')
                (authored/'use.ts').write_text("import {Absent} from '@angular/material/dialog';")
                result,case=self.observe(authored,peers);self.assertEqual(case['result'],'fail')
                self.assertEqual(result['annotation_unresolved_exports'][0]['name'],'Absent')
