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
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const TABLE_SYMBOL='legacy-table/primary/MatLegacyTable';
export const TABLE_CONTRACT_PATH='compatibility/rc/api/table-construction-contract.json';
const contractSha='01cc3b65e1e92014752a7f19c80c37c2c21d82e18e096bc17aa0d5a91bbe113b';
const line='21.x';
const sha=b=>createHash('sha256').update(b).digest('hex');
/** Exact delegated table decision; original manual constructor/factory remain normative evidence. */
export function approvedTableContract(symbol,readMember=p=>readFileSync(resolve(root,p))){
 if(symbol?.symbol_id!==TABLE_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-table');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,'MatLegacyTable');
 const bytes=readMember(TABLE_CONTRACT_PATH);assert.equal(sha(bytes),contractSha,'table construction contract identity changed');
 const contract=JSON.parse(bytes);assert.equal(contract.schema_version,1);assert.equal(contract.line,line);assert.equal(contract.symbol_id,TABLE_SYMBOL);
 const authority=readMember(contract.authority.path);assert.equal(sha(authority),contract.authority.sha256,'table maintainer delegation identity changed');
 const decision=JSON.parse(authority);assert.equal(decision.line,line);
 assert.equal(decision.authority.user_response,"As round as you strictly follow the standard of no required CSS/SCSS changes and sanity check against ~/cyph, I'll defer to your judgement on which TypeScript API changes are sufficiently conservative to be acceptable.");
 assert.equal(decision.authority.selected_decision,contract.authority.selected_decision);
 assert.equal(decision.consumer_stylesheet_changes_required,false);assert.equal(decision.consumer_files_modified,false);
 assert.deepEqual(decision.consumer.explicit_table_class_or_custom_dependency_hits,[]);assert.equal(decision.consumer.table_templates.length,2);
 assert.deepEqual(symbol.shape.inheritedConstructor,contract.original_constructor,'original table constructor changed');
 assert.deepEqual(symbol.shape.originalFactory,contract.original_factory,'original inherited eleven-dependency/role factory changed');
 assert.deepEqual(symbol.shape.inheritedTableInputs,contract.original_inherited_inputs,'original inherited boolean inputs changed');
 assert.equal(symbol.shape.ownConstructor,false);
 return {...contract,contract_path:TABLE_CONTRACT_PATH,contract_sha256:contractSha};
}
/** Only one authentic historical table constructor becomes the explicit owned zero-argument form. */
export function approvedTableSignatureRecord(symbol,packed,record,readMember){
 if(symbol?.symbol_id!==TABLE_SYMBOL||!record?.construction_contract)return false;
 const contract=approvedTableContract(symbol,readMember);
 if(record.construction_contract!==contract.profile_id||!packed?.ownConstructor
   ||packed.inheritedConstructor!=null||packed.publicTableParent!==true)return false;
 const constructors=(packed.ownSignatures||packed.signatures||[]).filter(s=>s.includes(' constructor('));
 return constructors.length===1&&constructors[0]===contract.owned_constructor
   &&record.symbol_id===TABLE_SYMBOL&&record.classification==='intentional-legacy-difference'
   &&Boolean(record.rationale)&&record.historical_signature===contract.original_constructor.signatures[0]
   &&record.owned_signature===contract.owned_constructor;
}
/** Full factory evidence is required; a rationale or matching token-name tuple cannot suffice. */
export function tableConstructionObservationComplete(observation,contract,row){
 return observation?.profile_id===contract.profile_id&&observation.contract_sha256===contract.contract_sha256
  &&row.factory_outcome==='returned'&&Array.isArray(row.observed)&&row.observed.length===contract.runtime_requests.length
  &&Array.isArray(observation.public_node_requests)&&observation.public_node_requests.length===contract.runtime_requests.length
  &&observation.public_node_requests.every((node,index)=>node&&typeof node==='object'&&node.ident===contract.runtime_requests[index].ident
    &&node.spec===contract.runtime_requests[index].spec&&node.identity_matched===true
    &&node.observed_label===row.observed[index]&&typeof node.observed_label==='string'&&node.observed_label.length>0
    &&['optional','self','skipSelf','host'].every(flag=>node[flag]===Boolean(contract.runtime_requests[index][flag])))
  &&Array.isArray(observation.behavior_problems)&&observation.behavior_problems.length===0
  &&observation.counts?.borrowedDestroyed===0&&observation.counts.manualRejects===2&&observation.counts.subclass===1
  &&observation.counts.disconnects===2
  &&Array.isArray(observation.parent_comparison)&&observation.parent_comparison.length===2
  &&observation.parent_comparison.every((p,index)=>p&&typeof p==='object'&&p.context===['grid-role','missing-role'][index]
    &&p.parent_outcome==='returned'&&p.owned_outcome==='returned'
    &&p.token_objects_equal===true&&p.options_equal===true&&p.trace_kinds_equal===true
    &&Number.isInteger(p.trace_count)&&Number.isInteger(p.parent_root_request_count)
    &&p.parent_root_request_count>=3&&p.owned_root_request_count===p.parent_root_request_count
    &&p.node_request_count===contract.runtime_requests.length&&p.attribute_request_count===1
    &&p.trace_count===p.node_request_count+p.parent_root_request_count+p.attribute_request_count
    &&p.role_behavior===true&&p.root_services_resolved===true)
  &&Array.isArray(observation.root_requests)&&observation.root_requests.length===observation.parent_comparison[0].owned_root_request_count
  &&observation.root_requests.some(r=>r&&r.optional===false)
  &&observation.root_requests.every(r=>r&&r.unresolved===false&&typeof r.optional==='boolean');
}
