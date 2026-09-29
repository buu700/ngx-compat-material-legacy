import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {adaptSpec, historicalPathFor} from './adapt-spec.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const outDir = path.join(__dirname, 'out');
const expectFail = process.env.LEGACY_TESTS_EXPECT_FAIL === '1';
const filter = process.env.LEGACY_SPEC_FILTER || '';
const family = process.env.LEGACY_SPEC_FAMILY || '';

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

const inventory = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'historical-inventory.json'), 'utf8'),
);
const familyCandidates = family
  ? new Set(inventory.rows.filter(row => row.family === family).map(row => row.candidate))
  : null;
if (family && familyCandidates.size === 0) {
  const known = [...new Set(inventory.rows.map(row => row.family))].sort();
  console.error(`Unknown historical family "${family}". Known: ${known.join(', ')}`);
  process.exit(1);
}
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'historical-specs.json'), 'utf8'))
  .filter(row => !filter || row.historical_path.includes(filter) || row.candidate.includes(filter))
  .filter(row => !familyCandidates || familyCandidates.has(row.candidate));
if ((family || filter) && rows.length === 0) {
  console.error('Historical selection matched no specs');
  process.exit(1);
}
for (const row of rows) {
  if (!fs.existsSync(path.join(root, row.candidate))) {
    console.error(`Missing historical spec ${row.candidate}`);
    process.exit(1);
  }
}

const entryLines = [
  "import '../init-test-env';",
  `globalThis.__LEGACY_EXPECTED_SPECS__ = ${JSON.stringify(rows.map(row => row.historical_path))};`,
  ...rows.map(row => `import '${path.join(root, row.candidate).replaceAll('\\', '/')}';`),
  "import '../specs/discovery.spec';",
  "import '../specs/deliberate-fail.spec';",
  '',
];
const generatedEntry = path.join(outDir, 'entry.generated.ts');
fs.writeFileSync(generatedEntry, entryLines.join('\n'));
fs.writeFileSync(path.join(outDir, 'bundled-specs.json'), JSON.stringify(rows, null, 2) + '\n');

const aliasPlugin = {
  name: 'legacy-aliases',
  setup(build) {
    const exact = {[pkgName]: resolveDistExport('')};
    for (const key of Object.keys(pkgJson.exports ?? {})) {
      if (!key.startsWith('./legacy-')) continue;
      const sub = key.slice(2);
      exact[`${pkgName}/${sub}`] = resolveDistExport(sub);
      exact[`@angular/material/${sub}`] = resolveDistExport(sub);
    }
    for (const [prefix, target] of Object.entries(exact)) {
      const filter = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
      build.onResolve({filter}, () => ({path: target}));
    }
    build.onResolve({filter: /^zone\.js\/testing$/}, () => ({path: require.resolve('zone.js/testing')}));
    build.onResolve({filter: /^zone\.js$/}, () => ({path: require.resolve('zone.js')}));
    build.onLoad({filter: /\.spec\.ts$/}, args => {
      const source = fs.readFileSync(args.path, 'utf8');
      const adapted = adaptSpec(source, args.path);
      if (adapted.problems.length) {
        return {errors: adapted.problems.map(text => ({text}))};
      }
      const historical = historicalPathFor(args.path, rows);
      const prefix = historical
        ? `globalThis.__LEGACY_SPEC_HIT__ = globalThis.__LEGACY_SPEC_HIT__ || []; globalThis.__LEGACY_SPEC_HIT__.push(${JSON.stringify(historical)});\n`
        : '';
      // esbuild does not emit design:paramtypes. Historical specs rely on JIT
      // constructor injection, so TypeScript emits the metadata before bundling.
      const transpiled = ts.transpileModule(prefix + adapted.code, {
        fileName: args.path,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          useDefineForClassFields: false,
          importHelpers: false,
        },
      });
      return {contents: transpiled.outputText, loader: 'js', resolveDir: path.dirname(args.path)};
    });
  },
};

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [generatedEntry],
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
