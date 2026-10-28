/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real historical CVA reconstruction, unchanged canonical bytes and current raw readers. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {packedUpstreamFocusMetadataEpoch} from '../scripts/packed-upstream-source-requalification.mjs';
import {PACKED_CVA_ROLE_INPUTS,preparePackedCvaSourceRequalification,packedCvaRoleHistoricalReader} from '../scripts/packed-cva-source-requalification.mjs';
import {DIALOG_TITLE_SOURCE_IMAGES,dialogTitleReaderSubject} from '../scripts/dialog-title-source-context.mjs';
import {dialogTitlePriorMetadataRead,inspectSnackCurrentDialogContracts,snackDomRawCurrentRead} from '../scripts/snack-dom-source-context.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=raw=>createHash('sha256').update(raw).digest('hex');
const disk=path=>readFileSync(join(root,path));let late=null;
const mutable=path=>path===late?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path);
const focus=packedUpstreamFocusMetadataEpoch({root,read:mutable});
assert.throws(()=>preparePackedCvaSourceRequalification({root,read:focus.read,historicalTitleMetadata:'true'}));
// Default current admission still rejects stale records. The metadata lane is explicit.
assert.throws(()=>preparePackedCvaSourceRequalification({root,read:focus.read}),error=>/original source judgments not preserved/.test(error.message));
const beforeCanonical=new Map(['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json','compatibility/f10/disposition-ledger/ledger.json'].map(path=>[path,disk(path)]));
const historical=packedCvaRoleHistoricalReader({root,read:focus.read});
assert.equal(historical.raw,focus.read);assert.equal(historical.members,3);assert.equal(historical.source_scope_only,true);
const inputs=JSON.parse(disk(PACKED_CVA_ROLE_INPUTS));assert.equal(inputs.selected.length,241);assert.equal(inputs.accessor_roles.length,6);
const roleFacts=JSON.parse(historical.read('compatibility/rc/packed-cva-current-public-roles.json'));assert.equal(roleFacts.changed_roles.length,68);assert.equal(roleFacts.detector_calls.length,2);assert.equal(roleFacts.accessor_provider_cases.length,6);
for(const ref of inputs.prior_ledgers)assert.equal(hash(historical.read(ref.path)),ref.sha256);
for(const image of DIALOG_TITLE_SOURCE_IMAGES){assert.equal(hash(historical.read(image.path)),image.after);assert.equal(hash(historical.raw(image.path)),image.after);}
const packet=JSON.parse(disk('compatibility/rc/dialog-title-current-source-reader-successors.json'));
const metadataFiles=['compatibility/f10/authored-use-reviews/packed-cva-current-source-boundaries.json','compatibility/rc/packed-cva-current-public-roles.json','compatibility/rc/packed-cva-current-source-requalification-proof.json',...inputs.prior_ledgers.map(ref=>ref.path)];
const guards=[...new Set([...DIALOG_TITLE_SOURCE_IMAGES.map(image=>image.path),'scripts/dialog-title-source-context.mjs','compatibility/rc/dialog-title-current-source-reader-successors.json',...packet.code_subjects.map(ref=>ref.path),...metadataFiles])];
let rejected=0;
for(const path of guards){late=path;assert.throws(()=>historical.read(metadataFiles[0]),undefined,path);rejected++;}late=null;
assert.equal(historical.read(DIALOG_TITLE_SOURCE_IMAGES[0].path).equals(disk(DIALOG_TITLE_SOURCE_IMAGES[0].path)),true);
// Metadata overlays may replace old records, but cannot override the two exact
// before-title images or redirect a current admission away from its raw source.
const overlay=dialogTitlePriorMetadataRead({root,read:mutable,metadataOverlay:path=>path==='diagnostic-record.json'?Buffer.from('{"historical":true}'):
 DIALOG_TITLE_SOURCE_IMAGES.some(image=>image.path===path)?Buffer.from('forged old product'):mutable(path)});
assert.equal(overlay('diagnostic-record.json').toString(),'{"historical":true}');
for(const image of DIALOG_TITLE_SOURCE_IMAGES)assert.equal(hash(overlay(image.path)),image.before);
const raw=snackDomRawCurrentRead({root,read:overlay});assert.equal(raw,mutable);
const current=inspectSnackCurrentDialogContracts({root,read:overlay});assert.equal(current.proposed_sources.size,49);
for(const image of DIALOG_TITLE_SOURCE_IMAGES)assert.equal(hash(current.proposed_sources.get(image.path)),image.after);
for(const [path,bytes]of beforeCanonical)assert.equal(disk(path).equals(bytes),true,'canonical metadata changed '+path);
const scope=dialogTitleReaderSubject({root,read:mutable,line:'21.x'});scope.assertCurrent();focus.assertCurrent();
const report={schema_version:1,line:'21.x',historical_CVA_reader_constructed:true,selected_roles:241,accessor_roles:6,original_ledger_images_verified:inputs.prior_ledgers.length,current_raw_title_images_verified:2,current_raw_dialog_graph_members:49,source_tool_and_applied_metadata_faults_rejected:rejected,default_current_mode_rejects_stale_source:true,metadata_mode_is_explicit:true,metadata_overlay_cannot_override_fixed_title_images:true,current_admission_unwraps_overlay_to_raw:true,canonical_metadata_and_SHA_ledger_unchanged:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
