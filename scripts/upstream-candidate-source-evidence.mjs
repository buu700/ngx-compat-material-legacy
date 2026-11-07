/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {lstatSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {requiresTestingApi21xProof,testingApi21xSourceEvidenceOk} from './upstream-testing-api-21x-admission.mjs';
import {knownIndividualProofKind} from './upstream-individual-evidence-scope.mjs';

const sourceKinds = new Set(['candidate-source-line-match', 'candidate-source-equivalent']);
const normalize = text => text.replace(/\s/g, '');

/** Include untracked current source too; absence is a whole-package claim. */
export function candidateProductSourcePaths(root) {
  const paths = [];
  function walk(rel) {
    for (const name of readdirSync(join(root, rel)).sort()) {
      if (name === 'node_modules') continue;
      const path = rel + '/' + name, stat = lstatSync(join(root, path));
      if (stat.isSymbolicLink()) throw new Error('Symlink in candidate source population');
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile() && /\.(ts|scss|css|html)$/.test(path)) paths.push(path);
    }
  }
  walk('projects/ngx-material-legacy');
  return paths;
}

/** Source presence is a bounded proof, never execution or inherited behavior. */
export function candidateSourceEvidenceOk(proof, readMember, productPaths) {
  try {
    if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return false;
    if (Object.hasOwn(proof, 'proof_kind') && !knownIndividualProofKind(proof.proof_kind)) return false;
    for (const field of ['source_members', 'source_evidence']) {
      if (!Object.hasOwn(proof, field)) continue;
      // Historical source_evidence lists may denote earlier snapshots. Do not
      // reinterpret them as current bytes without an explicit reviewed scope.
      if (field === 'source_evidence' && proof.source_evidence_scope !== 'current') return false;
      const refs = proof[field];
      if (!Array.isArray(refs) || !refs.length) return false;
      const seen = new Set();
      for (const ref of refs) {
        if (!ref || typeof ref !== 'object' || Array.isArray(ref) ||
            Object.keys(ref).some(key => !['path', 'sha256', 'bytes'].includes(key)) || typeof ref.path !== 'string' ||
            !ref.path || ref.path.startsWith('/') || ref.path.includes('\\') ||
            ref.path.split('/').some(part => !part || part === '.' || part === '..') ||
            (field === 'source_members' && !ref.path.startsWith('projects/ngx-material-legacy/')) ||
            !/^[0-9a-f]{64}$/.test(ref.sha256 || '') || seen.has(ref.path)) return false;
        const bytes = readMember(ref.path);
        if (!Buffer.isBuffer(bytes) || createHash('sha256').update(bytes).digest('hex') !== ref.sha256 ||
            (Object.hasOwn(ref, 'bytes') && (!Number.isSafeInteger(ref.bytes) || ref.bytes !== bytes.length))) return false;
        seen.add(ref.path);
      }
    }
    if (proof.proof_kind === 'individual-contextual-source-review' &&
        (!Array.isArray(proof.source_members) || !proof.source_members.length)) return false;
  } catch { return false; }
  if (requiresTestingApi21xProof(proof, readMember)) return testingApi21xSourceEvidenceOk(proof, readMember, productPaths);
  if (!sourceKinds.has(proof?.proof_kind)) {
    return !['candidate_member', 'added_lines', 'equivalent_candidate_lines', 'absent_in_package']
      .some(key => Object.hasOwn(proof || {}, key));
  }
  try {
    const member = proof.candidate_member;
    if (!member?.path?.startsWith('projects/ngx-material-legacy/') || !/\.(ts|scss|css|html)$/.test(member.path)) return false;
    const bytes = readMember(member.path);
    if (!bytes || createHash('sha256').update(bytes).digest('hex') !== member.sha256) return false;
    const lines = bytes.toString('utf8').split('\n');
    const check = (items, field) => Array.isArray(items) && items.length > 0 && items.every(item =>
      typeof item?.[field] === 'string' && normalize(item[field]).length > 0 &&
      Array.isArray(item.candidate_lines) && item.candidate_lines.length > 0 &&
      new Set(item.candidate_lines).size === item.candidate_lines.length &&
      item.candidate_lines.every(n => Number.isInteger(n) && n > 0 && n <= lines.length &&
        normalize(lines[n - 1]).includes(normalize(item[field]))));
    if (!check(proof.added_lines, 'upstream_added')) return false;
    if (proof.proof_kind === 'candidate-source-equivalent' && !check(proof.equivalent_candidate_lines, 'candidate_snippet')) return false;
    if (proof.absent_in_package) {
      const absent = proof.absent_in_package;
      if (!Array.isArray(absent.needles) || absent.needles.length === 0 ||
          absent.needles.some(n => typeof n !== 'string' || !n.trim()) ||
          !Array.isArray(absent.hits) || absent.hits.length !== 0) return false;
      const paths = productPaths().filter(p => /\.(ts|scss|css|html)$/.test(p));
      if (!paths.length || !paths.includes(member.path)) return false;
      for (const path of paths) {
        const source = readMember(path);
        if (!source || absent.needles.some(n => source.toString('utf8').includes(n))) return false;
      }
    }
    return true;
  } catch { return false; }
}
