"""The shared ripple alias needs actual declarations and complete public controls."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RippleSignatureTests(unittest.TestCase):
    def test_actual_public_declaration_all_members_and_constructor_corruptions(self):
        script = r"""
import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {packedShape,deriveSurface,compareSignatures} from './scripts/api-surface.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const peerRoot=process.env.CLOSEOUT_DIAGNOSTIC_PEER_ROOT||process.cwd();
const source=ts.createSourceFile(peerRoot+'/ripple-check.d.ts',"export {MatRipple as MatLegacyRipple} from '@angular/material/core';",ts.ScriptTarget.Latest,true);
const packed=packedShape(source,'MatLegacyRipple');
const symbol=deriveSurface(peerRoot+'/artifacts/local/ref-material-16.2.14/src/material').symbols.find(s=>s.symbol_id==='legacy-core/primary/MatLegacyRipple');
assert.deepEqual(compareSignatures(symbol,packed,[]).blocking,[]);
assert.equal(packed.public_constructor_observation.constructors[0],'public constructor()');
for(const change of [
 x=>x.public_constructor_observation=null,
 x=>x.public_constructor_observation.constructors=['public constructor(ElementRef)'],
 x=>x.public_constructor_observation.declaration_name='unrelated',
 x=>x.public_constructor_observation.public_peer_version='99.0.0',
 x=>x.public_constructor_observation.sources[0].sha256='',
 x=>x.public_constructor_observation.sources=x.public_constructor_observation.sources.filter(s=>!s.path.endsWith('/package.json')),
 x=>{const shape=x.public_constructor_observation.shape;shape.ownSignatures=shape.ownSignatures.filter(s=>!s.includes('fadeOutAll'));shape.signatures=shape.signatures.filter(s=>!s.includes('fadeOutAll'));},
 x=>x.public_constructor_observation.shape.ownSignatures.push('public method unrelated():void'),
]){
 const changed=structuredClone(packed);change(changed);
 assert.ok(compareSignatures(symbol,changed,[]).blocking.length,'Changed public declaration admitted');
}
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                                capture_output=True, text=True, timeout=25)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-6000:])
