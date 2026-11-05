#!/usr/bin/env python3
"""Independent literal/data authentication, never execution of historical tools."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = 'compatibility/rc/historical-contract-repair-reader-inputs.json'
GATES = ['scripts/sass-seal.mjs', 'scripts/sass-api-inventory.mjs', 'scripts/sass-mixin-arguments.mjs',
         'scripts/sass_mixin_argument_admission.py', 'scripts/rc-verify.py', 'scripts/sass-api-regressions.mjs']
PARENTS = {'21.x': 'af07cb6311c960de054dcf16e2d29ad65f6138f5', 'main': '99aa39254e87bd215d2f3ed7d6821236e9bb483d'}
PINS = {'21.x': ('a16f2e253cb34efb9963eadcf921977f2d8464c468797faad5c2dca580b13f35', 333345),
        'main': ('ab76e4170d669a5f7cea18ffcd33d91b05c954572ae96ad65ca9158f5dea9a14', 67365)}
def hash(raw):return hashlib.sha256(raw).hexdigest()
def identity(raw):return dict(sha256=hash(raw), bytes=len(raw))
def original(root, commit, path):
    env = {k:v for k,v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1', GIT_TERMINAL_PROMPT='0')
    return subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', commit+':'+path],
                          cwd=root, env=env, capture_output=True, check=True).stdout
def rows(raw, key):
    text=raw.decode();position=text.index('[',text.index('"'+key+'"'))+1;decoder=json.JSONDecoder();out=[]
    while True:
        while text[position].isspace() or text[position]==',':position+=1
        if text[position]==']':return out
        _,end=decoder.raw_decode(text,position);out.append(text[position:end]);position=end
def frozen(cut):
    for line,branch in cut['branches'].items():
        root=Path(branch['root'])
        for ref in branch['physical_refs']:
            assert identity((root/ref['path']).read_bytes())=={k:ref[k] for k in ('sha256','bytes')},ref['path']
    for ref in [cut[k] for k in ['title_cut','transition','C04_before_archive','worksheet']]+cut['focused_source_receipts']:
        assert identity((ROOT/ref['path']).read_bytes())=={k:ref[k] for k in ('sha256','bytes')},ref['path']

if __name__=='__main__':
    assert len(sys.argv)==3
    cut_path,output=map(Path,sys.argv[1:]);cut=json.loads(cut_path.read_bytes());frozen(cut);reports=[]
    for line,branch in cut['branches'].items():
        root=Path(branch['root']);raw=(root/MANIFEST).read_bytes();data=json.loads(raw)
        prior_raw=original(root,PARENTS[line],MANIFEST);assert (hash(prior_raw),len(prior_raw))==PINS[line];prior=json.loads(prior_raw)
        count=39 if line=='21.x' else 11;assert len(prior['tool_transitions'])==count
        assert len(data['tool_transitions'])==count+6 and len(data['support_inputs'])==4
        assert data['support_inputs'][:2]==prior['support_inputs']
        assert rows(raw,'support_inputs')[:2]==rows(prior_raw,'support_inputs')
        for key,value in prior.items():
            if key not in ('tool_transitions','support_inputs'):assert data[key]==value,key
        assert set(data)==set(prior)|{'gate_tool_successor'}
        gate=data['gate_tool_successor'];assert gate['prior_reader_registry']==dict(path=MANIFEST,sha256=PINS[line][0],bytes=PINS[line][1],source_parent=PARENTS[line])
        assert gate['added_tool_paths']==GATES
        assert [r['path'] for r in data['tool_transitions'][count:]]==GATES
        assert len({r['path'] for r in data['tool_transitions']})==count+6
        old_rows,new_rows=rows(prior_raw,'tool_transitions'),rows(raw,'tool_transitions');raw_preserved=0;exception=[]
        for index,old in enumerate(prior['tool_transitions']):
            new=data['tool_transitions'][index];assert new['path']==old['path'] and new['before']==old['before']
            assert new['literal_edits'][:len(old['literal_edits'])]==old['literal_edits']
            if line=='21.x' and old['path']=='tests/test_historical_contract_repair_source.py':
                proof=gate['rolled_forward_test'];assert proof['path']==old['path'] and proof['source_parent']==PARENTS[line]
                assert proof['before']==old['after'] and proof['after']==new['after']
                assert {**new,'after':old['after'],'literal_edits':old['literal_edits']}==old
                assert new['literal_edits'][len(old['literal_edits']):]==proof['literal_edits']
                before=original(root,PARENTS[line],old['path']);assert identity(before)==old['after']
                assert proof['literal_edits']==[
                    dict(before="self.assertEqual(len(data['tool_transitions']), 39)",after="self.assertEqual(len(data['tool_transitions']), 45)"),
                    dict(before="self.assertEqual(len(data['support_inputs']), 2)",after="self.assertEqual(len(data['support_inputs']), 4)")]
                text=before.decode()
                for edit in proof['literal_edits']:assert text.count(edit['before'])==1;text=text.replace(edit['before'],edit['after'])
                assert identity(text.encode())==new['after'] and text.encode()==(root/new['path']).read_bytes()
                exception.append(old['path'])
            else:
                assert new==old and new_rows[index]==old_rows[index],old['path'];raw_preserved+=1
        assert raw_preserved==(38 if line=='21.x' else 11)
        if line=='main':assert gate['rolled_forward_test'] is None
        replays=[]
        for index,row in enumerate(data['tool_transitions']):
            before=original(root,row.get('source_parent',data['source_parent']),row['path']);assert identity(before)==row['before']
            text=before.decode()
            for edit in row['literal_edits']:
                assert set(edit)=={'before','after'} and text.count(edit['before'])==1,row['path']
                text=text.replace(edit['before'],edit['after'])
            after=text.encode();assert identity(after)==row['after'] and after==(root/row['path']).read_bytes(),row['path']
            if index>=count:assert row['source_parent']==PARENTS[line]
            replays.append(dict(path=row['path'],literal_count=len(row['literal_edits']),before_authenticated_to_git=True,current_whole_image_equal=True))
        for support in data['support_inputs']:assert identity((root/support['path']).read_bytes())=={k:support[k] for k in ('sha256','bytes')}
        assert [r['path'] for r in data['support_inputs'][2:]]==['scripts/sass-spinner-snack-gate-integration.mjs','scripts/sass_spinner_snack_gate_integration.py']
        assert gate['old_reports_rewritten']==0 and gate['old_product_reader'] is False and gate['canonical_dispositions_changed']==0 and gate['current_artifact_or_rendering_qualified'] is False
        immutable=[]
        for path in ['compatibility/f10/disposition-ledger/ledger.json','scripts/upstream-source-contract-registry.mjs',
                     'compatibility/rc/oracles/material-16.2.14-sass-api.json','fixtures/sass/mixin-argument-contracts.json',
                     'scripts/sass-default-aggregate-contract.mjs','scripts/sass_default_aggregate_admission.py',
                     'scripts/sass-aggregate-color-theme-contract.mjs','scripts/sass_aggregate_color_theme_admission.py',
                     'scripts/sass-aggregate-typography-contract.mjs','scripts/sass_aggregate_typography_admission.py']:
            current=(root/path).read_bytes();assert current==original(root,PARENTS[line],path),path
            immutable.append(dict(path=path,**identity(current),whole_bytes_equal_C04_git=True))
        reports.append(dict(line=line,manifest=dict(path=MANIFEST,**identity(raw)),authenticated_C04_frame=dict(parent=PARENTS[line],**identity(prior_raw)),
                            primary_rows=count+6,support_rows=4,old_before_fields_and_literal_prefixes_preserved=count,raw_full_rows_preserved=raw_preserved,
                            only_existing_after_image_exception=exception,literal_replays=replays,immutable_canonical_oracle_catalog_and_old_models=immutable,old_code_executed=False))
    frozen(cut);report=dict(schema_version=1,role='Independent exact Git/literal/raw JSON data checks; no current owner or old tool execution',
                           frozen_cut=dict(path=str(cut_path),**identity(cut_path.read_bytes())),branches=reports,fresh_compiles=0,full_owner_executed=False)
    assert not output.exists();output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(dict(output=str(output),sha256=hash(output.read_bytes()),rows=[{k:x[k] for k in ['line','primary_rows','support_rows','raw_full_rows_preserved']} for x in reports])))
