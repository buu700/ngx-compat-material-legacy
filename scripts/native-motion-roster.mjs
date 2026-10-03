#!/usr/bin/env node
/**
 * Main-line native-motion roster.
 *
 * Ids are derived from the components that own native CSS/timer motion
 * before any browser launches. WebKitGTK is the webkit engine. It is not
 * Safari. 21.x is not part of this roster. motion-smoke stays a separate
 * source check.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {engineIdentityProblems} from './browser-matrix-roster.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const ENGINES = ['chromium', 'firefox', 'webkit'];
export const RUNTIMES = ['zoneful', 'zoneless'];
export const COMPONENTS = ['dialog', 'snack-bar', 'menu', 'select', 'tooltip', 'tabs', 'form-field'];
export const MODES = ['enabled', 'provider-disabled', 'reduced'];
export const ZERO_COMPONENTS = ['dialog', 'tabs'];
export const NOTIFY = [
  ['dialog', 'afterOpened', ['enabled', 'provider-disabled', 'reduced', 'zero']],
  ['snack-bar', 'afterOpened', ['enabled', 'provider-disabled', 'reduced']],
  ['menu', 'menuOpened', ['enabled', 'provider-disabled', 'reduced']],
  ['select', 'openedChange', ['enabled', 'provider-disabled', 'reduced']],
];
export const INTERRUPTIONS = [
  'dialog/rapid-reversal',
  'dialog/reopen-instance',
  'dialog/destroy-cleanup',
  'snack-bar/descendant-end',
  'snack-bar/fallback-without-end-event',
  'menu/duplicate-end',
  'menu/descendant-end',
  'select/descendant-end',
  'select/missing-end-fallback',
  'tooltip/destroy-while-shown',
  'tabs/rapid-reversal',
];
export const SELECTORS = {
  dialog: 'mat-dialog-container',
  'snack-bar': 'snack-bar-container',
  menu: '.mat-menu-panel',
  select: '.mat-select-panel',
  tooltip: '.mat-tooltip',
  tabs: '.mat-tab-body-content',
  'form-field': '.mat-form-field-subscript-message',
};
export const MIN_ENABLED_MS = {
  dialog: 100,
  'snack-bar': 100,
  menu: 50,
  select: 50,
  tooltip: 100,
  tabs: 400,
  'form-field': 200,
};
const NOTIFICATION_CONTRACT = new Set(['dialog', 'snack-bar', 'menu', 'select']);

export const MODE_BUTTONS = [
  'probe-dialog',
  'probe-snack',
  'probe-menu',
  'probe-select',
  'probe-tooltip',
  'probe-tabs',
  'probe-field',
];
export const ZERO_BUTTONS = ['probe-dialog-zero', 'probe-tabs-zero'];
export const INTERRUPT_BUTTONS = [
  'interrupt-dialog-reversal',
  'interrupt-dialog-reopen',
  'interrupt-dialog-destroy',
  'interrupt-snack',
  'interrupt-menu-duplicate',
  'interrupt-menu-descendant',
  'interrupt-select-descendant',
  'interrupt-select-fallback',
  'interrupt-tooltip-destroy',
  'interrupt-tabs',
];

export const NOT_APPLICABLE = [
  {component: 'snack-bar', mode: 'zero', reason: 'no public animation-duration input; a stylesheet 0ms override would be a fake'},
  {component: 'menu', mode: 'zero', reason: 'no public animation-duration input; a stylesheet 0ms override would be a fake'},
  {component: 'select', mode: 'zero', reason: 'no public animation-duration input; a stylesheet 0ms override would be a fake'},
  {component: 'tooltip', mode: 'zero', reason: 'no public animation-duration input; showDelay is not component motion'},
  {component: 'form-field', mode: 'zero', reason: 'subscript motion has no public duration input; a stylesheet 0ms override would be a fake'},
  {component: 'tooltip', group: 'exactly-once-notification', reason: 'no public completion event; visibility stays in enabled-disabled-reduced'},
  {component: 'form-field', group: 'exactly-once-notification', reason: 'subscript motion has no public completion event'},
  {component: 'tabs', group: 'exactly-once-notification', reason: 'selectedIndex is not a motion completion event'},
  {component: 'form-field', group: 'interruption-destruction', reason: 'subscript motion has no overlay, timer fallback, or end-event lifecycle'},
  {engine: 'safari', reason: 'the card names the webkit engine, not Safari; WebKitGTK is that engine and is not Safari certification'},
];

function id(engine, runtime, group, suffix) {
  return `native-motion/main/${engine}/${runtime}/${group}/${suffix}`;
}

export function buttonsFor(scene, mode) {
  if (scene === 'interrupt') return INTERRUPT_BUTTONS;
  if (mode === 'enabled') return [...MODE_BUTTONS, ...ZERO_BUTTONS];
  if (MODES.includes(mode)) return MODE_BUTTONS;
  throw new Error(`unknown motion scene ${scene}/${mode}`);
}

export function deriveMainRoster() {
  const enabled = [];
  for (const component of COMPONENTS) {
    const modes = ZERO_COMPONENTS.includes(component) ? [...MODES, 'zero'] : MODES;
    for (const mode of modes) {
      for (const runtime of RUNTIMES) {
        for (const engine of ENGINES) {
          enabled.push(id(engine, runtime, 'enabled-disabled-reduced', `${component}/${mode}`));
        }
      }
    }
  }
  const interrupt = [];
  for (const suffix of INTERRUPTIONS) {
    for (const runtime of RUNTIMES) {
      for (const engine of ENGINES) interrupt.push(id(engine, runtime, 'interruption-destruction', suffix));
    }
  }
  const notify = [];
  for (const [component, event, modes] of NOTIFY) {
    for (const mode of modes) {
      for (const runtime of RUNTIMES) {
        for (const engine of ENGINES) {
          notify.push(id(engine, runtime, 'exactly-once-notification', `${component}/${event}/${mode}`));
        }
      }
    }
  }
  const groups = {
    'enabled-disabled-reduced': enabled,
    'interruption-destruction': interrupt,
    'exactly-once-notification': notify,
  };
  const ids = [...enabled, ...interrupt, ...notify];
  if (new Set(ids).size !== ids.length) throw new Error('duplicate native-motion id');
  const perEngine = {};
  for (const engine of ENGINES) perEngine[engine] = ids.filter(item => item.split('/')[2] === engine).length;
  const perGroup = {};
  for (const [name, list] of Object.entries(groups)) perGroup[name] = list.length;
  return {ids, groups, perEngine, perGroup, engines: ENGINES, notApplicable: NOT_APPLICABLE};
}

function enabledProblem(component, mode, obs) {
  if (!obs || typeof obs !== 'object') return 'missing observation';
  if (obs.detectChangesCalls !== 0) return 'detectChanges stand-in';
  if (obs.selector !== SELECTORS[component] || obs.selectorMatches !== true) return 'wrapper background is not component motion';
  if (obs.finalState !== 'visible') return 'missing final state';
  if (mode === 'enabled') {
    if (!(typeof obs.durationMs === 'number' && obs.durationMs >= MIN_ENABLED_MS[component])) return 'zero-duration CSS fake';
  } else if (obs.durationMs !== 0) {
    return 'disabled motion still running';
  }
  if (NOTIFICATION_CONTRACT.has(component) && obs.notifications !== 1) return 'notification count';
  return null;
}

function interruptProblem(suffix, obs) {
  if (!obs || typeof obs !== 'object') return 'missing observation';
  if (obs.detectChangesCalls !== 0) return 'detectChanges stand-in';
  if (suffix === 'dialog/rapid-reversal') {
    if (obs.containers !== 0 || obs.leaks !== 0) return 'timer or overlay leak';
    if (obs.openedAfterClose !== 0) return 'stale open notification';
    return null;
  }
  if (suffix === 'dialog/reopen-instance') {
    if (obs.staleClosed === true) return 'stale close removed the reopened instance';
    if (obs.secondInstance !== true || obs.leaks !== 0) return 'reopened instance was not a new container';
    return null;
  }
  if (suffix === 'dialog/destroy-cleanup') {
    if (obs.containers !== 0 || obs.leaks !== 0) return 'timer or overlay leak';
    return null;
  }
  if (suffix === 'snack-bar/descendant-end' || suffix === 'menu/descendant-end') {
    if (obs.descendantIgnored !== true) return 'descendant event counted as completion';
    if (obs.completions !== 1) return 'emitted more than once';
    return null;
  }
  if (suffix === 'snack-bar/fallback-without-end-event') {
    if (obs.endEventDispatched !== false) return 'fallback was not isolated from an end event';
    if (obs.fallbackCompleted !== true || obs.completions !== 1) return 'missing fallback completion';
    return null;
  }
  if (suffix === 'menu/duplicate-end') {
    if (obs.duplicateDispatched !== true) return 'duplicate end event was not sent';
    if (obs.completions !== 1) return 'emitted more than once';
    return null;
  }
  if (suffix === 'select/descendant-end') {
    if (obs.descendantIgnored !== true) return 'descendant event counted as completion';
    if (obs.panelRemained !== true) return 'descendant event destroyed the panel';
    return null;
  }
  if (suffix === 'select/missing-end-fallback') {
    if (obs.endEventDispatched !== false) return 'fallback was not isolated from an end event';
    if (obs.fallbackCompleted !== true) return 'missing fallback completion';
    return null;
  }
  if (suffix === 'tooltip/destroy-while-shown') {
    if (obs.destroyed !== true || obs.leaks !== 0) return 'timer or overlay leak';
    return null;
  }
  if (suffix === 'tabs/rapid-reversal') {
    if (!(typeof obs.durationMs === 'number' && obs.durationMs >= MIN_ENABLED_MS.tabs)) return 'zero-duration CSS fake';
    if (obs.finalState !== 'visible' || obs.animating !== false) return 'rapid reversal did not settle on the last tab';
    return null;
  }
  return 'unknown interruption';
}

export function assertCase(caseId, obs) {
  const parts = String(caseId || '').split('/');
  if (parts.length < 6 || parts[0] !== 'native-motion' || parts[1] !== 'main') return ['unknown case'];
  const group = parts[4];
  const suffix = parts.slice(5).join('/');
  if (group === 'enabled-disabled-reduced') {
    const [component, mode] = suffix.split('/');
    const problem = enabledProblem(component, mode, obs);
    return problem ? [problem] : [];
  }
  if (group === 'interruption-destruction') {
    const problem = interruptProblem(suffix, obs);
    return problem ? [problem] : [];
  }
  if (group === 'exactly-once-notification') {
    if (!obs || typeof obs !== 'object') return ['missing observation'];
    if (obs.detectChangesCalls !== 0) return ['detectChanges stand-in'];
    if (obs.notifications !== 1) return ['emitted more than once'];
    return [];
  }
  return ['unknown case'];
}

export function samplePass(caseId) {
  const parts = caseId.split('/');
  const group = parts[4];
  const suffix = parts.slice(5).join('/');
  if (group === 'enabled-disabled-reduced') {
    const [component, mode] = suffix.split('/');
    return {
      selector: SELECTORS[component],
      selectorMatches: true,
      durationMs: mode === 'enabled' ? MIN_ENABLED_MS[component] : 0,
      finalState: 'visible',
      notifications: NOTIFICATION_CONTRACT.has(component) ? 1 : 0,
      detectChangesCalls: 0,
    };
  }
  if (group === 'exactly-once-notification') return {notifications: 1, detectChangesCalls: 0};
  const base = {detectChangesCalls: 0};
  if (suffix === 'dialog/rapid-reversal') return {...base, containers: 0, leaks: 0, openedAfterClose: 0};
  if (suffix === 'dialog/reopen-instance') return {...base, secondInstance: true, staleClosed: false, leaks: 0};
  if (suffix === 'dialog/destroy-cleanup') return {...base, containers: 0, leaks: 0};
  if (suffix === 'snack-bar/descendant-end' || suffix === 'menu/descendant-end') return {...base, descendantIgnored: true, completions: 1};
  if (suffix === 'snack-bar/fallback-without-end-event') return {...base, endEventDispatched: false, fallbackCompleted: true, completions: 1};
  if (suffix === 'menu/duplicate-end') return {...base, duplicateDispatched: true, completions: 1};
  if (suffix === 'select/descendant-end') return {...base, descendantIgnored: true, panelRemained: true};
  if (suffix === 'select/missing-end-fallback') return {...base, endEventDispatched: false, fallbackCompleted: true};
  if (suffix === 'tooltip/destroy-while-shown') return {...base, destroyed: true, leaks: 0};
  if (suffix === 'tabs/rapid-reversal') return {...base, durationMs: MIN_ENABLED_MS.tabs, finalState: 'visible', animating: false};
  return base;
}

export function observationProblems({requiredIds, outcomes, engines, sourceClean, artifactSha, boundSha}) {
  const problems = [];
  if (sourceClean !== true) problems.push('dirty source');
  if (!artifactSha || artifactSha !== boundSha) problems.push('unbound artifact');
  problems.push(...engineIdentityProblems(engines || {}));
  const passed = new Set();
  for (const row of outcomes || []) {
    if (!row || row.ok !== true) continue;
    const caseProblems = assertCase(row.id, row.observation);
    if (caseProblems.length) problems.push(...caseProblems.map(item => `${row.id}: ${item}`));
    else if (typeof row.evidence === 'string' && row.evidence.length > 0) passed.add(row.id);
  }
  const skipped = [];
  for (const caseId of requiredIds) {
    if (!passed.has(caseId)) skipped.push(caseId);
  }
  if (skipped.length) problems.push(`skipped required cell ${skipped[0]}`);
  return {problems, skipped};
}

function writeMatrix() {
  const roster = deriveMainRoster();
  const matrixPath = join(root, 'compatibility/rc/matrices/full-verify.json');
  const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
  const row = matrix.checks.find(item => item.check_id === 'native-motion');
  row.implemented = true;
  row.acceptance.cases_by_line.main = roster.groups;
  for (const group of Object.keys(roster.groups)) row.acceptance.cases_by_line['21.x'][group] = null;
  writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);
  console.log(`wrote native-motion main roster ${roster.ids.length}`);
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write-matrix')) writeMatrix();
  else {
    const roster = deriveMainRoster();
    console.log(JSON.stringify({cases: roster.ids.length, perEngine: roster.perEngine, perGroup: roster.perGroup}));
  }
}
