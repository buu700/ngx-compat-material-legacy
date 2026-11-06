/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {join,resolve} from 'node:path';
const root=resolve(process.argv[2]);const {currentAuthoredRosterSourceSubject:make}=await import(root+'/scripts/current-authored-roster-source.mjs');const packet=JSON.parse(readFileSync(join(root,'compatibility/rc/parent-dialog-menu-snack-authored-use-successor-v3.json')));const line=process.argv[3],mode=process.argv[4],targets=[packet.branches[line].core_declarations.path,packet.branches[line].fixture_source_transition.path,'compatibility/rc/parent-dialog-menu-snack-authored-use-successor-v3.json','projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts'];
let changed=mode==='cold'?targets[2]:null;const read=p=>p===changed?Buffer.from('corrupt'):readFileSync(join(root,p));
if(mode==='cold'){assert.throws(()=>make({root,read}));}else{const result=make({root,read});for(const path of targets){changed=path;assert.throws(()=>result.assertCurrent(),undefined,path);}changed=null;result.assertCurrent();}console.log('PASS',line,mode);
