/**
 * C02 technical determination for four finite current-sort color probes.
 * Retain untouched16 CSS as evidence; compile the public peer separately and
 * compare the complete CSS to the original fallback plus its current token.
 * This does not waive any owned control, aggregate, selector or other mixin.
 */
import {createHash} from 'node:crypto';
import {readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
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
const PEERS = {'main': '22.1.7', '21.x': '21.2.14'};
const MANIFESTS = {
  'main': '5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af',
  '21.x': '26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355',
};
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
  const roots = [materialRoot, cdkRoot].map(path => realpathSync(path));
  const manifest = readFileSync(join(roots[0], 'package.json'));
  const version = JSON.parse(manifest).version;
  if (version !== PEERS[line] || sha(manifest) !== MANIFESTS[line]) throw Error('sort peer does not match the exact branch floor');
  const measured = sass.compileString(program, {
    loadPaths: [join(roots[0], '..', '..')], style: 'expanded',
    silenceDeprecations: ['if-function', 'global-builtin', 'color-functions', 'import'],
    logger: {warn() {}, debug() {}},
  });
  const sources = measured.loadedUrls.map(url => {
    if (url.protocol !== 'file:') throw Error('sort oracle has a non-file source');
    const path = realpathSync(fileURLToPath(url));
    const root = roots.findIndex(base => {
      const part = relative(base, path);
      return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith('../'));
    });
    if (root < 0) throw Error('sort oracle loaded a candidate or unrelated source');
    const bytes = readFileSync(path);
    return {root, path: relative(roots[root], path).replaceAll('\\', '/'), sha256: sha(bytes), bytes: bytes.length};
  }).sort((a, b) => a.root - b.root || a.path.localeCompare(b.path));
  return {line, peer_version: version, peer_package_json_sha256: sha(manifest),
    program, program_sha256: sha(program), css: measured.css, css_sha256: sha(measured.css),
    css_bytes: Buffer.byteLength(measured.css), sources};
}

export function sortCompanionExpectedCss(caseId, original, peer) {
  if (!Object.hasOwn(SORT_COMPANION_CASES, caseId) || !original || !peer) return null;
  if (typeof original.css !== 'string' || typeof peer.program !== 'string' || typeof peer.css !== 'string'
      || !Array.isArray(peer.sources) || peer.sources.length === 0) return null;
  if (original.css_sha256 !== SORT_COMPANION_CASES[caseId] || sha(original.css) !== original.css_sha256
      || original.css_bytes !== Buffer.byteLength(original.css)
      || !Object.hasOwn(PEERS,peer.line) || PEERS[peer.line] !== peer.peer_version
      || peer.peer_package_json_sha256 !== MANIFESTS[peer.line] || peer.program !== sortPeerProgram(caseId)
      || peer.program_sha256 !== sha(peer.program) || peer.css_sha256 !== sha(peer.css)
      || peer.css_bytes !== Buffer.byteLength(peer.css)) return null;
  if (peer.sources.some(s => !Number.isInteger(s.root) || ![0,1].includes(s.root)
      || typeof s.path !== 'string' || !s.path || s.path.startsWith('/') || s.path.includes('\\') || s.path.split('/').includes('..')
      || !/^[0-9a-f]{64}$/.test(s.sha256) || !Number.isInteger(s.bytes) || s.bytes < 1)
      || new Set(peer.sources.map(s => `${s.root}/${s.path}`)).size !== peer.sources.length) return null;
  for (const [path, [digest,bytes]] of Object.entries(REQUIRED_SOURCES)) {
    if (!peer.sources.some(source => source.root === 0 && source.path === path && source.sha256 === digest && source.bytes === bytes)) return null;
  }
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
