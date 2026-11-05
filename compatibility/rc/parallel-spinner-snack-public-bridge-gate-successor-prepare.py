# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Prepare finite successor source as review data; never edit active shared files."""
from pathlib import Path
import hashlib,json,gzip,subprocess,os
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-'
MF='compatibility/rc/historical-contract-repair-reader-inputs.json';TEST='tests/test_historical_contract_repair_source.py'
SHA=lambda raw:hashlib.sha256(raw).hexdigest()
def replace(text,before,after):
 assert text.count(before)==1,(before[:80],text.count(before));return text.replace(before,after)
def original(root,parent,path):
 env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
 for name in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(name,None)
 return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=root,env=env)
commits={'21.x':subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','rev-parse','af07cb6311'],cwd=ROOT,text=True).strip(),'main':subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','rev-parse','99aa39254e'],cwd=MAIN,text=True).strip()}
archive={}
for line,root in [('21.x',ROOT),('main',MAIN)]:
 paths=[MF,'scripts/historical-contract-repair-readers.mjs','tests/historical_contract_repair_source.py']+([TEST]if line=='21.x'else[]);images=[]
 for path in paths:
  raw=original(root,commits[line],path);assert (root/path).read_bytes()==raw;images.append({'path':path,'sha256':SHA(raw),'bytes':len(raw),'body':raw.decode()})
 archive[line]={'source_parent':commits[line],'images':images}
