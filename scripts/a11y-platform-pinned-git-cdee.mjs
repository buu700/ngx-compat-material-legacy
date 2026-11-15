/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Resolve once from the pinned environment PATH and reject a different Git. */
import assert from 'node:assert/strict';
import {accessSync,constants,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {delimiter,resolve} from 'node:path';
export function captureA11yPlatformGit(root) {
 let executable;
 for(const part of (process.env.PATH||'').split(delimiter)){
  if(!part)continue;
  try{const candidate=resolve(part,'git');accessSync(candidate,constants.X_OK);executable=realpathSync(candidate);break;}catch{}
 }
 assert.ok(executable,'Git missing from pinned PATH');
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null'};
 assert.equal(execFileSync(executable,['--version'],{cwd:root,env,encoding:'utf8'}).trim(),'git version 2.55.0','requires pinned Git 2.55.0');
 return args=>execFileSync(executable,['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:24*1024*1024});
}
