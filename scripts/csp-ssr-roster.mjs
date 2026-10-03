/**
 * Finite main roster for csp-ssr. Derived before the browser or server
 * processes start. 21.x stays null. Hydration is unclaimed. Chromium is the
 * CSP engine; WebKitGTK is not Safari and is not this check.
 */

export const PUBLIC_ENTRIES = [
  'legacy-autocomplete',
  'legacy-button',
  'legacy-card',
  'legacy-checkbox',
  'legacy-chips',
  'legacy-core',
  'legacy-dialog',
  'legacy-form-field',
  'legacy-input',
  'legacy-list',
  'legacy-menu',
  'legacy-paginator',
  'legacy-progress-bar',
  'legacy-progress-spinner',
  'legacy-radio',
  'legacy-select',
  'legacy-slide-toggle',
  'legacy-slider',
  'legacy-snack-bar',
  'legacy-table',
  'legacy-tabs',
  'legacy-tooltip',
];

export const SURFACES = ['dialog', 'menu', 'select', 'tooltip', 'snack-bar', 'progress-spinner'];
export const NONCE_MODES = ['correct-nonce', 'missing-nonce', 'wrong-nonce'];
export const POLICY_CASES = [
  'unapproved-inline-script',
  'unapproved-inline-style',
  'style-hash-match',
  'style-hash-mismatch',
  'driver-not-application-script',
];
export const RENDER_FAMILIES = [
  'dialog-host',
  'menu-host',
  'select',
  'tooltip-host',
  'snack-host',
  'form-field',
  'tabs',
  'progress-spinner',
  'autocomplete',
  'checkbox',
  'button',
  'radio',
  'list',
  'card',
  'paginator',
  'progress-bar',
];

const HOST_FAMILIES = new Set(['dialog-host', 'menu-host', 'tooltip-host', 'snack-host']);

export function deriveMainRoster() {
  const nonce = [];
  for (const surface of SURFACES) {
    for (const mode of NONCE_MODES) nonce.push(`csp-ssr/main/chromium/nonce-and-negative/${surface}/${mode}`);
  }
  for (const name of POLICY_CASES) nonce.push(`csp-ssr/main/chromium/nonce-and-negative/policy/${name}`);
  const server = [];
  for (const entry of PUBLIC_ENTRIES) server.push(`csp-ssr/main/server/dom-free-server-and-leaks/import/${entry}`);
  for (const entry of PUBLIC_ENTRIES) server.push(`csp-ssr/main/server/dom-free-server-and-leaks/testing/${entry}`);
  for (const family of RENDER_FAMILIES) server.push(`csp-ssr/main/server/dom-free-server-and-leaks/render/${family}`);
  const groups = {'nonce-and-negative': nonce, 'dom-free-server-and-leaks': server};
  const ids = [...nonce, ...server];
  if (new Set(ids).size !== ids.length) throw new Error('duplicate csp-ssr id');
  return {
    ids,
    groups,
    perGroup: {'nonce-and-negative': nonce.length, 'dom-free-server-and-leaks': server.length},
    notApplicable: [
      {engine: 'safari', reason: 'Safari is not an engine for this check. WebKitGTK is not Safari and is not the CSP scope.'},
      {engine: 'firefox', reason: 'The csp-ssr contract keeps CSP on Chromium. A Firefox cell is not this check.'},
      {engine: 'webkit', reason: 'WebKitGTK is not the CSP scope and is not Safari.'},
      {claim: 'hydration', reason: 'Hydration stays unclaimed. A server render is not a hydration proof.'},
      {line: '21.x', reason: '21.x is not executed and stays null.'},
    ],
  };
}

function clientOnly(obs) {
  return obs.clientOnly === true || obs.documentBefore !== 'undefined' || obs.windowBefore !== 'undefined' || obs.hydration === true;
}

function nonceProblem(mode, obs) {
  if (!obs || typeof obs !== 'object') return 'missing observation';
  if (obs.hydration === true) return 'hydration is not claimed';
  if (obs.clientOnly === true) return 'client-only render presented as SSR';
  if (obs.unsafeInline !== false) return 'unsafe-inline is not allowed';
  if (obs.engine !== 'chromium') return 'missing required engine';
  if (mode === 'correct-nonce') {
    if (obs.opened !== true) return 'surface did not open under the nonce';
    if (obs.styleSrcViolations !== 0 || obs.scriptSrcViolations !== 0) return 'policy blocked an approved nonce';
    if (!(obs.stylesWithPolicyNonce > 0)) return 'missing nonce';
    if (obs.spinnerRules < 1 || obs.spinnerNonce !== 'policy') return 'dynamic style was not nonce-approved';
    return null;
  }
  if (mode === 'missing-nonce' || mode === 'wrong-nonce') {
    if (obs.styleSrcViolations < 1) return 'missing nonce was not rejected';
    if (obs.stylesWithPolicyNonce !== 0) return 'wrong nonce was accepted';
    if (obs.spinnerRules !== 0) return 'inline style the policy would block was applied';
    if (mode === 'missing-nonce' && obs.spinnerNonce !== '') return 'missing nonce was present';
    if (mode === 'wrong-nonce' && obs.spinnerNonce !== 'wrong') return 'wrong nonce was not the rejected nonce';
    return null;
  }
  return 'unknown nonce mode';
}

