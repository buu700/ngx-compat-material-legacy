"""Pin original helpers and exercise the actual owned functions' error contract."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class OwnedErrorHelperTests(unittest.TestCase):
    def test_original_functions_and_legacy_exports(self):
        ref=ROOT/'reference/material-16.2.14/error-helper-sources'
        expected={'form-field-errors.ts':'43dcfdbc17bb67ef20bdf2ee7f4372c4d889b90c53abcfd58accb68082cc625c','tooltip-invalid-position.ts':'5c335f133dee4ef738ff1a5bc8b644d4afa1773aceef74ea8fe47728cfacf99f','input-errors.ts':'f90b89bc25105ebd22a73ccd5d3f9799d86a967c0ef68fa37dcb40f0cc9bf10d','autocomplete-missing-panel.ts':'58c47b8ca51fd119246c4c1fb4ce3b25c8c099af10dce48b86934b9786a27cca'}
        functions=[]
        for source,family in [('form-field-errors.ts','legacy-form-field'),('tooltip-invalid-position.ts','legacy-tooltip'),('input-errors.ts','legacy-input'),('autocomplete-missing-panel.ts','legacy-autocomplete')]:
            original=(ref/source).read_text();self.assertEqual(hashlib.sha256(original.encode()).hexdigest(),expected[source])
            owned=(ROOT/'projects/ngx-material-legacy'/family/'owned-errors.ts').read_text()
            bodies=re.findall(r'export function .*?\n\}',original,re.S)
            self.assertEqual(re.findall(r'export function .*?\n\}',owned,re.S),bodies)
            public=(ROOT/'projects/ngx-material-legacy'/family/'public-api.ts').read_text()
            for body in bodies:
                name=re.search(r'function (\w+)',body)[1]
                self.assertIn(name+' as '+name.replace('getMat','getMatLegacy',1),public)
                functions.append(body.replace('export ','').replace(': string','').replace(': Error',''))
        code="import assert from 'node:assert/strict';\n"+'\n'.join(functions)+r"""
assert.equal(getMatFormFieldMissingControlError().message,'mat-form-field must contain a MatFormFieldControl.');
assert.equal(getMatFormFieldPlaceholderConflictError().message,'Placeholder attribute and child element were both specified.');
for (const value of ['start','end','', '"<>\n']) {
  const hint=getMatFormFieldDuplicatedHintError(value);
  const tooltip=getMatTooltipInvalidPositionError(value);
  assert.ok(hint instanceof Error);assert.ok(tooltip instanceof Error);
  assert.equal(hint.message,`A hint was already declared for 'align="${value}"'.`);
  assert.equal(tooltip.message,`Tooltip position "${value}" is invalid.`);
  assert.notEqual(hint,getMatFormFieldDuplicatedHintError(value));
  const input=getMatInputUnsupportedTypeError(value);
  assert.ok(input instanceof Error);
  assert.equal(input.message,`Input type "${value}" isn't supported by matInput.`);
  assert.notEqual(input,getMatInputUnsupportedTypeError(value));
}
assert.equal(getMatAutocompleteMissingPanelError().message,'Attempting to open an undefined instance of `mat-autocomplete`. Make sure that the id passed to the `matAutocomplete` is correct and that '+"you're attempting to open it after the ngAfterContentInit hook.");
assert.notEqual(getMatAutocompleteMissingPanelError(),getMatAutocompleteMissingPanelError());
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
