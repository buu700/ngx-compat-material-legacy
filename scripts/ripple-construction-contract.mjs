/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const RIPPLE_SYMBOL='legacy-core/primary/MatLegacyRipple';
export const RIPPLE_CONTRACT_PATH='compatibility/rc/api/ripple-construction-contract.json';
const contractSha='56c092bddfe51766e95777ab9bd90de58c4e68ec74f525b46b38db4ef7773ff8';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Exact delegated construction change; the immutable original factory and constructor stay required evidence. */
export function approvedRippleContract(symbol,readMember=path=>readFileSync(resolve(root,path))){
 if(symbol?.symbol_id!==RIPPLE_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-core');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,'MatLegacyRipple');
 const bytes=readMember(RIPPLE_CONTRACT_PATH);assert.equal(sha(bytes),contractSha,'ripple construction contract changed');
 const contract=JSON.parse(bytes);assert.equal(contract.symbol_id,RIPPLE_SYMBOL);
 const authority=readMember(contract.authority.path);assert.equal(sha(authority),contract.authority.sha256,'ripple delegated decision identity changed');
 const decision=JSON.parse(authority);
 assert.equal(decision.authority.user_response,"As round as you strictly follow the standard of no required CSS/SCSS changes and sanity check against ~/cyph, I'll defer to your judgement on which TypeScript API changes are sufficiently conservative to be acceptable.");
 assert.equal(decision.required_consumer_css_scss_changes,false);assert.equal(decision.consumer.modified,false);
 assert.deepEqual(decision.consumer.explicit_ripple_type_or_template_or_options_hits,[]);
 assert.deepEqual(symbol.shape.originalFactory,contract.original_factory);
 assert.deepEqual(symbol.shape.ownSignatures.filter(sig=>sig.includes(' constructor(')),contract.original_constructor);
 assert.equal(symbol.shape.ownConstructor,true);
 return {...contract,contract_path:RIPPLE_CONTRACT_PATH,contract_sha256:contractSha};
}

/** A matching re-export name alone cannot hide the original five-argument constructor. */
export function rippleReexportSignatureProblems(symbol,packed,readMember){
 const contract=approvedRippleContract(symbol,readMember),proof=packed?.public_constructor_observation;
 if(!contract||packed?.kind!=='reexport'||packed.reexport?.spec!=='@angular/material/core'||packed.reexport.imported!=='MatRipple'
  ||!proof||proof.public_spec!=='@angular/material/core'||proof.declaration_name!=='MatRipple'
  ||proof.shape?.kind!=='class'||!Array.isArray(proof.shape.ownSignatures)
  ||!Array.isArray(proof.constructors)||proof.constructors.length!==1||proof.constructors[0]!==contract.public_constructor_declarations[proof.public_peer_version]
  ||!Object.hasOwn(contract.public_constructor_declarations,proof.public_peer_version)
  ||!Array.isArray(proof.sources)||!proof.sources.length
  ||proof.sources.some(source=>!source.path||!/^([a-f0-9]{64})$/.test(source.sha256))
  ||!proof.sources.some(source=>source.path.endsWith('/package.json')))
  return ['ripple public re-export constructor declaration evidence incomplete'];
 return [];
}
