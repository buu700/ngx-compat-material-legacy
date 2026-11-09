#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Build-only packed-consumer fixture. The caller supplies an already prepared
 * physical consumer; this program never installs packages or starts a browser.
 * Usage: node scripts/build-dialog-padding-fixture.mjs <packed.tgz> <material-16.2.14.tgz> <consumer-dir> <new-report.json>
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {dirname,join,relative,resolve,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildLab,readPackedPackage,versionsFor} from './check-companion-computed-styles.mjs';
import {verifyWindowInstalledArtifact} from './csp-ssr-window-artifact-image.mjs';
import {compileTaggedDialogPadding,assessZeroArgCss} from './dialog-padding-tagged-reference.mjs';
import {inspectDialogPaddingSources} from './dialog-padding-source-contract.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'package.json')),hash=b=>createHash('sha256').update(b).digest('hex');
const [archive,tagArchive,consumerArg,reportArg,...extra]=process.argv.slice(2);assert.ok(archive&&tagArchive&&consumerArg&&reportArg&&!extra.length,'four positional arguments required');
assert.equal(process.versions.node,'24.21.0','unexpected Node version');
const tarball=resolve(archive),tagTar=resolve(tagArchive),consumer=resolve(consumerArg),report=resolve(reportArg),nodeModules=join(consumer,'node_modules');
const expected=hash(readFileSync(tarball));
const image=verifyWindowInstalledArtifact(tarball,consumer,expected),packed=readPackedPackage(tarball),versions=versionsFor(packed);
assert.equal(packed.name,'@ngx-compat/material-legacy');assert.deepEqual([versions.core,versions.cdk,versions.material],['22.1.7','22.1.7','22.1.7']);
for(const [name,version] of [['core',versions.core],['cdk',versions.cdk],['material',versions.material],['compiler',versions.core],['compiler-cli',versions.core]])assert.equal(JSON.parse(readFileSync(join(nodeModules,'@angular',name,'package.json'))).version,version,'actual peer '+name);
for(const [name,version] of [['rxjs',versions.rxjs],['zone.js',versions.zone],['tslib',versions.tslib]])assert.equal(JSON.parse(readFileSync(join(nodeModules,name,'package.json'))).version,version,'actual dependency '+name);
assert.equal(require('esbuild').version,JSON.parse(readFileSync(join(root,'package.json'))).devDependencies.esbuild,'unexpected esbuild version');
const sass=require('sass'),fixture=join(root,'fixtures/dialog-padding/fixture.ts'),theme=join(root,'fixtures/dialog-padding/theme.scss');
const comparison=compileTaggedDialogPadding({sass,tagTar,packedTar:tarball,expectedPackedSha:expected,nodeModules});
const wrong=comparison.candidate_css.replace('padding: 24px','padding: 23px');assert.notEqual(wrong,comparison.candidate_css);assert.equal(assessZeroArgCss(comparison.reference_css,wrong),false);
const css=sass.compile(theme,{loadPaths:[nodeModules],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import']});
const allowed=[realpathSync(join(nodeModules,'@ngx-compat/material-legacy')),realpathSync(join(nodeModules,'@angular/material')),realpathSync(join(nodeModules,'@angular/cdk'))];
for(const url of css.loadedUrls){assert.equal(url.protocol,'file:');const path=realpathSync(fileURLToPath(url));if(path===realpathSync(theme))continue;assert.ok(allowed.some(base=>{const rel=relative(base,path);return rel!==''&&rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel)}),'unexpected Sass dependency '+path);}
const ts=require('typescript');assert.equal(ts.version,'6.0.3');const sourceWitnesses=inspectDialogPaddingSources({typescript:ts,nodeModules,packedRoot:join(nodeModules,'@ngx-compat/material-legacy'),themeCss:css.css});
await buildLab(consumer,process.env,versions,readFileSync(fixture,'utf8'),{strictDeclarations:true});
const dist=join(consumer,'dist');writeFileSync(join(dist,'fixture.css'),css.css+'\n');writeFileSync(join(dist,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="fixture.css"></head><body><dialog-padding-lab></dialog-padding-lab><script src="app.js"></script></body></html>');
const toolInputs=['scripts/build-dialog-padding-fixture.mjs','scripts/check-dialog-padding-fixture.mjs','scripts/dialog-padding-fixture-contract.mjs','scripts/dialog-padding-source-contract.mjs','scripts/dialog-padding-tagged-reference.mjs','scripts/check-companion-computed-styles.mjs','scripts/csp-ssr-window-artifact-image.mjs','scripts/safe-package-extract.mjs','scripts/sass-owned-rendered.mjs'].map(path=>({path,sha256:hash(readFileSync(join(root,path)))}));
const result={schema_version:1,tool_inputs:toolInputs,status:'built-no-browser',tarball_sha256:expected,installed_image:image,peer_versions:versions,sass:sass.info,strict_templates:true,skip_lib_check:false,fixture_sha256:hash(readFileSync(fixture)),theme_source_sha256:hash(readFileSync(theme)),theme_css_sha256:hash(css.css),theme_css_file_sha256:hash(readFileSync(join(dist,'fixture.css'))),index_html_sha256:hash(readFileSync(join(dist,'index.html'))),app_js_sha256:hash(readFileSync(join(dist,'app.js'))),tagged_reference:comparison,source_witnesses:sourceWitnesses,wrong_css_mutant_rejected:true,npm_install:false,browser_started:false};
writeFileSync(report,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,strict_templates:true,tagged_css_sha256:comparison.reference_sha256,wrong_css_mutant_rejected:true}));
