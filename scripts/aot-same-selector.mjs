#!/usr/bin/env node
/**
 * Compile the same mat-button selector in two AOT scopes, then together.
 *
 *   node scripts/aot-same-selector.mjs --tarball <path>
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/aot-same-selector.json');
const scenario = JSON.parse(readFileSync(join(root, 'compatibility/rc/scenarios/button.json'), 'utf8'));

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--tarball') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--tarball requires a path');
    tarball = resolve(value);
    i += 1;
    continue;
  }
  fail(2, `Unknown argument: ${arg}`);
}
if (!tarball) fail(2, '--tarball is required');

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-aot-scope-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(
  join(consumer, 'package.json'),
  JSON.stringify(
    {
      name: 'ngx-compat-aot-same-selector',
      private: true,
      dependencies: {
        '@angular/cdk': '22.1.7',
        '@angular/common': '22.1.7',
        '@angular/compiler': '22.1.7',
        '@angular/compiler-cli': '22.1.7',
        '@angular/core': '22.1.7',
        '@angular/forms': '22.1.7',
        '@angular/material': '22.1.7',
        '@angular/platform-browser': '22.1.7',
        '@ngx-compat/material-legacy': `file:${installTarball}`,
        rxjs: '7.8.2',
        tslib: '2.8.1',
        typescript: '6.0.3',
      },
    },
    null,
    2,
  ),
);
writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
const env = {...process.env, NODE_OPTIONS: ''};
delete env.NODE_PATH;
const install = spawnSync(
  'npm',
  ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'],
  {cwd: consumer, encoding: 'utf8', timeout: 180000, env},
);
if (install.status !== 0) fail(1, (install.stderr || install.stdout || 'npm install failed').slice(-2000));

const installed = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
const rel = relative(realpathSync(consumer), installed);
if (rel.startsWith('..')) fail(1, `Library resolved outside the consumer: ${installed}`);

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(
  join(consumer, 'src/scenario.ts'),
  `export const buttonLabel = ${JSON.stringify(scenario.label)};\n`,
);
const component = (name, imports) => `import {Component, NgModule} from '@angular/core';
${imports}
import {buttonLabel} from './scenario';

@Component({
  standalone: false,
  selector: 'scope-root',
  template: ${JSON.stringify(scenario.template)},
})
export class ScopeRoot {
  label = buttonLabel;
}

@NgModule({
  imports: [${name}],
  declarations: [ScopeRoot],
})
export class ScopeModule {}
`;
writeFileSync(
  join(consumer, 'src/legacy.ts'),
  component(
    'MatLegacyButtonModule',
    `import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';`,
  ),
);
writeFileSync(
  join(consumer, 'src/modern.ts'),
  component('MatButtonModule', `import {MatButtonModule} from '@angular/material/button';`),
);
writeFileSync(
  join(consumer, 'src/combined.ts'),
  `import {Component, NgModule} from '@angular/core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatButtonModule} from '@angular/material/button';
import {buttonLabel} from './scenario';

@Component({
  standalone: false,
  selector: 'scope-root',
  template: ${JSON.stringify(scenario.template)},
})
export class ScopeRoot {
  label = buttonLabel;
}

@NgModule({
  imports: [MatLegacyButtonModule, MatButtonModule],
  declarations: [ScopeRoot],
})
export class ScopeModule {}
`,
);
const config = (file, outDir) => ({
  compilerOptions: {
    target: 'ES2022',
    module: 'ES2022',
    moduleResolution: 'bundler',
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: false,
    lib: ['ES2022', 'DOM'],
    rootDir: 'src',
    outDir,
    types: [],
    ignoreDeprecations: '6.0',
  },
  files: ['src/scenario.ts', file],
  angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
});
writeFileSync(join(consumer, 'tsconfig.legacy.json'), JSON.stringify(config('src/legacy.ts', 'out-legacy'), null, 2));
writeFileSync(join(consumer, 'tsconfig.modern.json'), JSON.stringify(config('src/modern.ts', 'out-modern'), null, 2));
writeFileSync(join(consumer, 'tsconfig.combined.json'), JSON.stringify(config('src/combined.ts', 'out-combined'), null, 2));
const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
function compile(project) {
  return spawnSync(process.execPath, [ngc, '-p', project], {
    cwd: consumer,
    encoding: 'utf8',
    timeout: 180000,
    env,
  });
}
const legacy = compile('tsconfig.legacy.json');
const modern = compile('tsconfig.modern.json');
const combined = compile('tsconfig.combined.json');
const combinedText = `${combined.stdout || ''}\n${combined.stderr || ''}`;
const report = {
  schema_version: 1,
  role: 'same-selector AOT scopes',
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  shared_scenario: 'compatibility/rc/scenarios/button.json',
  legacy_exit: legacy.status,
  modern_exit: modern.status,
  combined_exit: combined.status,
  combined_rejected: combined.status !== 0 && /mat-button|more than one|NG8002|NG0300/i.test(combinedText),
  combined_diagnostic: combinedText
    .replace(/\u001b\[[0-9;]*m/g, '')
    .trim()
    .split('\n')
    .filter(Boolean)
    .slice(-4),
  historical_material_16_app: 'not built',
  limitations: [
    'This is an ngc compile of two modules, not a browser application.',
    'A Material 16 historical app was not installed.',
    'This is not RC-07-A01.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  legacy_exit: legacy.status,
  modern_exit: modern.status,
  combined_exit: combined.status,
  combined_rejected: report.combined_rejected,
}, null, 2));
if (legacy.status !== 0 || modern.status !== 0 || !report.combined_rejected) {
  console.error(combinedText.slice(-2000));
  process.exit(1);
}
