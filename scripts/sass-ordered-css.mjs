#!/usr/bin/env node
/**
 * Finite ordered-CSS cases sass-seal actually compiles and compares.
 *
 * Ids are every strict non-debug fixture from fixtures/sass/manifest.json,
 * including the four whose candidate CSS differs from the sealed reference
 * (05-custom-map-nested, owned-legacy-button/-select/-snack-bar). Those stay
 * failing against the unmodified sealed CSS; a matching pending decision in
 * compatibility/rc/sass-pending-decisions.json explains them but never passes
 * them. The four bridge-review fixtures (core, legacy-core, aggregate and
 * companions, core-theme) are rostered against their sealed CSS the same way.
 * The two root core fixtures have a finite current public CDK contract,
 * preserving complete historical owned CSS. Raw reference differences stay
 * visible. The aggregate fixture has a separate sequence-sensitive whole-CSS
 * contract. Both supported lines execute this roster; empty debug CSS and DOM
 * are separate checks.
 */
import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ORDERED_CORE_CASES,ORDERED_CORE_CONTRACT,orderedCoreResultMatches} from './sass-ordered-core-contract.mjs';
import {ORDERED_AGGREGATE_CASES,ORDERED_AGGREGATE_CONTRACT,orderedAggregateResultMatches} from './sass-ordered-aggregate-contract.mjs';
import {ORDERED_LEGACY_BUTTON_CASES,ORDERED_LEGACY_BUTTON_CONTRACT,ORDERED_LEGACY_BUTTON_PEER_FILES,orderedLegacyButtonResultMatches} from './sass-ordered-legacy-button-contract.mjs';

import {RIPPLE_COLOR_ORDERED_CASES,RIPPLE_COLOR_CONTRACT,orderedRippleColorResultsMatch} from './sass-ripple-color-contract.mjs';
import {createHash} from 'node:crypto';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const ORDERED_CSS_FIXTURE_IDS = Object.freeze([
  '01-palette-values',
  'owned-legacy-autocomplete',
  'owned-legacy-card',
  'owned-legacy-checkbox',
  'owned-legacy-chips',
  'owned-legacy-dialog',
  'owned-legacy-form-field',
  'owned-legacy-input',
  'owned-legacy-list',
  'owned-legacy-menu',
  'owned-legacy-paginator',
  'owned-legacy-progress-bar',
  'owned-legacy-progress-spinner',
  'owned-legacy-radio',
  'owned-legacy-slide-toggle',
  'owned-legacy-slider',
  'owned-legacy-table',
  'owned-legacy-tabs',
  'owned-legacy-tooltip',
  'owned-option',
  '04-constructors-and-typography',
  '07-with-configuration',
  '11-cyph-deep-purple-800',
  '05-custom-map-nested',
  'owned-legacy-button',
  'owned-legacy-select',
  'owned-legacy-snack-bar',
  '02-core',
  '03-legacy-core',
  '06-aggregate-and-companions',
  '08-core-theme',
]);

/** Strict fixtures left out of the roster. Empty: every strict fixture is rostered. */
export const UNRESOLVED_STRICT_CSS = Object.freeze([]);

/** Debug fixtures. Their CSS is empty; the value seal is separate and not this roster. */
export const EMPTY_DEBUG_CSS = Object.freeze([
  'theme-map-structure',
  'theme-palette-values',
  '12-cyph-palette-debug',
]);

/** Bridge-review fixtures left out of the roster. Empty: all four are rostered. */
export const BRIDGE_REVIEW_FIXTURES = Object.freeze([]);

export function orderedCssCaseId(fixtureId) {
  if (!ORDERED_CSS_FIXTURE_IDS.includes(fixtureId)) {
    throw new Error(`not an executed ordered-css fixture: ${fixtureId}`);
  }
  return fixtureId;
}

