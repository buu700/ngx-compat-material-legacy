#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Structural inventory of the frozen seed versus the disposition ledger.
 *
 * A structural pass is unique final rows for every seed SHA. It is not
 * security clearance and it does not admit the upstream-audit-disposition
 * check. Sensitive rows and material inheritance/behavior decisions need
 * individually sufficient proof. Import ancestry and a nonempty ledger
 * string are not that proof.
 *
 *   node scripts/check-upstream-audit-disposition.mjs
 *   node scripts/check-upstream-audit-disposition.mjs --admission --line main
 */
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {authoredUseInventory, authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
import {validateCurrentAdvisories} from './upstream-advisory-admission.mjs';
import {spawnSync} from 'node:child_process';
import {BUILD_SCOPE_ROLE,BUILD_SCOPE_PATCHES,buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
import {TEST_CONSOLIDATION_ROLE,TEST_CONSOLIDATION_PATCHES,testConsolidationBatchOk,testConsolidationEntryOk} from './upstream-test-consolidation-evidence.mjs';
import {COMMENT_SCOPE_ROLE,COMMENT_SHAS,commentScopeEvidenceOk} from './upstream-comment-review.mjs';
import {SLIDER_TOKEN_SHA,SLIDER_TOKEN_ROLE,sliderTokenEvidenceOk} from './upstream-slider-token-evidence.mjs';
import {SLIDER_RANGE_SHAS,SLIDER_RANGE_ROLE,sliderRangeEvidenceOk} from './upstream-slider-range-followups.mjs';
import {candidateSourceEvidenceOk, candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {c04FirstIndividualEvidenceClass} from './upstream-c04-first-individual-evidence.mjs';
import {reviewMetadataComplete,individualReviewScopeOk} from './upstream-individual-evidence-scope.mjs';
import {requiresArtifactBehavior,validateArtifactBehavior} from './upstream-artifact-behavior-evidence.mjs';
import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';
import {requiresRulesJsBuild,rulesJsBuildEntryEvidenceOk,rulesJsBuildOriginalPatch} from './upstream-rules-js-build-admission.mjs';
import {requiresSassInspectionScope,sassInspectionEntryEvidenceOk} from './upstream-sass-inspection-admission.mjs';
import {requiresHistoricalBehavior,validateHistoricalBehavior,historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';
import {CHIP_LIFECYCLE_SCOPE_ROLE,requiresChipLifecycleScope,chipLifecycleScopeEvidenceOk} from './upstream-chip-lifecycle-admission.mjs';
import {requiresProgressCsp,validateProgressCsp} from './upstream-progress-csp-evidence.mjs';
import {requiresGeneratedIdentity,validateGeneratedIdentity} from './upstream-generated-identity-evidence.mjs';
import {requiresNativeDate,validateNativeDate} from './upstream-native-date-evidence.mjs';
import {requiresOwnedStyle,validateOwnedStyle} from './upstream-owned-style-evidence.mjs';
import {requiresBidiBehavior,validateBidiBehavior} from './upstream-bidi-evidence.mjs';
import {requiresSelectionBehavior,validateSelectionBehavior} from './upstream-selection-evidence.mjs';
import {requiresFormFieldHover,validateFormFieldHover} from './upstream-form-field-hover-evidence.mjs';
import {requiresTabCompletion,validateTabCompletion} from './upstream-tab-completion-evidence.mjs';
import {requiresRippleReplay,validateRippleReplay} from './upstream-ripple-replay-evidence.mjs';
import {requiresContentObserver,validateContentObserver} from './upstream-content-observer-evidence.mjs';
import {requiresMediaMatcher,validateMediaMatcher} from './upstream-media-matcher-evidence.mjs';
import {SLIDER_INPUT_ROLE, SLIDER_INPUT_SHAS, sliderInputScopeEvidenceOk} from './upstream-slider-input-scope.mjs';
import {SLIDER_THUMB_DESTROY_SHA, SLIDER_THUMB_DESTROY_ROLE, sliderThumbDestroyEvidenceOk} from './upstream-slider-thumb-destroy-scope.mjs';
import {BAZEL_BUILD_SHAS, BAZEL_BUILD_ROLE, bazelBuildEvidenceOk} from './upstream-bazel-build-scope.mjs';
import {TEST_IMPORT_ROLE, TEST_IMPORT_SHAS, testImportBatchOk, testImportEntryOk} from './upstream-test-import-cleanup-evidence.mjs';
import {requiresBootstrapPreparation, bootstrapPreparationEntryOk} from './bootstrap-stability-evidence.mjs';
import {MODERN_CHIP_SCOPE_ROLE,requiresModernChipScope,modernChipScopeEvidenceOk} from './upstream-modern-chip-scope.mjs';
import {CHIP_EDIT_SCOPE_ROLE,requiresChipEditScope,chipEditScopeEvidenceOk} from './upstream-chip-edit-scope.mjs';
import {CHIP_INPUT_API_SCOPE_ROLE,requiresChipInputApiScope,chipInputApiScopeEvidenceOk} from './upstream-chip-input-api-scope.mjs';
import {CHIP_MODERNIZATION_SCOPE_ROLE,requiresChipModernizationScope,chipModernizationScopeEvidenceOk} from './upstream-chip-modernization-scope.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ALLOWED_FINAL = new Set([
  'irrelevant',
  'not-applicable',
  'inherited',
  'already-adapted',
  'do-not-adopt',
  'adapt',
  'already-present',
]);
const PENDING = new Set(['open', 'needs-individual-review', 'security-review']);
const INHERITED = new Set(['inherited']);
const BEHAVIOR = new Set(['adapt', 'already-adapted', 'already-present']);
const REVIEW_DEPTHS = new Set([
  'individual-semantic',
  'individual-deep',
  'individual-compatibility',
  'individual-escalated',
]);
const HEX64 = /^[0-9a-f]{64}$/;
const SECURITY_LINE = /bypassSecurityTrust|DomSanitizer|\.innerHTML|securityContext|javascript:|eval\(|new Function\(|document\.write/;

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const seedPath = arg('--seed', join(root, 'compatibility/f10/upstream-sha-risk-bootstrap.json'));
const ledgerPath = arg('--ledger', join(root, 'compatibility/f10/disposition-ledger/ledger.json'));
const reportPath = arg('--report', join(root, 'compatibility/rc/reports/upstream-audit-disposition.json'));
const symbolsPath = arg('--symbols', join(root, 'compatibility/f10/authored-dependency-dispositions.json'));
const currentSymbolsPath = arg('--current-symbols', join(root, 'compatibility/f10/authored-dependency-current-dispositions.json'));
const patchesDir = arg('--patches', '');
const line = arg('--line', '');
const admission = hasFlag('--admission');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function patchText(entry) {
  if (typeof entry.patch === 'string' && entry.patch) return entry.patch;
  if (!patchesDir || !entry.sha) return '';
  const file = join(patchesDir, `${entry.sha}.diff`);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function securityHunkLabeledDocsOnly(entry) {
  const label = `${entry.final_disposition || ''} ${entry.read_note_disposition || ''} ${entry.reason || ''}`;
  if (!/docs-only/i.test(label)) return false;
  const patch = patchText(entry);
  if (!patch) return false;
  let file = '';
  for (const row of patch.split('\n')) {
    if (row.startsWith('diff --git ')) file = row.split(' b/').pop();
    if (!row.startsWith('+') || row.startsWith('+++')) continue;
    if (file.endsWith('.md')) continue;
    if (SECURITY_LINE.test(row)) return true;
  }
  return false;
}

function sensitiveClass(entry) {
  if (entry.bucket === 'security-deep') return 'security';
  const files = Array.isArray(entry.files) ? entry.files.join('\n') : '';
  const blob = `${entry.subject || ''}\n${files}`;
  if (/a11y|accessibility|live-announcer|focus-trap|focus-monitor|aria-/i.test(blob)) return 'a11y';
  if (/\b(ngOnInit|ngOnChanges|ngOnDestroy|ngAfterViewInit|ngAfterContentInit)\b/.test(entry.subject || '')) {
    return 'lifecycle';
  }
  return null;
}

const evidenceCache = new Map();
const artifactBehaviorResults = new Map();
const inheritedExecutionResults = new Map();
const testConsolidationCache = new Map();
const testImportCache = new Map();
let buildScopeProductPaths;
function currentProductPaths() {
  if (!buildScopeProductPaths) {
    const result=spawnSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'});
    if (result.status!==0) return [];
    buildScopeProductPaths=result.stdout.trim().split('\n').filter(Boolean);
  }
  return buildScopeProductPaths;
}
function evidenceJson(file) {
  if (!evidenceCache.has(file)) {
    let body = null;
    try { body = JSON.parse(readFileSync(file, 'utf8')); } catch { body = null; }
    evidenceCache.set(file, body);
  }
  return evidenceCache.get(file);
}

// A pointer is evidence only if the file actually speaks about this SHA: a
// batch report must list it among its reviews, and a per-SHA JSON record must
// carry the same sha. A file that merely exists is not evidence for the row.
function evidenceClass(entry) {
  const c04 = c04FirstIndividualEvidenceClass(entry, line, rel => {
    const member = regularRepoMember(rel); return member ? readFileSync(member) : null;
  });
  if (c04) return c04;
  const rel = entry.evidence_report;
  if (typeof rel !== 'string' || !rel.trim()) return 'missing';
  const rulesJsBuildScope = requiresRulesJsBuild(entry);
  if (rulesJsBuildScope && !rel.endsWith('.json')) return 'invalid-rules-js-build-scope';
  const sassInspectionScope = requiresSassInspectionScope(entry);
  if (sassInspectionScope && !rel.endsWith('.json')) return 'invalid-sass-inspection-scope';
  if (requiresModernChipScope(entry,entry.individual_proof) && !rel.endsWith('.json')) return 'invalid-modern-chip-source-scope';
  if (requiresChipEditScope(entry,entry.individual_proof) && !rel.endsWith('.json')) return 'invalid-chip-edit-source-scope';
  if (requiresChipInputApiScope(entry,entry.individual_proof) && !rel.endsWith('.json')) return 'invalid-chip-input-api-source-scope';
  if (requiresChipLifecycleScope(entry,entry.individual_proof) && !rel.endsWith('.json')) return 'invalid-chip-lifecycle-source-scope';
  if (requiresChipModernizationScope(entry,entry.individual_proof) && !rel.endsWith('.json')) return 'invalid-chip-modernization-source-scope';
  if (TEST_IMPORT_SHAS.includes(entry.sha) && !rel.endsWith('.json')) return 'invalid-test-import-cleanup-scope';
  if (SLIDER_INPUT_SHAS.includes(entry.sha) && !rel.endsWith('.json')) return 'invalid-slider-input-scope';
  if (entry.sha === SLIDER_THUMB_DESTROY_SHA && !rel.endsWith('.json')) return 'invalid-slider-thumb-destroy-scope';
  if (BAZEL_BUILD_SHAS.includes(entry.sha) && !rel.endsWith('.json')) return 'invalid-bazel-build-only-scope';
  const consolidationScope = Object.hasOwn(TEST_CONSOLIDATION_PATCHES, entry.sha)
    || entry.batch_id === 'closeout-test-consolidation-source-review';
  if (consolidationScope && !rel.endsWith('.json')) return 'invalid-test-consolidation-scope';
  if (rel.startsWith('/') || rel.split('/').includes('..')) return 'missing';
  if (rel === 'compatibility/rc/reports/upstream-audit-disposition.json') return 'circular';
  const file = join(root, rel);
  if (!existsSync(file) || !lstatSync(file).isFile()) return 'missing-file';
  const named = rel.split('/').pop().match(/\b[0-9a-f]{40}\b/);
  if (named && named[0] !== entry.sha) return 'other-sha';
  if (rel.endsWith('.json')) {
    const body = evidenceJson(file);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';
    if (rulesJsBuildScope && !rulesJsBuildEntryEvidenceOk({root,read:readRegularRepoBytes,entry,body,
      line:line||body.line})) return 'invalid-rules-js-build-scope';
    if (sassInspectionScope && !sassInspectionEntryEvidenceOk({root,read:readRegularRepoBytes,entry,body,
      line:line||body.line})) return 'invalid-sass-inspection-scope';
    if (requiresChipLifecycleScope(entry,entry.individual_proof) || body.role === CHIP_LIFECYCLE_SCOPE_ROLE) {
      const readMember = rel => {const member=regularRepoMember(rel);return member?readFileSync(member):null;};
      if (!chipLifecycleScopeEvidenceOk(body,entry,readMember,root,line || body.line,historicalBehaviorRequirements)) return 'invalid-chip-lifecycle-source-scope';
    }
    if (requiresChipModernizationScope(entry,entry.individual_proof) || body.role === CHIP_MODERNIZATION_SCOPE_ROLE) {
      const readMember = rel => {const member=regularRepoMember(rel);return member?readFileSync(member):null;};
      if (!chipModernizationScopeEvidenceOk(body,entry,readMember,candidateProductSourcePaths(root).sort(),line || body.line)) return 'invalid-chip-modernization-source-scope';
    }
    if (requiresChipInputApiScope(entry,entry.individual_proof) || body.role === CHIP_INPUT_API_SCOPE_ROLE) {
      const readMember = rel => {const member=regularRepoMember(rel);return member?readFileSync(member):null;};
      if (!chipInputApiScopeEvidenceOk(body,entry,readMember,candidateProductSourcePaths(root).sort(),line || body.line)) return 'invalid-chip-input-api-source-scope';
    }
    if (requiresChipEditScope(entry,entry.individual_proof) || body.role === CHIP_EDIT_SCOPE_ROLE) {
      const readMember = rel => {const member=regularRepoMember(rel);return member?readFileSync(member):null;};
      if (!chipEditScopeEvidenceOk(body,entry,readMember,candidateProductSourcePaths(root).sort(),line || body.line)) return 'invalid-chip-edit-source-scope';
    }
    if (requiresModernChipScope(entry,entry.individual_proof) || body.role === MODERN_CHIP_SCOPE_ROLE) {
      const readMember = rel => {const member=regularRepoMember(rel);return member?readFileSync(member):null;};
      if (!modernChipScopeEvidenceOk(body,entry,readMember,candidateProductSourcePaths(root).sort(),line || body.line)) return 'invalid-modern-chip-source-scope';
    }
    if (TEST_IMPORT_SHAS.includes(entry.sha) || body.role === TEST_IMPORT_ROLE) {
      const readMember = rel => {const member = regularRepoMember(rel); return member ? readFileSync(member) : null;};
      if (!testImportCache.has(file)) testImportCache.set(file, testImportBatchOk(body, readMember, line || body.line));
      if (!testImportEntryOk(body, entry, readMember, testImportCache.get(file))) return 'invalid-test-import-cleanup-scope';
    }
    if (SLIDER_INPUT_SHAS.includes(entry.sha) || body.role === SLIDER_INPUT_ROLE) {
      const readMember = rel => {const member = regularRepoMember(rel); return member ? readFileSync(member) : null;};
      if (!sliderInputScopeEvidenceOk(body, entry, readMember, () => candidateProductSourcePaths(root), line || body.line)) return 'invalid-slider-input-scope';
    }
    if (entry.sha === SLIDER_THUMB_DESTROY_SHA || body.role === SLIDER_THUMB_DESTROY_ROLE) {
      const readMember = rel => {const member = regularRepoMember(rel); return member ? readFileSync(member) : null;};
      if (!sliderThumbDestroyEvidenceOk(body, entry, readMember, () => candidateProductSourcePaths(root), line || body.line)) return 'invalid-slider-thumb-destroy-scope';
    }
    if (BAZEL_BUILD_SHAS.includes(entry.sha) || body.role === BAZEL_BUILD_ROLE) {
      const readMember = rel => {const member = regularRepoMember(rel); return member ? readFileSync(member) : null;};
      if (!bazelBuildEvidenceOk(body, entry, readMember, currentProductPaths, line || body.line)) return 'invalid-bazel-build-only-scope';
    }
    if(entry.sha===SLIDER_TOKEN_SHA||body.role===SLIDER_TOKEN_ROLE){
      const readMember=rel=>{const member=regularRepoMember(rel);return member?readFileSync(member):null;};
      if(!sliderTokenEvidenceOk(body,entry,readMember,line||body.line))return 'invalid-slider-token-scope';
    }
    if(SLIDER_RANGE_SHAS.includes(entry.sha)||body.role===SLIDER_RANGE_ROLE){
      const readMember=rel=>{const member=regularRepoMember(rel);return member?readFileSync(member):null;};
      if(!sliderRangeEvidenceOk(body,entry,readMember,()=>candidateProductSourcePaths(root),line||body.line))return 'invalid-slider-range-followup-scope';
    }
    if (COMMENT_SHAS.includes(entry.sha) || body.role === COMMENT_SCOPE_ROLE) {
      const readMember = rel => {const member = regularRepoMember(rel); return member ? readFileSync(member) : null;};
      if (!commentScopeEvidenceOk(body, entry, readMember, line || body.line)) return 'invalid-comment-scope';
    }
    if(consolidationScope||body.role===TEST_CONSOLIDATION_ROLE){
      const readMember=rel=>{const member=regularRepoMember(rel);return member?readFileSync(member):null;};
      if(!testConsolidationCache.has(file))testConsolidationCache.set(file,testConsolidationBatchOk(body,readMember,currentProductPaths()));
      if(!testConsolidationEntryOk(body,entry,readMember,testConsolidationCache.get(file)))return 'invalid-test-consolidation-scope';
    }
    if ((Object.hasOwn(BUILD_SCOPE_PATCHES,entry.sha) || body.role===BUILD_SCOPE_ROLE || rel==='compatibility/f10/disposition-ledger/evidence/closeout-fourteen-build-scope-review.json'
        || entry.batch_id==='closeout-fourteen-build-source-scope') && !buildScopeEvidenceOk(body,entry,rel=>{
        const member=regularRepoMember(rel);return member?readFileSync(member):null;
      },currentProductPaths())) return 'invalid-build-scope';
    const review=Array.isArray(body.reviews)?body.reviews.find(item=>item&&item.sha===entry.sha):body;
    if(Array.isArray(body.reviews)&&!review)return 'not-in-report';
    if (!Array.isArray(body.reviews)&&typeof body.sha === 'string' && body.sha !== entry.sha) return 'other-sha';
    if (!Array.isArray(body.reviews)&&rel.startsWith('compatibility/f10/disposition-ledger/evidence/') && body.sha !== entry.sha) return 'other-sha';
    if(ALLOWED_FINAL.has(entry.final_disposition)&&!reviewMetadataComplete({entry,body,review}))return 'unfinished-review';
  }
  return 'file';
}

function regularRepoMember(rel) {
  if (typeof rel !== 'string' || rel.includes('\\')) return null;
  const parts = rel.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) return null;
  let file = root;
  try {
    for (const part of parts) {
      file = join(file, part);
      if (lstatSync(file).isSymbolicLink()) return null;
    }
    return lstatSync(file).isFile() ? file : null;
  } catch { return null; }
}

// Dependency graph resolvers distinguish an absent candidate (ENOENT) from an
// unreadable or unsafe source. Preserve that filesystem contract for raw reads.
function readRegularRepoBytes(rel) {
  if (typeof rel !== 'string' || rel.includes('\\')) throw new Error('unsafe source member');
  const parts = rel.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) throw new Error('unsafe source member');
  let file = root, stat;
  for (const part of parts) {
    file = join(file, part); stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error('symlink in source member');
  }
  if (!stat.isFile()) throw new Error('source member is not a regular file');
  return readFileSync(file);
}

function individualPatchBound(entry, proof) {
  if (!regularRepoMember(entry.evidence_report)) return false;
  if (evidenceClass(entry) !== 'file' || !entry.evidence_report.endsWith('.json')) return false;
  const body = evidenceJson(join(root, entry.evidence_report));
  const review = Array.isArray(body?.reviews)
    ? body.reviews.find(item => item?.sha === entry.sha) : body;
  if (!review || review.sha !== entry.sha || review.diff_sha256 !== proof.diff_sha256) return false;
  if(!individualReviewScopeOk({entry,proof,body,review,
    requiresIndividual:Boolean(sensitiveClass(entry))||requiresChipLifecycleScope(entry,proof)||requiresChipModernizationScope(entry,proof)||requiresChipInputApiScope(entry,proof)||requiresChipEditScope(entry,proof)||requiresHistoricalBehavior(entry,proof)||requiresArtifactBehavior(entry,proof)||requiresOwnedStyle(entry,proof)||INHERITED.has(entry.final_disposition)||BEHAVIOR.has(entry.final_disposition),
    claimsBehavior:INHERITED.has(entry.final_disposition)||BEHAVIOR.has(entry.final_disposition)}))return false;
  let bytes;
  if (requiresRulesJsBuild(entry)) {
    bytes = rulesJsBuildOriginalPatch(readRegularRepoBytes,entry.sha);
  } else if (typeof review.diff === 'string' && review.diff.startsWith('diff --git ')) {
    bytes = Buffer.from(review.diff, 'utf8');
  } else {
    const file = regularRepoMember(review.patch_file);
    if (!file) return false;
    bytes = readFileSync(file);
    if (!bytes.toString('utf8').includes('diff --git ')) return false;
  }
  return createHash('sha256').update(bytes).digest('hex') === proof.diff_sha256;
}

function individualProofOk(entry) {
  const proof = entry.individual_proof;
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return false;
  if ((requiresBootstrapPreparation(entry) || proof.current_bootstrap_preparation !== undefined) && !bootstrapPreparationEntryOk(entry, proof, rel => {
    const member = regularRepoMember(rel);
    return member ? readFileSync(member) : null;
  })) return false;
  if (!HEX64.test(proof.diff_sha256 || '') || !individualPatchBound(entry, proof)) return false;
  if (!candidateSourceEvidenceOk(proof, rel => {
    const member = regularRepoMember(rel);
    return member ? readFileSync(member) : null;
  }, () => candidateProductSourcePaths(root))) return false;
  if (!REVIEW_DEPTHS.has(proof.review_depth)) return false;
  if (!Array.isArray(proof.affected_branches) || proof.affected_branches.length === 0) return false;
  if (!proof.affected_branches.every(branch => branch === 'main' || branch === '21.x')) return false;
  if (line && !proof.affected_branches.includes(line)) return false;
  if (typeof proof.decision !== 'string' || proof.decision.trim().length < 40) return false;
  if (proof.proof_kind === 'batch' || proof.proof_kind === 'ancestry' || proof.proof_kind === 'import') return false;
  if (requiresNativeDate(entry, proof)) {
    const result = validateNativeDate({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresOwnedStyle(entry, proof)) {
    const result = validateOwnedStyle({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresGeneratedIdentity(entry, proof)) {
    const result = validateGeneratedIdentity({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresBidiBehavior(entry, proof)) {
    const result = validateBidiBehavior({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresSelectionBehavior(entry, proof)) {
    const result = validateSelectionBehavior({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresFormFieldHover(entry, proof)) {
    const result = validateFormFieldHover({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresTabCompletion(entry, proof)) {
    const result = validateTabCompletion({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresRippleReplay(entry, proof)) {
    const result = validateRippleReplay({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresProgressCsp(entry, proof)) {
    const result = validateProgressCsp({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresHistoricalBehavior(entry, proof)) {
    const result = validateHistoricalBehavior({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresArtifactBehavior(entry, proof)) {
    const result = validateArtifactBehavior({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  if (requiresMediaMatcher(entry, proof)) {
    const result = validateMediaMatcher({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    inheritedExecutionResults.set(entry.sha, result);
    return result.ok;
  }
  if (requiresContentObserver(entry, proof)) {
    const result = validateContentObserver({root, entry, proof, request});
    artifactBehaviorResults.set(entry.sha, result);
    inheritedExecutionResults.set(entry.sha, result);
    // This finite guard has verified the installed identity and complete
    // per-SHA execution; generic inherited labels cannot substitute for it.
    return result.ok;
  }
  if (INHERITED.has(entry.final_disposition)) {
    const result = validateInheritedExecution({root, entry, proof, request, line});
    inheritedExecutionResults.set(entry.sha, result);
    if (!result.ok) return false;
  }
  return true;
}

const request = coordinatorRequest();
if (request && request.error) fail(2, `upstream-audit-disposition: refusing acceptance report: ${request.error}`);

if (!existsSync(seedPath)) fail(2, `Missing seed: ${seedPath}`);
if (!existsSync(ledgerPath)) fail(1, `Missing disposition ledger: ${ledgerPath}`);

const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const seedShas = new Set(seed.commits.map(commit => commit.sha));
const ledgerBySha = new Map();
const conflicts = [];
for (const entry of ledger.entries || []) {
  if (ledgerBySha.has(entry.sha)) conflicts.push(entry.sha);
  ledgerBySha.set(entry.sha, entry);
}
const missing = [...seedShas].filter(sha => !ledgerBySha.has(sha));
const unresolved = [];
const unknown = [];
const missingEvidence = [];
const evidenceFailures = [];
const circularEvidence = [];
const insufficientSensitive = [];
const insufficientInherited = [];
const insufficientBehavior = [];
const missingBranch = [];
for (const entry of ledgerBySha.values()) {
  const disposition = entry.final_disposition;
  if (!disposition || PENDING.has(disposition)) unresolved.push(entry.sha);
  else if (!ALLOWED_FINAL.has(disposition)) unknown.push(entry.sha);
  const evidence = evidenceClass(entry);
  if (evidence === 'circular') circularEvidence.push(entry.sha);
  else if (evidence !== 'file') {
    missingEvidence.push(entry.sha);
    evidenceFailures.push({sha: entry.sha, reason: evidence, evidence_report: entry.evidence_report ?? null});
  }
  const sensitive = sensitiveClass(entry) || requiresHistoricalBehavior(entry, entry.individual_proof) || requiresArtifactBehavior(entry, entry.individual_proof) || requiresOwnedStyle(entry, entry.individual_proof) || requiresNativeDate(entry, entry.individual_proof) || requiresProgressCsp(entry, entry.individual_proof) || requiresGeneratedIdentity(entry, entry.individual_proof) || requiresBidiBehavior(entry, entry.individual_proof) || requiresSelectionBehavior(entry, entry.individual_proof)
    || requiresFormFieldHover(entry, entry.individual_proof) || requiresTabCompletion(entry, entry.individual_proof) || requiresRippleReplay(entry, entry.individual_proof) || requiresContentObserver(entry, entry.individual_proof) || requiresMediaMatcher(entry, entry.individual_proof) || requiresChipEditScope(entry, entry.individual_proof) || requiresChipInputApiScope(entry, entry.individual_proof) || requiresChipModernizationScope(entry, entry.individual_proof) || requiresChipLifecycleScope(entry, entry.individual_proof);
  const needsIndividual = Boolean(sensitive) || INHERITED.has(disposition) || BEHAVIOR.has(disposition);
  if (needsIndividual && !individualProofOk(entry)) {
    if (sensitive) insufficientSensitive.push(entry.sha);
    if (INHERITED.has(disposition)) insufficientInherited.push(entry.sha);
    if (BEHAVIOR.has(disposition)) insufficientBehavior.push(entry.sha);
    const branches = entry.individual_proof && Array.isArray(entry.individual_proof.affected_branches)
      ? entry.individual_proof.affected_branches : [];
    if (!line || !branches.includes(line)) missingBranch.push(entry.sha);
  }
}
const outside = [...ledgerBySha.keys()].filter(sha => !seedShas.has(sha));
const securityDocsOnly = [...ledgerBySha.values()].filter(securityHunkLabeledDocsOnly).map(entry => entry.sha);
const forgedClearance = ledger.security_clearance === 'passed' || ledger.g11_claim === 'passed';

const authoredReferencePath = join(root, 'compatibility/f10/authored-dependency-inventory-seed.json');
const authoredReferenceBytes = readFileSync(authoredReferencePath);
if (createHash('sha256').update(authoredReferenceBytes).digest('hex') !== '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b')
  fail(2, 'Frozen authored-use reference identity mismatch');
const authoredReference = JSON.parse(authoredReferenceBytes);
let symbolUsesOpen = null;
let symbolStatus = 'missing';
let symbolDispositionsSha256 = null;
let symbolInventory = authoredUseInventory(authoredReference.symbol_uses, null);
let symbolReviewEvidence = {reviewed:0,insufficient:0,insufficient_uses:[]};
const reviewLine = line || (JSON.parse(readFileSync(join(root,'package.json'),'utf8')).devDependencies['@angular/core'].startsWith('21.') ? '21.x' : 'main');
if (existsSync(symbolsPath)) {
  const symbolBytes = readFileSync(symbolsPath);
  symbolDispositionsSha256 = createHash('sha256').update(symbolBytes).digest('hex');
  const symbols = JSON.parse(symbolBytes.toString('utf8'));
  symbolStatus = symbols.status || 'missing';
  symbolInventory = authoredUseInventory(authoredReference.symbol_uses, symbols);
  symbolReviewEvidence = authoredUseReviewEvidence(symbols,reviewLine,rel=>{const file=regularRepoMember(rel);return file?readFileSync(file):null;},bytes=>createHash('sha256').update(bytes).digest('hex'));
  symbolUsesOpen = symbolInventory.open + symbolInventory.missing + symbolInventory.duplicates
    + symbolInventory.outside + symbolInventory.invalid;
} 

// The immutable seed remains fully required. Later authored imports and public
// reexports are separate obligations discovered from actual current source.
const currentAuthoredSource = scanCurrentAuthoredUses({root});
let currentSymbols = null;
try { currentSymbols = JSON.parse(readFileSync(currentSymbolsPath, 'utf8')); } catch { /* Missing/unreadable is incomplete. */ }
const currentSymbolAdmission = currentAuthoredUseAdmission({current: currentAuthoredSource,
  frozen: authoredReference.symbol_uses, candidate: currentSymbols, line: reviewLine,
  readMember: readRegularRepoBytes});

const structuralOk = missing.length === 0 && unresolved.length === 0 && conflicts.length === 0
  && outside.length === 0 && securityDocsOnly.length === 0 && unknown.length === 0
  && !forgedClearance && ledger.g11_claim === 'not-passed';
const dispositionOk = structuralOk && missingEvidence.length === 0 && circularEvidence.length === 0
  && insufficientSensitive.length === 0 && insufficientInherited.length === 0
  && insufficientBehavior.length === 0 && missingBranch.length === 0
  && symbolInventory.complete && symbolUsesOpen === 0 && symbolStatus === 'closed' && symbolReviewEvidence.insufficient === 0
  && currentSymbolAdmission.ready;

const summary = {
  ok: structuralOk,
  structural_inventory: structuralOk ? 'pass' : 'fail',
  disposition_admission: dispositionOk ? 'pass' : 'incomplete',
  security_clearance: 'not-passed',
  g11_claim: 'not-passed',
  seed_rows: seedShas.size,
  ledger_rows: ledgerBySha.size,
  missing: missing.length,
  unresolved: unresolved.length,
  conflicting_sha_rows: conflicts.length,
  outside_seed: outside.length,
  security_hunk_labeled_docs_only: securityDocsOnly.length,
  unknown_disposition: unknown.length,
  missing_evidence: missingEvidence.length,
  circular_evidence: circularEvidence.length,
  insufficient_sensitive: insufficientSensitive.length,
  insufficient_inherited: insufficientInherited.length,
  insufficient_behavior: insufficientBehavior.length,
  missing_branch_applicability: missingBranch.length,
  authored_use_inventory: symbolInventory,
  authored_use_review_evidence: {reviewed:symbolReviewEvidence.reviewed,insufficient:symbolReviewEvidence.insufficient,insufficient_use_sample:symbolReviewEvidence.insufficient_uses.slice(0,20)},
  current_authored_use_inventory: currentSymbolAdmission,
  symbol_uses_open: symbolUsesOpen,
  symbol_status: symbolStatus,
  symbol_dispositions_sha256: symbolDispositionsSha256,
  forged_clearance: forgedClearance,
};

const report = {
  schema_version: 1,
  role: 'upstream audit disposition coverage',
  check_id: 'upstream-audit-disposition',
  evidence_failures: evidenceFailures,
  artifact_behavior_evidence: [...artifactBehaviorResults].map(([sha, result]) => ({sha, ...result})),
  inherited_execution_evidence: [...inheritedExecutionResults].map(([sha, result]) => ({sha, ...result})),
  insufficient_review_sha_ids: {
    sensitive: insufficientSensitive,
    inherited: insufficientInherited,
    behavior: insufficientBehavior,
    branch_applicability: missingBranch,
  },
  seed_rows: seedShas.size,
  ledger_rows: ledgerBySha.size,
  missing_from_ledger: missing.length,
  unresolved_in_ledger: unresolved.length,
  conflicting_sha_rows: conflicts.length,
  outside_seed: outside.length,
  security_hunk_labeled_docs_only: securityDocsOnly.length,
  unknown_disposition: unknown.length,
  missing_evidence: missingEvidence.length,
  circular_evidence: circularEvidence.length,
  insufficient_sensitive: insufficientSensitive.length,
  insufficient_inherited: insufficientInherited.length,
  insufficient_behavior: insufficientBehavior.length,
  missing_branch_applicability: missingBranch.length,
  authored_use_inventory: symbolInventory,
  authored_use_review_evidence: symbolReviewEvidence,
  current_authored_use_inventory: currentSymbolAdmission,
  symbol_uses_open: symbolUsesOpen,
  symbol_status: symbolStatus,
  symbol_dispositions_sha256: symbolDispositionsSha256,
  ledger_sha256: createHash('sha256').update(readFileSync(ledgerPath)).digest('hex'),
  result: structuralOk ? 'pass' : 'fail',
  structural_inventory: summary.structural_inventory,
  disposition_admission: summary.disposition_admission,
  security_clearance: 'not-passed',
  g11_claim: 'not-passed',
  limitations: [
    'Structural inventory equality is not security clearance and is not cell closure.',
    'Sensitive rows and inherited or other material behavior decisions need individual proof. Tag ancestry or an import path is not that proof.',
    'A ledger string cannot set security clearance. g11_claim stays not-passed.',
    'Authored-use closed labels require exact per-use source/line/import review and independently hashed evidence. These bindings do not replace complete semantic G11 review of each conclusion.',
    'Current named imports, reexports, namespace/default/side-effect/import-type and unresolved dynamic routes are discovered independently. Added uses require their own complete source-bound dispositions; removed uses remain in the frozen roster.',
    'Does not claim G11.',
  ],
};

function coordinatorRequest() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length) return {error: `incomplete coordinator environment: ${present.join(', ')}`};
  if (process.env.RC_CHECK_ID !== 'upstream-audit-disposition') return {error: 'RC_CHECK_ID is not upstream-audit-disposition'};
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) return {error: 'invalid invocation identity'};
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    return {error: 'RC_EVIDENCE_BINDING is not JSON'};
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return {error: 'binding is not an object'};
  if (binding.run_id !== process.env.RC_RUN_ID) return {error: 'binding run_id does not match RC_RUN_ID'};
  const major = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'), 'utf8')).version.split('.')[0];
  const sourceLine = major === '22' ? 'main' : major === '21' ? '21.x' : null;
  if (!sourceLine || binding.source_line !== sourceLine || (line && line !== sourceLine)) return {error: 'binding line does not match this checkout'};
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  if (!outputDir || !existsSync(outputDir)) return {error: 'assertion output directory is missing'};
  const stat = lstatSync(outputDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return {error: 'assertion output directory is not a real directory'};
  const expectedSuffix = join('evidence', 'upstream-audit-disposition', invocation);
  if (!outputDir.endsWith(expectedSuffix)) return {error: 'assertion directory is not check-owned'};
  let packedConsumerExecution;
  if (process.env.RC_UPSTREAM_PACKED_CONSUMER !== undefined) {
    try { packedConsumerExecution = JSON.parse(process.env.RC_UPSTREAM_PACKED_CONSUMER); }
    catch { return {error: 'RC_UPSTREAM_PACKED_CONSUMER is not JSON'}; }
  }
  let historicalExecution;
  if (process.env.RC_UPSTREAM_HISTORICAL !== undefined) {
    try { historicalExecution = JSON.parse(process.env.RC_UPSTREAM_HISTORICAL); }
    catch { return {error: 'RC_UPSTREAM_HISTORICAL is not JSON'}; }
  }
  let sassExecution;
  if (process.env.RC_UPSTREAM_SASS_SEAL !== undefined) {
    try { sassExecution = JSON.parse(process.env.RC_UPSTREAM_SASS_SEAL); }
    catch { return {error: 'RC_UPSTREAM_SASS_SEAL is not JSON'}; }
  }
  let browserExecution;
  if (process.env.RC_UPSTREAM_BROWSER_MATRIX !== undefined) {
    try { browserExecution = JSON.parse(process.env.RC_UPSTREAM_BROWSER_MATRIX); }
    catch { return {error: 'RC_UPSTREAM_BROWSER_MATRIX is not JSON'}; }
  }
  let nativeMotionExecution;
  if (process.env.RC_UPSTREAM_NATIVE_MOTION !== undefined) {
    try { nativeMotionExecution = JSON.parse(process.env.RC_UPSTREAM_NATIVE_MOTION); }
    catch { return {error: 'RC_UPSTREAM_NATIVE_MOTION is not JSON'}; }
  }
  let typeaheadExecution;
  if (process.env.RC_UPSTREAM_TYPEAHEAD !== undefined) {
    try { typeaheadExecution = JSON.parse(process.env.RC_UPSTREAM_TYPEAHEAD); }
    catch { return {error: 'RC_UPSTREAM_TYPEAHEAD is not JSON'}; }
  }
  return {binding, invocation, runId: process.env.RC_RUN_ID, outputDir, runDir: resolve(outputDir, '..', '..', '..'), line: binding.source_line, packedConsumerExecution, sassExecution, historicalExecution, browserExecution, nativeMotionExecution, typeaheadExecution};
}

const dependencyGroups = request ? JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'))
  .checks.find(check => check.check_id === 'dependency-eligibility').acceptance.cases_by_line[request.line] : null;
const advisory = request ? validateCurrentAdvisories({runDir: request.runDir, binding: request.binding,
  expectedCaseIds: dependencyGroups && Object.values(dependencyGroups).every(Array.isArray)
    ? Object.values(dependencyGroups).flat() : null}) : {ok: false, detail: 'No run-bound current dependency lookup supplied.'};

const CASE_RESULTS = [
  ['upstream-shas', 'upstream-audit/upstream-shas/unique-membership', missing.length === 0 && conflicts.length === 0 && outside.length === 0 && unresolved.length === 0],
  ['upstream-shas', 'upstream-audit/upstream-shas/allowed-vocabulary', unknown.length === 0 && !forgedClearance],
  ['upstream-shas', 'upstream-audit/upstream-shas/sensitive-individual-proof', insufficientSensitive.length === 0],
  ['upstream-shas', 'upstream-audit/upstream-shas/independent-evidence', missingEvidence.length === 0 && circularEvidence.length === 0],
  ['authored-symbols', 'upstream-audit/authored-symbols/complete-use-dispositions', symbolInventory.complete && symbolUsesOpen === 0 && symbolStatus === 'closed' && symbolReviewEvidence.insufficient === 0 && currentSymbolAdmission.ready],
  ['installed-peer-fixes', 'upstream-audit/installed-peer-fixes/content-not-ancestry', insufficientInherited.length === 0],
  ['installed-peer-fixes', 'upstream-audit/installed-peer-fixes/branch-applicability', missingBranch.length === 0 && insufficientBehavior.length === 0],
  ['current-advisories', 'upstream-audit/current-advisories/bound-current-lookup', advisory.ok],
];

function writeAcceptance(request) {
  const cases = CASE_RESULTS.map(([group, caseId, passed]) => ({
    case_id: caseId,
    group,
    result: passed ? 'pass' : 'fail',
    detail: group === 'current-advisories' ? advisory.detail : passed ? 'observed' : 'not individually sufficient for admission',
  }));
  const failed = cases.filter(item => item.result !== 'pass').map(item => item.case_id);
  const assertion = {
    kind: 'upstream-audit-disposition-observations',
    check_id: 'upstream-audit-disposition',
    run_id: request.runId,
    invocation_id: request.invocation,
    structural_inventory: summary.structural_inventory,
    disposition_admission: summary.disposition_admission,
    security_clearance: 'not-passed',
    g11_claim: 'not-passed',
    counts: summary,
    line: request.line,
    binding: request.binding,
    current_advisories: advisory,
    artifact_behavior_evidence: report.artifact_behavior_evidence,
    inherited_execution_evidence: report.inherited_execution_evidence,
    note: 'Structural row equality is recorded separately from security clearance. Failed cases are the admission gap.',
    cases,
  };
  const assertionPath = join(request.outputDir, 'disposition-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion, null, 2)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {
    path: relativeAssertion,
    sha256: createHash('sha256').update(assertionBytes).digest('hex'),
    bytes: assertionBytes.length,
  };
  const passedIds = cases.filter(item => item.result === 'pass').map(item => item.case_id);
  const admitted = failed.length === 0 && summary.disposition_admission === 'pass';
  const rcReport = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: 'upstream-audit-disposition',
    line: request.line,
    invocation_id: request.invocation,
    binding: request.binding,
    coverage: admitted ? 'complete' : 'incomplete',
    result: admitted ? 'pass' : 'fail',
    exit_code: admitted ? 0 : 1,
    g11_claim: 'not-passed',
    subject_kind: 'source',
    subject_ids: ['source'],
    artifacts: {},
    expected_case_ids: cases.map(item => item.case_id),
    discovered_case_ids: cases.map(item => item.case_id),
    executed_case_ids: cases.map(item => item.case_id),
    passed_case_ids: passedIds,
    failed_case_ids: failed,
    skipped_case_ids: [],
    unresolved_case_ids: [],
    exceptions: [],
    passed: passedIds.length,
    failed: failed.length,
    skipped: 0,
    outputs: [output],
    case_results: cases.map(item => ({
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/check-upstream-audit-disposition.mjs', '--admission', '--line', line || request.line],
    limitations: [
      `structural_inventory=${summary.structural_inventory}; disposition_admission=${summary.disposition_admission}; security_clearance=not-passed`,
      `insufficient_sensitive=${insufficientSensitive.length}; insufficient_inherited=${insufficientInherited.length}; insufficient_behavior=${insufficientBehavior.length}; missing_evidence=${missingEvidence.length}; circular_evidence=${circularEvidence.length}; symbol_uses_open=${symbolUsesOpen}; current_uses_open=${currentSymbolAdmission.inventory.open}; current_authored_ready=${currentSymbolAdmission.ready}`,
      'Ledger equality does not admit this check. Current advisories require this run’s complete, hashed dependency observations.',
    ],
  };
  const reportsDir = join(request.runDir, 'reports');
  mkdirSync(reportsDir, {recursive: true});
  writeFileSync(join(reportsDir, 'upstream-audit-disposition.json'), `${JSON.stringify(rcReport, null, 2)}\n`);
  return failed.length === 0;
}

mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (request) {
  const accepted = writeAcceptance(request);
  if (!accepted || !dispositionOk) {
    fail(1, `upstream-audit-disposition admission incomplete: sensitive=${insufficientSensitive.length} inherited=${insufficientInherited.length} behavior=${insufficientBehavior.length} missing_evidence=${missingEvidence.length} circular=${circularEvidence.length} symbols_open=${symbolUsesOpen} authored_reviews_missing=${symbolReviewEvidence.insufficient} current_uses_open=${currentSymbolAdmission.inventory.open} current_authored_ready=${currentSymbolAdmission.ready}`);
  }
}
if (!structuralOk) {
  fail(1, `upstream-audit-disposition incomplete: missing=${missing.length} unresolved=${unresolved.length} conflicting=${conflicts.length} outside=${outside.length} security_docs_only=${securityDocsOnly.length} unknown=${unknown.length}`);
}
if (admission && !dispositionOk) {
  fail(1, `upstream-audit-disposition admission incomplete: sensitive=${insufficientSensitive.length} inherited=${insufficientInherited.length} behavior=${insufficientBehavior.length} missing_evidence=${missingEvidence.length} circular=${circularEvidence.length} symbols_open=${symbolUsesOpen} authored_reviews_missing=${symbolReviewEvidence.insufficient} branch=${missingBranch.length} current_uses_open=${currentSymbolAdmission.inventory.open} current_authored_ready=${currentSymbolAdmission.ready}`);
}
