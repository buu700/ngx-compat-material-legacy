# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Apply complete literal current-tool edits and save exact review data."""
from pathlib import Path
import json
r=Path.cwd();log=[]
def edit(path,before,after):
 p=r/path;text=p.read_text();assert text.count(before)==1,(path,before[:100]);p.write_text(text.replace(before,after));log.append({'path':path,'before':before,'after':after})
p='scripts/legacy-removal-owner-source.mjs'
edit(p,"import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';","import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';\nimport {tableLocalCompilationOwnerSourceSubject} from './table-local-compilation-owner-source.mjs';")
edit(p," const bound=new Map(),member=ref=>{const raw=read(ref.path);assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),ref.sha256,'changed legacy owner code '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(readEvidenceMember(root,ref.path)),'nonphysical legacy owner code '+ref.path);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;};", " const successor=tableLocalCompilationOwnerSourceSubject({root,read});\n const bound=new Map(successor.bound.map(ref=>[ref.path,{...ref}])),member=ref=>{const raw=read(ref.path),owned=successor.ownsReference(ref),qualified=owned?successor.qualifyReference(ref):ref,comparison=owned?successor.comparisonBytes(ref):raw;assert.ok(Buffer.isBuffer(raw));assert.equal(hash(comparison),ref.sha256,'changed legacy owner code '+ref.path);if(ref.bytes!==undefined)assert.equal(comparison.length,ref.bytes);assert.equal(hash(raw),qualified.sha256,'changed actual legacy owner successor '+ref.path);assert.ok(raw.equals(readEvidenceMember(root,ref.path)),'nonphysical legacy owner code '+ref.path);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return comparison;};")
edit(p,"before=gunzipSync(member(packet.registry_before_image)),after=gunzipSync(member(packet.registry_after_image)),raw=read(path);", "before=gunzipSync(member(packet.registry_before_image)),after=gunzipSync(member(packet.registry_after_image)),physical=read(path),raw=successor.predecessorData(path,physical);")
edit(p,"assert.ok(raw.equals(readEvidenceMember(root,path)),'nonphysical registry comparison source');", "assert.ok(physical.equals(readEvidenceMember(root,path)),'nonphysical registry comparison source');")
edit(p,"const reference={path,sha256:hash(raw),bytes:raw.length},prior=bound.get(path);", "const reference={path,sha256:hash(physical),bytes:physical.length},prior=bound.get(path);")
edit(p,"const qualifyRegistry=ref=>{const subject=registrySubject()", "const qualifyRegistry=value=>{const ref=successor.predecessorReference(value),subject=registrySubject()")
edit(p,"const qualifyReference=ref=>{const row=transitions.get(ref.path);", "const qualifyReference=value=>{const ref=successor.predecessorReference(value),row=transitions.get(ref.path);")
edit(p,"return {...ref,sha256:row.after.sha256,bytes:row.after.bytes};};", "return successor.qualifyReference({...ref,sha256:row.after.sha256,bytes:row.after.bytes});};")
edit(p,"const comparisonBytes=ref=>{const row=transitions.get(ref.path);", "const comparisonBytes=ref=>{if(successor.ownsReference(ref))return successor.comparisonBytes(ref);const row=transitions.get(ref.path);")
edit(p,"const assertCurrent=()=>{for(const ref of bound.values())", "const assertCurrent=()=>{successor.assertCurrent();for(const ref of bound.values())")
edit(p,"qualifyReference,comparisonBytes,registryComparisonBytes,assertCurrent,old_program_executed:false", "qualifyReference,comparisonBytes,registryComparisonBytes,predecessorData:successor.predecessorData,assertCurrent,old_program_executed:false")
p='scripts/legacy-removal-canonical-stage.mjs'
edit(p," assert.ok(actualRegistry.equals(registryBefore)||actualRegistry.equals(registryAfter),'unqualified legacy source registry');\n const applied=actualLedger.equals(stage.after),registryApplied=actualRegistry.equals(registryAfter);", " const comparisonRegistry=tools.predecessorData(LEGACY_REMOVAL_REGISTRY,actualRegistry);\n assert.ok(comparisonRegistry.equals(registryBefore)||comparisonRegistry.equals(registryAfter),'unqualified legacy source registry');\n const applied=actualLedger.equals(stage.after),registryApplied=comparisonRegistry.equals(registryAfter);")
p='scripts/packed-upstream-ledger-epoch.mjs'
edit(p,"import {legacyRemovalOwnerContext} from './legacy-removal-canonical-stage.mjs';", "import {legacyRemovalOwnerContext} from './legacy-removal-canonical-stage.mjs';\nimport {tableLocalCompilationOwnerContext} from './table-local-compilation-canonical-stage.mjs';")
edit(p,"export function preparePackedUpstreamLedger({root=process.cwd(),read=disk(root)}={}){", "function prepareBeforeTableLocalCompilationLedger({root=process.cwd(),read=disk(root)}={}){")
edit(p,"export function packedUpstreamLedgerEpoch({root=process.cwd(),read=disk(root)}={}){", "function epochBeforeTableLocalCompilationLedger({root=process.cwd(),read=disk(root)}={}){")
edit(p,"export function qualifyCanonicalToolReference({root=process.cwd(),read=disk(root),prior}={}){", "function qualifyBeforeTableLocalCompilationToolReference({root=process.cwd(),read=disk(root),prior}={}){")
# Append separately reviewed public wrappers; complete original bodies stay present.
old=(r/p).read_text();append='''

/** Exact terminal table source decision; every prior current source stage runs. */
export function preparePackedUpstreamLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.preparePackedUpstreamLedger({root,read});
 const table=tableLocalCompilationOwnerContext({root,read});
 const prior=prepareBeforeTableLocalCompilationLedger({root,read:table.metadataRead});return table.wrapPrepared(prior);
}
export function packedUpstreamLedgerEpoch({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.packedUpstreamLedgerEpoch({root,read});
 const table=tableLocalCompilationOwnerContext({root,read}),prior=epochBeforeTableLocalCompilationLedger({root,read:table.metadataRead});
 const assertCurrent=()=>{table.assertCurrent();prior.assertCurrent();table.assertCurrent();};
 const historical=path=>{if(path!==LEDGER)return read(path);assertCurrent();const raw=prior.read(path);assertCurrent();return raw;};
 readers.set(historical,{root:resolve(root),raw:read});assertCurrent();
 return {...prior,read:historical,raw:read,assertCurrent,individual_decisions_applied:prior.individual_decisions_applied+(table.applied?1:0),table_local_compilation_source_decisions_applied:table.applied?1:0,current_tool_bytes_exposed_without_projection:true,current_native_packed_or_floor_or_g11_credit:false};
}
export function qualifyCanonicalToolReference({root=process.cwd(),read=disk(root),prior}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.qualifyCanonicalToolReference({root,read,prior});
 let role;try{role=read(METADATA_ROLE);}catch{/* Public readers have no comparison capability. */}
 if(role===metadataToken)return qualifyBeforeTableLocalCompilationToolReference({root,read,prior});
 const table=tableLocalCompilationOwnerContext({root,read}),result=qualifyBeforeTableLocalCompilationToolReference({root,read:table.metadataRead,prior});if(!result)return result;
 const bound=new Map(result.bound.map(ref=>[ref.path,{...ref}]));for(const ref of table.bound)bound.set(ref.path,{...ref});
 const raw=read(result.reference.path),reference={...result.reference,sha256:hash(raw),bytes:raw.length};
 const assertCurrent=()=>{table.assertCurrent();result.assertCurrent();table.assertCurrent();};assertCurrent();
 return {...result,reference,bound:[...bound.values()],assertCurrent,table_local_compilation_source_scope:true};
}
'''
edit(p,old,old+append)
p='scripts/table-local-compilation-canonical-stage.mjs'
edit(p,"import admission from './upstream-table-local-compilation-admission.cjs';", "import admission from './upstream-table-local-compilation-admission.cjs';\nimport {tableLocalCompilationOwnerSourceSubject} from './table-local-compilation-owner-source.mjs';\nimport {readFileSync} from 'node:fs';\nimport {join} from 'node:path';\nimport {gunzipSync} from 'node:zlib';\nimport {readEvidenceMember} from './upstream-packed-run-evidence.mjs';")
old=(r/p).read_text();append='''

/** Actual current terminal stage; no historical program or public code projection. */
export function tableLocalCompilationOwnerContext({root,read=path=>readFileSync(join(root,path))}={}){
 const tools=tableLocalCompilationOwnerSourceSubject({root,read}),packet=tools.packet;
 const bound=new Map(tools.bound.map(ref=>[ref.path,{...ref}])),member=ref=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed table canonical input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;};
 const proposal=JSON.parse(member(packet.proposal)),body=JSON.parse(member(proposal.review)),before=gunzipSync(member(packet.ledger_before_image)),registryBefore=gunzipSync(member(packet.registry_before_image));
 const stage=applyTableLocalCompilationCanonicalStage({before,body}),registryAfter=tableLocalCompilationRegistrySuccessor(registryBefore);
 assert.equal(hash(stage.before),proposal.before.sha256);assert.equal(hash(stage.after),proposal.after.sha256);assert.equal(hash(registryAfter),proposal.registry_after.sha256);
 assert.ok(gunzipSync(member(packet.ledger_after_image)).equals(stage.after));assert.ok(gunzipSync(member(packet.registry_after_image)).equals(registryAfter));
 const actualLedger=read(TABLE_LOCAL_COMPILATION_LEDGER),actualRegistry=read(TABLE_LOCAL_COMPILATION_REGISTRY),registryRef=tools.qualifyReference(proposal.registry_before);
 assert.ok(actualRegistry.equals(readEvidenceMember(root,TABLE_LOCAL_COMPILATION_REGISTRY)),'nonphysical table registry');assert.equal(hash(actualRegistry),registryRef.sha256);
 const applied=actualLedger.equals(stage.after),registryApplied=actualRegistry.equals(registryAfter);if(applied)assert.ok(registryApplied,'table ledger requires exact registry successor');
 for(const[path,raw]of [[TABLE_LOCAL_COMPILATION_LEDGER,actualLedger],[TABLE_LOCAL_COMPILATION_REGISTRY,actualRegistry]])bound.set(path,{path,sha256:hash(raw),bytes:raw.length});
 const source=admission.inspectCanonicalSource({root,read,entries:stage.entries,body});for(const ref of source.bound)bound.set(ref.path,{...ref});
 const assertCurrent=()=>{tools.assertCurrent();source.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late table canonical input '+ref.path);assert.equal(raw.length,ref.bytes);}};
 const metadataRead=path=>{if(path!==TABLE_LOCAL_COMPILATION_LEDGER)return read(path);const raw=read(path);assert.ok(raw.equals(actualLedger),'late table ledger');return applied?Buffer.from(before):raw;};
 const wrapPrepared=prior=>{
  assertCurrent();assert.ok(prior.canonical_after.equals(before),'table stage does not succeed complete prior owner');const currentBound=new Map(prior.bound);for(const ref of bound.values())currentBound.set(ref.path,ref.sha256);
  const assertPrior=()=>{assertCurrent();prior.assertCurrent?.();prior.prior_metadata_assert_current?.();assertCurrent();};
  const native=prior.native_spec_source,nativeBound=native.bound.map(ref=>({...ref,sha256:currentBound.get(ref.path)??ref.sha256,bytes:read(ref.path).length}));
  assertPrior();return {...prior,canonical_after:Buffer.from(stage.after),bound:currentBound,table_local_compilation_stage:{...stage,assertCurrent:assertPrior,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},native_spec_source:{...native,bound:nativeBound,assertCurrent:()=>{assertCurrent();native.assertCurrent();assertCurrent();}},assertCurrent:assertPrior,prior_metadata_assert_current:assertPrior};
 };
 assertCurrent();return {applied,registryApplied,before:Buffer.from(before),after:Buffer.from(stage.after),registryBefore:Buffer.from(registryBefore),registryAfter:Buffer.from(registryAfter),metadataRead,wrapPrepared,bound:structuredClone([...bound.values()]),assertCurrent,source_facts:structuredClone(source.facts),source_scope_only:true,current_native_packed_browser_floor_or_full_audit_qualified:false};
}
'''
edit(p,old,old+append)
(r/'compatibility/rc/21x-table-local-compilation-admission-owner-code-edits.json').write_text(json.dumps(log,indent=2)+'\n')
print('literal code edits',len(log))
