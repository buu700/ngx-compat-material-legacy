#!/usr/bin/env node
/**
 * 21.x release-metadata comparison.
 *
 *   node scripts/check-release-metadata.mjs
 *   node scripts/check-release-metadata.mjs --out <report.json>
 *
 * Compares this checkout's library manifest, compatibility/library-package-metadata.json,
 * LICENSE files that already exist, migration/dist/package/package.json and its LICENSE
 * when present, and compatibility/provenance.json against SOURCE-PROVENANCE.md.
 * One assertion per compared field. Does not copy a license or provenance file.
 * Does not rewrite the library version. Does not roster a provenance field that
 * does not match. Does not add an instruction case id. Does not claim G01 or G13.
 * Does not mark release-metadata approved. Main groups are not filled.
 * Coverage stays a slice: this is not a coverage-complete coordinator report,
 * so the matrix implemented flag stays false.
 */
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultReport = join(root, 'compatibility/rc/reports/release-metadata.json');

const PATHS = {
  libraryManifest: 'projects/ngx-material-legacy/package.json',
  libraryDeclared: 'compatibility/library-package-metadata.json',
  libraryLicense: 'projects/ngx-material-legacy/LICENSE',
  rootLicense: 'LICENSE',
  cliManifest: 'migration/dist/package/package.json',
  cliRecord: 'compatibility/migrate-legacy-cli-artifact.json',
  cliLicense: 'migration/dist/package/LICENSE',
  provenance: 'compatibility/provenance.json',
  provenanceText: 'projects/ngx-material-legacy/SOURCE-PROVENANCE.md',
};

const LICENSE_CLAUSES = [
  'Copyright (c) 2023 Google LLC.\nCopyright (c) 2026 Ryan Lester.',
  'Permission is hereby granted, free of charge',
  'The above copyright notice and this permission notice shall be included',
  'THE SOFTWARE IS PROVIDED "AS IS"',
];

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {out: defaultReport};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--out requires a path');
      args.out = resolve(value);
      i += 1;
    } else {
      fail(2, `Unknown argument: ${arg}`);
    }
  }
  return args;
}

export function normalizeNewlines(text) {
  return String(text).replace(/\r\n/g, '\n');
}

export function gitIdentity(value) {
  return String(value ?? '').trim().replace(/^git\+/, '').replace(/\/+$/, '');
}

