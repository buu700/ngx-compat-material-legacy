from pathlib import Path
import json,hashlib,base64,urllib.request,concurrent.futures
root=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');raw=(root/'compatibility/rc/material-public-subjects.json').read_bytes();assert hashlib.sha256(raw).hexdigest()=='f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3';cap=json.loads(raw);dest=Path('/tmp/closeout-remaining-identities-20261015/extra-archives');dest.mkdir(exist_ok=True)
work=[(s['line'],p) for s in cap['subjects'] if s['line']!='original' for p in s['packages'] if p['name'] in ['@angular/core','@angular/forms']]
def acquire(item):
 line,p=item;url='https://registry.npmjs.org/'+p['name']+'/-/'+p['name'].split('/')[-1]+'-'+p['version']+'.tgz';target=dest/line/(p['name'].replace('/','__')+'.tgz');target.parent.mkdir(exist_ok=True)
 data=target.read_bytes() if target.exists() else urllib.request.urlopen(url,timeout=45).read();assert len(data)==p['archive_bytes'];assert hashlib.sha256(data).hexdigest()==p['archive_sha256'];assert 'sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()==p['integrity']
 if not target.exists():target.write_bytes(data)
 return {'line':line,'package':p,'url':url,'path':str(target),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'SRI_verified_now':True,'package_installation_or_lifecycle':False}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(acquire,work))
(dest/'acquisition.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps([{'line':r['line'],'package':r['package']['name'],'version':r['package']['version'],'bytes':r['bytes'],'SRI_verified_now':True} for r in results]))
