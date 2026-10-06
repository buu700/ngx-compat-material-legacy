#!/usr/bin/env node
/**
 * Compile the shared button scenario against Material 16.2.14, apart from the candidate.
 *
 *   node scripts/aot-historical-scenario.mjs
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/aot-historical-scenario.json');
const scenarioPath = join(root, 'compatibility/rc/scenarios/button.json');
const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-aot-m16-'));
writeFileSync(
  join(consumer, 'package.json'),
  JSON.stringify(
    {
      name: 'ngx-compat-aot-material-16',
      private: true,
      dependencies: {
        '@angular/animations': '16.2.12',
        '@angular/cdk': '16.2.14',
        '@angular/common': '16.2.12',
        '@angular/compiler': '16.2.12',
        '@angular/compiler-cli': '16.2.12',
        '@angular/core': '16.2.12',
        '@angular/forms': '16.2.12',
        '@angular/material': '16.2.14',
        '@angular/platform-browser': '16.2.12',
        rxjs: '7.8.1',
        tslib: '2.6.2',
        typescript: '5.1.6',
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
if (existsSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'))) {
  fail(1, 'Historical app installed the candidate package');
}

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/scenario.ts'), `export const buttonLabel = ${JSON.stringify(scenario.label)};\n`);
writeFileSync(
  join(consumer, 'src/historical.ts'),
  `import {Component, NgModule} from '@angular/core';
import {MatLegacyButtonModule} from '@angular/material/legacy-button';
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
  imports: [MatLegacyButtonModule],
  declarations: [ScopeRoot],
})
export class ScopeModule {}
`,
);
writeFileSync(
  join(consumer, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'node',
        experimentalDecorators: true,
        strict: true,
        skipLibCheck: false,
        lib: ['ES2022', 'DOM'],
        rootDir: 'src',
        outDir: 'out',
        types: [],
      },
      files: ['src/scenario.ts', 'src/historical.ts'],
      angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
    },
    null,
    2,
  ),
);
const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {
  cwd: consumer,
  encoding: 'utf8',
  timeout: 180000,
  env,
});
const text = `${compiled.stdout || ''}\n${compiled.stderr || ''}`;
const report = {
  schema_version: 1,
  role: 'historical Material 16 scenario compile',
  scenario_sha256: createHash('sha256').update(readFileSync(scenarioPath)).digest('hex'),
  angular: '16.2.12',
  material: '16.2.14',
  entry: '@angular/material/legacy-button',
  candidate_package_installed: false,
  exit: compiled.status,
  limitations: [
    'This is an ngc compile, not a browser application.',
    'It does not compare rendered output with the candidate.',
    'This is not RC-07-A01.',
  ],
};
if (compiled.status !== 0) report.diagnostic = text.replace(/\u001b\[[0-9;]*m/g, '').trim().split('\n').slice(-8);
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({exit: compiled.status}, null, 2));
if (compiled.status !== 0) {
  console.error(text.slice(-2000));
  process.exit(1);
}
