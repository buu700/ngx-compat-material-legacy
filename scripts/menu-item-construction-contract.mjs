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
const contractSha = 'ca8ee93c898c039a4f43414ae3e99fbb0b8b0adfa421b9a11ae450bfe6d47e93';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

/** Exact owner-approved historical item scope; unchanged original evidence remains binding. */
export function approvedMenuItemContract(symbol, readMember = path => readFileSync(resolve(root, path))) {
  if (symbol?.symbol_id !== MENU_ITEM_SYMBOL) return null;
  assert.equal(symbol.family, 'legacy-menu');
  assert.equal(symbol.kind, 'primary');
  assert.equal(symbol.name, 'MatLegacyMenuItem');
  const bytes = readMember(MENU_ITEM_CONTRACT_PATH);
  assert.equal(sha(bytes), contractSha, 'menu construction contract identity changed');
  const contract = JSON.parse(bytes.toString('utf8'));
  assert.equal(contract.schema_version, 2);
  assert.equal(contract.symbol_id, MENU_ITEM_SYMBOL);
  const authority = readMember(contract.authority.path);
  assert.equal(sha(authority), contract.authority.sha256, 'menu owner decision identity changed');
  const decision = JSON.parse(authority.toString('utf8'));
  assert.equal(contract.authority.kind, 'explicit-owner-approved-historical-implementation');
  for (const key of ['kind', 'proposal_quote', 'response_quote', 'later_constraint_quote'])
    assert.equal(decision.authority[key], contract.authority[key]);
  assert.equal(decision.authority.new_permission_requested, false);
  assert.deepEqual(symbol.shape.inheritedConstructor, contract.original_constructor,
    'original two-overload constructor contract changed');
  assert.deepEqual(symbol.shape.originalFactory, contract.original_factory,
    'original inherited five-dependency factory contract changed');
  assert.equal(symbol.shape.ownConstructor, false);
  return {...contract, contract_path: MENU_ITEM_CONTRACT_PATH, contract_sha256: contractSha};
}

/** Superseded DI-only constructor waivers can never authorize a current signature. */
export function approvedMenuItemSignatureRecord() { return false; }
