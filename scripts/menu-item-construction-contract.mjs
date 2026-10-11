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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MENU_ITEM_SYMBOL = 'legacy-menu/primary/MatLegacyMenuItem';
export const MENU_ITEM_CONTRACT_PATH = 'compatibility/rc/api/menu-item-construction-contract.json';
const contractSha = '9fc349c1a7b93c5d9174afd839dc480c89be26090795cb3b6c9895dfadeb1fd3';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

/** Finite menu-only judgment under delegated TypeScript authority; original shape retained. */
export function approvedMenuItemContract(symbol, readMember = path => readFileSync(resolve(root, path))) {
  if (symbol?.symbol_id !== MENU_ITEM_SYMBOL) return null;
  assert.equal(symbol.family, 'legacy-menu');
  assert.equal(symbol.kind, 'primary');
  assert.equal(symbol.name, 'MatLegacyMenuItem');
  const bytes = readMember(MENU_ITEM_CONTRACT_PATH);
  assert.equal(sha(bytes), contractSha, 'menu construction contract identity changed');
  const contract = JSON.parse(bytes.toString('utf8'));
  assert.equal(contract.schema_version, 1);
  assert.equal(contract.symbol_id, MENU_ITEM_SYMBOL);
  const authority = readMember(contract.authority.path);
  assert.equal(sha(authority), contract.authority.sha256, 'menu owner decision identity changed');
  const decision = JSON.parse(authority.toString('utf8'));
  assert.equal(contract.authority.kind, 'delegated-technical-judgment');
  assert.equal(decision.authority.kind, contract.authority.kind);
  assert.equal(decision.authority.specific_DI_only_user_approval, false,
    'Do not misattribute the earlier historical-implementation approval');
  assert.equal(decision.authority.technical_judgment, contract.authority.technical_judgment);
  assert.equal(decision.authority.delegation_quote, contract.authority.delegation_quote);
  assert.equal(decision.authority.delegation_quote,
    "As round as you strictly follow the standard of no required CSS/SCSS changes and sanity check against ~/cyph, I'll defer to your judgement on which TypeScript API changes are sufficiently conservative to be acceptable.");
  assert.deepEqual(symbol.shape.inheritedConstructor, contract.original_constructor,
    'original two-overload constructor contract changed');
  assert.deepEqual(symbol.shape.originalFactory, contract.original_factory,
    'original inherited five-dependency factory contract changed');
  assert.equal(symbol.shape.ownConstructor, false);
  return {...contract, contract_path: MENU_ITEM_CONTRACT_PATH, contract_sha256: contractSha};
}

/** Only the two authenticated manual overloads become the accepted DI constructor. */
export function approvedMenuItemSignatureRecord(symbol, packed, record, readMember) {
  if (symbol?.symbol_id !== MENU_ITEM_SYMBOL || !record?.construction_contract) return false;
  const contract = approvedMenuItemContract(symbol, readMember);
  if (record.construction_contract !== contract.profile_id) return false;
  if (!packed?.ownConstructor || packed.inheritedConstructor != null || packed.publicMenuItemParent !== true) return false;
  const constructors = (packed.ownSignatures || packed.signatures || []).filter(sig => sig.includes(' constructor('));
  if (constructors.length !== 1 || constructors[0] !== contract.owned_constructor) return false;
  const [full, short] = contract.original_constructor.signatures;
  return record.symbol_id === MENU_ITEM_SYMBOL && record.classification === 'intentional-legacy-difference'
    && Boolean(record.rationale) && ((record.historical_signature === full
      && record.owned_signature === contract.owned_constructor)
      || (record.historical_signature === short && record.owned_signature === null));
}
