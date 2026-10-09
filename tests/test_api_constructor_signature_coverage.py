"""Finite inherited overrides and input retirement must retain exact signature admission."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ConstructorSignatureCoverageTests(unittest.TestCase):
    def test_historical_overrides_union_and_input_retirement_corruptions(self):
        code = r'''
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import fs from 'node:fs';
import {deriveSurface,packedShape,compareSignatures,originalInheritedOverrides,originalInheritedConstructor} from './scripts/api-surface.mjs';
import {INPUT_SYMBOL,INPUT_ORIGINAL_CONSTRUCTOR,INPUT_CONSTRUCTION_PROFILE,approvedInputSignatureRecord} from './scripts/api-input-context.mjs';
const ts=createRequire(import.meta.url)('typescript'),peerRoot=process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||process.cwd(),surface=deriveSurface(peerRoot+'/artifacts/local/ref-material-16.2.14/src/material');
const parse=text=>ts.createSourceFile('fixture.d.ts',text,ts.ScriptTarget.Latest,true);
let overrides=0,unions=0,inputMutants=0;
for(const name of ['MatLegacyColumnDef','MatLegacyHeaderRowDef','MatLegacyFooterRowDef','MatLegacyTabLabel','MatLegacyTabContent']){
 const symbol=surface.symbols.find(s=>s.name===name&&s.kind==='primary'),contract=symbol.shape.inheritedOverrides;
 assert.ok(contract&&contract.signatures.length);assert.deepEqual(originalInheritedOverrides('/original/src/material/'+symbol.family+'/source.ts',name),contract);
 // All exact inherited members now have mandatory expected signatures. No
 // other fixture member is needed to test this finite coverage independently.
 const historical={...symbol,shape:{kind:'class',comparison:'signature',signatures:contract.signatures,ownSignatures:[],heritage:[],inheritedOverrides:contract}};
 const packed={kind:'class',comparison:'signature',ownSignatures:contract.signatures,signatures:contract.signatures,heritage:[]};
 assert.deepEqual(compareSignatures(historical,packed,[]).blocking,[]);
 for(const signature of contract.signatures){
  for(const mode of ['drop','type']){
   const bad=structuredClone(packed);bad.ownSignatures=bad.ownSignatures.filter(s=>s!==signature);if(mode==='type')bad.ownSignatures.push(signature.replace(/boolean|BooleanInput|TemplateRef<any>|:any/g,'foreign'));
   bad.signatures=[...bad.ownSignatures];assert.ok(compareSignatures(historical,bad,[]).blocking.length);overrides++;
  }
 }
}
const leading=packedShape(parse("export type State = | 'left' | 'center' | 'right';"),'State'),plain=packedShape(parse("export type State = 'left' | 'center' | 'right';"),'State');
assert.deepEqual(compareSignatures({symbol_id:'union-fixture',shape:leading},plain,[]).blocking,[]);
for(const text of ["'left'|'center'","'left'|'center'|'foreign'","'left'|'center'|'right'|'extra'"]){const bad=packedShape(parse('export type State='+text+';'),'State');assert.ok(compareSignatures({symbol_id:'union-fixture',shape:leading},bad,[]).blocking.length);unions++;}
const symbol=surface.symbols.find(s=>s.symbol_id===INPUT_SYMBOL);
assert.deepEqual(symbol.shape.inheritedConstructor,originalInheritedConstructor('/original/src/material/legacy-input/input.ts','MatLegacyInput'));
assert.equal(symbol.shape.inheritedConstructor.signatures[0],INPUT_ORIGINAL_CONSTRUCTOR);
const packed=packedShape(parse("import {MatInput as BaseMatInput} from '@angular/material/input';export declare class MatLegacyInput extends BaseMatInput {constructor();protected _getPlaceholder():string|null;}"),'MatLegacyInput');
const record={symbol_id:INPUT_SYMBOL,classification:'intentional-legacy-difference',historical_signature:INPUT_ORIGINAL_CONSTRUCTOR,owned_signature:'public constructor()',construction_contract:INPUT_CONSTRUCTION_PROFILE,rationale:'finite delegated decision'};
assert.equal(approvedInputSignatureRecord(symbol,packed,record),true);assert.deepEqual(compareSignatures(symbol,packed,[record]).blocking,[]);
for(const change of [p=>p.ownConstructor=false,p=>p.publicInputParent=false,p=>p.inheritedConstructor={},p=>p.ownSignatures.push('public constructor(any)'),p=>p.ownSignatures=p.ownSignatures.filter(s=>!s.includes('constructor')),p=>p.ownSignatures=p.ownSignatures.map(s=>s.includes('constructor')?'public constructor(any)':s)]){
 const bad=structuredClone(packed);change(bad);assert.equal(approvedInputSignatureRecord(symbol,bad,record),false);inputMutants++;
}
for(const change of [r=>r.construction_contract='foreign',r=>r.historical_signature='public constructor(any)',r=>r.owned_signature=null,r=>r.symbol_id='foreign',r=>r.classification='match',r=>r.rationale='',r=>r.extra='waiver']){
 const bad=structuredClone(record);change(bad);assert.equal(approvedInputSignatureRecord(symbol,packed,bad),false);inputMutants++;
}
for(const change of [s=>s.shape.inheritedConstructor.signatures[0]='public constructor(any)',s=>s.shape.inheritedConstructor.source_sha256='0'.repeat(64),s=>s.shape.ownConstructor=true]){
 const bad=structuredClone(symbol);change(bad);assert.throws(()=>approvedInputSignatureRecord(bad,packed,record));inputMutants++;
}
assert.throws(()=>approvedInputSignatureRecord(symbol,packed,record,()=>Buffer.from('{}')));inputMutants++;
assert.ok(compareSignatures(symbol,packed,[]).blocking.length);
for(const [name,parent]of [['MatLegacyInput','Foreign'],['ForeignInput','MatInput']]){
 const bad=packedShape(parse("import {"+parent+" as Parent} from '@angular/material/input';export declare class "+name+" extends Parent {constructor();}"),name);
 assert.notEqual(bad.publicInputParent,true);inputMutants++;
}
const namespace=packedShape(parse("import * as peer from '@angular/material/input';export declare class MatLegacyInput extends peer.MatInput {constructor();protected _getPlaceholder():string|null;}"),'MatLegacyInput');
assert.equal(approvedInputSignatureRecord(symbol,namespace,record),true);
for(const text of ["import * as peer from 'foreign';export declare class MatLegacyInput extends peer.MatInput {constructor();}","import * as peer from '@angular/material/input';declare namespace peer {class MatInput {}};export declare class MatLegacyInput extends peer.MatInput {constructor();}"]){
 const bad=packedShape(parse(text),'MatLegacyInput');assert.notEqual(bad.publicInputParent,true);inputMutants++;
}
assert.equal(overrides,20);assert.equal(unions,3);assert.equal(inputMutants,21);
const pseudo=surface.symbols.find(s=>s.symbol_id==='legacy-core/primary/MatLegacyPseudoCheckbox');
const differences=JSON.parse(fs.readFileSync('compatibility/rc/api/signature-differences.json')).differences;
const pseudoPacked={...pseudo.shape,ownSignatures:[...pseudo.shape.ownSignatures,'protected get _animationsDisabled():boolean'],signatures:[...pseudo.shape.signatures,'protected get _animationsDisabled():boolean']};
assert.deepEqual(compareSignatures(pseudo,pseudoPacked,differences).blocking,[]);
for(const signature of ['protected get _animationsDisabled():string','protected get unrelated():boolean','public get _animationsDisabled():boolean']){
 const bad=structuredClone(pseudoPacked);bad.ownSignatures=bad.ownSignatures.filter(s=>!s.includes('_animationsDisabled'));bad.ownSignatures.push(signature);bad.signatures=[...bad.ownSignatures];assert.ok(compareSignatures(pseudo,bad,differences).blocking.length);
}
console.log(JSON.stringify({overrides,unions,inputMutants}));
'''
        result = subprocess.run(
            ['node', '--input-type=module', '-e', code], cwd=ROOT,
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-6000:])
