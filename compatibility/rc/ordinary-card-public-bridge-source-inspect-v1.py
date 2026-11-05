#!/usr/bin/env python3
# Copyright Google LLC. Copyright (c) 2026 Ryan Lester. MIT; see LICENSE.
"""Card-only read-only source/value provenance. No compiler or network."""
import hashlib,json,os,re,subprocess
from pathlib import Path
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/ordinary-card-public-bridge-'
def sha(b):return hashlib.sha256(b).hexdigest()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def ref(base,p):
 b=(base/p).read_bytes();return dict(path=p,sha256=sha(b),bytes=len(b))
def loc(base,p,s):
 x=(base/p).read_text();assert s in x;return dict(path=p,line=x[:x.index(s)].count('\n')+1,text=s)
def git(base,args):
 env={k:v for k,v in os.environ.items()if not k.startswith('GIT_')};env.update(GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1',GIT_TERMINAL_PROMPT='0')
 return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=base,env=env)
packet=json.loads((ROOT/(P+'original-cases-v1.json')).read_bytes());pf=json.loads((ROOT/'compatibility/rc/parallel-spinner-snack-gate-integration-original16-source-view-preflight-v1.json').read_bytes());REF=Path(pf['referenceRoot']);TAG='df60e733c60e572ba538f6ad0ceff3e63e527b53';CACHE=Path('/home/parallels/.cache/angular-components.git')
for r in packet['all_original_loaded_sources']:assert ref(REF,r['path'])=={k:v for k,v in r.items()if k!='root'}
assert sha((ROOT/'reference/material-16.2.14/environment-package-lock.json').read_bytes())=='ad2f9d62bf04758f87650cae408f805e667236f992cd6d8e481c5577c939d130'
paths=['card/_card-theme.scss','core/tokens/m2/mdc/_elevated-card.scss','core/tokens/m2/mdc/_outlined-card.scss','core/tokens/m2/mat/_card.scss','core/tokens/_token-utils.scss']
auth=[]
for p in paths:
 tagged=git(CACHE,['show',TAG+':src/material/'+p]);actual=(REF/'@angular/material'/p).read_bytes();assert tagged==actual
 owned=(ROOT/'projects/ngx-material-legacy/styles'/p).read_bytes();expected=actual
 if p=='card/_card-theme.scss':
  for variant in ['elevated','outlined']:expected=expected.replace(('@material/card/'+variant+'-card-theme').encode(),('../vendor/mdc/card/'+variant+'-card-theme').encode())
 if p=='core/tokens/_token-utils.scss':
  for suffix in ['elevation/elevation-theme','theme/custom-properties','theme/theme','theme/keys']:expected=expected.replace(('@material/'+suffix).encode(),('../../vendor/mdc/'+suffix).encode())
 assert expected==owned
 auth.append(dict(tag=TAG,tagged_path='src/material/'+p,git_blob=blob(tagged),reference=ref(REF,'@angular/material/'+p),owned=ref(ROOT,'projects/ngx-material-legacy/styles/'+p),comparison='Exact bytes after only enumerated @material→ownedvendor import relocation' if actual!=owned else 'Exact bytes'))
roles=['elevated-container-color','elevated-container-elevation','outlined-container-color','outlined-container-elevation','outlined-outline-color'];branches=[]
for line,root,version in [('21.x',ROOT,'21.2.14'),('main',MAIN,'22.1.7')]:
 raw=git(root,['ls-tree','-rz','HEAD','--','projects/ngx-material-legacy']);entries={}
 for part in raw.split(b'\0'):
  if not part:continue
  meta,path=part.split(b'\t');mode,kind,oid=meta.split();p=path.decode()
  if p.endswith('.scss'):assert kind==b'blob';entries[p]=oid.decode()
 owned=[]
 for p,oid in sorted(entries.items()):
  b=(root/p).read_bytes();assert blob(b)==oid,p;owned.append(dict(**ref(root,p),git_blob=oid))
 assert len(owned)==409
 material='node_modules/@angular/material/';manifest=json.loads((root/(material+'package.json')).read_bytes());assert manifest['version']==version
 theme=(root/(material+'card/_card-theme.scss')).read_text();model=(root/(material+'card/_m3-card.scss')).read_text();index=(root/(material+'_index.scss')).read_text();assert 'card-overrides' in index;assert 'namespace: card' in theme and '@mixin overrides($tokens: ())' in theme
 fesm=material+'fesm2022/card.mjs';text=(root/fesm).read_text();styles=[]
 for m in re.finditer(r'styles:\s*\[\s*("(?:[^"\\]|\\.)*")',text):
  css=json.loads(m[1]);
  if css not in styles:styles.append(css)
 assert len(styles)==1;css=styles[0];consumers=[]
 for role in roles:
  key='--mat-card-'+role;assert 'card-'+role+':' in model and 'var('+key in css
  at=css.index('var('+key);start=css.rfind('}',0,at)+1;end=css.index('}',at)+1
  consumers.append(dict(public_key=role,var=key,rule=css[start:end].strip()))
 assert 'this.appearance = config?.appearance || \'raised\'' in text
 assert 'classAttribute: "mat-mdc-card mdc-card"' in text
 assert '"class.mat-mdc-card-outlined": "appearance === \\"outlined\\""' in text
 positives=['subtitle-text-color']+[x+'-'+y for x in ['title-text','subtitle-text']for y in ['font','line-height','size','tracking','weight']]
 for key in positives:assert 'var(--mat-card-'+key in css
 inputs=[material+'package.json',material+'_index.scss',material+'card/_card-theme.scss',material+'card/_m2-card.scss',material+'card/_m3-card.scss',fesm,'projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/styles/card/_card-theme.scss','projects/ngx-material-legacy/styles/legacy-card/_card-theme.scss','projects/ngx-material-legacy/legacy-card/card.ts','projects/ngx-material-legacy/styles/core/theming/_all-theme.scss','projects/ngx-material-legacy/styles/legacy-core/theming/_all-theme.scss','projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss','research/sass-symbols.json']
 branches.append(dict(line=line,material_minimum=version,inputs=[ref(root,p)for p in inputs],public_api=loc(root,material+'card/_card-theme.scss','@mixin overrides($tokens: ())'),public_root_forward=loc(root,material+'_index.scss','card-overrides'),current_consumers=consumers,decoded_css_sha256=sha(css.encode()),existing_11_mat_names=positives,unchanged_owned409_git_refs=owned,owned_head_commit=git(root,['rev-parse','HEAD']).decode().strip(),current_peer_filled_appearance='Exists but is not a historical role translated by this proposal; no filled tokens added',base_geometry='Shape and outline-width responsibility remains independent; this five-role color proposal adds no geometry token'))
