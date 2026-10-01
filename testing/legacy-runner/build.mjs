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
const subjectMode = process.env.LEGACY_SUBJECT_MODE || 'workspace-dist';
const distPkg =
  process.env.LEGACY_PACKAGE_ROOT || path.join(root, 'dist/ngx-material-legacy');
const typesRoot =
  process.env.LEGACY_TYPES_ROOT || path.join(distPkg, 'types');

fs.mkdirSync(outDir, {recursive: true});

if (!fs.existsSync(path.join(distPkg, 'package.json'))) {
  console.error(`Missing package at ${distPkg} — run pack/build or pass an extracted --run artifact.`);
  process.exit(1);
}

const pkgJson = JSON.parse(fs.readFileSync(path.join(distPkg, 'package.json'), 'utf8'));
const pkgName = pkgJson.name; // @ngx-compat/material-legacy
const workspaceDist = path.resolve(root, 'dist/ngx-material-legacy');
const workspaceProjects = path.resolve(root, 'projects/ngx-material-legacy');

function under(parent, target) {
  const rel = path.relative(parent, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function resolveDistExport(subpath) {
  const key = subpath === '' ? '.' : `./${subpath}`;
  const exp = pkgJson.exports?.[key];
  if (!exp) throw new Error(`No export ${key} in package ${distPkg}`);
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
  `globalThis.__LEGACY_SUBJECT_MODE__ = ${JSON.stringify(subjectMode)};`,
  `globalThis.__LEGACY_PACKAGE_ROOT__ = ${JSON.stringify(distPkg)};`,
  ...rows.map(row => `import '${path.join(root, row.candidate).replaceAll('\\', '/')}';`),
  "import '../specs/discovery.spec';",
  "import '../specs/deliberate-fail.spec';",
  '',
];
const generatedEntry = path.join(outDir, 'entry.generated.ts');
fs.writeFileSync(generatedEntry, entryLines.join('\n'));
fs.writeFileSync(
  path.join(outDir, 'bundled-specs.json'),
  JSON.stringify(
    {
      subject_mode: subjectMode,
      package_root: distPkg,
      run_id: process.env.LEGACY_RUN_ID || null,
      artifact_sha256: process.env.LEGACY_ARTIFACT_SHA256 || null,
      rows,
    },
    null,
    2,
  ) + '\n',
);

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
      const filterRe = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
      build.onResolve({filter: filterRe}, () => ({path: target}));
    }
    build.onResolve({filter: /^zone\.js\/testing$/}, () => ({path: require.resolve('zone.js/testing')}));
    build.onResolve({filter: /^zone\.js$/}, () => ({path: require.resolve('zone.js')}));

    if (subjectMode === 'artifact') {
      // Refuse packaged-public bypass via workspace implementation files.
      // Specs, runner shims, and non-component local test helpers may still load.
      build.onLoad({filter: /\.(ts|js|mjs)$/}, args => {
        const resolved = path.resolve(args.path);
        const isSpec = /\.spec\.ts$/.test(resolved);
        const isShim = resolved.includes(
          `${path.sep}testing${path.sep}legacy-runner${path.sep}shims${path.sep}`,
        );
        if (under(workspaceDist, resolved) && !under(path.resolve(distPkg), resolved)) {
          return {
            errors: [
              {
                text:
                  `artifact mode refused workspace-dist import: ${path.relative(root, resolved)}`,
              },
            ],
          };
        }
        if (under(workspaceProjects, resolved) && !isSpec && !isShim) {
          const text = fs.readFileSync(resolved, 'utf8');
          if (/@Component\s*\(|@Directive\s*\(|@NgModule\s*\(|templateUrl\s*:/.test(text)) {
            return {
              errors: [
                {
                  text:
                    `artifact mode refused workspace component/module import: ` +
                    `${path.relative(root, resolved)} (package root is ${distPkg})`,
                },
              ],
            };
          }
        }
        return undefined;
      });
    }

    build.onLoad({filter: /\.spec\.ts$/}, args => {
      const source = fs.readFileSync(args.path, 'utf8');
      const adapted = adaptSpec(source, args.path, {typesRoot, subjectMode});
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

console.log(
  `Bundled → testing/legacy-runner/out/legacy-tests.iife.js (expectFail=${expectFail} mode=${subjectMode})`,
);
