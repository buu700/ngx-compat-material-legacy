/** Independent current-peer Sass measurement shared by finite C02 contracts. */
import {createHash} from 'node:crypto';
import {readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const PEERS = {'main': '22.1.7', '21.x': '21.2.14'};
const MANIFESTS = {
  'main': '5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af',
  '21.x': '26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355',
};

export function measureM2PeerProgram({sass, materialRoot, cdkRoot, program, line}) {
  const roots = [materialRoot, cdkRoot].map(path => realpathSync(path));
  const manifest = readFileSync(join(roots[0], 'package.json'));
  const version = JSON.parse(manifest).version;
  if (version !== PEERS[line] || sha(manifest) !== MANIFESTS[line]) throw Error('companion peer does not match the exact branch floor');
  const measured = sass.compileString(program, {
    loadPaths: [join(roots[0], '..', '..')], style: 'expanded',
    silenceDeprecations: ['if-function', 'global-builtin', 'color-functions', 'import'],
    logger: {warn() {}, debug() {}},
  });
  const sources = measured.loadedUrls.map(url => {
    if (url.protocol !== 'file:') throw Error('companion oracle has a non-file source');
    const path = realpathSync(fileURLToPath(url));
    const root = roots.findIndex(base => {
      const part = relative(base, path);
      return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith('../'));
    });
    if (root < 0) throw Error('companion oracle loaded a candidate or unrelated source');
    const bytes = readFileSync(path);
    return {root, path: relative(roots[root], path).replaceAll('\\', '/'), sha256: sha(bytes), bytes: bytes.length};
  }).sort((a, b) => a.root - b.root || a.path.localeCompare(b.path));
  return {line, peer_version: version, peer_package_json_sha256: sha(manifest),
    program, program_sha256: sha(program), css: measured.css, css_sha256: sha(measured.css),
    css_bytes: Buffer.byteLength(measured.css), sources};
}

export function peerMeasurementMatches(peer, program, requiredSources) {
  if (!peer || typeof peer.program !== 'string' || typeof peer.css !== 'string'
      || !Array.isArray(peer.sources) || peer.sources.length === 0) return false;
  if (!Object.hasOwn(PEERS,peer.line) || PEERS[peer.line] !== peer.peer_version
      || peer.peer_package_json_sha256 !== MANIFESTS[peer.line] || peer.program !== program
      || peer.program_sha256 !== sha(peer.program) || peer.css_sha256 !== sha(peer.css)
      || peer.css_bytes !== Buffer.byteLength(peer.css)) return false;
  if (peer.sources.some(s => !Number.isInteger(s.root) || ![0,1].includes(s.root)
      || typeof s.path !== 'string' || !s.path || s.path.startsWith('/') || s.path.includes('\\') || s.path.split('/').includes('..')
      || !/^[0-9a-f]{64}$/.test(s.sha256) || !Number.isInteger(s.bytes) || s.bytes < 1)
      || new Set(peer.sources.map(s => `${s.root}/${s.path}`)).size !== peer.sources.length) return false;
  return Object.entries(requiredSources).every(([path,[digest,bytes]]) =>
    peer.sources.some(source => source.root === 0 && source.path === path && source.sha256 === digest && source.bytes === bytes));
}
