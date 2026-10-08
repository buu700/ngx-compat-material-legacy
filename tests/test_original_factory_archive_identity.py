"""Archive authentication rejects self-consistent but unauthentic capture inputs."""
import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('factory_sources',ROOT/'scripts/verify_material16_factory_sources.py')
validator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)

class OriginalFactoryArchiveIdentityTests(unittest.TestCase):
    def test_archive_bytes_are_authority_over_extracted_bytes_and_capture_statements(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);lock={'packages':{}};rows=[]
            for index,package in enumerate(['@angular/material','@angular/cdk','@angular/forms','@angular/core']):
                directory=root/str(index);(directory/'fesm2022').mkdir(parents=True)
                name='fesm2022/core.mjs' if package=='@angular/core' else 'fesm2022/index.mjs'
                content=b'export const original=true;\n'
                manifest=json.dumps({'name':package,'version':'16.2.12' if index>1 else '16.2.14'}).encode()
                (directory/'package.json').write_bytes(manifest);(directory/name).write_bytes(content)
                archive=directory/'source.tgz'
                with tarfile.open(archive,'w:gz') as tf:
                    for member,data in [('package/package.json',manifest),('package/'+name,content)]:
                        entry=tarfile.TarInfo(member);entry.size=len(data);tf.addfile(entry,io.BytesIO(data))
                raw=archive.read_bytes();integrity='sha512-'+base64.b64encode(hashlib.sha512(raw).digest()).decode()
                version=json.loads(manifest)['version'];lock['packages']['node_modules/'+package]={'version':version,'integrity':integrity}
                rows.append({'package':package,'version':version,'integrity':integrity,'archive_path':str(archive),
                    'tarball_sha256':hashlib.sha256(raw).hexdigest(),'directory':str(directory),
                    'manifest_sha256':hashlib.sha256(manifest).hexdigest(),
                    'members':[{'path':name,'sha256':hashlib.sha256(content).hexdigest(),'bytes':len(content)}],
                    'member_sha256':hashlib.sha256(content).hexdigest()})
            lock_path=root/'reference/material-16.2.14/environment-package-lock.json';lock_path.parent.mkdir(parents=True)
            lock_path.write_text(json.dumps(lock));identities=root/'identities.json';core_identity=root/'core.json'
            baseline={'lock_sha256':hashlib.sha256(lock_path.read_bytes()).hexdigest(),'packages':rows[:3]}
            identities.write_text(json.dumps(baseline));core_identity.write_text(json.dumps(rows[3]));core_source=Path(rows[3]['directory'])/'fesm2022/core.mjs'
            prior=validator.ROOT;validator.ROOT=root
            try:
                def verify():return validator.verify(identities,core_identity,core_source)
                self.assertEqual(verify(),{'archives':4,'members':4,'javascript_execution':False})
                source=Path(rows[0]['directory'])/rows[0]['members'][0]['path'];original=source.read_bytes()
                source.write_bytes(b'export const changed=true;\n')
                forged=json.loads(json.dumps(baseline));forged['packages'][0]['members'][0].update(
                    sha256=hashlib.sha256(source.read_bytes()).hexdigest(),bytes=source.stat().st_size)
                identities.write_text(json.dumps(forged))
                with self.assertRaisesRegex(ValueError,'extracted bytes differ'):verify()
                source.write_bytes(original)
                for mutate,reason in [
                    (lambda d:d['packages'][0].update(members=[]),'roster'),
                    (lambda d:d['packages'][0].update(tarball_sha256='0'*64),'archive digest'),
                    (lambda d:d.update(lock_sha256='0'*64),'lock identity'),
                    (lambda d:d['packages'].reverse(),'package roster'),
                ]:
                    altered=json.loads(json.dumps(baseline));mutate(altered);identities.write_text(json.dumps(altered))
                    with self.assertRaisesRegex(ValueError,reason):verify()
                identities.write_text(json.dumps(baseline));altered=dict(rows[3],package='@angular/forms');core_identity.write_text(json.dumps(altered))
                with self.assertRaisesRegex(ValueError,'framework package identity'):verify()
                core_identity.write_text(json.dumps(rows[3]));core_source.write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError,'core source differs'):verify()
            finally:validator.ROOT=prior
