# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Exact authenticated support0 roll-forward and two helper pins; no old execution."""
from pathlib import Path
import copy,difflib,hashlib,json,os,subprocess
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-';MF='compatibility/rc/historical-contract-repair-reader-inputs.json';SELF='scripts/historical-contract-repair-readers.mjs';PY='tests/historical_contract_repair_source.py';sha=lambda b:hashlib.sha256(b).hexdigest()
def ref(root,path):
 raw=(root/path).read_bytes();return {'path':path,'sha256':sha(raw),'bytes':len(raw)}
def original(root,parent,path):
 env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
 for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(key,None)
 return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=root,env=env)
def edits(left,right):
 aa=left.decode().splitlines(keepends=True);bb=right.decode().splitlines(keepends=True);text=left.decode();out=[]
 for group in reversed(list(difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(6))):
  before=''.join(aa[group[0][1]:group[-1][2]]);after=''.join(bb[group[0][3]:group[-1][4]]);assert before and text.count(before)==1;text=text.replace(before,after);out.append({'before':before,'after':after})
 assert text.encode()==right and out;return out
cut_path='compatibility/rc/parallel-spinner-snack-gate-integration-physical-closure-support-cut-v1.json';cutraw=(ROOT/cut_path).read_bytes();assert sha(cutraw)=='20f3b7f7a817c06fe7aa51198acabc2e448ccd88cd31f3013ee3c536b299067c';cut=json.loads(cutraw)
assert [r['path']for r in cut['transitions']]==['scripts/sass-spinner-snack-gate-integration.mjs','scripts/sass_spinner_snack_gate_integration.py','scripts/sass-spinner-snack-c04-source.mjs']
old_pins={'21.x':'fdfb5235f4f940558150e9999d6f79f5e286b5265f35373928ee148d14c52c4d','main':'3f3769fb75c1a88b260c32dbf7475fad26e02f66ef440d466e87c34750596884'};manifests={};pending={};rows={}
for line,root in [('21.x',ROOT),('main',MAIN)]:
 for row in cut['transitions']:
  assert ref(root,row['path'])=={'path':row['path'],**row['after']};assert ref(root,row['preserved_before_image']['path'])==row['preserved_before_image']
 for row in cut['frozen_inputs_unchanged']:assert ref(root,row['path'])==row
 raw=(root/MF).read_bytes();assert sha(raw)==old_pins[line];data=json.loads(raw);priorref=data['gate_tool_successor']['prior_reader_registry'];priorraw=original(root,priorref['source_parent'],MF);assert sha(priorraw)==priorref['sha256'];prior=json.loads(priorraw)
 assert len(data['tool_transitions'])==(45 if line=='21.x'else 17);assert data['support_inputs'][:2]==prior['support_inputs'];assert len(data['support_inputs'])==4
 c04=cut['transitions'][2];before=original(root,priorref['source_parent'],c04['path']);assert {'sha256':sha(before),'bytes':len(before)}==c04['before'];assert {'path':c04['path'],**c04['before']}==prior['support_inputs'][0]
 proof={'path':c04['path'],'source_parent':priorref['source_parent'],'before':copy.deepcopy(prior['support_inputs'][0]),'after':{'path':c04['path'],**c04['after']},'literal_edits':edits(before,(root/c04['path']).read_bytes())};data['gate_tool_successor']['rolled_forward_c04_support']=proof;data['support_inputs'][0]=copy.deepcopy(proof['after'])
 for index,row in enumerate(cut['transitions'][:2],2):
  assert data['support_inputs'][index]=={'path':row['path'],**row['before']};data['support_inputs'][index]={'path':row['path'],**row['after']}
 assert data['support_inputs'][1]==prior['support_inputs'][1]
 new=(json.dumps(data,indent=2)+'\n').encode();pending[(line,MF)]=new;manifests[line]={'sha256':sha(new),'bytes':len(new)};rows[line]={'before':{'path':MF,'sha256':sha(raw),'bytes':len(raw)},'after':{'path':MF,**manifests[line]},'primary_rows':len(data['tool_transitions']),'support_rows':4,'c04_support_proof':proof,'unchanged_support1':data['support_inputs'][1]}