raw=(json.dumps({'schema_version':1,'role':'Immutable C04 historical tool-only preimages; never execute as current','branches':archive},indent=2)+'\n').encode()
for root in [ROOT,MAIN]:(root/(P+'C04-before.json.gz')).write_bytes(gzip.compress(raw,mtime=0))
reader=(ROOT/'scripts/historical-contract-repair-readers.mjs').read_text()
reader=replace(reader,"const intermediate=new Map(),sourceLanes=data.extension_kind==='packed-owner-source-lanes',c04=data.extension_kind==='spinner-snack-c04-source';","const intermediate=new Map(),sourceLanes=data.extension_kind==='packed-owner-source-lanes',c04=data.extension_kind==='spinner-snack-c04-source',gate=data.gate_tool_successor;\n if(gate)assert.equal(c04,true);")
reader=replace(reader,"assert.deepEqual(data.tool_transitions.slice(count).map(row=>row.path),scope.added_tool_paths);\n  for(const row of data.tool_transitions.slice(count))assert.equal(row.source_parent,ref.source_parent);", "const end=count+scope.added_tool_paths.length;assert.deepEqual(data.tool_transitions.slice(count,end).map(row=>row.path),scope.added_tool_paths);\n  for(const row of data.tool_transitions.slice(count,end))assert.equal(row.source_parent,ref.source_parent);")
reader=replace(reader,"['scripts/sass-spinner-snack-c04-source.mjs','scripts/sass-spinner-snack-bridge-contract.mjs']);for(const input of data.support_inputs)","['scripts/sass-spinner-snack-c04-source.mjs','scripts/sass-spinner-snack-bridge-contract.mjs',...(gate?['scripts/sass-spinner-snack-gate-integration.mjs','scripts/sass_spinner_snack_gate_integration.py']:[])]);for(const input of data.support_inputs)")
gate_js=''' if(gate){
  const pin=GATE_PREDECESSOR_PINS[line],ref=gate.prior_reader_registry;
  assert.deepEqual(ref,{path:INPUTS,...pin});const raw=original(root,ref.source_parent,INPUTS);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
  const prior=JSON.parse(raw),count=line==='21.x'?39:11;assert.equal(prior.tool_transitions.length,count);assert.equal(prior.extension_kind,'spinner-snack-c04-source');assert.equal(prior.gate_tool_successor,undefined);
  assert.deepEqual(data.c04_source_successor,prior.c04_source_successor);assert.deepEqual(data.prior_reader_registry,prior.prior_reader_registry);assert.deepEqual(data.support_inputs.slice(0,2),prior.support_inputs);
  const paths=['scripts/sass-seal.mjs','scripts/sass-api-inventory.mjs','scripts/sass-mixin-arguments.mjs','scripts/sass_mixin_argument_admission.py','scripts/rc-verify.py','scripts/sass-api-regressions.mjs'];assert.deepEqual(gate.added_tool_paths,paths);assert.deepEqual(data.tool_transitions.slice(count).map(row=>row.path),paths);assert.equal(data.tool_transitions.length,count+6);
  for(const row of data.tool_transitions.slice(count))assert.equal(row.source_parent,ref.source_parent);
  for(let i=0;i<count;i++){
   const old=prior.tool_transitions[i],next=data.tool_transitions[i];
   if(line==='21.x'&&old.path==='tests/test_historical_contract_repair_source.py'){
    const proof=gate.rolled_forward_test;assert.equal(proof.path,old.path);assert.equal(proof.source_parent,ref.source_parent);assert.deepEqual(proof.before,old.after);assert.deepEqual(proof.after,next.after);
    assert.deepEqual(next.literal_edits.slice(0,old.literal_edits.length),old.literal_edits);assert.deepEqual(next.literal_edits.slice(old.literal_edits.length),proof.literal_edits);assert.deepEqual({...next,after:old.after,literal_edits:old.literal_edits},old);
    const before=original(root,proof.source_parent,proof.path);assert.equal(hash(before),proof.before.sha256);assert.equal(before.length,proof.before.bytes);let text=before.toString();assert.equal(proof.literal_edits.length,2);for(const edit of proof.literal_edits){assert.equal(text.split(edit.before).length,2);text=text.replace(edit.before,edit.after);}assert.equal(hash(text),proof.after.sha256);assert.equal(Buffer.byteLength(text),proof.after.bytes);
   }else assert.deepEqual(next,old,'unrelated C04 predecessor row changed');
  }
  if(line==='main')assert.equal(gate.rolled_forward_test,null);
  assert.equal(gate.old_reports_rewritten,0);assert.equal(gate.old_product_reader,false);assert.equal(gate.canonical_dispositions_changed,0);assert.equal(gate.current_artifact_or_rendering_qualified,false);
 }
'''
pins={line:{'sha256':SHA(original(root,commits[line],MF)),'bytes':len(original(root,commits[line],MF)),'source_parent':commits[line]}for line,root in [('21.x',ROOT),('main',MAIN)]}
gate_js=gate_js.replace('GATE_PREDECESSOR_PINS',json.dumps(pins,separators=(',',':')))
reader=replace(reader,' if(data.prior_reader_registry&&!c04){',gate_js+' if(data.prior_reader_registry&&!c04){')
reader=replace(reader,"c04?(line==='21.x'?17:7)+data.c04_source_successor.added_tool_paths.length:","c04?(line==='21.x'?17:7)+data.c04_source_successor.added_tool_paths.length+(gate?6:0):")
py=(ROOT/'tests/historical_contract_repair_source.py').read_text()
py=replace(py,"    assert len(data['tool_transitions']) == ((17 if data['line'] == '21.x' else 7) + len(data['c04_source_successor']['added_tool_paths']) if", "    gate = data.get('gate_tool_successor')\n    assert len(data['tool_transitions']) == ((17 if data['line'] == '21.x' else 7) + len(data['c04_source_successor']['added_tool_paths']) + (6 if gate else 0) if")
py=replace(py,"        assert [r['path'] for r in data['tool_transitions'][count:]] == data['c04_source_successor']['added_tool_paths']\n        assert all(r['source_parent'] == data['prior_reader_registry']['source_parent'] for r in data['tool_transitions'][count:])", "        end = count + len(data['c04_source_successor']['added_tool_paths'])\n        assert [r['path'] for r in data['tool_transitions'][count:end]] == data['c04_source_successor']['added_tool_paths']\n        assert all(r['source_parent'] == data['prior_reader_registry']['source_parent'] for r in data['tool_transitions'][count:end])")
py=replace(py,"['scripts/sass-spinner-snack-c04-source.mjs', 'scripts/sass-spinner-snack-bridge-contract.mjs']", "['scripts/sass-spinner-snack-c04-source.mjs', 'scripts/sass-spinner-snack-bridge-contract.mjs'] + (['scripts/sass-spinner-snack-gate-integration.mjs', 'scripts/sass_spinner_snack_gate_integration.py'] if gate else [])")
gate_py='''    if gate:
        assert data['extension_kind'] == 'spinner-snack-c04-source'
        prior = _prior_gate_registry(root, data)
        count = 39 if data['line'] == '21.x' else 11
        assert data['c04_source_successor'] == prior['c04_source_successor']
        assert data['prior_reader_registry'] == prior['prior_reader_registry']
        assert data['support_inputs'][:2] == prior['support_inputs']
        paths = ['scripts/sass-seal.mjs', 'scripts/sass-api-inventory.mjs', 'scripts/sass-mixin-arguments.mjs', 'scripts/sass_mixin_argument_admission.py', 'scripts/rc-verify.py', 'scripts/sass-api-regressions.mjs']
        assert gate['added_tool_paths'] == paths
        assert [r['path'] for r in data['tool_transitions'][count:]] == paths
        assert all(r['source_parent'] == gate['prior_reader_registry']['source_parent'] for r in data['tool_transitions'][count:])
        for old, current in zip(prior['tool_transitions'], data['tool_transitions'][:count]):
            if data['line'] == '21.x' and old['path'] == 'tests/test_historical_contract_repair_source.py':
                proof = gate['rolled_forward_test']
                assert proof['path'] == old['path'] and proof['source_parent'] == gate['prior_reader_registry']['source_parent']
                assert proof['before'] == old['after'] and proof['after'] == current['after']
                assert current['literal_edits'][:len(old['literal_edits'])] == old['literal_edits']
                assert current['literal_edits'][len(old['literal_edits']):] == proof['literal_edits']
                assert {**current, 'after': old['after'], 'literal_edits': old['literal_edits']} == old
                raw = _original(str(root), proof['source_parent'], proof['path'])
                _identity(raw, proof['before'])
                text = raw.decode()
                assert len(proof['literal_edits']) == 2
                for edit in proof['literal_edits']:
                    assert text.count(edit['before']) == 1
                    text = text.replace(edit['before'], edit['after'])
                _identity(text.encode(), proof['after'])
            else:
                assert current == old
        if data['line'] == 'main':
            assert gate['rolled_forward_test'] is None
        assert gate['old_reports_rewritten'] == gate['canonical_dispositions_changed'] == 0
        assert gate['old_product_reader'] is gate['current_artifact_or_rendering_qualified'] is False
'''
py=replace(py,'    return data\n\n\ndef _tool_intermediate',gate_py+'    return data\n\n\ndef _tool_intermediate')
prior_py='''def _prior_gate_registry(root, data):
    ref = data['gate_tool_successor']['prior_reader_registry']
    pins = GATE_PREDECESSOR_PINS
    assert ref == {'path': READERS, **pins[data['line']]}
    raw = _original(str(root), ref['source_parent'], READERS)
    _identity(raw, ref)
    prior = _decoded(raw)
    assert prior['line'] == data['line'] and prior['source_parent'] == data['source_parent']
    assert prior['extension_kind'] == 'spinner-snack-c04-source' and 'gate_tool_successor' not in prior
    assert len(prior['tool_transitions']) == (39 if data['line'] == '21.x' else 11)
    return prior


'''.replace('GATE_PREDECESSOR_PINS',repr(pins))
py=replace(py,'def _prior_c04_registry(root, data):',prior_py+'def _prior_c04_registry(root, data):')
test=(ROOT/TEST).read_text();test_edits=[]
for before,after in [("self.assertEqual(len(data['tool_transitions']), 39)","self.assertEqual(len(data['tool_transitions']), 45)"),("self.assertEqual(len(data['support_inputs']), 2)","self.assertEqual(len(data['support_inputs']), 4)")]:
 test=replace(test,before,after);test_edits.append({'before':before,'after':after})
