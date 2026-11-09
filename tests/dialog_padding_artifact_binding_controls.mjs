/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Build both archives first. Uses an isolated physical consumer and restores
 * test mutations; no successful browser invocation is permitted here.
 * node tests/dialog_padding_artifact_binding_controls.mjs <original.tgz> <alternate.tgz> <tag.tgz> <consumer> <original-build.json> <new-output-dir>
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyWindowInstalledArtifact} from '../scripts/csp-ssr-window-artifact-image.mjs';
import {compileTaggedDialogPadding} from '../scripts/dialog-padding-tagged-reference.mjs';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'package.json'));
const [a,b,tag,c,receipt,out,...extra]=process.argv.slice(2).map(value=>resolve(value));assert.ok(a&&b&&tag&&c&&receipt&&out&&!extra.length);
const hash=x=>createHash('sha256').update(x).digest('hex'), sha=hash(readFileSync(a)), alternate=hash(readFileSync(b));assert.notEqual(sha,alternate);
const image=verifyWindowInstalledArtifact(a,c,sha),altImage=verifyWindowInstalledArtifact(b,c,alternate);assert.equal(image.inventory_sha256,altImage.inventory_sha256);assert.equal(image.files,altImage.files);
assert.throws(()=>verifyWindowInstalledArtifact(b,c,sha),/wrong artifact bytes/);
assert.throws(()=>compileTaggedDialogPadding({sass:require('sass'),tagTar:tag,packedTar:b,expectedPackedSha:sha,nodeModules:join(c,'node_modules')}),/wrong packed archive/);
const probe=(archive,label,pattern)=>{const target=join(out,label+'.json');assert.ok(!existsSync(target));const r=spawnSync(process.execPath,[join(root,'scripts/check-dialog-padding-fixture.mjs'),archive,tag,c,receipt,target],{encoding:'utf8',timeout:30000});assert.notEqual(r.status,0,label);assert.match(r.stderr,pattern,label);assert.ok(!existsSync(target),label+' unexpectedly reached browser result');};
probe(b,'wrong-archive',/wrong artifact bytes/);
function mutate(path,body){const before=readFileSync(path);try{writeFileSync(path,Buffer.concat([before,Buffer.from('\n')]));body();}finally{writeFileSync(path,before);assert.equal(hash(readFileSync(path)),hash(before));}}
mutate(join(c,'node_modules/@ngx-compat/material-legacy/package.json'),()=>probe(a,'changed-installed-package',/installed package bytes mismatch/));
mutate(join(c,'dist/app.js'),()=>probe(a,'changed-served-app',/changed built fixture app.js/));
console.log(JSON.stringify({different_archive_same_image:true,files:image.files,wrong_archive_rejected:true,wrong_tagged_reference_archive_rejected:true,installed_drift_rejected:true,served_drift_rejected:true,browser_started:false}));
