/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {validateTestingApi21xInheritedExecution} from './upstream-testing-api-21x-admission.mjs';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {TABLE_ONPUSH_SHA, validateArtifactBehavior} from './upstream-artifact-behavior-evidence.mjs';
import {TABLE_ONPUSH_CASE_ID} from './table-onpush-packed-contract.mjs';
import {selectionBehaviorRequirements, validateSelectionBehavior} from './upstream-selection-evidence.mjs';
import {bidiBehaviorRequirements, validateBidiBehavior} from './upstream-bidi-evidence.mjs';
import {typeaheadBehaviorRequirements, validateTypeaheadBehavior} from './upstream-typeahead-evidence.mjs';
import {inheritedHelperRequirements, validateInheritedHelperExecution} from './upstream-inherited-helper-evidence.mjs';

// Independently authenticated minimum-peer bytes, rather than a ledger-selected
// digest. Other registered native validators already pin and rehash their peers.
const tablePeers = new Map([
  ['main', {version: '22.1.7', sha256: '2bdeb437714a07914ccb8d2f749fd75d72b63da1ab4cc0c069f64e714c2a6ad4'}],
  ['21.x', {version: '21.2.14', sha256: 'ea8d99a22482768bab22e19aba83b2a1498be6be340e46991965f539036b6c11'}],
]);
const demand = (value, message) => {if (!value) throw new Error(message);};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Finite per-SHA execution contracts. A proof kind, digest or report label is
 * never an execution contract. Source-only helper reviews may be registered
 * separately once their exact observation producers and subjects are bound. */
export function validateInheritedExecution({root, entry, proof, request, line}) {
  try {
    demand(tablePeers.has(line), 'unknown inherited execution branch');
    demand(!request || request.line === line, 'wrong inherited execution branch');
    if (typeaheadBehaviorRequirements(entry?.sha, line)) return validateTypeaheadBehavior({root, entry, proof, request, line});
    if (line === '21.x' && entry?.sha === '4de7c0fb2d033bd81074764a52cc46edd02e6774')
      return validateTestingApi21xInheritedExecution({root,entry,proof,line});
    if (inheritedHelperRequirements(entry?.sha, line)) return validateInheritedHelperExecution({root, entry, proof, line});
    if (entry?.sha === TABLE_ONPUSH_SHA) {
      const peer = tablePeers.get(line), path = `compatibility/rc/table-public-module-sources/cdk-${peer.version}-table.mjs`;
      const expected = {package: '@angular/cdk', version: peer.version, path, sha256: peer.sha256, member: 'CdkTable._updateNoDataRow'};
      demand(isDeepStrictEqual(proof?.affected_branches, [line]) && isDeepStrictEqual(proof?.installed_member, expected),
        'wrong authenticated inherited table member');
      demand(hash(readEvidenceMember(root, path)) === peer.sha256, 'wrong authenticated inherited table bytes');
      demand(proof.reachable_behavior?.kind === 'executed-delegation' && proof.reachable_behavior.id === TABLE_ONPUSH_CASE_ID,
        'wrong inherited table delegation');
      return validateArtifactBehavior({root, entry, proof, request});
    }
    // These validators bind fixed installed peer bytes, the complete source
    // scope, this run's packed artifact and meaningful per-SHA observations.
    if (selectionBehaviorRequirements(entry?.sha, line)) return validateSelectionBehavior({root, entry, proof, request});
    if (bidiBehaviorRequirements(entry?.sha, line)) return validateBidiBehavior({root, entry, proof, request});
    throw new Error('no registered verified inherited execution contract for this SHA; existing source judgments are retained');
  } catch (error) {return {ok: false, detail: error.message};}
}
