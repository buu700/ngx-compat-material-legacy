import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const outDir = path.join(__dirname, 'out');
const expectFail = process.env.LEGACY_TESTS_EXPECT_FAIL === '1';

fs.mkdirSync(outDir, {recursive: true});

const distPkg = path.join(root, 'dist/ngx-material-legacy');
if (!fs.existsSync(path.join(distPkg, 'package.json'))) {
  console.error('Missing dist/ngx-material-legacy — run pack/build first.');
  process.exit(1);
}

const pkgJson = JSON.parse(fs.readFileSync(path.join(distPkg, 'package.json'), 'utf8'));
const pkgName = pkgJson.name; // @ngx-compat/material-legacy

function resolveDistExport(subpath) {
  const key = subpath === '' ? '.' : `./${subpath}`;
  const exp = pkgJson.exports?.[key];
  if (!exp) throw new Error(`No export ${key} in dist package`);
  const rel = typeof exp === 'string' ? exp : exp.default || exp.import;
  return path.join(distPkg, rel);
}

const aliasPlugin = {
  name: 'legacy-aliases',
  setup(build) {
    const exact = {
      [`${pkgName}/legacy-button/testing`]: resolveDistExport('legacy-button/testing'),
      [`${pkgName}/legacy-button`]: resolveDistExport('legacy-button'),
      [pkgName]: resolveDistExport(''),
    };
    for (const [prefix, target] of Object.entries(exact)) {
      const filter = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
      build.onResolve({filter}, () => ({path: target}));
    }
    build.onResolve({filter: /^zone\.js\/testing$/}, () => ({path: require.resolve('zone.js/testing')}));
    build.onResolve({filter: /^zone\.js$/}, () => ({path: require.resolve('zone.js')}));
  },
};

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(__dirname, 'entry.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2022'],
  outfile: path.join(outDir, 'legacy-tests.iife.js'),
  sourcemap: true,
  plugins: [aliasPlugin],
  define: {
    __LEGACY_TESTS_EXPECT_FAIL__: expectFail ? 'true' : 'false',
  },
  loader: {'.html': 'text', '.css': 'text', '.svg': 'text'},
  ignoreAnnotations: true,
  logOverride: {'direct-eval': 'silent'},
});

console.log(`Bundled → testing/legacy-runner/out/legacy-tests.iife.js (expectFail=${expectFail})`);
