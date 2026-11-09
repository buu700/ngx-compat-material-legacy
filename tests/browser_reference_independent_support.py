# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Read-only evidence checks for the independent browser source comparison."""
import hashlib,json,os,re,subprocess
from pathlib import Path

ZONE_PACKET='compatibility/rc/parent-zone-binder-finite-transition-v1.json'
ZONE_HASH='4ab8f480bd816ef901133e5e3e397ccda61e6add95859e696a660447103afe0c'
ZONE_PATH='scripts/browser-required-cells.mjs'
LEDGER='compatibility/f10/disposition-ledger/ledger.json'
def digest(raw):return hashlib.sha256(raw).hexdigest()
def match(raw,ref):
    assert isinstance(raw,bytes) and len(raw)==ref['bytes'] and digest(raw)==ref['sha256']
def replay(before,edits):
    cursor=0;parts=[]
    for edit in edits:
        offset=edit['offset'];old=edit['before'].encode();new=edit['after'].encode()
        assert type(offset) is int and cursor<=offset<=len(before) and before[offset:offset+len(old)]==old
        parts.extend((before[cursor:offset],new));cursor=offset+len(old)
    return b''.join((*parts,before[cursor:]))
def _verify_zone_history(packet_raw,line,historical_after,old,new):
    assert digest(packet_raw)==ZONE_HASH
    packet=json.loads(packet_raw)
    assert packet['schema_version']==1 and packet['role']=='proposed-exact-browser-zone-and-source-binding-successor'
    assert packet['historical_packets_rewritten'] is False and packet['old_programs_executed'] is False
    assert packet['native_or_full_audit_qualified'] is False and packet['g11_claim']=='not-passed'
    row=packet['browser'][line];assert row['path']==ZONE_PATH and row['before']['path']==ZONE_PATH and row['after']['path']==ZONE_PATH
    assert row['before']=={'path':ZONE_PATH,**historical_after}
    match(old,row['before']);match(new,row['after']);assert replay(old,row['edits'])==new
    return row

def verify_zone_data(packet_raw,line,historical_after,old,new,physical):
    row=_verify_zone_history(packet_raw,line,historical_after,old,new)
    match(physical,row['after']);assert physical==new
    return row

def git_data(root,commit,path):
    assert re.fullmatch(r'[0-9a-f]{40}',commit) and path==ZONE_PATH
    env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_TERMINAL_PROMPT='0')
    return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],cwd=root,env=env)

def _verify_main_terminal(root,row):
    # This is the sole later main image: Git establishes the exact lineage and
    # bytes; the separately read live file must match that same terminal image.
    parent='fdcdadee28c4552e3500b5099de9f42e456adb5c'
    commit='8e9e7316806fe9266373865b0784e9917659e5e8'
    env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_TERMINAL_PROMPT='0')
    parents=subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',commit],cwd=root,env=env).decode().strip()
    assert parents==commit+' '+parent
    subprocess.check_output(['git','--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],cwd=root,env=env)
    previous=git_data(root,parent,ZONE_PATH);terminal=git_data(root,commit,ZONE_PATH)
    match(previous,row['after'])
    needle=b"    '--no-sandbox',\n"
    assert previous.count(needle)==1 and previous.replace(needle,b'')==terminal
    match(terminal,{'sha256':'1ff46b8442f8b66fa92d3b8340c0169950007e8e9a19bfc5630bc36bf806e0b2','bytes':64913})
    physical=(root/ZONE_PATH).read_bytes()
    match(physical,{'sha256':'1ff46b8442f8b66fa92d3b8340c0169950007e8e9a19bfc5630bc36bf806e0b2','bytes':64913})
    assert physical==terminal

SURFACE_PATH='scripts/browser-surface-families.mjs'
FORM_PATH='scripts/browser-form-families.mjs'
SURFACE_PACKET='compatibility/rc/parent-browser-surface-finite-successor-v1.json'
FORM_PACKET='compatibility/rc/parent-zone-form-successor-v1.json'

def _git_helper_data(root,commit,path):
    assert re.fullmatch(r'[0-9a-f]{40}',commit) and path in (SURFACE_PATH,FORM_PATH)
    env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_TERMINAL_PROMPT='0')
    return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],cwd=root,env=env)

def _verify_main_surface(root,historical_after):
    raw=(root/SURFACE_PACKET).read_bytes()
    assert digest(raw)=='e4f5c029f3c2b88359920ac3aad5d344e86e163fcc323b407d413e7e35d08e4e'
    packet=json.loads(raw)
    assert packet['schema_version']==1 and packet['role']=='finite-browser-surface-source-successor'
    assert packet['old_programs_executed'] is False and packet['historical_packets_rewritten'] is False
    assert packet['source_scope_only'] is True and packet['actual_native_packed_browser_floor_or_full_audit_qualified'] is False and packet['g11_claim']=='not-passed'
    branch=packet['branches']['main'];rows=branch['transitions']
    assert [r['path'] for r in rows]==[SURFACE_PATH,'scripts/legacy-core-high-contrast-contract.mjs']
    row=rows[0]
    assert all(row[k]['path']==SURFACE_PATH for k in ('before','intermediate','after'))
    assert row['before']=={'path':SURFACE_PATH,**historical_after}
    before=_git_helper_data(root,branch['source_parent'],SURFACE_PATH)
    middle=_git_helper_data(root,branch['intermediate_commit'],SURFACE_PATH)
    match(before,row['before']);match(middle,row['intermediate'])
    assert replay(before,row['before_to_intermediate'])==middle
    after=replay(middle,row['intermediate_to_after']);match(after,row['after'])
    physical=(root/SURFACE_PATH).read_bytes();match(physical,row['after']);assert physical==after