reader=(ROOT/SELF).read_text();python=(ROOT/PY).read_text();assert sha(reader.encode())=='54bdcb50e89492c6c224e93bc307cf0e5dd2dabff8fa778e593421f006916592';assert sha(python.encode())=='41c0dc9fc0db35e1b47a41bdab3fc67cf557d507be3aa9d63a16fabdb0a680f1';assert (MAIN/SELF).read_text()==reader and (MAIN/PY).read_text()==python
before_js='assert.deepEqual(data.support_inputs.slice(0,2),prior.support_inputs);'
after_js="""const support=gate.rolled_forward_c04_support;assert.equal(support.path,'scripts/sass-spinner-snack-c04-source.mjs');assert.equal(support.source_parent,ref.source_parent);assert.deepEqual(support.before,prior.support_inputs[0]);assert.deepEqual(support.after,data.support_inputs[0]);assert.deepEqual(data.support_inputs[1],prior.support_inputs[1]);
  const supportBefore=original(root,support.source_parent,support.path);assert.equal(hash(supportBefore),support.before.sha256);assert.equal(supportBefore.length,support.before.bytes);let supportText=supportBefore.toString();assert.ok(support.literal_edits.length>0);for(const edit of support.literal_edits){assert.equal(supportText.split(edit.before).length,2);supportText=supportText.replace(edit.before,edit.after);}assert.equal(hash(supportText),support.after.sha256);assert.equal(Buffer.byteLength(supportText),support.after.bytes);"""
assert reader.count(before_js)==1;reader=reader.replace(before_js,after_js)
before_py="        assert data['support_inputs'][:2] == prior['support_inputs']"
after_py="""        support = gate['rolled_forward_c04_support']
        assert support['path'] == 'scripts/sass-spinner-snack-c04-source.mjs'
        assert support['source_parent'] == gate['prior_reader_registry']['source_parent']
        assert support['before'] == prior['support_inputs'][0]
        assert support['after'] == data['support_inputs'][0]
        assert data['support_inputs'][1] == prior['support_inputs'][1]
        support_before = _original(str(root), support['source_parent'], support['path'])
        _identity(support_before, support['before'])
        support_text = support_before.decode()
        assert support['literal_edits']
        for edit in support['literal_edits']:
            assert support_text.count(edit['before']) == 1
            support_text = support_text.replace(edit['before'], edit['after'])
        _identity(support_text.encode(), support['after'])"""
assert python.count(before_py)==1;python=python.replace(before_py,after_py)
for line in ['21.x','main']:
 assert reader.count(old_pins[line])==1 and python.count(old_pins[line])==1;reader=reader.replace(old_pins[line],manifests[line]['sha256']);python=python.replace(old_pins[line],manifests[line]['sha256'])
for line in ['21.x','main']:pending[(line,SELF)]=reader.encode();pending[(line,PY)]=python.encode()
for (line,path),raw in pending.items():(ROOT if line=='21.x'else MAIN).joinpath(path).write_bytes(raw)
out={'schema_version':1,'role':'Exact three support afterimages and finite C04 Git support0 proof with physical-only shared closure','support_cut':{'path':cut_path,'sha256':sha(cutraw),'bytes':len(cutraw)},'prior_gate_freeze_revoked':'e02e2d1e43f478a14cca1f6adc8a43e5129ca02e79c33320bfe3bcca227e73df','branches':rows,'shared_sources':{line:[ref(root,p)for p in [SELF,PY]]for line,root in [('21.x',ROOT),('main',MAIN)]},'primary_support_transition_added':False,'old_product_reader':False,'old_programs_or_compilers_executed':False,'current_full_owner_executed':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'}
raw=(json.dumps(out,indent=2)+'\n').encode()
for root in [ROOT,MAIN]:root.joinpath(P+'transition-v3-final.json').write_bytes(raw)
print(json.dumps({'branches':{line:{k:v for k,v in row.items()if k!='c04_support_proof'}for line,row in rows.items()},'shared_sources':out['shared_sources']},indent=2))