export function loadManifest(manifestPath = join(root, 'fixtures/sass/manifest.json')) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function rosterProblems(manifest = loadManifest()) {
  const problems = [];
  const cases = new Map((manifest.cases || []).map(item => [item.id, item]));
  if (new Set(ORDERED_CSS_FIXTURE_IDS).size !== ORDERED_CSS_FIXTURE_IDS.length) {
    problems.push('ordered CSS fixture ids are not unique');
  }
  for (const id of ORDERED_CSS_FIXTURE_IDS) {
    const item = cases.get(id);
    if (!item) problems.push(`missing fixture: ${id}`);
    else if (!['strict', 'bridge-review'].includes(item.comparison) || item.capture_debug) {
      problems.push(`fixture is not a strict or bridge-review non-debug case: ${id}`);
    }
    const css = join(root, 'reference/material-16.2.14/sass-css', `${id}.css`);
    try {
      const bytes = readFileSync(css);
      if (bytes.length === 0) problems.push(`reference CSS is empty: ${id}`);
    } catch {
      problems.push(`missing reference CSS: ${id}`);
    }
  }
  for (const id of [...UNRESOLVED_STRICT_CSS, ...EMPTY_DEBUG_CSS, ...BRIDGE_REVIEW_FIXTURES]) {
    if (ORDERED_CSS_FIXTURE_IDS.includes(id)) problems.push(`excluded fixture is rostered: ${id}`);
    if (!cases.has(id)) problems.push(`excluded fixture is not in the manifest: ${id}`);
  }
  // The roster is every non-debug fixture of the manifest: nothing is chosen by outcome.
  const declared = (manifest.cases || []).filter(item => !item.capture_debug).map(item => item.id).sort();
  if (JSON.stringify(declared) !== JSON.stringify([...ORDERED_CSS_FIXTURE_IDS].sort())) {
    problems.push('ordered CSS roster is not exactly the non-debug fixtures of the manifest');
  }
  return problems;
}

export function writeFixtureSubset(dest, manifest = loadManifest()) {
  const problems = rosterProblems(manifest);
  if (problems.length) throw new Error(problems.join('\n'));
  mkdirSync(dest, {recursive: true});
  const selected = ORDERED_CSS_FIXTURE_IDS.map(id => manifest.cases.find(item => item.id === id));
  for (const item of selected) {
    copyFileSync(join(root, 'fixtures/sass', item.file), join(dest, item.file));
  }
  writeFileSync(join(dest, 'manifest.json'), `${JSON.stringify({...manifest, cases: selected}, null, 2)}\n`);
}

export function writeReferenceCss(dest) {
  const problems = rosterProblems();
  if (problems.length) throw new Error(problems.join('\n'));
  mkdirSync(dest, {recursive: true});
  for (const id of ORDERED_CSS_FIXTURE_IDS) {
    copyFileSync(
      join(root, 'reference/material-16.2.14/sass-css', `${id}.css`),
      join(dest, `${id}.css`),
    );
  }
}

export function compareOrderedCss(referenceDir, candidateDir, reportPath) {
  const script = join(root, 'scripts/compare-css.py');
  const run = spawnSync('python3', [script, referenceDir, candidateDir, '--report', reportPath], {
    cwd: root,
    encoding: 'utf8',
  });
  let report = null;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    report = null;
  }
  return {status: run.status, stdout: run.stdout, stderr: run.stderr, report};
}

