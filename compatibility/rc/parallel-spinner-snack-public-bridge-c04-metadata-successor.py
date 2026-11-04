# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Reconstruct authenticated v1 tool data; never execute it or return it as current."""
import copy,difflib,gzip,hashlib,json,subprocess,os
from pathlib import Path
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/parallel-spinner-snack-public-bridge-c04-'
frozen=json.loads((ROOT/(P+'frozen-inputs-v1.json')).read_bytes());SHA=lambda b:hashlib.sha256(b).hexdigest()
def replace(s,before,after):
 assert s.count(before)==1,(before[:100],s.count(before));return s.replace(before,after)
common_path='scripts/sass-spinner-snack-c04-source.mjs';measure_path='scripts/measure-sass-inspection-scope.mjs';mf_path='compatibility/rc/historical-contract-repair-reader-inputs.json'
common=(ROOT/common_path).read_text();measure=(ROOT/measure_path).read_text();a=measure.index('/** Snapshot JSON metadata through descriptors');b=measure.index('/** Overlay only the two qualified digest/size fields;',a);capture=measure[a:b].rstrip('\n')+'\n'
old_common=replace(common,"export {captureSpinnerSnackC04Metadata} from './measure-sass-inspection-scope.mjs';\n",capture)
old_common=replace(old_common,'currentSpinnerSnackSourceSummary,captureSpinnerSnackC04Metadata}', 'currentSpinnerSnackSourceSummary}')
old_common=replace(old_common,'  const capture=()=>captureSpinnerSnackC04Metadata(ref);',"  const capture=()=>{const d=Object.getOwnPropertyDescriptors(ref);for(const field of Object.values(d))assert.ok(Object.hasOwn(field,'value'),'C04 reference accessor');return structuredClone(Object.fromEntries(Object.entries(d).map(([key,value])=>[key,value.value])));};")
old_common=replace(old_common,"  assert.equal(typeof kind,'string');const currentSnapshot=captureSpinnerSnackC04Metadata(current);\n",'')
old_common=replace(old_common,"assert.deepEqual(currentSnapshot,expected,'C04 report changed beyond the exact spinner/snack source successor: '+kind);assertCurrent();assert.deepEqual(captureSpinnerSnackC04Metadata(current),currentSnapshot,'C04 current report changed during final source guards');", "assert.deepEqual(current,expected,'C04 report changed beyond the exact spinner/snack source successor: '+kind);assertCurrent();")
needle=" const liveHistorical=historical,liveCurrent=current;historical=captureSpinnerSnackC04Metadata(historical);current=captureSpinnerSnackC04Metadata(current);\n"
assert old_common.count(needle)==2;old_common=old_common.replace(needle,'')
for typ in ['retention','token-placement']:
 old_common=replace(old_common,"assert.deepEqual(captureSpinnerSnackC04Metadata(liveHistorical),historical,'historical "+typ+" input changed during final guards');assert.deepEqual(captureSpinnerSnackC04Metadata(liveCurrent),current,'current "+typ+" input changed during final guards');",'')
old_common=replace(old_common,'const bound=union(structuredClone([...bridge.bound,...tools.bound]),structuredClone(reportRefs))','const bound=union([...bridge.bound,...tools.bound],reportRefs)')
old_common=replace(old_common," const publicBridge={...structuredClone(Object.fromEntries(Object.entries(bridge).filter(([,value])=>typeof value!=='function'))),qualify:bridge.qualify,assertCurrent:bridge.assertCurrent,assertHistoricalSource:bridge.assertHistoricalSource};\n",'')
old_common=replace(old_common,'const result={bridge:publicBridge,qualify','const result={bridge,qualify')
old_measure=measure[:a]+measure[b:]
old_measure=replace(old_measure,' const capture=()=>captureSpinnerSnackC04Metadata(incoming);'," const capture=()=>{const d=Object.getOwnPropertyDescriptors(incoming);for(const field of Object.values(d))assert.ok(Object.hasOwn(field,'value'),'source metadata accessor');return structuredClone(Object.fromEntries(Object.entries(d).map(([key,value])=>[key,value.value])));};")
old_measure=replace(old_measure,needle,'')
old_measure=replace(old_measure," const summary=captureSpinnerSnackC04Metadata(currentSpinnerSnackSourceSummary(bridge));\n bridge={qualify:bridge.qualify,assertCurrent:bridge.assertCurrent,transitions:summary.sources,bound:summary.guard_inputs};\n",'')
old_measure=replace(old_measure,'expected.current_public_bridge=summary;','expected.current_public_bridge=currentSpinnerSnackSourceSummary(bridge);')
old_measure=replace(old_measure,"assert.deepEqual(captureSpinnerSnackC04Metadata(liveHistorical),historical,'historical scope changed during final source guards');assert.deepEqual(captureSpinnerSnackC04Metadata(liveCurrent),current,'current scope changed during final source guards');",'')
old={common_path:old_common.encode(),measure_path:old_measure.encode()}
for p,raw in old.items():
 ref=next(r for r in frozen['branches']['21.x']['physical_inputs'] if r['path']==p)
 # Formatting is part of the immutable identity; no relaxed source comparison.
 assert SHA(raw)==ref['sha256'],(p,SHA(raw),ref['sha256'])
 assert len(raw)==ref['bytes']
