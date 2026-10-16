/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {reverseBidiPeerChecker} from '../../scripts/bidi-peer-source-context.mjs';
export const IDENTITY_INTEGRATION = [
  ["import {requiresGeneratedIdentity,validateGeneratedIdentity} from './upstream-generated-identity-evidence.mjs';\n", ''],
  ['  if (requiresGeneratedIdentity(entry, proof)) {\n    const result = validateGeneratedIdentity({root, entry, proof, request});\n    artifactBehaviorResults.set(entry.sha, result);\n    if (!result.ok) return false;\n  }\n', ''],
  ['  const sensitive = sensitiveClass(entry) || requiresProgressCsp(entry, entry.individual_proof) || requiresGeneratedIdentity(entry, entry.individual_proof);',
    '  const sensitive = sensitiveClass(entry) || requiresProgressCsp(entry, entry.individual_proof);'],
];
export function stripIdentityIntegration(text) {
  text = reverseBidiPeerChecker(text);
  for (const [current, preceding] of IDENTITY_INTEGRATION) {
    assert.equal(text.split(current).length, 2, 'missing/duplicate finite generated identity integration');
    text = text.replace(current, () => preceding);
  }
  return text;
}
export const HISTORICAL_IDENTITY_EDITS = [
  ["import {stripIdentityIntegration} from './identity-source-context.mjs';\n", ''],
  ["stripProgressCspIntegration(stripIdentityIntegration(read('scripts/check-upstream-audit-disposition.mjs').toString()), 'checker')",
    "stripProgressCspIntegration(read('scripts/check-upstream-audit-disposition.mjs').toString(), 'checker')"],
];
export const CSP_IDENTITY_EDITS = [
  ["import {readIdentityPredecessor} from './identity-source-context.mjs';\n", ''],
  ["inspectProgressCspJudgments({root, readMember: path => readIdentityPredecessor(path, read)})", 'inspectProgressCspJudgments({root})'],
  ["  entry.individual_proof.progress_csp_behavior.source_members.find(row => row.path === 'scripts/check-upstream-audit-disposition.mjs').sha256 = hash(read('scripts/check-upstream-audit-disposition.mjs'));\n", ''],
  ['  const original = readIdentityPredecessor(path, read), changed = mutate(original);', '  const original = read(path), changed = mutate(original);'],
  ['readMember: target => target === path ? changed : readIdentityPredecessor(target, read)', 'readMember: target => target === path ? changed : read(target)'],
];
export function reverseIdentityEdits(text, edits) {
  for (const [current, preceding] of edits) {
    assert.equal(text.split(current).length, 2, 'inexact identity test context'); text = text.replace(current, () => preceding);
  }
  return text;
}
/** Only recover the explicit new context, then run every older source assertion. */
export function readIdentityPredecessor(path, read) {
  const bytes = read(path);
  if (path === 'scripts/check-upstream-audit-disposition.mjs') return Buffer.from(stripIdentityIntegration(bytes.toString()));
  if (path === 'tests/upstream/historical-behavior-admission.mjs') return Buffer.from(reverseIdentityEdits(bytes.toString(), HISTORICAL_IDENTITY_EDITS));
  return bytes;
}
