# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT.
import tarfile,hashlib,json,pathlib
sha=lambda b:hashlib.sha256(b).hexdigest()
a=pathlib.Path('/home/parallels/.codex/closeout-state/2026-11-14-resume/legacy-animation-combined-c72-v2-final-runtime/ngx-compat-material-legacy-22.0.0-rc.0.tgz');b=pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/artifacts/main/entry-resume-4015-20261114/ngx-compat-material-legacy-22.0.0-rc.0.tgz');s=pathlib.Path('/home/parallels/.codex/closeout-state/2026-11-14-resume/legacy-animation-combined-c72-v2-final-runtime/qualification-source-snapshot.patch')
assert sha(a.read_bytes())=='04092350fea6096cac866268fc295eb390b2670c67366a3195a75c14b319be88';assert sha(b.read_bytes())=='877c8b62e1ea9b134d838043dda436abb4ccf9515041640fdb05dc6113727b0b';assert sha(s.read_bytes())=='8832414542be2d87c660ffbc32d72c590d13883a099a4eac07db2fbc0fe5e80f'
def read(p):
 with tarfile.open(p) as t:
  m=t.getmembers();assert len(m)==512 and all(x.isfile() and x.name.startswith('package/') and '..' not in x.name.split('/') for x in m);assert len(set(x.name for x in m))==512;return {x.name[8:]:t.extractfile(x).read() for x in m}
x=read(a);y=read(b);assert set(x)==set(y);extract=pathlib.Path('/home/parallels/.codex/closeout-state/2026-11-14-resume/legacy-animation-combined-c72-v2-final-runtime/legacy-extract-1794688037415/ngx-legacy-artifact-THBJDA/package');actual={str(p.relative_to(extract)) for p in extract.rglob('*') if p.is_file()};assert actual==set(x);assert all(not p.is_symlink() for p in extract.rglob('*'));assert all((extract/k).read_bytes()==v for k,v in x.items())
files={k:{'bytes':len(v),'sha256':sha(v),'prior_bytes':len(y[k]),'prior_sha256':sha(y[k])} for k,v in sorted(x.items())};maps={}
for family in ['legacy-form-field','legacy-select']:
 prefix='fesm2022/ngx-compat-material-legacy-'+family+'.mjs';m=json.loads(x[prefix+'.map']);assert len(m['sources'])==len(m['sourcesContent']);entries=[]
 for name,content in zip(m['sources'],m['sourcesContent']):
  path=name.removeprefix('../../../');candidate=pathlib.Path('/tmp/legacy-animation-combined-c72')/path;generated=name.endswith('/ngx-compat-material-legacy-'+family+'.ts')
  if generated:assert content=="/**\n * Generated bundle index. Do not edit.\n */\n\nexport * from './public-api';\n"
  else:assert candidate.is_file() and candidate.read_text()==content,(family,name)
  entries.append({'path':path,'sha256':sha(content.encode()),'generated_bundle_index':generated})
 maps[family]={'bundle_sha256':sha(x[prefix]),'map_sha256':sha(x[prefix+'.map']),'sources':entries}
report={'schema_version':1,'scope':'exact image and extracted physical tree; two complete FESM embedded source maps; no G02/G11','base':'c72d0ed6b9bbb918eb08b4c4efb37bcf89894707','source_snapshot_sha256':sha(s.read_bytes()),'candidate_archive_sha256':sha(a.read_bytes()),'prior_archive_sha256':sha(b.read_bytes()),'member_count':len(x),'changed_member_count':sum(x[k]!=y[k] for k in x),'members':files,'family_maps':maps};pathlib.Path('compatibility/rc/qualification/api-node-combined-v1/artifact-census.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'members':len(x),'changed_members':report['changed_member_count'],'maps':{k:{'bundle_sha256':v['bundle_sha256'],'map_sha256':v['map_sha256'],'sources':len(v['sources'])} for k,v in maps.items()}}))
