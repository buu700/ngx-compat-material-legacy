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

# All authority checks below use assertions; optimized Python must fail before loading data.
if not __debug__:
    raise RuntimeError('optimized Python cannot run Stepper source authority')

SELF = 'scripts/stepper_sixth_source.py'
PACKET = 'compatibility/rc/current-sass-stepper-sixth-source-inputs-v1.json'
PACKET_SHA = '1d566395c25e3569cee1031526ec05508e40cb866d7d5fda008cb6a325a9caec'
BRIDGE = 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss'
SHORT = 'styles/bridges/_companion-overrides.scss'
IMAGE = Path(__file__).read_bytes()
def digest(raw): return hashlib.sha256(raw).hexdigest()
def blob(raw): return hashlib.sha1(('blob ' + str(len(raw)) + '\0').encode() + raw).hexdigest()
def reference(path,raw): return {'path':path,'sha256':digest(raw),'bytes':len(raw)}
STEPPER_SIXTH_LOADED_IMAGE = reference(SELF, IMAGE)
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
class StepperSixthSource:
    __slots__=('root','line','_read','_branch','_bound','_transition','_source_set','_active','_sealed')
    def __setattr__(self,name,value):
        if getattr(self,'_sealed',False) and name!='_active':
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
        version=json.loads(physical(self.root,'projects/ngx-material-legacy/package.json'))['version']
        self.line='21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert self.line
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
        assert physical(self.root,BRIDGE)==expected,'nonreviewed Stepper afterimage'
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
        self._branch=freeze(branch)
        self._bound=[reference(SELF,IMAGE),reference(PACKET,packet_raw),prior,v2['historical_source_packet'],
                     v2['historical_css_packet'],v2['protected_input_packet'],v2['style_template_census']]
        self._bound.extend({'path':'projects/ngx-material-legacy/'+row['path'],'sha256':row['sha256'],'bytes':row['bytes']} for row in owned)
        assert len({x['path'] for x in self._bound})==len(self._bound)
        self._bound=tuple(freeze(row) for row in self._bound)
        self._transition=freeze({'path':BRIDGE,'before':branch['before_git'],'current':branch['reviewed_after']})
        self._source_set=freeze({'historical_sha256':historical_key,'v2_current_sha256':branch['source_set']['v2_current_sha256'],
                          'v3_current_sha256':branch['source_set']['v3_current_sha256'],'rows':rows})
        self._active=False
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
        identity(physical(self.root,BRIDGE),self._branch['reviewed_after'])
        for row in self._bound:identity(physical(self.root,row['path']),row)
    def assert_current(self):
        assert not self._active,'reentrant Stepper source guard'
        self._active=True
        try:
            self.assert_physical()
            for row in self._bound:
                actual=physical(self.root,row['path'])
                supplied=actual if self._read is None else self._read(row['path'])
                assert type(supplied) is bytes and supplied==actual,'nonphysical Stepper callback '+row['path']
                assert physical(self.root,row['path'])==actual,'Stepper source changed during callback '+row['path']
            self.assert_physical()
        finally:self._active=False
    def qualify(self,ref):
        assert not self._active,'reentrant Stepper source qualification'
        assert type(ref) is dict and {'path','sha256'}<=ref.keys()
        if ref['path']!=BRIDGE:return None
        selected=next((x for x in (self._branch['before_git'],self._branch['reviewed_after']) if x['sha256']==ref['sha256']),None)
        assert selected is not None,'unknown Stepper source predecessor'
        if 'bytes' in ref:assert ref['bytes']==selected['bytes']
        snapshot=dict(ref);self.assert_current();assert ref==snapshot,'Stepper source reference mutated'
        result={'path':BRIDGE,'sha256':self._branch['reviewed_after']['sha256']}
        if 'bytes' in ref:result['bytes']=self._branch['reviewed_after']['bytes']
        self.assert_physical()
        return result
