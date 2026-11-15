/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,rmSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {inspectA11yPlatformInstalledMinimum} from '../../scripts/a11y-platform-installed-minimum-cdee.mjs';
import {buildFocusMonitorCdee} from '../../scripts/focus-monitor-cdee-source-successor.mjs';
import {buildPlatformCdee} from '../../scripts/platform-cdee-source-successor.mjs';
import {buildA11yPlatformRolesCdee} from '../../scripts/a11y-platform-roles-cdee-source-successor.mjs';
import {buildA11yUnchangedCallersCdee} from '../../scripts/a11y-unchanged-callers-cdee-source-successor.mjs';
import {buildRadioSnackUnchangedCdee} from '../../scripts/radio-snack-unchanged-cdee-source-successor.mjs';
const identity=inspectA11yPlatformInstalledMinimum();assert.deepEqual(identity,JSON.parse(readFileSync('compatibility/rc/a11y-platform-installed-minimum-cdee-v1.json')));assert.equal(identity.installed_cdk,'22.1.7');assert.equal(identity.installed_member_count,127);
const directory=mkdtempSync(join(tmpdir(),'a11y-git-version-')),old=process.env.PATH;
try {const executable=join(directory,'git');writeFileSync(executable,"#!/bin/sh\nprintf 'git version 2.54.0\\n'\n");chmodSync(executable,0o755);process.env.PATH=directory;
 for(const build of [buildFocusMonitorCdee,buildPlatformCdee,buildA11yPlatformRolesCdee,buildA11yUnchangedCallersCdee,buildRadioSnackUnchangedCdee]){let reads=0;assert.throws(()=>build({root:process.cwd(),read:()=>{reads++;throw Error('unexpected source read');}}),/requires pinned Git 2\.55\.0/);assert.equal(reads,0);}
}finally{process.env.PATH=old;rmSync(directory,{recursive:true,force:true});}
console.log(JSON.stringify({installed_cdk:'22.1.7',members:identity.installed_member_count,wrong_git_rejected_before_source_reads:5,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
