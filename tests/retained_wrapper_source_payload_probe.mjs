/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {sassWrapperNoticeMetadata} from '../scripts/sass-wrapper-notice-metadata.mjs';
import {historicalChipWrapperMetadata} from '../scripts/historical-chip-wrapper-metadata.mjs';
import {dialogTitleReaderSubject} from '../scripts/dialog-title-source-context.mjs';
import {retainedCurrentContextIdentity} from '../scripts/retained-current-context-identity.mjs';

const kind=process.argv[2],root=process.cwd(),read=path=>readFileSync(root+'/'+path),hash=raw=>createHash('sha256').update(raw).digest('hex');
assert.ok(['sass','chip','chip-default'].includes(kind),'unknown wrapper source family');
const packetPath=kind==='sass'?'compatibility/rc/sass-wrapper-notice-ledger-successor.json':'compatibility/rc/historical-chip-source-wrapper-ledger-successor.json';
const packet=JSON.parse(read(packetPath));
let source,context;
if(kind==='sass')source=sassWrapperNoticeMetadata({root,read});
else{
  const reader=dialogTitleReaderSubject({root,read});
  if(kind==='chip-default'){
    assert.throws(()=>reader.withHistoricalToolMetadata(metadata=>historicalChipWrapperMetadata({root,read:metadata,line:'main'})),/changed historical wrapper metadata subject projects\/ngx-material-legacy\/legacy-chips\/chip-list\.spec\.ts/);
    console.log(JSON.stringify({result:'pass',default_historical_source_stays_strict:true,admission_granted:false}));
    process.exit(0);
  }
  context=retainedCurrentContextIdentity({root,read});
  source=reader.withHistoricalToolMetadata(metadata=>historicalChipWrapperMetadata({root,read:metadata,line:'main',currentSourceContext:context}));
}
assert.equal(hash(source.before),packet.before.sha256);assert.deepEqual(source.entries,packet.entries);
for(const report of source.reports){
  const entry=packet.entries.find(row=>row.sha===report.sha);assert.ok(entry);
  assert.deepEqual(report.ref,entry.current_review);assert.equal(hash(report.raw),report.ref.sha256);
}
let changedProducts=0;
if(context){
  const expected=packet.qualification_members.map(ref=>{
    if(!ref.path.startsWith('projects/ngx-material-legacy/'))return ref;
    const selected=context.resolveReference(ref);assert.equal(selected.kind,'current');
    if(ref.sha256!==selected.reference.sha256)changedProducts++;
    return selected.reference;
  });
  assert.deepEqual(source.bound,expected);assert.equal(changedProducts,1);
  const spec=source.bound.find(ref=>ref.path==='projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts');
  assert.equal(spec.sha256,hash(read(spec.path)));
}
source.assertCurrent();
assert.equal(source.current_native_artifact_floor_or_G11_credit,false);
console.log(JSON.stringify({result:'pass',family:kind,bound:source.bound.length,entries:source.entries.length,reports:source.reports.length,changed_product_descriptors:changedProducts,original_entry_and_report_bytes_preserved:true,current_source_guards_executed:true,admission_granted:false}));
