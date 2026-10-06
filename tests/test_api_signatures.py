#!/usr/bin/env python3
"""Constructor DI types and public method parameters are compared, not only names."""
from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def typescript_resolves() -> bool:
    result = subprocess.run(
        ["node", "-e", "require('typescript')"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0

SCRIPT = r"""
import {compareContracts, contractFromText} from './scripts/api-completeness.mjs';
const mode = process.argv[1];
const ref = `
import {Inject, Optional} from '@angular/core';
export class MatLegacyButton {
  constructor(elementRef: ElementRef, private _focus: FocusMonitor, @Optional() @Inject(ANIMATION_MODULE_TYPE) mode: string) {}
  focus(origin?: FocusOrigin): void {}
  _hidden(): void {}
}
`;
const packedMatch = `
export declare class MatLegacyButton {
  constructor(elementRef: ElementRef, _focus: FocusMonitor, mode: string);
  focus(origin?: FocusOrigin): void;
}
`;
const packedMismatch = `
export declare class MatLegacyButton {
  constructor(elementRef: ElementRef, _focus: Other);
  focus(origin?: string): void;
}
`;
const packed = mode === 'mismatch' ? packedMismatch : packedMatch;
const report = compareContracts(
  contractFromText(ref, 'ref.ts', 'MatLegacyButton'),
  contractFromText(packed, 'pack.d.ts', 'MatLegacyButton'),
);
console.log(JSON.stringify(report));
"""


def compare(mode: str) -> dict:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", SCRIPT, mode],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


COMPARE_OBJECTS = r"""
import {compareContracts} from './scripts/api-completeness.mjs';
const ref = {
  kind: 'class',
  constructor: [
    {type: 'ElementRef', inject: '', optional: false},
    {type: 'FocusMonitor', inject: '', optional: false},
    {type: 'string', inject: 'ANIMATION_MODULE_TYPE', optional: true},
  ],
  methods: [{name: 'focus', params: ['FocusOrigin']}],
};
const packedMatch = {
  kind: 'class',
  constructor: [
    {type: 'ElementRef', inject: '', optional: false},
    {type: 'FocusMonitor', inject: '', optional: false},
    {type: 'string', inject: '', optional: false},
  ],
  methods: [{name: 'focus', params: ['FocusOrigin']}],
};
const packedMismatch = {
  kind: 'class',
  constructor: [
    {type: 'ElementRef', inject: '', optional: false},
    {type: 'Other', inject: '', optional: false},
  ],
  methods: [{name: 'focus', params: ['string']}],
};
const packed = process.argv[1] === 'mismatch' ? packedMismatch : packedMatch;
console.log(JSON.stringify(compareContracts(ref, packed)));
"""


class ApiSignatureTests(unittest.TestCase):
    def test_compare_contracts_reads_parameter_types(self):
        matched = self.compare_objects("match")
        self.assertEqual(matched["di_status"], "match")
        self.assertEqual(matched["method_status"], "match")
        mismatched = self.compare_objects("mismatch")
        self.assertEqual(mismatched["di_status"], "mismatch")
        self.assertEqual(mismatched["method_status"], "mismatch")
        self.assertIn("focus(FocusOrigin)", mismatched["missing_methods"])
        self.assertIn("focus(string)", mismatched["extra_methods"])

    def compare_objects(self, mode: str) -> dict:
        result = subprocess.run(
            ["node", "--input-type=module", "-e", COMPARE_OBJECTS, mode],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        return json.loads(result.stdout)

    @unittest.skipUnless(typescript_resolves(), "typescript is not installed")
    def test_typescript_optional_and_default_do_not_waive_di_dependency(self):
        script = r"""
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {diParamsOf} from './scripts/api-surface.mjs';
const ts=createRequire(process.cwd()+'/package.json')('typescript');
function observe(parameter) {
 const text=`import {Inject, Optional} from '@angular/core';
import {Service} from 'fixture-service';
class Fixture {constructor(@Optional() @Inject(TOKEN) token: unknown, ${parameter}) {}}`;
 const source=ts.createSourceFile('fixture.ts',text,ts.ScriptTarget.Latest,true);
 const node=source.statements.find(ts.isClassDeclaration);
 return diParamsOf(node,source);
}
for(const argument of ['service: Service','service?: Service','service: Service = fallback']) {
 const params=observe(argument);
 assert.equal(params[0].optional,true);
 assert.equal(params[0].ident,'TOKEN');
 assert.equal(params[1].optional,false,argument);
 assert.equal(params[1].imported,'Service');
}
assert.equal(observe('@Optional() service?: Service')[1].optional,true);
"""
        result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)

    @unittest.skipUnless(typescript_resolves(), "typescript is not installed")
    def test_constructor_types_match_and_inject_token_is_kept(self):
        report = compare("match")
        self.assertEqual(report["di_status"], "match")
        self.assertEqual(report["method_status"], "match")
        self.assertEqual(report["ref_constructor"][2]["inject"], "ANIMATION_MODULE_TYPE")
        self.assertEqual(report["ref_constructor"][2]["type"], "string")
        self.assertEqual([param["type"] for param in report["pack_constructor"]], [
            "ElementRef", "FocusMonitor", "string",
        ])

    @unittest.skipUnless(typescript_resolves(), "typescript is not installed")
    def test_different_constructor_and_method_types_mismatch(self):
        report = compare("mismatch")
        self.assertEqual(report["di_status"], "mismatch")
        self.assertEqual(report["method_status"], "mismatch")
        self.assertTrue(any("focus(FocusOrigin)" in method or "focus(" in method for method in report["missing_methods"]))

    @unittest.skipUnless(typescript_resolves(), "typescript is not installed")
    def test_async_factory_alias_requires_exact_cdk_import_and_keeps_type_argument(self):
        script = r"""
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {propertyTypeText,normalizeType} from './scripts/api-surface.mjs';
const ts=createRequire(process.cwd()+'/package.json')('typescript');
function observe(importLine,type) {
 const source=ts.createSourceFile('fixture.ts',`${importLine} class Fixture {protected locator: ${type};}`,ts.ScriptTarget.Latest,true);
 const declaration=source.statements.find(ts.isClassDeclaration).members[0];
 return normalizeType(propertyTypeText(declaration.type,source));
}
const imported="import {AsyncFactoryFn as Locator} from '@angular/cdk/testing';";
assert.equal(observe(imported,'Locator<TestElement | null>'),observe('', '() => Promise<TestElement | null>'));
assert.equal(observe(imported,'Locator<| (ComponentHarness & { getValueText(): Promise<string> }) | null>'),observe('', '() => Promise<(ComponentHarness & { getValueText(): Promise<string> }) | null>'));
assert.notEqual(observe(imported,'Locator<| TestElement | null | undefined>'),observe('', '() => Promise<TestElement | null>'));
assert.notEqual(observe(imported,'Locator<TestElement | null>'),observe('', '() => Promise<TestElement>'));
assert.notEqual(observe(imported,'Locator<TestElement>'),observe('', '(id: string) => Promise<TestElement>'));
assert.notEqual(observe(imported,'Locator<TestElement>'),observe('', '() => Promise<string>'));
assert.equal(observe("import {AsyncFactoryFn as Locator} from 'other';",'Locator<TestElement>'),'Locator<TestElement>');
assert.equal(observe('type AsyncFactoryFn<T> = T;','AsyncFactoryFn<TestElement>'),'AsyncFactoryFn<TestElement>');
assert.equal(observe(imported,'Locator<TestElement, string>'),'Locator<TestElement,string>');
"""
        result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)


if __name__ == "__main__":
    unittest.main()
