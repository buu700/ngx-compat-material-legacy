"""Original source and test assertions guard the legacy chip keyboard contract."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
REFERENCE=ROOT/'reference/material-16.2.14/chips-keyboard-sources'
PINS={'chip-input.ts':'8970d734fc5404e9e54341a21bea9753311ed3447f415006ac41234ca9890680','chip.ts':'a3809031dbb69a835b3766f2af6052073939bab62a70161fe57e39260377fe5a','chip-list.spec.ts':'a64a9468dd842c9a944c381b466d135497baa7d25f1d7503b5a1aefd0e363053'}
def body(source,name):
    match=re.search(r'^  (?:private )?'+re.escape(name)+r'\([^\n]*\)(?:\s*:\s*\w+)?\s*\{',source,re.M)
    if not match:raise ValueError('method missing: '+name)
    start=match.end();depth=1
    for end in range(start,len(source)):
        if source[end]=='{':depth+=1
        if source[end]=='}':depth-=1
        if not depth:return source[start:end]
    raise ValueError('unbalanced original method')

class ChipsKeyboardContractTests(unittest.TestCase):
    def test_exact_original_source_and_restored_original_assertion(self):
        provenance=json.loads((REFERENCE/'provenance.json').read_text());self.assertEqual(provenance['commit'],'df60e733c60e572ba538f6ad0ceff3e63e527b53')
        for name,pin in PINS.items():self.assertEqual(hashlib.sha256((REFERENCE/name).read_bytes()).hexdigest(),pin)
        source=ROOT/'projects/ngx-material-legacy/legacy-chips'
        self.assertEqual((source/'chip-input.ts').read_text(),(REFERENCE/'chip-input.ts').read_text().replace('@Directive({','@Directive({\n  standalone: false,',1))
        self.assertEqual(body((source/'chip.ts').read_text(),'_handleKeydown'),body((REFERENCE/'chip.ts').read_text(),'_handleKeydown'))
        needle="        it(\n          'should not focus the last chip when pressing BACKSPACE after changing input, '"
        end="        it('should focus last chip after pressing BACKSPACE after creating a chip'"
        a=(REFERENCE/'chip-list.spec.ts').read_text();b=(source/'chip-list.spec.ts').read_text()
        self.assertEqual(a[a.index(needle):a.index(end,a.index(needle))],b[b.index(needle):b.index(end,b.index(needle))])
        self.assertNotIn('should not focus the last chip when the BACKSPACE key is being repeated',b)

    def test_original_and_candidate_method_state_transitions(self):
        methods=['ngAfterContentInit','_keydown','_keyup','_focus','_emitChipEnd','clear','_isSeparatorKey']
        for location in [REFERENCE,ROOT/'projects/ngx-material-legacy/legacy-chips']:
            input_source=(location/'chip-input.ts').read_text();chip_source=(location/'chip.ts').read_text()
            payload=dict(input={m:body(input_source,m) for m in methods},chip={m:body(chip_source,m) for m in ['remove','_handleKeydown']})
            code=r'''
import assert from 'node:assert/strict';
const source=JSON.parse(process.argv[1]);
const compile=body=>new Function('event','BACKSPACE','DELETE','SPACE','TAB','hasModifierKey',body);
const attach=(object,methods)=>{for(const [name,body] of Object.entries(methods)){const fn=compile(body);object[name]=event=>fn.call(object,event,8,46,32,9,e=>!!(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey));}return object;};
const event=(keyCode,repeat=false)=>({keyCode,repeat,prevented:0,preventDefault(){this.prevented++;}});
let focus=0,end=0;
const input=attach({inputElement:{value:''},separatorKeyCodes:[188],chipEnd:{emit(){end++;}},_chipList:{_keyManager:{setLastItemActive(){focus++;}},_keydown(){},_allowFocusEscape(){},stateChanges:{next(){}}}},source.input);
Object.defineProperty(input,'empty',{get(){return !this.inputElement.value;}});
input.ngAfterContentInit();input._focus();input.inputElement.value='changed';input._keydown(event(65));input.inputElement.value='';
input._keydown(event(8));input._keydown(event(8,true));assert.equal(focus,0);
const release=event(8);input._keyup(release);assert.equal(focus,0);assert.equal(release.prevented,1);
input._keydown(event(8));assert.equal(focus,1);
input.inputElement.value='separator';input._keydown(event(188));input._keydown(event(188,true));assert.equal(end,2);
input._keydown({...event(188),ctrlKey:true});assert.equal(end,2);
input.clear();input._keydown(event(8));assert.equal(focus,2);
let removals=0;const chip=attach({disabled:false,removable:true,removed:{emit(){removals++;}}},source.chip);
chip._handleKeydown(event(8));chip._handleKeydown(event(8,true));assert.equal(removals,2);
chip.disabled=true;chip._handleKeydown(event(8));assert.equal(removals,2);
chip.disabled=false;chip.removable=false;chip._handleKeydown(event(8));assert.equal(removals,2);
'''
            result=subprocess.run(['node','--input-type=module','-e',code,json.dumps(payload)],cwd=ROOT,text=True,capture_output=True)
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
