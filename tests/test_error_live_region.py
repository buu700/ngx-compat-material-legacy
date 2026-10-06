# Original live-region defaults and constructor contract; diagnostic only.
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class ErrorLiveRegionTests(unittest.TestCase):
    def test_original_directive_and_actual_constructor_behavior(self):
        original=(ROOT/'reference/material-16.2.14/error-helper-sources/legacy-error.ts').read_text()
        self.assertEqual(hashlib.sha256(original.encode()).hexdigest(),'fde8ceb3fdd9ce24122f56c6838b68da382c41774c6b2808a1860341f46d50e0')
        owned=(ROOT/'projects/ngx-material-legacy/legacy-form-field/error.ts').read_text()
        restored=owned.replace(' * Copyright (c) 2026 Ryan Lester.\n','').replace('@Directive({\n  standalone: false,','@Directive({')
        self.assertEqual(restored,original)
        self.assertIn("'aria-atomic': 'true'",owned)
        body=re.search(r"constructor\(@Attribute\('aria-live'\) ariaLive: string, elementRef: ElementRef\) \{(.*)\n  \}\n\}",owned,re.S)[1]
        code="import assert from 'node:assert/strict';\nconst construct=new Function('ariaLive','elementRef',"+json.dumps(body)+r''');
for(const value of ['',null,undefined,'assertive','polite',' ']) {
 const attributes=new Map();if(value)attributes.set('aria-live',value);
 const writes=[];const element={setAttribute(name,value){writes.push([name,value]);attributes.set(name,value);}};
 construct(value,{nativeElement:element});
 assert.equal(attributes.get('aria-live'),value || 'polite');
 assert.deepEqual(writes,value?[]:[['aria-live','polite']]);
}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        exceptions=json.loads((ROOT/'compatibility/rc/api/signature-differences.json').read_text())['differences']
        self.assertFalse(any(e['symbol_id']=='legacy-form-field/primary/MatLegacyError' and e['historical_signature']=='public constructor(string,ElementRef)' and e['owned_signature'] is None for e in exceptions))
