/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {readFileSync, writeFileSync, mkdirSync, realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {join, resolve} from 'node:path';
import {hashPackageTree, makeBuildIdentity, sha256, verifyPackageIdentity} from './identity.mjs';
const root = new URL('.', import.meta.url).pathname;
const runPath = resolve(process.env.LEGACY_RUN_JSON || '');
const packageIdentityPath = resolve(process.env.LEGACY_PACKAGE_IDENTITY || '');
if (!process.env.LEGACY_RUN_JSON || !process.env.LEGACY_PACKAGE_IDENTITY) {
  throw Error('LEGACY_RUN_JSON and LEGACY_PACKAGE_IDENTITY are required to bind this build');
}
const packageLink = join(root, 'node_modules/@ngx-compat/material-legacy');
const packageRoot = realpathSync(packageLink);
const packageIdentityBytes = readFileSync(packageIdentityPath);
const packageIdentity = JSON.parse(packageIdentityBytes.toString('utf8'));
const fesmPath = join(packageRoot, 'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs');
verifyPackageIdentity({
  runBytes: readFileSync(runPath), expectedRunPath: runPath, packageIdentityBytes,
  actualPackageRoot: packageLink, actualPackageTreeSha256: hashPackageTree(packageRoot),
  actualFesmSha256: sha256(readFileSync(fesmPath)),
});
const req = createRequire(join(root, 'package.json'));
const node = process.execPath;
const compilerCliPkg = req.resolve('@angular/compiler-cli/package.json');
const ngc = join(compilerCliPkg, '..', 'bundles/src/bin/ngc.js');
const compile = spawnSync(node, [ngc, '-p', 'tsconfig.json'], {cwd: root, encoding: 'utf8'});
if (compile.status !== 0) throw Error((compile.stdout + compile.stderr).slice(-5000));
const linkerRequire = createRequire(req.resolve('@angular/compiler-cli/package.json'));
const {transformSync} = linkerRequire('@babel/core');
const linkerPlugin = linkerRequire('@angular/compiler-cli/linker/babel').default;
const {needsLinking} = linkerRequire('@angular/compiler-cli/linker');
const esbuild = req('esbuild');
mkdirSync(join(root, 'dist'), {recursive: true});
await esbuild.build({absWorkingDir: root, entryPoints: ['out/main.js'], bundle: true, format: 'iife', outfile: 'dist/app.js', platform: 'browser', logLevel: 'silent', plugins: [{name:'linker',setup(build){build.onLoad({filter:/\.m?js$/},args=>{const contents=readFileSync(args.path,'utf8');if(!contents.includes('ɵɵngDeclare')||!needsLinking(args.path,contents))return null;const linked=transformSync(contents,{filename:args.path,compact:false,configFile:false,babelrc:false,plugins:[[linkerPlugin,{linkerJitMode:false}]]});return {contents:linked.code,loader:'js'};});}}]});
const sass = req('sass');
const theme = `@use '@ngx-compat/material-legacy' as mat with ($theme-ignore-duplication-warnings: true);\n$primary: mat.define-palette(mat.$indigo-palette);\n$accent: mat.define-palette(mat.$pink-palette, A200, A100, A400);\n$warn: mat.define-palette(mat.$red-palette);\n$light: mat.define-light-theme((color:(primary:$primary,accent:$accent,warn:$warn),typography:mat.define-typography-config(),density:0));\n@include mat.core();\n@include mat.legacy-core();\n.fixture { @include mat.all-legacy-component-themes($light); }\n`;
const css=sass.compileString(theme,{loadPaths:[join(root,'node_modules'), join(root,'../../node_modules')],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import']}).css;
writeFileSync(join(root,'dist/theme.css'),css);
writeFileSync(join(root,'dist/index.html'),'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/theme.css"><style>body{margin:0;padding:16px}.fixture{max-width:900px}.mat-tab-body-wrapper{min-height:120px}.probe-content{min-height:48px}.mat-tab-group-dynamic-height .mat-tab-body-wrapper{transition:height 500ms ease}html.width-boundary .mat-tab-body-active>.mat-tab-body-content{width:calc(100% + 64px)!important}html.width-boundary .mat-tab-body:not(.mat-tab-body-active)>.mat-tab-body-content{width:calc(100% - 32px)!important}</style></head><body><tabs-root class="fixture"></tabs-root><script src="/app.js"></script></body></html>\n');
console.log(JSON.stringify({node:spawnSync(node,['-v'],{encoding:'utf8'}).stdout.trim(),ngc,appBytes:readFileSync(join(root,'dist/app.js')).length,themeBytes:css.length,esbuild:req('esbuild/package.json').version,angular: req('@angular/core/package.json').version}));
const buildIdentity = makeBuildIdentity({
  packageIdentityPath, packageIdentity,
  appPath: join(root, 'dist/app.js'), themePath: join(root, 'dist/theme.css'),
  htmlPath: join(root, 'dist/index.html'), packageRoot,
});
writeFileSync(join(root, 'dist/build-identity.json'), JSON.stringify(buildIdentity, null, 2) + '\n');
console.log(JSON.stringify({buildIdentity: join(root, 'dist/build-identity.json'),
  packageIdentitySha256: sha256(packageIdentityBytes), artifactSha256: packageIdentity.artifact_sha256,
  packageTreeSha256: buildIdentity.package_tree_sha256, appSha256: buildIdentity.app_sha256,
  themeSha256: buildIdentity.theme_sha256}));
