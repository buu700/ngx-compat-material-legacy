# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite Stepper source identity; no CSS or artifact admission."""
from pathlib import Path
from types import MappingProxyType
import hashlib
import json
import os
import re
import stat
import subprocess
import weakref

# All authority checks below use assertions; optimized Python must fail before loading data.
if not __debug__:
    raise RuntimeError('optimized Python cannot run Stepper source authority')

SELF = 'scripts/stepper_current_peer_source_v5.py'
FOCUS_PACKET={'path':'compatibility/rc/current-main-strong-focus-source-v1.json','sha256':'e4f6c47d595edc21f102a756e3a827d077c0f717f1968b8672c691d4fb336ccb','bytes':1030}
V4_HELPER={'path':'scripts/stepper_current_peer_source_v4.py','sha256':'e94a50ceae847413bb80538bd19dd5afcd3f2fa212cd8c1c4e296236f625b1fa','bytes':15375}
PRIOR_HELPER = {'path':'scripts/stepper_sixth_source.py','sha256':'3b6408d97f09d887686952600844c306ad434d1f626cc6a4b74701b536ce79d7'}
NEXT_PACKET = 'compatibility/rc/current-sass-stepper-current-peer-source-inputs-v4.json'
NEXT_SHA = 'aa44e7c00521373e6c05f63717e38688af0ebbff4eee95bd06e5dfac127d482c'
PACKET = 'compatibility/rc/current-sass-stepper-sixth-source-inputs-v1.json'
PACKET_SHA = '1d566395c25e3569cee1031526ec05508e40cb866d7d5fda008cb6a325a9caec'
BRIDGE = 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss'
SHORT = 'styles/bridges/_companion-overrides.scss'
IMAGE = Path(__file__).read_bytes()
def digest(raw): return hashlib.sha256(raw).hexdigest()
def blob(raw): return hashlib.sha1(('blob ' + str(len(raw)) + '\0').encode() + raw).hexdigest()
def reference(path,raw): return {'path':path,'sha256':digest(raw),'bytes':len(raw)}
STEPPER_CURRENT_PEER_LOADED_IMAGE = reference(SELF, IMAGE)
def freeze(value):
    if type(value) is dict: return MappingProxyType({key:freeze(item) for key,item in value.items()})
    if type(value) is list: return tuple(freeze(item) for item in value)
    return value
def thaw(value):
    if type(value) is MappingProxyType: return {key:thaw(item) for key,item in value.items()}
    if type(value) is tuple: return [thaw(item) for item in value]
    return value
def physical(root,path):
    assert type(path) is str and path and not path.startswith('/') and '\\' not in path and '\0' not in path
    cursor=Path(root)
    for part in path.split('/'):
        assert part and part not in ('.','..')
        cursor=cursor/part
        assert not stat.S_ISLNK(os.lstat(cursor).st_mode), 'linked Stepper source '+path
    assert stat.S_ISREG(os.lstat(cursor).st_mode), 'nonfile Stepper source '+path
    return cursor.read_bytes()
def identity(raw,ref):
    assert digest(raw)==ref['sha256'], 'changed Stepper source '+ref['path']
    assert len(raw)==ref['bytes'], 'changed Stepper source size '+ref['path']
    if 'git_blob' in ref: assert blob(raw)==ref['git_blob']
def historical(root,commit,path):
    assert re.fullmatch('[0-9a-f]{40}',commit)
    env={'PATH':os.environ.get('PATH',''),'LANG':'C','LC_ALL':'C','GIT_CONFIG_GLOBAL':'/dev/null',
         'GIT_CONFIG_SYSTEM':'/dev/null','GIT_TERMINAL_PROMPT':'0','GIT_NO_REPLACE_OBJECTS':'1','GIT_NO_LAZY_FETCH':'1'}
    return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',
                                    'show',commit+':'+path],cwd=root,env=env)
