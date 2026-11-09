#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Optional later live probe; never invoked by the build-only command.
 * Usage: node scripts/check-dialog-padding-fixture.mjs <packed.tgz> <material-16.2.14.tgz> <physical-consumer> <build-report.json> <new-report.json>
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withChromium} from './check-companion-computed-styles.mjs';
import {settleOwnedStyleFrame} from './sass-owned-rendered.mjs';
import {verifyWindowInstalledArtifact} from './csp-ssr-window-artifact-image.mjs';
import {compileTaggedDialogPadding} from './dialog-padding-tagged-reference.mjs';
import {DIALOG_PADDING_OBSERVE,WRONG_VALUE_CSS,assessDialogPadding} from './dialog-padding-fixture-contract.mjs';
import {inspectDialogPaddingSources} from './dialog-padding-source-contract.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'package.json')),hash=b=>createHash('sha256').update(b).digest('hex');
const [archive,tagArchive,consumerArg,buildArg,outArg,...extra]=process.argv.slice(2);assert.ok(archive&&tagArchive&&consumerArg&&buildArg&&outArg&&!extra.length,'five positional arguments required');
const tarball=resolve(archive),tagTar=resolve(tagArchive),consumer=resolve(consumerArg),dist=join(consumer,'dist'),build=JSON.parse(readFileSync(resolve(buildArg))),expected=build.tarball_sha256;
const toolPaths=['scripts/build-dialog-padding-fixture.mjs','scripts/check-dialog-padding-fixture.mjs','scripts/dialog-padding-fixture-contract.mjs','scripts/dialog-padding-source-contract.mjs','scripts/dialog-padding-tagged-reference.mjs','scripts/check-companion-computed-styles.mjs','scripts/csp-ssr-window-artifact-image.mjs','scripts/safe-package-extract.mjs','scripts/sass-owned-rendered.mjs'];assert.deepEqual(build.tool_inputs?.map(x=>x.path),toolPaths);for(const entry of build.tool_inputs)assert.equal(hash(readFileSync(join(root,entry.path))),entry.sha256,'changed fixture tool '+entry.path);
assert.equal(build.status,'built-no-browser');assert.match(expected,/^[0-9a-f]{64}$/);assert.equal(build.browser_started,false);assert.equal(build.npm_install,false);assert.equal(build.strict_templates,true);assert.equal(build.skip_lib_check,false);
const image=verifyWindowInstalledArtifact(tarball,consumer,expected);assert.deepEqual(image,build.installed_image);
assert.equal(hash(readFileSync(join(root,'fixtures/dialog-padding/fixture.ts'))),build.fixture_sha256);assert.equal(hash(readFileSync(join(root,'fixtures/dialog-padding/theme.scss'))),build.theme_source_sha256);
for(const [name,key] of [['app.js','app_js_sha256'],['fixture.css','theme_css_file_sha256'],['index.html','index_html_sha256']])assert.equal(hash(readFileSync(join(dist,name))),build[key],'changed built fixture '+name);
const ts=require('typescript');assert.equal(ts.version,'6.0.3');const witnesses=inspectDialogPaddingSources({typescript:ts,nodeModules:join(consumer,'node_modules'),packedRoot:join(consumer,'node_modules/@ngx-compat/material-legacy'),themeCss:readFileSync(join(dist,'fixture.css'),'utf8')});assert.deepEqual(witnesses,build.source_witnesses);
const direct=compileTaggedDialogPadding({sass:require('sass'),tagTar,packedTar:tarball,expectedPackedSha:expected,nodeModules:join(consumer,'node_modules')});assert.equal(direct.reference_sha256,build.tagged_reference.reference_sha256);assert.equal(direct.candidate_sha256,build.tagged_reference.candidate_sha256);assert.equal(build.wrong_css_mutant_rejected,true);
const outcome=await withChromium(dist,async({evaluate,browser})=>{
 let ready=false;for(let i=0;i<100;i++){ready=await evaluate('!!window.dialogPaddingFixture || !!window.dialogPaddingError');if(ready)break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,'dialog fixture never initialized');const error=await evaluate('window.dialogPaddingError || null');assert.equal(error,null);
 let found=false;for(let i=0;i<100;i++){found=await evaluate("document.querySelectorAll('.cdk-overlay-pane.dp-current-baseline,.cdk-overlay-pane.dp-current-optin,.cdk-overlay-pane.dp-legacy-baseline,.cdk-overlay-pane.dp-legacy-optin').length===4");if(found)break;await new Promise(r=>setTimeout(r,100));}assert.ok(found,'missing actual dialog overlays');
 const settled=await settleOwnedStyleFrame(evaluate),positive=await evaluate(DIALOG_PADDING_OBSERVE);
 await evaluate(`(() => {const style=document.createElement('style');style.id='dialog-padding-negative';style.textContent=${JSON.stringify(WRONG_VALUE_CSS)};document.head.appendChild(style);})()`);
 const negative=await evaluate(DIALOG_PADDING_OBSERVE);await evaluate("document.getElementById('dialog-padding-negative').remove()");
 const recovery=await evaluate(DIALOG_PADDING_OBSERVE),assessment=assessDialogPadding(positive,negative);assessment.recovery=JSON.stringify(recovery)===JSON.stringify(positive);assessment.pass=assessment.pass&&assessment.recovery;
 return {browser,settled,positive,negative,recovery,assessment};
},{debugPort:0,requireAnnouncedEndpoint:true});
const result={schema_version:1,status:outcome.assessment.pass?'pass':'fail',artifact_sha256:expected,peer_material:'22.1.7',source_kind:'packed',tagged_css_sha256:direct.reference_sha256,build_report_sha256:hash(readFileSync(resolve(buildArg))),...outcome,scope:'Actual dialog/input padding and margins in four body overlays only; not native M3 theming of legacy controls, full browser matrix or release admission.'};
writeFileSync(resolve(outArg),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,assessment:result.assessment}));if(!outcome.assessment.pass)process.exitCode=1;