function policyProblem(name, obs) {
  if (!obs || typeof obs !== 'object') return 'missing observation';
  if (obs.hydration === true) return 'hydration is not claimed';
  if (obs.unsafeInline !== false) return 'unsafe-inline is not allowed';
  if (obs.engine !== 'chromium') return 'missing required engine';
  if (name === 'unapproved-inline-script') {
    if (obs.appBooted !== true || obs.inlineScriptRan !== false) return 'inline script the policy would block ran';
    if (obs.scriptSrcViolations < 1) return 'missing nonce was not rejected';
    return null;
  }
  if (name === 'unapproved-inline-style') {
    if (obs.inlineStyleApplied !== false) return 'inline style the policy would block was applied';
    if (obs.styleSrcViolations < 1) return 'missing nonce was not rejected';
    return null;
  }
  if (name === 'style-hash-match') {
    if (obs.hashStyleApplied !== true) return 'matching style hash was blocked';
    if (obs.styleSrcViolations !== 0) return 'hash policy rejected its own style';
    return null;
  }
  if (name === 'style-hash-mismatch') {
    if (obs.hashStyleApplied !== false) return 'inline style the policy would block was applied';
    if (obs.styleSrcViolations < 1) return 'unhashed inline style was accepted';
    return null;
  }
  if (name === 'driver-not-application-script') {
    if (obs.driverEvaluated !== true || obs.inlineScriptRan !== false) return 'driver evaluation was treated as application script permission';
    if (obs.scriptSrcViolations < 1) return 'missing nonce was not rejected';
    return null;
  }
  return 'unknown policy case';
}

function serverProblem(kind, family, obs) {
  if (!obs || typeof obs !== 'object') return 'missing observation';
  if (obs.hydration === true) return 'hydration is not claimed';
  if (clientOnly(obs)) return 'client-only render presented as SSR';
  if (obs.renderedOnServer === true && obs.documentBefore !== 'undefined') return 'client-only render presented as SSR';
  if (obs.documentAfter !== 'undefined' || obs.windowAfter !== 'undefined') return 'server process leaked a browser global';
  if (obs.timers !== 0) return 'server process leaked a timer';
  if (obs.exitCode !== 0 || obs.threw === true) return 'server process exit was not successful';
  if (kind === 'render') {
    if (obs.renderedOnServer !== true || obs.clientOnly !== false) return 'client-only render presented as SSR';
    if (obs.marker !== true) return 'server render did not include the component';
    if (HOST_FAMILIES.has(family) && obs.overlayOpened !== false) return 'overlay was reported open without a browser';
    return null;
  }
  if (kind === 'import' || kind === 'testing') {
    if (obs.renderedOnServer !== false || obs.serverImport !== true) return 'import was presented as a render';
    return null;
  }
  return 'unknown server case';
}

export function assertCase(caseId, obs) {
  const parts = String(caseId || '').split('/');
  if (parts[0] !== 'csp-ssr' || parts[1] !== 'main') return ['unknown case'];
  if (parts[2] === 'chromium' && parts[3] === 'nonce-and-negative') {
    if (parts[4] === 'policy') {
      const problem = policyProblem(parts[5], obs);
      return problem ? [problem] : [];
    }
    const problem = nonceProblem(parts[5], obs);
    return problem ? [problem] : [];
  }
  if (parts[2] === 'server' && parts[3] === 'dom-free-server-and-leaks') {
    const problem = serverProblem(parts[4], parts[5], obs);
    return problem ? [problem] : [];
  }
  return ['unknown case'];
}

export function samplePass(caseId) {
  const parts = caseId.split('/');
  if (parts[2] === 'chromium' && parts[4] !== 'policy') {
    const mode = parts[5];
    const base = {engine: 'chromium', unsafeInline: false, clientOnly: false, hydration: false, stylesWithPolicyNonce: mode === 'correct-nonce' ? 1 : 0};
    if (mode === 'correct-nonce') return {...base, opened: true, styleSrcViolations: 0, scriptSrcViolations: 0, spinnerRules: 1, spinnerNonce: 'policy'};
    if (mode === 'missing-nonce') return {...base, opened: true, styleSrcViolations: 1, scriptSrcViolations: 0, spinnerRules: 0, spinnerNonce: ''};
    return {...base, opened: true, styleSrcViolations: 1, scriptSrcViolations: 0, spinnerRules: 0, spinnerNonce: 'wrong'};
  }
  if (parts[4] === 'policy') {
    const name = parts[5];
    const base = {engine: 'chromium', unsafeInline: false, hydration: false};
    if (name === 'unapproved-inline-script') return {...base, appBooted: true, inlineScriptRan: false, scriptSrcViolations: 1};
    if (name === 'unapproved-inline-style') return {...base, inlineStyleApplied: false, styleSrcViolations: 1};
    if (name === 'style-hash-match') return {...base, hashStyleApplied: true, styleSrcViolations: 0};
    if (name === 'style-hash-mismatch') return {...base, hashStyleApplied: false, styleSrcViolations: 1};
    return {...base, driverEvaluated: true, inlineScriptRan: false, scriptSrcViolations: 1};
  }
  const kind = parts[4];
  const family = parts[5];
  const base = {
    documentBefore: 'undefined', windowBefore: 'undefined', documentAfter: 'undefined', windowAfter: 'undefined',
    timers: 0, exitCode: 0, threw: false, clientOnly: false, hydration: false,
  };
  if (kind === 'render') {
    return {...base, renderedOnServer: true, marker: true, overlayOpened: HOST_FAMILIES.has(family) ? false : undefined};
  }
  return {...base, renderedOnServer: false, serverImport: true};
}

export function observationProblems({requiredIds, outcomes, sourceClean, artifactSha, boundSha, chromiumLaunched}) {
  const problems = [];
  if (sourceClean !== true) problems.push('dirty source');
  if (!artifactSha || artifactSha !== boundSha) problems.push('unbound artifact');
  if (chromiumLaunched !== true) problems.push('missing required engine');
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