# These are the actual compiler program builder/collector and actual measurement entry.
assert old_measure[old_measure.index('function scopeProgram'):old_measure.index('/** Overlay')]==measure[measure.index('function scopeProgram'):a]
assert old_measure[old_measure.index('export function measureSassInspectionScope'):]==measure[measure.index('export function measureSassInspectionScope'):]
def edits(before,after):
 aa,bb=before.decode().splitlines(keepends=True),after.decode().splitlines(keepends=True);text=before.decode();result=[]
 for group in reversed(list(difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(3))):
  left=''.join(aa[group[0][1]:group[-1][2]]);right=''.join(bb[group[0][3]:group[-1][4]]);assert text.count(left)==1;text=text.replace(left,right);result.append({'before':left,'after':right})
 assert text.encode()==after;return result
def original(root,parent,path):
 env=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
 for k in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(k,None)
 return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=root,env=env)
branches={};old_mf={}
for line,root in [('21.x',ROOT),('main',MAIN)]:
 data=json.loads((root/mf_path).read_bytes());previous=copy.deepcopy(data)
 row=next(r for r in previous['tool_transitions'] if r['path']==measure_path);baseline=original(root,row['source_parent'],measure_path)
 row['after']={'sha256':SHA(old[measure_path]),'bytes':len(old[measure_path])};row['literal_edits']=edits(baseline,old[measure_path])
 ref=next(r for r in previous['support_inputs'] if r['path']==common_path);ref.update(sha256=SHA(old[common_path]),bytes=len(old[common_path]))
 raw=(json.dumps(previous,indent=2)+'\n').encode();prior=next(r for r in frozen['branches'][line]['physical_inputs'] if r['path']==mf_path)
 assert SHA(raw)==prior['sha256'] and len(raw)==prior['bytes'],(line,SHA(raw),prior)
 old_mf[line]=raw
 branches[line]={'before_manifest':prior,'after_manifest':{'path':mf_path,'sha256':SHA((root/mf_path).read_bytes()),'bytes':len((root/mf_path).read_bytes())}}
for p in ['scripts/historical-contract-repair-readers.mjs','tests/historical_contract_repair_source.py']:
 text=(ROOT/p).read_text()
 for line in ['21.x','main']:
  text=replace(text,SHA(({'21.x':ROOT,'main':MAIN}[line]/mf_path).read_bytes()),SHA(old_mf[line]))
 old[p]=text.encode();ref=next(r for r in frozen['branches']['21.x']['physical_inputs'] if r['path']==p);assert SHA(old[p])==ref['sha256'] and len(old[p])==ref['bytes'],(p,SHA(old[p]),ref)
images=[{'path':p,'before_sha256':SHA(raw),'before_bytes':len(raw),'before_text':raw.decode(),'after_sha256':SHA((ROOT/p).read_bytes()),'after_bytes':len((ROOT/p).read_bytes()),'literal_edits':edits(raw,(ROOT/p).read_bytes())} for p,raw in old.items()]
out={'schema_version':1,'role':'Exact historical tool-only metadata hardening successor from authenticated frozen v1; old code is comparison data','prior_frozen_cut':{'path':P+'frozen-inputs-v1.json','sha256':SHA((ROOT/(P+'frozen-inputs-v1.json')).read_bytes())},'branches':branches,'images':images,'compiler_program_builder_collector_and_measurement_entry_exact':True,'sass_product_or_peer_bytes_changed':False,'old_code_executed':False,'old_product_bytes_exposed':False,'archived_reports_rewritten':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'}
raw=(json.dumps(out,indent=2)+'\n').encode()
for root in [ROOT,MAIN]:(root/(P+'metadata-successor-v2.json.gz')).write_bytes(gzip.compress(raw,mtime=0))
print('metadata-only successor',SHA(gzip.compress(raw,mtime=0)))