def source_set_key(rows):return digest(json.dumps(rows,separators=(',',':')).encode())
_ACTIVE = weakref.WeakKeyDictionary()
class StepperCurrentPeerSourceV4:
    __slots__=('__weakref__','root','line','_read','_branch','_bound','_transition','_source_set','_sealed')
    def __setattr__(self,name,value):
        if getattr(self,'_sealed',False):
            raise AttributeError('sealed Stepper source authority')
        object.__setattr__(self,name,value)
    def __init__(self,root,read=None):
        supplied_root=Path(root)
        assert supplied_root.is_absolute(), 'absolute Stepper root required'
        assert not stat.S_ISLNK(os.lstat(supplied_root).st_mode), 'linked Stepper root'
        self.root=supplied_root.absolute()
        assert stat.S_ISDIR(os.lstat(self.root).st_mode)
        assert read is None or callable(read)
        self._read=read
        assert physical(self.root,SELF)==IMAGE, 'changed loaded Stepper helper'
        packet_raw=physical(self.root,PACKET)
        assert digest(packet_raw)==PACKET_SHA, 'changed Stepper packet'
        packet=json.loads(packet_raw)
        assert packet['schema_version']==3 and packet['role']=='finite-sixth-Stepper-M2-bridge-current-source-successor'
        assert packet['sixth_module_path']==BRIDGE and packet['source_scope_only'] is True
        assert packet['css_or_artifact_admission_granted'] is False and packet['historical_bytes_exposed_as_current'] is False
        version_path='projects/ngx-material-legacy/package.json';version_raw=physical(self.root,version_path)
        version=json.loads(version_raw)['version']
        self.line='21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert self.line
        assert self.line=='main', 'Stepper current peer source successor is main-only'
        old_helper=physical(self.root,PRIOR_HELPER['path']);assert digest(old_helper)==PRIOR_HELPER['sha256'], 'changed frozen sixth reader'
        next_raw=physical(self.root,NEXT_PACKET);assert digest(next_raw)==NEXT_SHA, 'changed Stepper peer packet'
        next_packet=json.loads(next_raw)
        assert next_packet['schema_version']==4 and next_packet['role']=='finite-main-stepper-current-peer-source-successor' and next_packet['line']=='main'
        assert next_packet['previous_packet']==reference(PACKET,packet_raw) and next_packet['source_parent']=='42d02491648097656ccb3c590dbaaea066c3e603'
        assert next_packet['source_scope_only'] is True and next_packet['css_or_artifact_admission_granted'] is False and next_packet['historical_bytes_exposed_as_current'] is False
        assert next_packet['semantic_scope']=={'historical_prefix':'unchanged-material-16','current_companion':'independent-current-peer-m2','stepper_tokens':['header-focus-state-layer-shape','header-hover-state-layer-shape','header-error-state-label-text-color','header-error-state-icon-foreground-color','header-hover-state-layer-color','header-focus-state-layer-color']}
        branch=packet['branches'][self.line]
        prior=packet['previous_packet']
        assert prior=={'path':'compatibility/rc/current-sass-source-inputs-v2.json',
                       'sha256':'46e1c8e8657880c1168010c8ec1b5967cbb4aa4c289a4d9b9ae29e3b2182b0a9','bytes':prior['bytes']}
        prior_raw=physical(self.root,prior['path']);identity(prior_raw,prior)
        v2=json.loads(prior_raw);assert v2['schema_version']==2
        source_raw=physical(self.root,v2['historical_source_packet']['path']);identity(source_raw,v2['historical_source_packet'])
        source=json.loads(source_raw)['branches'][self.line]
        css_raw=physical(self.root,v2['historical_css_packet']['path']);identity(css_raw,v2['historical_css_packet'])
        css=json.loads(css_raw)
        protected_raw=physical(self.root,v2['protected_input_packet']['path']);identity(protected_raw,v2['protected_input_packet'])
        protected=json.loads(protected_raw)
        census_raw=physical(self.root,v2['style_template_census']['path']);identity(census_raw,v2['style_template_census'])
        census=json.loads(census_raw)
        assert source['before_commit']==branch['source_parent']
        old=[x for x in source['unchanged_owned_sass_before_inputs'] if x['path']==BRIDGE]
        assert len(old)==1 and old[0]['sha256']==branch['before_git']['sha256']
        assert old[0]['bytes']==branch['before_git']['bytes'] and old[0]['blob']==branch['before_git']['git_blob']
        for rows in (source['inputs'],protected['branches'][self.line]['protected_inputs'],
                     next(x for x in census['lines'] if x['line']==self.line)['non_target_owned_style_template_graph']):
            assert len([x for x in rows if x['path']==BRIDGE])==1
        before=historical(self.root,branch['source_parent'],BRIDGE);identity(before,branch['before_git'])
        pieces=[];cursor=0
        for edit in branch['literal_edits']:
            offset=edit['offset'];old_bytes=edit['before'].encode();new_bytes=edit['after'].encode()
            assert type(offset) is int and offset>=cursor and before[offset:offset+len(old_bytes)]==old_bytes
            pieces.extend((before[cursor:offset],new_bytes));cursor=offset+len(old_bytes)
        pieces.append(before[cursor:]);expected=b''.join(pieces);identity(expected,branch['reviewed_after'])
        assert next_packet['transition']['before']==branch['reviewed_after']
        assert historical(self.root,next_packet['source_parent'],BRIDGE)==expected,'V4 committed predecessor differs'
        parts=[];at=0
        for edit in next_packet['transition']['literal_edits']:
            assert set(edit)=={'offset','before','after'}
            offset=edit['offset'];old_bytes=edit['before'].encode();new_bytes=edit['after'].encode()
            assert type(offset) is int and offset>=at and expected[offset:offset+len(old_bytes)]==old_bytes
            parts.extend((expected[at:offset],new_bytes));at=offset+len(old_bytes)
        current=b''.join([*parts,expected[at:]]);identity(current,next_packet['transition']['after'])
        assert physical(self.root,BRIDGE)==current,'nonreviewed Stepper current afterimage'

        five=[{'path':x['path'],'current':x['current']} for x in source['modules']]
        five.extend({'path':x['path'],'current':x['current']} for x in v2['additional_modules'])
        assert len(five)==5 and [x['path'] for x in five]==v2['product_paths']
        five_map={x['path']:x['current'] for x in five}
        sets=css['branches'][self.line]['source_sets'];assert len(sets)==1
        historical_key,historical_rows=next(iter(sets.items()))
        assert source_set_key(historical_rows)==historical_key==branch['source_set']['historical_sha256']
        v2_rows=[]
        for row in historical_rows:
            image=five_map.get('projects/ngx-material-legacy/'+row['path']) if row['root']==0 else None
            v2_rows.append({**row,'sha256':image['sha256'],'bytes':image['bytes']} if image else dict(row))
        assert source_set_key(v2_rows)==branch['source_set']['v2_current_sha256']
        rows=[{**row,'sha256':branch['reviewed_after']['sha256'],'bytes':branch['reviewed_after']['bytes']}
              if row['root']==0 and row['path']==SHORT else dict(row) for row in v2_rows]
        assert source_set_key(rows)==branch['source_set']['v3_current_sha256']
        assert next_packet['source_set']['v3_current_sha256']==branch['source_set']['v3_current_sha256']
        current_rows=[{**row,'sha256':next_packet['transition']['after']['sha256'],'bytes':next_packet['transition']['after']['bytes']} if row['root']==0 and row['path']==SHORT else dict(row) for row in rows]
        assert source_set_key(current_rows)==next_packet['source_set']['v4_current_sha256']
        assert len(current_rows)==next_packet['source_set']['all_source_count'] and next_packet['source_set']['changed_paths']==[SHORT]
        assert [row['path'] for row,prior_row in zip(current_rows,rows) if row!=prior_row]==[SHORT]

        assert len(rows)==branch['source_set']['all_source_count']
        owned=[row for row in rows if row['root']==0]
        assert len(owned)==branch['source_set']['owned_sass_count']==286
        assert len(rows)-len(owned)==branch['source_set']['source_set_nonowned_count']
        changed=[row['path'] for row,prior_row in zip(rows,v2_rows) if row!=prior_row]
        assert changed==branch['source_set']['changed_owned_sass_paths']==[SHORT]
        assert len(owned)-len(changed)==branch['source_set']['unchanged_owned_sass_count']==285
        for anchor in branch['owned_m2_anchors']:
            row=next(x for x in owned if 'projects/ngx-material-legacy/'+x['path']==anchor['path'])
            assert row['sha256']==anchor['sha256'] and row['bytes']==anchor['bytes']
        fp_raw=physical(root,FOCUS_PACKET['path']);identity(fp_raw,FOCUS_PACKET);fp=json.loads(fp_raw)
        assert fp['schema_version']==1 and fp['role']=='finite-current-main-strong-focus-source' and fp['source_scope_only'] is True
        assert fp['parent']=='d74c0d083077f227ea237aff33f42f6c75e76214' and fp['commit']=='e1848d4e3a04b31cbb616f16b77d80525f6a7a5c'
        assert fp['before']['path']=='projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss' and fp['after']['path']==fp['before']['path']
        env=dict(PATH=os.environ.get('PATH',''),LANG='C',LC_ALL='C',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_TERMINAL_PROMPT='0',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1')
        assert subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','rev-list','--parents','-n','1',fp['commit']],cwd=root,env=env,text=True).strip()==fp['commit']+' '+fp['parent']
        identity(historical(root,fp['parent'],fp['before']['path']),fp['before']);focus_after=historical(root,fp['commit'],fp['after']['path']);identity(focus_after,fp['after']);assert physical(root,fp['after']['path'])==focus_after
        identity(physical(root,fp['review']['path']),fp['review']);identity(physical(root,V4_HELPER['path']),V4_HELPER);assert source_set_key(current_rows)==fp['source_set_before']
        count=0;bound_rows=[]
        for row in current_rows:
            if row['root']==0 and 'projects/ngx-material-legacy/'+row['path']==fp['before']['path']:
                count+=1;assert row['sha256']==fp['before']['sha256'] and row['bytes']==fp['before']['bytes'];row={**row,'sha256':fp['after']['sha256'],'bytes':fp['after']['bytes']}
            bound_rows.append(row)
        assert count==1 and source_set_key(bound_rows)==fp['source_set_after']
        self._branch=freeze({**branch,'next_after':next_packet['transition']['after']})
        self._bound=[reference(SELF,IMAGE),FOCUS_PACKET,fp['review'],V4_HELPER,reference(version_path,version_raw),reference(PRIOR_HELPER['path'],old_helper),reference(NEXT_PACKET,next_raw),reference(PACKET,packet_raw),prior,v2['historical_source_packet'],
                     v2['historical_css_packet'],v2['protected_input_packet'],v2['style_template_census']]
        self._bound.extend({'path':'projects/ngx-material-legacy/'+row['path'],'sha256':row['sha256'],'bytes':row['bytes']} for row in bound_rows if row['root']==0)
        assert len({x['path'] for x in self._bound})==len(self._bound)
        self._bound=tuple(freeze(row) for row in self._bound)
        self._transition=freeze({'path':BRIDGE,'before':branch['before_git'],'current':next_packet['transition']['after']})
        self._source_set=freeze({'historical_sha256':historical_key,'v2_current_sha256':branch['source_set']['v2_current_sha256'],
                          'v3_current_sha256':branch['source_set']['v3_current_sha256'],'current_sha256':next_packet['source_set']['v4_current_sha256'],'rows':current_rows})
        _ACTIVE[self]={'active':False,'nested':False}
        self._sealed=True
        self.assert_current()
    @property
    def bound(self):return thaw(self._bound)
    @property
    def transition(self):return thaw(self._transition)
    @property
    def source_set(self):return thaw(self._source_set)
    @property
    def source_scope_only(self):return True
    @property
    def css_or_artifact_admission_granted(self):return False
    def assert_physical(self):
        assert physical(self.root,SELF)==IMAGE,'changed loaded Stepper helper'
        identity(physical(self.root,BRIDGE),self._branch['next_after'])
        for row in self._bound:identity(physical(self.root,row['path']),row)
    def _idle(self):
        state=_ACTIVE[self]
        if state['active']:
            state['nested']=True
            raise AssertionError('reentrant Stepper source guard')
    def assert_current(self):
        self._idle();state=_ACTIVE[self];state['active']=True;state['nested']=False
        try:
            self.assert_physical()
            for row in self._bound:
                actual=physical(self.root,row['path'])
                supplied=actual if self._read is None else self._read(row['path'])
                assert type(supplied) is bytes and supplied==actual,'nonphysical Stepper callback '+row['path']
                assert physical(self.root,row['path'])==actual,'Stepper source changed during callback '+row['path']
            self.assert_physical()
            assert not state['nested'],'nested Stepper source attempt'
        finally:state['active']=False
    def qualify(self,ref):
        self._idle()
        assert type(ref) is dict and {'path','sha256'}<=ref.keys()
        if ref['path']!=BRIDGE:return None
        selected=next((x for x in (self._branch['before_git'],self._branch['reviewed_after'],self._branch['next_after']) if x['sha256']==ref['sha256']),None)
        assert selected is not None,'unknown Stepper source predecessor'
        if 'bytes' in ref:assert ref['bytes']==selected['bytes']
        snapshot=dict(ref);self.assert_current();assert ref==snapshot,'Stepper source reference mutated'
        result={'path':BRIDGE,'sha256':self._branch['next_after']['sha256']}
        if 'bytes' in ref:result['bytes']=self._branch['next_after']['bytes']
        self.assert_physical()
        return result
