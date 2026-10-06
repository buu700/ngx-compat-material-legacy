"""Archive members are validated before any package file is written."""
import io
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
class SafePackageExtractionTests(unittest.TestCase):
    def test_valid_archive_and_refusal_before_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp)
            def execute(kind):
                archive=base/(kind+'.tgz');destination=base/kind
                with tarfile.open(archive,'w:gz') as t:
                    data=b'first regular file must not be written on refusal';member=tarfile.TarInfo('package/bin/tool.js');member.size=len(data);t.addfile(member,io.BytesIO(data))
                    if kind!='valid':
                        member=tarfile.TarInfo({'traversal':'package/../../escape','absolute':'/tmp/escape','duplicate':'package/bin/tool.js','normalized':'package//bin/other.js'}.get(kind,'package/bad'))
                        if kind in ['symlink','hardlink']:member.type=tarfile.SYMTYPE if kind=='symlink' else tarfile.LNKTYPE;member.linkname='/tmp/escape'
                        if kind=='device':member.type=tarfile.CHRTYPE
                        t.addfile(member)
                code="import {extractPackageArchive} from './scripts/safe-package-extract.mjs';extractPackageArchive(process.argv[1],process.argv[2]);"
                run=subprocess.run(['node','--input-type=module','-e',code,str(archive),str(destination)],cwd=ROOT,capture_output=True,text=True)
                return run,destination
            result,destination=execute('valid');self.assertEqual(result.returncode,0,result.stderr);self.assertTrue((destination/'package/bin/tool.js').is_file())
            for kind in ['traversal','absolute','duplicate','normalized','symlink','hardlink','device']:
                result,destination=execute(kind);self.assertNotEqual(result.returncode,0,kind);self.assertFalse((destination/'package').exists(),kind)
    def test_existing_or_symlink_destination_and_size_bomb_are_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);archive=base/'archive.tgz'
            with tarfile.open(archive,'w:gz') as t:
                data=b'x'*100000;member=tarfile.TarInfo('package/large');member.size=len(data);t.addfile(member,io.BytesIO(data))
            code="import {extractPackageArchive} from './scripts/safe-package-extract.mjs';extractPackageArchive(process.argv[1],process.argv[2],{maxFiles:10,maxBytes:100});"
            destination=base/'bomb';run=subprocess.run(['node','--input-type=module','-e',code,str(archive),str(destination)],cwd=ROOT,capture_output=True,text=True)
            self.assertNotEqual(run.returncode,0);self.assertFalse(destination.exists())
            regular=base/'existing';(regular/'package').mkdir(parents=True);(regular/'package/keep').write_text('preserve')
            alias=base/'alias';alias.symlink_to(regular,target_is_directory=True)
            code="import {extractPackageArchive} from './scripts/safe-package-extract.mjs';extractPackageArchive(process.argv[1],process.argv[2]);"
            for destination in [regular,alias,alias/'child']:
                run=subprocess.run(['node','--input-type=module','-e',code,str(archive),str(destination)],cwd=ROOT,capture_output=True,text=True)
                self.assertNotEqual(run.returncode,0)
            self.assertEqual((regular/'package/keep').read_text(),'preserve');self.assertFalse((regular/'child').exists())
if __name__=='__main__':unittest.main()