cyph=Path('/home/parallels/cyph');path='shared/css/mixins.scss';text=(cyph/path).read_text();calls=[dict(name=m[1],line=text[:m.start()].count('\n')+1)for m in re.finditer(r'@include\s+mat\.([a-zA-Z0-9_-]+)',text)if 'card' in m[1]or m[1]=='all-legacy-component-themes'];assert not any(r['name'].startswith('card-')for r in calls)
proposal=json.loads((ROOT/(P+'proposed-afterimage-v1.json')).read_bytes());after=(ROOT/proposal['after']['path']).read_text();before=(ROOT/proposal['target']).read_text();assert sha(before.encode())==proposal['before']['sha256'];inverse=after
for added in proposal['exact_inverse_additions']:assert inverse.count(added)==1;inverse=inverse.replace(added,'')
assert inverse==before;assert after.split('@mixin theme-from-tokens')[1]==before.split('@mixin theme-from-tokens')[1]
locs=[loc(ROOT,'projects/ngx-material-legacy/styles/card/_card-theme.scss','@mixin color'),loc(ROOT,'projects/ngx-material-legacy/styles/core/tokens/_token-utils.scss','@function resolve-elevation'),loc(ROOT,'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_outlined-card.scss','outline-color: theming.get-color-from-palette($foreground, base, 0.12)'),loc(ROOT,'projects/ngx-material-legacy/styles/core/theming/_all-theme.scss','@include card-theme.theme'),loc(ROOT,'projects/ngx-material-legacy/styles/legacy-core/theming/_all-theme.scss',"@use '../../legacy-card/card-theme'"),loc(ROOT,'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss','@mixin all-current-companion-bridges'),loc(ROOT,'projects/ngx-material-legacy/legacy-card/card.ts',"'class': 'mat-card mat-focus-indicator'")]
out=dict(schema_version=1,role='Card-only source/API/immutable-original value identity, no Sass compiler',tagged_commit=TAG,tagged_tree=git(CACHE,['rev-parse',TAG+'^{tree}']).decode().strip(),original286_rehashed=True,owned_original_comparisons=auth,proposal_exact_inverse=True,source_locations=locs,branches=branches,cyph_readonly=dict(root=str(cyph),file=ref(cyph,path),inspected_call_sites=calls,ordinary_card_calls_in_inspected_file=0,scope='Single existing mixins file sanity, no consumer build or full usage qualification'),later_integration=dict(explicit_ordinary_exports=['card-color','card-theme','card-typography','card-density'],ordinary_aggregate='all-component-themes and its color/typography composition may transitively emit card tokens; uncompiled here',all_legacy_13_companion_scope='Card is not one of the13; existing all-legacy/owned aggregate uses legacy-card; keep both unchanged',guard='Existing spinner/snack source subject pins card among unchanged owned before-model inputs; any actual card product application requires a separately reviewed finite source successor and current input closure, no generic source-hash refresh',qualifies_current_physical_card=False),no_existing_files_modified=True)
output=ROOT/(P+'source-evidence-v1.json');assert not output.exists();output.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(dict(path=str(output.relative_to(ROOT)),sha256=sha(output.read_bytes()),bytes=output.stat().st_size,tagged_files=5,current_native_roles=10,source_refs_per_line=len(owned))))
