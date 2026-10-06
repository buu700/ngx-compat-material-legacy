/** Validate every npm archive member before extracting into a fresh package root. */
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
export function extractPackageArchive(tarball, destination, {maxFiles=20000,maxBytes=100*1024*1024} = {}) {
  if (!Number.isSafeInteger(maxFiles) || maxFiles<1 || !Number.isSafeInteger(maxBytes) || maxBytes<1) throw new Error('invalid archive limits');
  const python = `import sys,tarfile,pathlib,gzip,io
archive,destination=sys.argv[1:3]; limit_files,limit_bytes=map(int,sys.argv[3:])
root=pathlib.Path(destination)
source=pathlib.Path(archive); raw_limit=limit_bytes+limit_files*1024
if source.is_symlink() or not source.is_file() or source.stat().st_size>raw_limit: raise ValueError('unsafe or oversized package archive')
if any(parent.is_symlink() for parent in root.parents): raise ValueError('symlink extraction ancestor')
if root.is_symlink() or (root.exists() and not root.is_dir()): raise ValueError('unsafe extraction directory')
if (root/'package').exists() or (root/'package').is_symlink(): raise ValueError('package destination already exists')
with gzip.open(archive,'rb') as compressed:
 data=compressed.read(raw_limit+1)
if len(data)>raw_limit: raise ValueError('decompressed package size')
with tarfile.open(fileobj=io.BytesIO(data),mode='r:') as t:
 members=t.getmembers(); seen=set(); total=0
 if not members or len(members)>limit_files: raise ValueError('package member count')
 for m in members:
  p=pathlib.PurePosixPath(m.name); normalized=p.as_posix()
  if p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0]!='package' or '\\\\' in m.name or normalized!=m.name.rstrip('/') or normalized in seen or not (m.isdir() or m.isfile()): raise ValueError('unsafe package member')
  seen.add(normalized); total+=m.size
  if m.size<0 or total>limit_bytes: raise ValueError('package size')
 root.mkdir(parents=True,exist_ok=True)
 t.extractall(root,filter='data')
`;
  const result=spawnSync('python3',['-c',python,tarball,destination,String(maxFiles),String(maxBytes)],{encoding:'utf8',timeout:30000});
  if (result.status!==0 || result.error) throw new Error('package extraction refused: '+String(result.stderr || result.error?.message || result.stdout));
  return join(destination,'package');
}