export function githubSlug(value) {
  const normalized = gitIdentity(value).replace(/\.git$/, '');
  const match = normalized.match(/github\.com\/([^/]+\/[^/#?]+)$/i);
  return match ? match[1] : null;
}

export function isInstructionCaseId(caseId) {
  return /(^|[/-])instructions?(?=$|[/-])/i.test(String(caseId ?? ''));
}

function sha256Text(text) {
  return createHash('sha256').update(normalizeNewlines(text), 'utf8').digest('hex');
}

function licenseFacts(source, text) {
  const normalized = normalizeNewlines(text);
  return {
    source,
    sha256: sha256Text(normalized),
    bytes: Buffer.byteLength(normalized),
    clauses_present: LICENSE_CLAUSES.every(clause => normalized.includes(clause)),
  };
}

function stringField(group, caseId, field, left, right, ok) {
  return {
    case_id: caseId,
    group,
    field,
    left,
    right,
    result: ok ? 'pass' : 'fail',
  };
}

export function compareReleaseMetadata(input) {
  const comparisons = [];
  const errors = [];
  const note = (comparison, message) => {
    comparisons.push(comparison);
    if (comparison.result !== 'pass') errors.push(message);
  };

  const libraryName = input.libraryManifest?.name;
  const declaredName = input.libraryDeclared?.name;
  note(
    stringField(
      'package-metadata-license',
      'library-name',
      'name',
      {source: PATHS.libraryManifest, value: libraryName ?? null},
      {source: PATHS.libraryDeclared, value: declaredName ?? null},
      typeof libraryName === 'string' && libraryName.length > 0 && libraryName === declaredName,
    ),
    'library name does not match compatibility/library-package-metadata.json',
  );

  const libraryVersion = input.libraryManifest?.version;
  const declaredVersion = input.libraryDeclared?.version;
  note(
    stringField(
      'package-metadata-license',
      'library-version',
      'version',
      {source: PATHS.libraryManifest, value: libraryVersion ?? null},
      {source: PATHS.libraryDeclared, value: declaredVersion ?? null},
      typeof libraryVersion === 'string' && SEMVER.test(libraryVersion) && libraryVersion === declaredVersion,
    ),
    'library version does not match compatibility/library-package-metadata.json',
  );

  const libraryLicense = input.libraryManifest?.license;
  const declaredLicense = input.libraryDeclared?.license;
  note(
    stringField(
      'package-metadata-license',
      'library-license',
      'license',
      {source: PATHS.libraryManifest, value: libraryLicense ?? null},
      {source: PATHS.libraryDeclared, value: declaredLicense ?? null},
      libraryLicense === 'MIT' && declaredLicense === 'MIT',
    ),
    'library license field is not MIT in both declarations',
  );

  const libraryLicenseFacts = licenseFacts(PATHS.libraryLicense, input.libraryLicense ?? '');
  const rootLicenseFacts = licenseFacts(PATHS.rootLicense, input.rootLicense ?? '');
  const libraryLicenseOk = libraryLicenseFacts.sha256 === rootLicenseFacts.sha256
    && libraryLicenseFacts.clauses_present
    && libraryLicenseFacts.bytes > 0;
  note(
    stringField(
      'package-metadata-license',
      'library-license-text',
      'license-text',
      libraryLicenseFacts,
      rootLicenseFacts,
      libraryLicenseOk,
    ),
    libraryLicenseFacts.clauses_present
      ? 'library LICENSE text does not match LICENSE'
      : `missing required license text in ${PATHS.libraryLicense}`,
  );

  const cliName = input.cliManifest?.name;
  const recordedName = input.cliRecord?.package_name;
  note(
    stringField(
      'package-metadata-license',
      'cli-name',
      'name',
      {source: PATHS.cliManifest, value: cliName ?? null},
      {source: PATHS.cliRecord, value: recordedName ?? null},
      typeof cliName === 'string' && cliName.length > 0 && cliName === recordedName,
    ),
    'migrate-cli name does not match compatibility/migrate-legacy-cli-artifact.json',
  );

  const cliVersion = input.cliManifest?.version;
  const recordedVersion = input.cliRecord?.version;
  note(
    stringField(
      'package-metadata-license',
      'cli-version',
      'version',
      {source: PATHS.cliManifest, value: cliVersion ?? null},
      {source: PATHS.cliRecord, value: recordedVersion ?? null},
      typeof cliVersion === 'string' && SEMVER.test(cliVersion) && cliVersion === recordedVersion,
    ),
    'migrate-cli version does not match compatibility/migrate-legacy-cli-artifact.json',
  );

  const cliLicense = input.cliManifest?.license;
  note(
    stringField(
      'package-metadata-license',
      'cli-license',
      'license',
      {source: PATHS.cliManifest, value: cliLicense ?? null},
      {source: PATHS.libraryManifest, value: libraryLicense ?? null},
      cliLicense === 'MIT' && libraryLicense === 'MIT',
    ),
    'migrate-cli license field is not MIT',
  );

  if (input.cliLicensePresent === false) {
    // The migrate-cli LICENSE is compared only when that file already exists.
  } else {
    const cliLicenseFacts = licenseFacts(PATHS.cliLicense, input.cliLicense ?? '');
    const cliLicenseOk = cliLicenseFacts.sha256 === libraryLicenseFacts.sha256
      && cliLicenseFacts.clauses_present
      && cliLicenseFacts.bytes > 0;
    note(
      stringField(
        'package-metadata-license',
        'cli-license-text',
        'license-text',
        cliLicenseFacts,
        libraryLicenseFacts,
        cliLicenseOk,
      ),
      cliLicenseFacts.clauses_present
        ? 'migrate-cli LICENSE text does not match the library LICENSE'
        : `missing required license text in ${PATHS.cliLicense}`,
    );
  }

  const provenance = input.provenance ?? {};
  const provenanceText = normalizeNewlines(input.provenanceText ?? '');
  const baselineSlug = githubSlug(provenance.baseline_repository);
  const baselineMentioned = Boolean(baselineSlug) && provenanceText.includes(baselineSlug);
  note(
    stringField(
      'instructions-provenance',
      'baseline-repository',
      'baseline_repository',
      {source: PATHS.provenance, value: provenance.baseline_repository ?? null},
      {source: PATHS.provenanceText, value: baselineMentioned ? baselineSlug : null},
      baselineSlug === 'angular/components' && baselineMentioned,
    ),
    'provenance baseline repository is not angular/components in SOURCE-PROVENANCE.md',
  );

  const baselineTag = provenance.baseline_tag;
  const tagMentioned = typeof baselineTag === 'string' && baselineTag.length > 0
    && provenanceText.includes('`' + baselineTag + '`');
  note(
    stringField(
      'instructions-provenance',
      'baseline-tag',
      'baseline_tag',
      {source: PATHS.provenance, value: baselineTag ?? null},
      {source: PATHS.provenanceText, value: tagMentioned ? baselineTag : null},
      tagMentioned,
    ),
    'provenance baseline tag is not cited in SOURCE-PROVENANCE.md',
  );

  const baselineCommit = provenance.baseline_full_commit;
  const commitOk = typeof baselineCommit === 'string' && /^[0-9a-f]{40}$/.test(baselineCommit)
    && provenanceText.includes(baselineCommit);
  note(
    stringField(
      'instructions-provenance',
      'baseline-commit',
      'baseline_full_commit',
      {source: PATHS.provenance, value: baselineCommit ?? null},
      {source: PATHS.provenanceText, value: commitOk ? baselineCommit : null},
      commitOk,
    ),
    'provenance baseline commit is missing from SOURCE-PROVENANCE.md',
  );

  const baselineGitTag = provenance.baseline_git_tag;
  const gitTagOk = typeof baselineGitTag === 'string' && baselineGitTag.length > 0
    && provenanceText.includes(baselineGitTag);
  note(
    stringField(
      'instructions-provenance',
      'baseline-git-tag',
      'baseline_git_tag',
      {source: PATHS.provenance, value: baselineGitTag ?? null},
      {source: PATHS.provenanceText, value: gitTagOk ? baselineGitTag : null},
      gitTagOk,
    ),
    'provenance baseline git tag is not cited in SOURCE-PROVENANCE.md',
  );

  const provenanceRepo = gitIdentity(provenance.repository);
  const manifestRepo = gitIdentity(input.libraryManifest?.repository?.url);
  note(
    stringField(
      'instructions-provenance',
      'repository',
      'repository',
      {source: PATHS.provenance, value: provenance.repository ?? null},
      {source: PATHS.libraryManifest, value: input.libraryManifest?.repository?.url ?? null},
      provenanceRepo.length > 0 && provenanceRepo === manifestRepo,
    ),
    'provenance repository does not match the library repository url',
  );

  return {comparisons, errors};
}

export function unmatchedProvenanceFields(provenance, provenanceText) {
  const text = normalizeNewlines(provenanceText ?? '');
  const refused = [];
  const tag = provenance?.current_reference_tag;
  const tagCited = typeof tag === 'string' && tag.length > 0 && text.includes('`' + tag + '`');
  if (!tagCited) {
    refused.push({
      field: 'current_reference_tag',
      case_id: 'current-reference-tag',
      reason: 'current reference tag is not cited in SOURCE-PROVENANCE.md',
    });
  }
  const commit = provenance?.current_reference_full_commit;
  const commitCited = typeof commit === 'string' && /^[0-9a-f]{40}$/.test(commit) && text.includes(commit);
  if (!commitCited) {
    refused.push({
      field: 'current_reference_full_commit',
      case_id: 'current-reference-commit',
      reason: 'current reference commit is missing from SOURCE-PROVENANCE.md',
    });
  }
  const adaptations = provenance?.source_adaptations;
  const adaptationsCited = Array.isArray(adaptations) && adaptations.length > 0
    && adaptations.every(item => typeof item === 'string' && item.length > 0 && text.includes(item));
  if (!adaptationsCited) {
    refused.push({
      field: 'source_adaptations',
      case_id: 'source-adaptations',
      reason: 'source_adaptations does not match a citation in SOURCE-PROVENANCE.md',
    });
  }
  return refused;
}

export function rosterReleaseMetadata(comparisons, refused = []) {
  const refusedIds = new Set(refused.map(item => item.case_id));
  const keep = (caseId) => !refusedIds.has(caseId) && !isInstructionCaseId(caseId);
  const packageIds = comparisons
    .filter(item => item.group === 'package-metadata-license' && keep(item.case_id))
    .map(item => item.case_id);
  const provenanceIds = comparisons
    .filter(item => item.group === 'instructions-provenance' && item.result === 'pass' && keep(item.case_id))
    .map(item => item.case_id);
  return {
    'package-metadata-license': packageIds.length ? packageIds : null,
    'instructions-provenance': provenanceIds.length ? provenanceIds : null,
  };
}

export function writeReleaseMetadataAssertions(outputDir, comparisons) {
  if (!Array.isArray(comparisons) || comparisons.length === 0) {
    throw new Error('refusing to emit release-metadata assertions without comparisons');
  }
  const written = [];
  for (const comparison of comparisons) {
    if (comparison.result !== 'pass') {
      throw new Error(`refusing to emit a pass assertion for ${comparison.case_id}`);
    }
    if (isInstructionCaseId(comparison.case_id)) {
      throw new Error(`refusing to emit an instruction case id: ${comparison.case_id}`);
    }
    const body = {
      case_id: comparison.case_id,
      result: 'pass',
      kind: 'assertion',
      line: '21.x',
      group: comparison.group,
      field: comparison.field,
      left: comparison.left,
      right: comparison.right,
      g01_claim: 'not-passed',
      g13_claim: 'not-passed',
      not_executed: {
        main: {
          'package-metadata-license': null,
          'instructions-provenance': null,
        },
      },
    };
    if (Object.prototype.hasOwnProperty.call(body, 'approved') || body.approved === true) {
      throw new Error('refusing to mark release-metadata approved');
    }
    const name = `${comparison.case_id}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
  }
  return written;
}

function assertionOutputDir() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length || process.env.RC_CHECK_ID !== 'release-metadata') {
    fail(2, 'release-metadata: incomplete coordinator environment');
  }
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) {
    fail(2, 'release-metadata: invalid invocation identity');
  }
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    fail(2, 'release-metadata: RC_EVIDENCE_BINDING is not JSON');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    fail(2, 'release-metadata: binding is not an object');
  }
  if (binding.source_line === 'main') return null;
  if (binding.source_line !== '21.x') fail(2, 'release-metadata: binding source line is not 21.x');
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    fail(2, 'release-metadata: assertion output directory is missing');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(2, 'release-metadata: assertion output directory is not a real directory');
  }
  if (!outputDir.endsWith(join('evidence', 'release-metadata', invocation))) {
    fail(2, 'release-metadata: assertion directory is not check-owned');
  }
  return outputDir;
}

function readJsonRequired(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) throw new Error(`missing ${rel}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readTextRequired(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) throw new Error(`missing ${rel}`);
  return readFileSync(path, 'utf8');
}

function loadWorkspace() {
  const cliLicensePath = join(root, PATHS.cliLicense);
  const cliLicensePresent = existsSync(cliLicensePath);
  return {
    libraryManifest: readJsonRequired(PATHS.libraryManifest),
    libraryDeclared: readJsonRequired(PATHS.libraryDeclared),
    libraryLicense: readTextRequired(PATHS.libraryLicense),
    rootLicense: readTextRequired(PATHS.rootLicense),
    cliManifest: readJsonRequired(PATHS.cliManifest),
    cliRecord: readJsonRequired(PATHS.cliRecord),
    cliLicensePresent,
    cliLicense: cliLicensePresent ? readFileSync(cliLicensePath, 'utf8') : '',
    provenance: readJsonRequired(PATHS.provenance),
    provenanceText: readTextRequired(PATHS.provenanceText),
  };
}

function rosteredComparisons(comparisons, roster) {
  const wanted = new Set([
    ...(roster['package-metadata-license'] ?? []),
    ...(roster['instructions-provenance'] ?? []),
  ]);
  return comparisons.filter(item => wanted.has(item.case_id));
}

function main(argv) {
  const args = parseArgs(argv);
  let input;
  try {
    input = loadWorkspace();
  } catch (error) {
    fail(1, error instanceof Error ? error.message : String(error));
  }
  const libraryVersionBefore = input.libraryManifest?.version ?? null;
  const {comparisons, errors} = compareReleaseMetadata(input);
  const refused = unmatchedProvenanceFields(input.provenance, input.provenanceText);
  for (const comparison of comparisons) {
    if (comparison.group === 'instructions-provenance' && comparison.result !== 'pass') {
      refused.push({
        field: comparison.field,
        case_id: comparison.case_id,
        reason: 'provenance field does not match',
      });
    }
  }
  const roster = rosterReleaseMetadata(comparisons, refused);
  const report = {
    schema_version: 1,
    role: 'Declared package name, version, license, and provenance comparison for 21.x',
    check_id: 'release-metadata',
    line: '21.x',
    coverage: 'slice',
    observed_library_version: libraryVersionBefore,
    version_rewritten: false,
    rostered_groups: roster,
    refused_fields: refused,
    instruction_case_ids: [],
    comparisons,
    result: errors.length ? 'fail' : 'pass',
    g01_claim: 'not-passed',
    g13_claim: 'not-passed',
    limitations: [
      'Compares library name, version, and license to compatibility/library-package-metadata.json.',
      `Observed library version is ${libraryVersionBefore}. This checker does not rewrite it to 22.`,
      'Compares library LICENSE bytes to the repository LICENSE, including the Google then Ryan Lester copyright and MIT clauses.',
      'Compares migrate-cli name and version to compatibility/migrate-legacy-cli-artifact.json on this checkout.',
      'Compares migrate-cli license SPDX and LICENSE bytes to the library license when migration/dist/package/LICENSE is already present. No license file was copied.',
      'Compares compatibility/provenance.json baseline repository, tag, commit, git tag, and repository url to SOURCE-PROVENANCE.md and the library repository url.',
      'A provenance field that does not match is not rostered.',
      'No instruction file was compared. No instruction case id was added.',
      'Main release-metadata groups are left untouched.',
      'Coverage is a slice. This file is not a coverage-complete 21.x coordinator report. implemented stays false.',
      'Does not mark release-metadata approved. Does not claim G01 or G13.',
    ],
  };
  if (report.approved === true || report.g01_claim !== 'not-passed' || report.g13_claim !== 'not-passed') {
    fail(1, 'refusing to mark release-metadata approved or to claim G01 or G13');
  }
  if (report.coverage !== 'slice') fail(1, 'refusing to mark release-metadata coverage complete');
  mkdirSync(dirname(args.out), {recursive: true});
  writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  let assertion_files = null;
  const outputDir = assertionOutputDir();
  if (outputDir && errors.length === 0) {
    try {
      assertion_files = writeReleaseMetadataAssertions(outputDir, rosteredComparisons(comparisons, roster));
    } catch (error) {
      fail(1, error instanceof Error ? error.message : String(error));
    }
  }
  console.log(JSON.stringify({
    ok: errors.length === 0,
    assertion_files,
    coverage: report.coverage,
    observed_library_version: libraryVersionBefore,
    version_rewritten: false,
    package_metadata_license: roster['package-metadata-license'],
    instructions_provenance: roster['instructions-provenance'],
    refused_fields: refused,
    g01_claim: report.g01_claim,
    g13_claim: report.g13_claim,
    comparisons: comparisons.map(item => ({
      case_id: item.case_id,
      group: item.group,
      field: item.field,
      result: item.result,
    })),
    errors,
  }));
  return errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
