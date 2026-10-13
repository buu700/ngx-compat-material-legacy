import json,tarfile,hashlib,base64,shutil,sys
from pathlib import Path,PurePosixPath
work=Path(__file__).resolve().parent
old=Path('/home/parallels/.cache/ngx-compat-material-legacy-closeout/tool-advisory-subjects/31e9770f7dc71119a58509353b27917557aaf0ac9b5ef1a0465ee7d8ec67ae75.tgz')
research=Path('/tmp/ngx-npm-brace-remediation-ek_rbwld')
new=research/'brace-expansion-5.0.12.tgz';meta=json.loads((research/'brace-expansion-5.0.12.json').read_text())
assert hashlib.sha256(old.read_bytes()).hexdigest()=='31e9770f7dc71119a58509353b27917557aaf0ac9b5ef1a0465ee7d8ec67ae75'
assert 'sha512-'+base64.b64encode(hashlib.sha512(new.read_bytes()).digest()).decode()==meta['dist']['integrity']
def unpack(archive,destination):
 destination.mkdir(mode=0o700);rows=[]
 with tarfile.open(archive) as tf:
  for member in tf:
   p=PurePosixPath(member.name)
   assert p.parts[0]=='package' and not p.is_absolute() and '..' not in p.parts
   target=destination.joinpath(*p.parts[1:])
   if member.isdir():target.mkdir(parents=True,exist_ok=True);continue
   assert member.isfile() and not target.exists(),member.name
   data=tf.extractfile(member).read();target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);target.chmod(0o644)
   rows.append({'path':member.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 return rows
original=work/'npm-original';members=unpack(old,original);fixed=work/'npm-fixed';shutil.copytree(original,fixed)
replacement=fixed/'node_modules/brace-expansion';shutil.rmtree(replacement);fixed_members=unpack(new,replacement)
(work/'subjects.json').write_text(json.dumps({'npm_archive_sha256':hashlib.sha256(old.read_bytes()).hexdigest(),'fixed_archive_sha256':hashlib.sha256(new.read_bytes()).hexdigest(),'fixed_sri':meta['dist']['integrity'],'publication':json.loads((research/'publication.json').read_text()),'base_files':members,'fixed_module_files':fixed_members,'target_modules':{'original':str(original),'fixed':str(fixed)}},indent=2)+'\n')
print(json.dumps({'authenticated_npm_files':len(members),'fixed_module_files':len(fixed_members),'actual_installed_module_comparison_only':True}))
