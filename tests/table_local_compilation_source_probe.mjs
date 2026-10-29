/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite source, compiler-receipt and original-patch rejection controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {TABLE_LOCAL_COMPILATION_PREFIX as PREFIX,reviewTableLocalCompilationSource,verifyTableLocalCompilationOriginal,verifyTableLocalCompilationCompiler,inspectTableLocalCompilationOwnedSource} from '../scripts/upstream-table-local-compilation-source.mjs';

const root=process.cwd(),cache=new Map(),read=path=>{
  if(!cache.has(path))cache.set(path,readFileSync(join(root,path)));return cache.get(path);
};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const original=JSON.parse(gunzipSync(read(PREFIX+'originals.json.gz')));
const census=JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));
const compiler=JSON.parse(read(PREFIX+'compiler.json')),controls=JSON.parse(read(PREFIX+'compiler-controls.json'));
const rowPath='projects/ngx-material-legacy/legacy-table/row.ts',tablePath='projects/ngx-material-legacy/legacy-table/table.ts',modulePath='projects/ngx-material-legacy/legacy-table/table-module.ts';
const row=read(rowPath).toString(),table=read(tablePath).toString(),moduleBody=read(modulePath).toString(),tagged=original.tagged_reference.members[0].body;
const reject=fn=>assert.throws(fn,error=>error?.code==='ERR_ASSERTION');
let originalFaults=0,compilerFaults=0,metadataFaults=0,coldFaults=0,lateFaults=0;
function originalFault(change){const data=structuredClone(original);change(data);reject(()=>verifyTableLocalCompilationOriginal(data,census));originalFaults++;}
assert.equal(verifyTableLocalCompilationOriginal(original,census).hunk_reviews.length,7);
originalFault(d=>d.sections.pop());
originalFault(d=>d.complete_changed_files.pop());
originalFault(d=>d.sections[0].hunks.splice(1,1));
originalFault(d=>d.sections[1].after.body+='\n');
originalFault(d=>{const h=d.sections[0].hunks[0];h.text=h.text.replace('CDK_ROW_TEMPLATE','FOREIGN_TEMPLATE');h.sha256=hash(h.text);});
originalFault(d=>d.original_commit.raw=d.original_commit.raw.replace('resolve local','resolve foreign'));
originalFault(d=>d.tagged_reference.members[0].blob=d.sections[0].before.blob);
originalFault(d=>d.tree_objects.pop());
originalFault(d=>d.capture_policy.upstream_code_executed=true);

const compilerFacts=verifyTableLocalCompilationCompiler(compiler,controls,row,original);
assert.equal(compilerFacts.actual_small_compiler_cells,6);assert.equal(compilerFacts.original_failure_reproduced_at_minimum,false);
function compilerFault(change){const a=structuredClone(compiler),b=structuredClone(controls);change(a,b);reject(()=>verifyTableLocalCompilationCompiler(a,b,row,original));compilerFaults++;}
compilerFault(a=>a.cells[0].exit_code=1);
compilerFault(a=>a.cells[0].config.angularCompilerOptions.compilationMode='full');
compilerFault(a=>a.cells[0].config.angularCompilerOptions.strictTemplates=false);
compilerFault(a=>a.cells[0].fixture=a.cells[0].fixture.replace("'class': 'mat-row'","'class': 'mat-mdc-row'"));
compilerFault(a=>a.cells[0].outputs.pop());
compilerFault(a=>a.cells[0].outputs.find(o=>o.path==='out/rows.js').body+='\n');
compilerFault(a=>{
  const output=a.cells[1].outputs.find(o=>o.path==='out/rows.js');
  output.body=output.body.replaceAll('classAttribute: "mat-header-row"','classAttribute: "mat-mdc-header-row"');output.sha256=hash(output.body);output.bytes=Buffer.byteLength(output.body);
});
compilerFault(a=>{
  const output=a.cells[2].outputs.find(o=>o.path==='out/rows.js');
  output.body=output.body.replaceAll('[["cdkCellOutlet", ""]]','[["foreignOutlet", ""]]');output.sha256=hash(output.body);output.bytes=Buffer.byteLength(output.body);
});
compilerFault((a,b)=>b.cells[1].mode='partial');
compilerFault(a=>a.packages[3].version='22.1.7');

assert.equal(inspectTableLocalCompilationOwnedSource(row,table,moduleBody,tagged).native_row_groups_retained,3);
for(const [a,b,c]of [
  [row.replace("'class': 'mat-row'","'class': 'mat-mdc-row'"),table,moduleBody],
  [row.replace('useExisting: MatLegacyRow}','useExisting: CdkRow}'),table,moduleBody],
  [row.replace("exportAs: 'matRow'","exportAs: 'modernRow'"),table,moduleBody],
  [row,table.replace('legacyTableOutlet="empty"','legacyTableOutlet="data"'),moduleBody],
  [row,table.replace('<thead role="rowgroup">','<ng-container>'),moduleBody],
  [row,table,moduleBody.replace('imports: [CdkTableModule, MatCommonModule]','imports: [MatCommonModule]')],
]){assert.ok(a!==row||b!==table||c!==moduleBody,'metadata control changed no bytes');reject(()=>inspectTableLocalCompilationOwnedSource(a,b,c,tagged));metadataFaults++;}

const qualified=reviewTableLocalCompilationSource({root,read});qualified.assertCurrent();
assert.equal(qualified.report.proposed_final_disposition,'do-not-adopt');assert.equal(qualified.report.canonical_dispositions_changed,0);assert.equal(qualified.report.product_changes,0);
for(const path of [
  'scripts/upstream-table-local-compilation-source.mjs',PREFIX+'originals.json.gz',PREFIX+'current.json',PREFIX+'compiler.json',PREFIX+'compiler-controls.json',
  PREFIX+'compiler-probe.mjs',PREFIX+'compiler-controls.mjs',rowPath,tablePath,modulePath,
  'node_modules/@angular/cdk/types/table.d.ts','node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js',
  'compatibility/f10/disposition-ledger/ledger.json','scripts/upstream-source-contract-registry.mjs',
]){
  const bad=Buffer.concat([read(path),Buffer.from('\n')]);reject(()=>reviewTableLocalCompilationSource({root,read:p=>p===path?bad:read(p)}));coldFaults++;
}
for(const path of [rowPath,tablePath,PREFIX+'compiler.json','compatibility/f10/disposition-ledger/ledger.json']){
  let changed=false;const bad=Buffer.concat([read(path),Buffer.from('\n')]);
  const result=reviewTableLocalCompilationSource({root,read:p=>changed&&p===path?bad:read(p)});changed=true;reject(()=>result.assertCurrent());lateFaults++;
}
console.log(JSON.stringify({result:'pass',complete_original_hunks:7,small_compiler_cells_qualified:6,original_data_faults_rejected:originalFaults,compiler_receipt_faults_rejected:compilerFaults,owned_metadata_faults_rejected:metadataFaults,cold_source_faults_rejected:coldFaults,late_source_faults_rejected:lateFaults,canonical_decisions_changed:0,product_changes:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}));
