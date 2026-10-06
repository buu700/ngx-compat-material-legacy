"""Capture original compiler factory metadata from the locked untouched Material16 package."""
import argparse,base64,hashlib,io,json,re,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def capture(tarball,lock_path,package="@angular/material"):
    lock=json.loads(lock_path.read_text());
    if package not in ('@angular/material','@angular/cdk'):raise ValueError('unsupported original package')
    record=lock['packages']['node_modules/'+package];raw=tarball.read_bytes()
    algorithm,expected=record['integrity'].split('-',1)
    if base64.b64encode(hashlib.new(algorithm,raw).digest()).decode()!=expected:raise ValueError('historical Material registry integrity mismatch')
    rows={};sources={}
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
        manifest=json.load(archive.extractfile('package/package.json'))
        if manifest['name']!=package or manifest['version']!='16.2.14':raise ValueError('not the untouched Material16.2.14 package')
        for member in archive.getmembers():
            if not member.name.startswith('package/fesm2022/') or not member.name.endswith('.mjs'):continue
            if not member.isfile():raise ValueError('historical JS member is not regular')
            body=archive.extractfile(member).read();text=body.decode();family=Path(member.name).stem
            matches=list(re.finditer(r'ɵɵngDeclareFactory\((\{[^\n]+\})\)',text))
            for match in matches:
                declaration=match.group(1);typ=re.search(r'\btype:\s*(\w+)\s*,\s*deps:\s*("invalid"|null|\[[^\n]*\])\s*,\s*target:',declaration)
                if not typ:raise ValueError('unrecognized historical factory: '+member.name)
                name,deps=typ.groups();key=family+'/'+name
                if key in rows:raise ValueError('duplicate historical factory '+key)
                kind='invalid' if deps=='"invalid"' else 'inherited' if deps=='null' else 'dependencies'
                attributes=re.findall(r"\{\s*token:\s*(['\"])(.*?)\1,\s*attribute:\s*true\s*\}",deps)
                rows[key]=dict(family=family,name=name,deps_kind=kind,declaration=declaration,attributes=[name for quote,name in attributes],source=member.name.removeprefix('package/'),source_sha256=hashlib.sha256(body).hexdigest())
            if matches:sources[member.name.removeprefix('package/')]=hashlib.sha256(body).hexdigest()
    if not rows:raise ValueError('empty historical factory population')
    return dict(schema_version=1,role='Untouched16.2.14 compiler metadata; not candidate expectations',package=package,version='16.2.14',registry_tarball=record['resolved'],integrity=record['integrity'],tarball_sha256=hashlib.sha256(raw).hexdigest(),lock_sha256=hashlib.sha256(lock_path.read_bytes()).hexdigest(),sources=sources,factories=rows)
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--tarball',type=Path,required=True);parser.add_argument('--out',type=Path,required=True);parser.add_argument('--package',choices=['@angular/material','@angular/cdk'],default='@angular/material');args=parser.parse_args()
    if args.out.exists():raise SystemExit('refuse to overwrite existing reference metadata')
    result=capture(args.tarball,ROOT/'reference/material-16.2.14/environment-package-lock.json',args.package);args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,indent=2)+'\n');print('Captured',len(result['factories']),'original factory declarations')