def _verify_main_form(root,historical_after):
    raw=(root/FORM_PACKET).read_bytes()
    assert digest(raw)=='a900cfaad6fd64bbb77b2fa5ab2326d99191de8af9dd4e410d4ba22f28c9e63f'
    packet=json.loads(raw)
    assert packet['schema_version']==1 and packet['role']=='finite-browser-form-zone-runtime-successor'
    assert packet['historical_packets_rewritten'] is False and packet['old_programs_executed'] is False
    assert packet['native_or_full_audit_qualified'] is False and packet['g11_claim']=='not-passed'
    row=packet['lines']['main'];assert row['path']==FORM_PATH and row['before']['path']==FORM_PATH and row['after']['path']==FORM_PATH
    assert row['before']=={'path':FORM_PATH,**historical_after}
    reference=row['reference_packet'];prior_raw=(root/reference['path']).read_bytes();assert digest(prior_raw)==reference['sha256']
    prior=json.loads(prior_raw);assert prior['line']=='main' and prior['transitions'][reference['transition_index']]['after']==row['before']
    before=_git_helper_data(root,row['before_commit'],FORM_PATH);match(before,row['before'])
    reconstructed=replay(before,row['edits']);match(reconstructed,row['after'])
    parent='fdcdadee28c4552e3500b5099de9f42e456adb5c';commit='8e9e7316806fe9266373865b0784e9917659e5e8'
    env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_TERMINAL_PROMPT='0')
    parents=subprocess.check_output(['git','--no-replace-objects','rev-list','--parents','-n','1',commit],cwd=root,env=env).decode().strip()
    assert parents==commit+' '+parent
    subprocess.check_output(['git','--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],cwd=root,env=env)
    previous=_git_helper_data(root,parent,FORM_PATH);terminal=_git_helper_data(root,commit,FORM_PATH)
    match(previous,row['after']);assert reconstructed==previous
    needle=b"  '--no-sandbox',\n"
    assert previous.count(needle)==1 and previous.replace(needle,b'')==terminal
    terminal_ref={'sha256':'afee71948187d5aebcd2a42fa3f1bb16e0e2241edbce8aaa3421c3110c874a04','bytes':21567}
    match(terminal,terminal_ref)
    physical=(root/FORM_PATH).read_bytes();match(physical,terminal_ref);assert physical==terminal

def verify_helpers(root,line,transitions):
    assert len(transitions)==4 and ZONE_PATH in transitions
    raw=(root/ZONE_PACKET).read_bytes();assert digest(raw)==ZONE_HASH
    packet=json.loads(raw);row=packet['browser'][line]
    old=git_data(root,row['old_commit'],ZONE_PATH);new=git_data(root,row['new_commit'],ZONE_PATH)
    if line=='main':
        checked=_verify_zone_history(raw,line,transitions[ZONE_PATH]['after'],old,new)
        _verify_main_terminal(root,checked)
    else:
        verify_zone_data(raw,line,transitions[ZONE_PATH]['after'],old,new,(root/ZONE_PATH).read_bytes())
    if line=='main':
        assert SURFACE_PATH in transitions and FORM_PATH in transitions
        _verify_main_surface(root,transitions[SURFACE_PATH]['after'])
        _verify_main_form(root,transitions[FORM_PATH]['after'])
        for path,transition in transitions.items():
            if path not in (ZONE_PATH,SURFACE_PATH,FORM_PATH):match((root/path).read_bytes(),transition['after'])
    else:
        verify_other_helpers(root,transitions)

def verify_other_helpers(root,transitions):
    assert len(transitions)==4 and ZONE_PATH in transitions
    for path,transition in transitions.items():
        if path!=ZONE_PATH:match((root/path).read_bytes(),transition['after'])

def assert_strict_frame(live,before,after):
    assert live in (before,after),'unregistered strict canonical frame'

def validate_full_report(report,baseline,line,ledger):
    assert isinstance(baseline,dict) and set(baseline)=={'bound','report'}
    rows=baseline['bound'];semantics=baseline['report'];assert isinstance(rows,list) and rows
    assert all(isinstance(r,dict) and set(r)=={'path','sha256','bytes'} for r in rows)
    paths=[r['path'] for r in rows];assert len(set(paths))==len(paths)
    assert all(isinstance(r['path'],str) and re.fullmatch(r'[0-9a-f]{64}',r['sha256']) and type(r['bytes']) is int and r['bytes']>=0 for r in rows)
    assert report['result']=='pass' and report['line']==line
    assert report['source_execution_mode']=='complete-regression' and report['full_source_fault_lifetimes_executed'] is True
    assert type(report['bound_current_paths']) is int and report['bound_current_paths']==len(rows)
    for kind in ('cold','late'):
        assert type(report[kind+'_source_faults_rejected']) is int and report[kind+'_source_faults_rejected']==len(rows)
        assert report[kind+'_source_fault_paths_rejected']==paths
    assert all(report.get(k)==v for k,v in semantics.items())
    assert report['current_physical_ledger_sha256']==digest(ledger) and report['current_physical_ledger_bytes']==len(ledger)
    assert report['canonical_frame_admission_granted'] is False and report['old_programs_executed'] is False
    assert report['actual_angular_DOM_browser_or_packed_execution'] is False
    assert report['actual_native_packed_browser_floor_or_full_audit_qualified'] is False and report['g11_claim']=='not-passed'
    assert report['title_contract_negative_controls']==47 and len(report['whole_current_dialog_probe_collaborator_runs'])==8
    return rows

def verify_physical(root,rows):
    root=Path(root)
    for ref in rows:
        path=ref['path'];assert not path.startswith('/') and all(p not in ('','.','..') for p in path.split('/')) and '\\' not in path
        match((root/path).read_bytes(),ref)
