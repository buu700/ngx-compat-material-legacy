"""Compare owned transition classification with untouched compiled Material16."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class CheckboxTransitionOwnershipTests(unittest.TestCase):
    def test_all_state_pairs_noop_and_wrong_ordinal_mutation(self):
        ref=ROOT/'reference/material-16.2.14/error-helper-sources'
        pins={'checkbox-transition-state.ts':'edcbda55c944e8949b947b518619128be911acc620f2accdb8d6e70d0d6deddd','checkbox-transition-method.txt':'5683b7b9b5f1c1b84ff6f0da28cce65a10c2c3c8006f61818b1116449af72eda','checkbox-transition-classes.txt':'ea7de029fdce9fad5e3db1ae111920cbddbbc7840b8c1a206ec39c1dba79dc93'}
        originals={}
        for name,pin in pins.items():
            data=(ref/name).read_text();self.assertEqual(hashlib.sha256(data.encode()).hexdigest(),pin);originals[name]=data
        family=ROOT/'projects/ngx-material-legacy/legacy-checkbox'
        enum=(family/'owned-transition-state.ts').read_text();self.assertEqual(enum.replace(' * Copyright (c) 2026 Ryan Lester.\n',''),originals['checkbox-transition-state.ts'])
        enum_body=re.search(r'export const enum TransitionCheckState \{(.*?)\n\}',enum,re.S)[1]
        names=[s.strip() for s in re.sub(r'/\*.*?\*/','',enum_body,flags=re.S).split(',') if s.strip()]
        self.assertEqual(names,['Init','Checked','Unchecked','Indeterminate'])
        source=(family/'internal/checkbox-base.ts').read_text();start=source.index('  private _getAnimationClassForCheckStateTransition(');end=source.index('\n  }',start)
        body=source[source.index('{',start)+1:end]
        original=originals['checkbox-transition-method.txt'];reference_body=original[original.index('{')+1:original.rindex('}')]
        original_classes=dict(re.findall(r"(\w+): '([^']+)'",originals['checkbox-transition-classes.txt']))
        owner=(family/'checkbox.ts').read_text();owner_map=re.search(r'protected _animationClasses = \{(.*?)\n  \};',owner,re.S)[1]
        self.assertEqual(dict(re.findall(r"(\w+): '([^']+)'",owner_map)),original_classes)
        code="import assert from 'node:assert/strict';\nconst reference=new Function('oldState','newState',"+json.dumps(reference_body)+");\nconst candidate=new Function('TransitionCheckState','oldState','newState',"+json.dumps(body)+");\nconst classes="+json.dumps(original_classes)+";\nconst states="+json.dumps(dict(zip(names,range(4))))+r''';
let cases=0,mutations=0;
for(const mode of ['BrowserAnimations','NoopAnimations'])for(const checked of [false,true])for(let before=0;before<4;before++)for(let after=0;after<4;after++) {
 const receiver={_animationMode:mode,_checked:checked,_animationClasses:classes};
 const expected=reference.call(receiver,before,after);
 assert.equal(candidate.call(receiver,states,before,after),expected);
 if(mode==='NoopAnimations')assert.equal(expected,'');
 if(candidate.call(receiver,{...states,Checked:2},before,after)!==expected)mutations++;
 cases++;
}
assert.equal(cases,64);assert.ok(mutations>0,'incorrect ordinal must be detected');
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)
if __name__=='__main__':unittest.main()
