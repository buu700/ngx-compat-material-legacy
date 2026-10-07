/**
 * C02 technical determination for four finite current-sort color probes.
 * Retain untouched16 CSS as evidence; compile the public peer separately and
 * compare the complete CSS to the original fallback plus its current token.
 * This does not waive any owned control, aggregate, selector or other mixin.
 */
import {createHash} from 'node:crypto';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
import {SCENARIOS, themeSass} from './companion-bridge-peer-oracle.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const LIGHT = 'e97314a64538c85bf6bb0bcf98e156409bf0e10b99f82e3e9ec4f78c801d6efe';
const DARK = 'b727db33639182dc7d8cc6dd5631a8f3f925a28fa0a27028b25d21aa4971efa9';
export const SORT_COMPANION_CASES = Object.freeze({
  'mixin-argument/sort-color/custom-full-theme': LIGHT,
  'mixin-argument/sort-color/raw-color-config': LIGHT,
  'mixin-argument/sort-theme/custom-full-theme': LIGHT,
  'mixin-argument/sort-theme/custom-dark-theme': DARK,
});
const REQUIRED_SOURCES = {
  'sort/_m2-sort.scss': ['06d77838a6fee948f3e101021da366bf95845a769916b354137103cf454f98d6',267],
  'sort/_sort-theme.scss': ['526fb2229a84a7449a9a4d57cd228089df1c403cdcebd0b84ebed54086636be0',1977],
};

export function sortPeerProgram(caseId) {
  if (!Object.hasOwn(SORT_COMPANION_CASES, caseId)) return null;
  const dark = caseId.endsWith('/custom-dark-theme');
  const scenario = SCENARIOS.find(s => s.id === `closeout-custom-2018-${dark ? 'dark' : 'light'}`);
  if (!scenario) throw Error('independent peer sort scenario is missing');
  const dimension = caseId.includes('/sort-color/') ? 'color' : 'theme';
  return "@use '@angular/material' as peer;\n" + themeSass('peer', scenario, {m2Prefix: 'm2-'})
    + `.sass-argument-probe { @include peer.sort-${dimension}($theme); }\n`;
}

export function measureSortPeer({sass, materialRoot, cdkRoot, caseId, line}) {
  const program = sortPeerProgram(caseId);
  if (program === null) return null;
  return measureM2PeerProgram({sass,materialRoot,cdkRoot,program,line});
}

export function sortCompanionExpectedCss(caseId, original, peer) {
  if (!Object.hasOwn(SORT_COMPANION_CASES, caseId) || !original || !peer) return null;
  if (typeof original.css !== 'string' || original.css_sha256 !== SORT_COMPANION_CASES[caseId]
      || sha(original.css) !== original.css_sha256 || original.css_bytes !== Buffer.byteLength(original.css)
      || !peerMeasurementMatches(peer,sortPeerProgram(caseId),REQUIRED_SOURCES)) return null;
  const match = /^\.sass-argument-probe \.mat-sort-header-arrow \{\n  color: ([^;\n{}]+);\n\}$/.exec(original.css);
  if (!match) return null;
  const value = caseId.endsWith('/custom-dark-theme') ? 'white' : 'rgba(0, 0, 0, 0.87)';
  const peerCss = `.sass-argument-probe {\n  --mat-sort-arrow-color: ${value};\n}`;
  if (peer.css !== peerCss) return null;
  return `.sass-argument-probe .mat-sort-header-arrow {\n  color: var(--mat-sort-arrow-color, ${match[1]});\n}\n` + peerCss;
}

export function sortCompanionResultsMatch(caseId, original, actual, peer) {
  const expected = sortCompanionExpectedCss(caseId, original, peer);
  return expected !== null && actual?.css === expected && actual.css_sha256 === sha(actual.css)
    && actual.css_bytes === Buffer.byteLength(actual.css);
}