outputs={'proposed-reader-v2.mjs':reader,'proposed-python-v2.py':py,'proposed-test-v2.py':test}
for root in [ROOT,MAIN]:
 for name,text in outputs.items():(root/(P+name)).write_text(text)
proposal={'schema_version':1,'role':'Data-only prepared exact reader/Python/test successor; current MF/shared files unchanged','C04_before_archive':{'path':P+'C04-before.json.gz','sha256':SHA(gzip.compress((json.dumps({'schema_version':1,'role':'Immutable C04 historical tool-only preimages; never execute as current','branches':archive},indent=2)+'\n').encode(),mtime=0))},'gate_helper_and_afterimage_pins':'await-title-freeze; proposed shared sources still contain CURRENT MFpins and must not be executed as current','prior_registry_pins':pins,'rolled_forward_test_edits':test_edits,'proposed_sources':[{'path':P+name,'sha256':SHA(text.encode()),'bytes':len(text.encode())}for name,text in outputs.items()],'primary_tool_rows':{'21.x':45,'main':17},'support_rows':4,'preservation':{'21full_rows':38,'main_full_rows':11,'all39historical_before_fields':True,'all_existing_literal_prefixes':True},'old_programs_executed':False,'compiler_executed':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'}
raw=(json.dumps(proposal,indent=2)+'\n').encode()
for root in [ROOT,MAIN]:(root/(P+'prepared-source-v2.json')).write_bytes(raw)
print(SHA(raw))
