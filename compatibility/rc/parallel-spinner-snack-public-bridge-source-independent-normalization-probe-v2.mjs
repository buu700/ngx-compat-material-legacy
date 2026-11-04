import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(new URL('../..',import.meta.url).pathname),prefix='compatibility/rc/parallel-spinner-snack-public-bridge-source-independent-';
const sourcePath='compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs',packetPath='compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),ref=path=>{const raw=readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};};
const {normalizeSpinnerSnackBridgeReceiptUrl:normalize}=await import(pathToFileURL(join(root,sourcePath)));
const packet=JSON.parse(readFileSync(join(root,packetPath))),rows=[];
for(const [line,branch]of Object.entries(packet.branches)){
 const receipt=JSON.parse(readFileSync(join(root,branch.semantic_receipt.path))),origin=branch.captured_origin,canonical=[];
 assert.equal(origin,receipt.root);let virtual=0;
 for(const href of receipt.candidate.loaded_urls){const value=normalize(href,origin);if(value===null)virtual++;else canonical.push(value);}
 assert.equal(virtual,1);assert.equal(new Set(canonical).size,canonical.length);
 for(const path of canonical)assert.ok(branch.inputs.some(row=>row.path===path));
 const negatives=[
  ['wrong-protocol','https://example.test/projects/ngx-material-legacy/_index.scss'],
  ['foreign-host','file://foreign-host'+origin+'/projects/ngx-material-legacy/_index.scss'],
  ['query','file://'+origin+'/projects/ngx-material-legacy/_index.scss?old=1'],
  ['fragment','file://'+origin+'/projects/ngx-material-legacy/_index.scss#old'],
  ['foreign-origin','file:///foreign/projects/ngx-material-legacy/_index.scss'],
  ['prefix-lookalike','file://'+origin+'-other/projects/ngx-material-legacy/_index.scss'],
  ['origin-escape','file://'+origin+'/../projects/ngx-material-legacy/_index.scss'],
  ['unknown-package','file://'+origin+'/node_modules/@angular/core/_index.scss'],
  ['unapproved-source-root','file://'+origin+'/scripts/fake.scss'],
  ['non-sass','file://'+origin+'/node_modules/@angular/material/index.js'],
  ['encoded-slash','file://'+origin+'/projects%2Fngx-material-legacy/_index.scss'],
  ['encoded-null','file://'+origin+'/projects/ngx-material-legacy/invalid%00.scss'],
  ['empty-path-segment','file://'+origin+'/projects/ngx-material-legacy//invalid.scss'],
  ['relative-url','projects/ngx-material-legacy/_index.scss'],
 ];
 for(const[name,href]of negatives)assert.throws(()=>normalize(href,origin),undefined,name);
 assert.equal(normalize('file:///__nonexistent_captured_origin__/projects/ngx-material-legacy/_index.scss','/__nonexistent_captured_origin__'),'projects/ngx-material-legacy/_index.scss');
 rows.push({line,captured_urls:receipt.candidate.loaded_urls.length,canonical_current_paths:canonical.length,virtual_entries:virtual,
  unexpected_or_unbound_paths:0,negative_controls_rejected:negatives.map(([name])=>name),nonexistent_capture_origin_normalizes_without_filesystem:true});
}
const result={schema_version:1,status:'all-captured-urls-normalize-to-exact-approved-current-paths',source:ref(sourcePath),packet:ref(packetPath),rows,
 source_only:true,new_compiler_build_browser_owner_or_floor_execution:false,existing_edits:false};
const output=prefix+'normalization-result-v2.json';writeFileSync(join(root,output),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:ref(output),rows}));
