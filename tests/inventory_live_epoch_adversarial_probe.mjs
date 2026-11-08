/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readEvidenceMember} from '../scripts/upstream-packed-run-evidence.mjs';
import {prepareInventoryReferenceLiveSourceEpoch as make} from '../scripts/inventory-reference-live-source-epoch.mjs';
const root=process.cwd(),paths=['compatibility/f10/disposition-ledger/ledger.json','compatibility/rc/parent-main-dialog-hot-stream-ledger-v1.json','compatibility/rc/parent-main-95f2-source-exclusion-v2.json','compatibility/f10/disposition-ledger/evidence/95f2de4adae1811836c461e8bf4ffdcec2e81677-original-row.raw.json'];let bad=null;
const read=path=>path===bad?Buffer.from('corrupt'):readEvidenceMember(root,path),subject=make({root,read});assert.equal(subject.lineage.transitions,21);
for(const path of paths){bad=path;assert.throws(()=>subject.assertCurrent());assert.throws(()=>make({root,read}));bad=null;}
subject.assertCurrent();console.log(JSON.stringify({result:'pass',cold_late_callback:paths.length,recovery:true,g11_claim:'not-passed'}));
