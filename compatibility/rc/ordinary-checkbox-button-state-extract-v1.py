# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Read actual tagged/owned/minimum peer sources; never execute upstream code."""
from pathlib import Path
import hashlib,json,re,subprocess,os
R=Path.cwd();M=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/ordinary-checkbox-button-state-';sha=lambda b:hashlib.sha256(b).hexdigest()
def ref(root,path):
 b=(root/path).read_bytes();return {'path':path,'sha256':sha(b),'bytes':len(b)}
def write(path,body):
 assert not (R/path).exists();(R/path).write_bytes(body);return ref(R,path)
env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
for k in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(k,None)
def git(*args):return subprocess.check_output(['git','--git-dir=/home/parallels/.cache/angular-components.git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=R,env=env)
commit=git('rev-parse','16.2.14^{commit}').decode().strip();assert commit=='df60e733c60e572ba538f6ad0ceff3e63e527b53';rawcommit=git('cat-file','commit',commit);tree=git('rev-parse',commit+'^{tree}').decode().strip();tagged=[]
for family in ['checkbox','button']:
 path='src/material/'+family+'/'+family+'.scss';blob=git('rev-parse',commit+':'+path).decode().strip();body=git('show',commit+':'+path);assert hashlib.sha1(b'blob '+str(len(body)).encode()+b'\0'+body).hexdigest()==blob;tagged.append({'path':path,'blob':blob,'body':write(P+'tagged16-'+family+'-component.scss',body)})
 if family=='checkbox':assert body==(R/'compatibility/rc/parallel-checkbox-button-public-bridge-tagged16-checkbox-component.scss').read_bytes()
pre=json.loads((R/'compatibility/rc/parallel-spinner-snack-gate-integration-original16-source-view-preflight-v1.json').read_bytes());reference=Path(pre['referenceRoot']);identity=json.loads((R/'compatibility/rc/original16-sass-source-diagnostic-identity.json').read_bytes());known={x['path']:x for x in next(iter(identity['loaded_source_sets'].values()))};original=[]
for path in ['@material/checkbox/_checkbox-theme.scss','@material/ripple/_ripple-theme.scss','@material/button/_button-base.scss','@material/typography/_typography.scss','@angular/material/core/tokens/m2/mdc/_checkbox.scss','@angular/material/checkbox/_checkbox-theme.scss','@angular/material/button/_button-theme.scss']:
 actual=ref(reference,path);assert actual['sha256']==known[path]['sha256'] and actual['bytes']==known[path]['bytes'];original.append(actual)
branches={}
paths=['projects/ngx-material-legacy/legacy-checkbox/checkbox.scss','projects/ngx-material-legacy/legacy-checkbox/checkbox.html','projects/ngx-material-legacy/legacy-checkbox/checkbox.ts','projects/ngx-material-legacy/legacy-button/button.scss','projects/ngx-material-legacy/legacy-button/button.html','projects/ngx-material-legacy/legacy-button/button.ts','projects/ngx-material-legacy/styles/legacy-checkbox/_checkbox-theme.scss','projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss','projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss','projects/ngx-material-legacy/styles/button/_button-theme.scss','projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_checkbox.scss','projects/ngx-material-legacy/styles/vendor/mdc/checkbox/_checkbox-theme.scss','projects/ngx-material-legacy/styles/vendor/mdc/ripple/_ripple-theme.scss','projects/ngx-material-legacy/styles/vendor/mdc/button/_button-base.scss','projects/ngx-material-legacy/styles/vendor/mdc/typography/_typography.scss','node_modules/@angular/material/package.json','node_modules/@angular/cdk/package.json','node_modules/@angular/material/_index.scss','node_modules/@angular/material/checkbox/_checkbox-theme.scss','node_modules/@angular/material/button/_button-theme.scss','node_modules/@angular/material/fesm2022/checkbox.mjs','node_modules/@angular/material/fesm2022/button.mjs','node_modules/@angular/material/fesm2022/checkbox.mjs.map','node_modules/@angular/material/fesm2022/button.mjs.map']
for line,root,version in [('21.x',R,'21.2.14'),('main',M,'22.1.7')]:
 assert json.loads((root/'node_modules/@angular/material/package.json').read_bytes())['version']==version;assert json.loads((root/'node_modules/@angular/cdk/package.json').read_bytes())['version']==version;css=[]
 for family in ['checkbox','button']:
  path='node_modules/@angular/material/fesm2022/'+family+'.mjs';text=(root/path).read_text();matches=list(re.finditer(r'styles:\s*\[("(?:\\.|[^"\\])*")',text));assert len(matches)>=1;body=json.loads(matches[0][1]);assert body==json.loads(matches[1][1]);css.append({'family':family,'FESM_line':text.count('\n',0,matches[0].start())+1,'extraction':'Exact first styles-array JSON string, equal to its duplicate metadata copy','css':write(P+('21'if line=='21.x'else'main')+'-'+family+'-component.css',body.encode())})
 branches[line]={'peer_version':version,'source_refs':[ref(root,p)for p in paths],'peer_component_css':css}
proposal=json.loads((R/'compatibility/rc/parallel-checkbox-button-public-bridge-proposed-afterimages-v3.json').read_bytes())
for row in proposal['members']:assert ref(R,row['before']['path'])==row['before'] and ref(R,row['after']['path'])==row['after']
out={'schema_version':1,'role':'Independent source-only authentic16 and actual minimum input extraction','tagged16':{'commit':commit,'raw_commit_sha256':sha(rawcommit),'tree':tree,'members':tagged},'original_reference_root':str(reference),'original_Sass_source_map':ref(R,'compatibility/rc/original16-sass-source-diagnostic-identity.json'),'original_Sass_members_individually_rehashed':original,'proposal':ref(R,'compatibility/rc/parallel-checkbox-button-public-bridge-proposed-afterimages-v3.json'),'branches':branches,'compiler_executed':False,'browser_or_computed_style_executed':False,'upstream_code_executed':False,'network_used':False,'g11_claim':'not-passed'};print(json.dumps(write(P+'inputs-v1.json',(json.dumps(out,indent=2)+'\n').encode())))
for file in (R/'compatibility/rc').glob('ordinary-checkbox-button-state-*'):
 if file.is_file():(M/file.relative_to(R)).write_bytes(file.read_bytes())