export function orderedCssResults(report, compiledReport = null, candidateCss = {}, consumerPeerFiles = {}) {
  const files = new Map((report?.files || []).map(item => [item.file, item]));
  return ORDERED_CSS_FIXTURE_IDS.map(id => {
    const rows=(report?.files||[]).filter(item=>item.file===`${id}.css`);
    const row=rows.length===1?files.get(`${id}.css`):null;
    const exact = row?.status === 'exact';
    if(Object.hasOwn(ORDERED_LEGACY_BUTTON_CASES,id)&&compiledReport!==null){
      const records=(compiledReport?.fixtures||[]).filter(item=>item.id===id),record=records.length===1?records[0]:null;
      const css=Object.hasOwn(candidateCss,id)?candidateCss[id]:null;
      const conforming=rows.length===1&&compiledReport?.sass==='dart-sass\t1.104.1\t(Sass Compiler)\t[Dart]\ndart2js\t3.13.3\t(Dart Compiler)\t[Dart]'
        &&compiledReport?.installed?.['@angular/material']?.version==='22.1.7'
        &&compiledReport?.installed?.['@angular/material']?.manifest_sha256==='5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af'
        &&orderedLegacyButtonResultMatches(id,row,record,css,consumerPeerFiles),entry=ORDERED_LEGACY_BUTTON_CASES[id];
      return {case_id:id,result:conforming?'pass':'fail',kind:'assertion',status:conforming?'conforming-current-infrastructure':row?.status??'missing',
        raw_status:row?.status??'missing',baseline_sha256:row?.baseline_sha256??null,candidate_sha256:row?.candidate_sha256??null,
        fixture:`fixtures/sass/${id}.scss`,fixture_sha256:record?.fixture_sha256??null,
        reference:`reference/material-16.2.14/sass-css/${id}.css`,reference_sha256:entry.reference_sha256,
        comparison:ORDERED_LEGACY_BUTTON_CONTRACT,
        actual_measurement:css===null?null:{css,css_sha256:record?.css_sha256??null,css_bytes:Buffer.byteLength(css),compiled_record:record,sass_version:compiledReport?.sass??null,installed_material:compiledReport?.installed?.['@angular/material']??null},
        current_infrastructure:{classification:'conforming-current-infrastructure',contract:ORDERED_LEGACY_BUTTON_CONTRACT,peer_version:'22.1.7',consumer_peer_files:consumerPeerFiles}};
    }
    if(Object.hasOwn(RIPPLE_COLOR_ORDERED_CASES,id)&&compiledReport!==null){
      const records=(compiledReport?.fixtures||[]).filter(item=>item.id===id),record=records.length===1?records[0]:null;
      const conforms=orderedRippleColorResultsMatch(row,record),entry=RIPPLE_COLOR_ORDERED_CASES[id];
      return {case_id:id,result:conforms?'pass':'fail',kind:'assertion',status:conforms?'conforming-current-companion':row?.status??'missing',
        raw_status:row?.status??'missing',baseline_sha256:row?.baseline_sha256??null,candidate_sha256:row?.candidate_sha256??null,
        fixture:entry.fixture,fixture_sha256:record?.fixture_sha256??null,reference:entry.reference,reference_sha256:entry.original.css_sha256,
        comparison:RIPPLE_COLOR_CONTRACT,actual_measurement:record?.actual_measurement??null,current_companion:record?.current_companion??null};
    }
    if(Object.hasOwn(ORDERED_AGGREGATE_CASES,id)&&compiledReport!==null){
      const records=(compiledReport?.fixtures||[]).filter(item=>item.id===id),record=records.length===1?records[0]:null;
      const conforming=orderedAggregateResultMatches(row,record),entry=ORDERED_AGGREGATE_CASES[id];
      return {case_id:id,result:conforming?'pass':'fail',kind:'assertion',status:conforming?'conforming-current-companion':row?.status??'missing',
        raw_status:row?.status??'missing',baseline_sha256:row?.baseline_sha256??null,candidate_sha256:row?.candidate_sha256??null,
        fixture:entry.fixture,fixture_sha256:record?.fixture_sha256??null,reference:entry.reference,reference_sha256:entry.reference_sha256,
        comparison:ORDERED_AGGREGATE_CONTRACT,actual_measurement:record?.actual_measurement??null,current_companion:record?.current_companion??null};
    }
    if(Object.hasOwn(ORDERED_CORE_CASES,id)&&compiledReport!==null){
      const records=(compiledReport?.fixtures||[]).filter(item=>item.id===id);
      const record=records.length===1?records[0]:null;
      const conforming=orderedCoreResultMatches(id,row,record),entry=ORDERED_CORE_CASES[id];
      return {case_id:id,result:conforming?'pass':'fail',kind:'assertion',status:conforming?'conforming-current-infrastructure':row?.status??'missing',
        raw_status:row?.status??'missing',baseline_sha256:row?.baseline_sha256??null,candidate_sha256:row?.candidate_sha256??null,
        fixture:entry.fixture,fixture_sha256:record?.fixture_sha256??null,reference:entry.reference,reference_sha256:entry.reference_sha256,
        comparison:ORDERED_CORE_CONTRACT,actual_measurement:record?.actual_measurement??null,current_infrastructure:record?.current_infrastructure??null};
    }
    return {
      case_id: orderedCssCaseId(id),
      result: exact ? 'pass' : 'fail',
      kind: 'assertion',
      status: row?.status ?? 'missing',
      baseline_sha256: row?.baseline_sha256 ?? null,
      candidate_sha256: row?.candidate_sha256 ?? null,
    };
  });
}

