/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {sourceContractDefinitions} from './upstream-source-contract-registry.mjs';
/** A registered source decision needs individual proof regardless of its final label. */
export function requiresRegisteredSourceReview(entry,proof=entry?.individual_proof){
  return sourceContractDefinitions.some(definition=>definition.sha===entry?.sha
    ||proof?.proof_kind===definition.proof_kind||proof?.[definition.scope_key]!==undefined);
}
