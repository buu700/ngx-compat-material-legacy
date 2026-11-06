/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Reject redirected or changed run inputs before extraction. */
import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{lstatSync,readFileSync,realpathSync}from'node:fs';import{dirname,isAbsolute,join,resolve}from'node:path';
export function densityRunArtifact(manifestPath,expectedLine){
 assert.equal(lstatSync(manifestPath).isSymbolicLink(),false);assert.ok(lstatSync(manifestPath).isFile());const runPath=realpathSync(manifestPath),run=JSON.parse(readFileSync(runPath)),dir=dirname(runPath);assert.equal(run.schema_version,1);assert.equal(run.stage,'draft');assert.notEqual(run.template,true);assert.notEqual(run.purpose,'release');assert.equal(run.source.line,expectedLine);const artifacts=run.artifacts.filter(x=>x.id==='library');assert.equal(artifacts.length,1);const a=artifacts[0];assert.equal(typeof a.path,'string');assert.ok(a.path&&!isAbsolute(a.path)&&!a.path.includes('\\')&&a.path.split('/').every(x=>x&&x!=='.'&&x!=='..'));let path=dir;for(const part of a.path.split('/')){path=join(path,part);assert.equal(lstatSync(path).isSymbolicLink(),false)}assert.ok(lstatSync(path).isFile());const bytes=readFileSync(path);assert.equal(bytes.length,a.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.equal(realpathSync(path),resolve(path));return {run,artifact:a,archive:path};
}