export function writeOrderedCssAssertions(outputDir, results, identity = null) {
  const outputs = [];
  for (const item of results) {
    const body = Buffer.from(`${JSON.stringify({
      ...item,
      ...(identity?{check_id:'sass-seal',group:'ordered-css-dom',line:identity.binding.source_line,run_id:identity.runId,invocation_id:identity.invocationId,binding:identity.binding,tarball_sha256:identity.tarballSha256,exit_code:item.result==='pass'?0:1}:{}),
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      status: item.status,
      baseline_sha256: item.baseline_sha256,
      candidate_sha256: item.candidate_sha256,
      note: item.comparison===RIPPLE_COLOR_CONTRACT?'Complete historical ripple colors with the independently measured public color binding;raw golden difference retained.':item.comparison===ORDERED_AGGREGATE_CONTRACT?'Complete historical aggregate sequence with independently measured public contributions;raw golden difference retained.':item.comparison===ORDERED_CORE_CONTRACT?'Complete historical owned core CSS with independently measured public CDK contributions;raw golden difference retained.':item.comparison===ORDERED_LEGACY_BUTTON_CONTRACT?'Complete historical legacy CSS with finite current public button tokens under datepicker scope;raw golden difference retained.':'Exact ordered CSS against the sealed Material16.2.14 reference. Rendering is checked separately.',
    }, null, 2)}\n`);
    const name = `${item.case_id}.json`;
    writeFileSync(join(outputDir, name), body);
    outputs.push({name, bytes: body.length});
  }
  return outputs;
}

/** Whole execution fails for unknown/duplicate rows or any child failure. */
export function orderedCssCompletion(compileStatus,compared,results){
  const rows=compared.report?.files||[],expected=ORDERED_CSS_FIXTURE_IDS.map(id=>`${id}.css`).sort();
  const completeReport=JSON.stringify(rows.map(row=>row.file).sort())===JSON.stringify(expected);
  const ok=compileStatus===0&&[0,1].includes(compared.status)&&completeReport&&results.length===ORDERED_CSS_FIXTURE_IDS.length
    &&results.every(item=>item.result==='pass');
  const exact=compileStatus===0&&compared.status===0&&completeReport&&rows.every(row=>row.status==='exact');
  return {ok,exact};
}

export function runOrderedCss(environment, {line = 'main'} = {}) {
  const work = join(environment, 'ordered-css');
  const fixtures = join(work, 'fixtures');
  const reference = join(work, 'reference');
  const candidate = join(work, 'candidate');
  const reportPath = join(work, 'compare.json');
  writeFixtureSubset(fixtures);
  writeReferenceCss(reference);
  const compiled = spawnSync(process.execPath, [
    join(root, 'scripts/run-sass-fixtures.mjs'),
    '--environment', environment,
    '--module', '@ngx-compat/material-legacy',
    '--output', candidate,
    '--fixtures', fixtures,
    '--include-bridge',
    '--line',line,
  ], {cwd: root, encoding: 'utf8'});
  const compared = compareOrderedCss(reference, candidate, reportPath);
  let compiledReport;
  try{compiledReport=JSON.parse(readFileSync(join(candidate,'compile-report.json'),'utf8'));}catch{compiledReport={fixtures:[]};}
  const candidateCss={};
  const consumerPeerFiles={};
  if(compiled.status===0)for(const id of Object.keys(ORDERED_LEGACY_BUTTON_CASES)){
    try{candidateCss[id]=readFileSync(join(candidate,id+'.css'),'utf8');}catch{/* Missing CSS stays failed. */}
  }
  if(compiled.status===0)for(const path of Object.keys(ORDERED_LEGACY_BUTTON_PEER_FILES)){
    try{consumerPeerFiles[path]=createHash('sha256').update(readFileSync(join(environment,path))).digest('hex');}catch{/* Missing peer source stays failed. */}
  }
  const results = compared.report ? orderedCssResults(compared.report,compiledReport,candidateCss,consumerPeerFiles) : ORDERED_CSS_FIXTURE_IDS.map(id => ({
    case_id: id,
    result: 'fail',
    kind: 'assertion',
    status: 'missing',
    baseline_sha256: null,
    candidate_sha256: null,
  }));
  const {ok,exact}=orderedCssCompletion(compiled.status,compared,results);
  return {
    ok,
    exact,
    results,
    compile_status: compiled.status,
    compare_status: compared.status,
    compile_error: compiled.status === 0 ? null : `${compiled.stderr || compiled.stdout || ''}`.slice(-2000),
  };
}
