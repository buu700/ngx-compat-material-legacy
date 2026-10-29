/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current main reader chain only; the remaining packed source guard must reject. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {autocompleteSelectionReaderSubject} from '../../scripts/autocomplete-selection-spec-subject.mjs';
import {inspectPackedProductSourceRepairs} from '../../scripts/snack-dom-source-context.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex');
assert.match(JSON.parse(readFileSync('projects/ngx-material-legacy/package.json')).version,/^22\./);
const started=performance.now(),read=p=>readFileSync(join(root,p)),reader=autocompleteSelectionReaderSubject({root,read});reader.assertCurrent();
let failure;
try{inspectPackedProductSourceRepairs({root});assert.fail('unintegrated packed source repair should still reject');}
catch(error){failure={message:error.message,stack_frames:error.stack?.split('\n').filter(s=>/^\s+at /.test(s)).slice(0,5)};}
assert.match(failure.message,/only exact title targets may compose with an earlier product repair/);
assert.ok(failure.stack_frames.some(frame=>frame.includes('packed-product-source-recovery.mjs')));
reader.assertCurrent();
const producer='compatibility/rc/historical-contract-repair-main-chain-verify.mjs';
const result={schema_version:1,line:'main',status:'current title/native-spec source readers accept exact tool and product successors; full packed source requalification remains pending',current_title_and_native_spec_SOURCE_reader_chain_accepted:true,current_reader_bindings:reader.bound.length,remaining_packed_source_rejection:failure,
 execution:{producer,sha256:hash(read(producer)),seconds:(performance.now()-started)/1000},
 native_tests_executed:false,packed_artifact_execution_performed:false,full_source_owner_integration_complete:false,canonical_dispositions_changed:0,g11_claim:'not-passed'};
const output='compatibility/rc/historical-contract-repair-main-chain-qualified.json';assert.equal(existsSync(join(root,output)),false);writeFileSync(join(root,output),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({line:'main',current_title_spec_source_chain:true,current_reader_bindings:result.current_reader_bindings,packed_source_epoch_complete:false,seconds:result.execution.seconds,remaining_rejection:failure.message.split('\n')[0]}));
