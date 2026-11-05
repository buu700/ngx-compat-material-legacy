from pathlib import Path
import hashlib,json,re
root=Path.cwd();pre='compatibility/rc/parallel-checkbox-button-public-bridge-'
def ref(path,base=root):
 b=(base/path).read_bytes();return dict(path=str(path),sha256=hashlib.sha256(b).hexdigest(),bytes=len(b))
lines=[]
for line,base in [('21.x',root),('main',Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'))]:
 families=[]
 for family in ['checkbox','button']:
  m3=base/'node_modules/@angular/material'/family/('_m3-'+family+'.scss')
  keys=sorted(set(re.findall(r'^\s+'+family+r'-([a-z0-9-]+):',m3.read_text(),re.M)))
  proposal=(root/(pre+'proposed-'+family+'-theme-v3.scss')).read_text()
  if family=='checkbox':proposed=set(re.findall(r'^\s+([a-z][a-z0-9-]+):',proposal,re.M))-{'display','color'}
  else:
   proposed=set(re.findall(r'^\s+((?:text|filled|protected|outlined)-[a-z0-9-]+):',proposal,re.M))
   suffixes=re.findall(r"'#\{\$variant\}-([a-z0-9-]+)':",proposal)
   proposed|={v+'-'+s for v in ['text','filled','protected','outlined'] for s in suffixes}
  assert proposed<=set(keys),(family,proposed-set(keys))
  consumers=[];sourcefiles=[]
  for p in sorted((base/'node_modules/@angular/material/fesm2022').glob('*.mjs')):
   if '.spec.' in p.name or 'testing' in p.name:continue
   text=p.read_text()
   if 'var(--mat-'+family+'-' not in text:continue
   sourcefiles.append(ref(p.relative_to(base),base))
   for key in keys:
    count=len(re.findall(r'var\(--mat-'+family+'-'+re.escape(key)+r'(?=[,)])',text))
    if count:consumers.append(dict(path=str(p.relative_to(base)),token=key,literal_var_occurrences=count))
  families.append(dict(family=family,public_root_export=family+'-overrides',public_definition=ref(Path('node_modules/@angular/material')/family/('_'+family+'-theme.scss'),base),public_model=ref(m3.relative_to(base),base),public_keys=keys,proposed_keys=sorted(proposed),proposed_key_count=len(proposed),all_proposed_keys_present=True,current_literal_consumer_sources=sourcefiles,current_literal_consumers=consumers,proposed_keys_without_literal_var_consumer=sorted(proposed-{r['token'] for r in consumers})))
 lines.append(dict(line=line,material_manifest=ref('node_modules/@angular/material/package.json',base),root_public_index=ref('node_modules/@angular/material/_index.scss',base),families=families))
(root/(pre+'public-token-map-v1.json')).write_text(json.dumps(dict(schema_version=1,role='Finite static minimum public override map and literal consumer census',lines=lines,limitations=['Literal var consumer inventory is source evidence, not computed style/rendering or all possible dynamic consumers.','Current m2/private model files are review references only and absent from proposed product dependencies.'],new_compiles=0),indent=2)+'\n')
print(json.dumps([dict(line=l['line'],families=[dict(family=f['family'],public_keys=len(f['public_keys']),proposed_keys=f['proposed_key_count'],without_literal=f['proposed_keys_without_literal_var_consumer']) for f in l['families']]) for l in lines]))
