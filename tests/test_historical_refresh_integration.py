# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Disposable A/B frame and synthetic profile checks; no production seal."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NODE = '/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'
FILES = ('scripts/historical-source-replay.mjs', 'scripts/check-dependency-eligibility.py',
         'scripts/prepare-historical-replay-frame.py', 'scripts/prepare-main-private-npm-profile-v3.py',
         'tests/historical_replay_current_frame_successor_probe.mjs',
         'tests/npm_replay_checker_self_pin_transport_v3_probe.mjs',
         'tests/test_npm_replay_checker_self_pin_transport_v3.py',
         'tests/test_prepare_historical_replay_frame.py', 'tests/test_historical_source_replay.py',
         'tests/test_historical_refresh_integration.py')

def canonical(value):
    return (json.dumps(value, indent=2) + '\n').encode()

class RefreshIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ngx-refresh-private-')
        cls.base = Path(cls.temp.name)
        cls.root = cls.base / 'repo'
        cls.env = {k: v for k, v in os.environ.items() if k not in {'GIT_DIR','GIT_WORK_TREE',
                   'GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'}}
        cls.env.update(GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null',
                       GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1', GIT_TERMINAL_PROMPT='0')
        subprocess.run(['git','clone','--shared','--quiet','--no-checkout',str(ROOT),str(cls.root)],
                       check=True, env=cls.env)
        cls.git('checkout','--detach','--quiet','HEAD')
        for name in FILES:
            target = cls.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        cls.git('add','--',*FILES)
        cls.commit('source A')
        a = cls.git('rev-parse','HEAD').decode().strip()
        listing = cls.git('ls-tree','-rz',a)
        path = cls.root / 'compatibility/rc/historical-source-replay-inputs.json'
        data = json.loads(path.read_bytes())
        data['current_frame'] = {'commit':a,'tree':cls.git('rev-parse',a+'^{tree}').decode().strip(),
                                 'tree_listing_sha256':hashlib.sha256(listing).hexdigest(),
                                 'members':len(listing.split(b'\0'))-1}
        old = hashlib.sha256(path.read_bytes()).hexdigest()
        raw = canonical(data)
        path.write_bytes(raw)
        helper = cls.root / 'scripts/historical-source-replay.mjs'
        source = helper.read_text()
        if source.count(old) != 1:
            raise ValueError('fixture requires one actual current registry pin')
        helper.write_text(source.replace(old, hashlib.sha256(raw).hexdigest()))
        cls.git('add','--',str(path.relative_to(cls.root)),str(helper.relative_to(cls.root)))
        cls.commit('fixture registry B')
        cls.b = cls.git('rev-parse','HEAD').decode().strip()

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    @classmethod
    def git(cls,*args):
        return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0',
                                        '-c','maintenance.auto=0','-c','core.hooksPath=/dev/null',
                                        '-c','user.name=fixture','-c','user.email=fixture@example.invalid',
                                        *args], cwd=cls.root, env=cls.env)

    @classmethod
    def commit(cls,message):
        cls.git('commit','--quiet','-m',message)

    def run_node(self, code):
        return subprocess.run([NODE,'--input-type=module','-e',code],cwd=self.root,env=self.env,
                              capture_output=True,text=True,timeout=90,check=True)

    def test_current_nine_and_transaction_controls(self):
        result = subprocess.run([NODE,'tests/historical_replay_current_frame_successor_probe.mjs'],
                                cwd=self.root,env=self.env,capture_output=True,text=True,timeout=90,check=True)
        report = json.loads(result.stdout)
        self.assertEqual(report['rejections'],9)
        self.assertEqual(report['registered_original_programs_preserved'],26)
        subprocess.run(['python3','-m','unittest','tests.test_historical_source_replay'],
                       cwd=self.root,env=self.env,capture_output=True,text=True,timeout=200,check=True)
        self.run_node('''
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,statSync} from 'node:fs';
import {inspectHistoricalReplayCurrent as inspect,verifyHistoricalCurrentSubjects as verify} from './scripts/historical-source-replay.mjs';
const root=process.cwd(),read=p=>readFileSync(root+'/'+p),good=inspect({root});
for(const nested of [()=>inspect({root}),()=>verify({root})]){
 let once=false;
 assert.throws(()=>inspect({root,readMember:p=>{if(!once){once=true;try{nested();}catch{}}return read(p);}}),/reentry/);
}
assert.throws(()=>inspect({root,readMember:p=>p==='AGENTS.md'?Buffer.concat([read(p),Buffer.from('x')]):read(p)}),/physical/);
const file=root+'/AGENTS.md',before=readFileSync(file);let fired=false;
try{assert.throws(()=>inspect({root,readMember:p=>{const b=read(p);if(!fired&&p==='tests/recorded_execution_source_context_probe.mjs'){fired=true;writeFileSync(file,Buffer.concat([before,Buffer.from('late')]));}return b;}}),/late physical replay change/);assert.ok(fired);}finally{writeFileSync(file,before);}
assert.equal(inspect({root}).guard.current_product_members,good.guard.current_product_members);
const endProbe='tests/recorded_execution_source_context_probe.mjs';
{
 const realEquals=Buffer.prototype.equals,target=root+'/AGENTS.md',original=readFileSync(target);
 let reads=0,fired=false;
 try{
  assert.throws(()=>inspect({root,readMember:p=>{
   const value=read(p);
   if(p===endProbe&&++reads===2){fired=true;writeFileSync(target,Buffer.concat([original,Buffer.from('shadowed late mutation')]));Buffer.prototype.equals=()=>true;}
   return value;
  }}),/late physical replay change/);
  assert.ok(fired,'prototype-shadow callback did not execute');
 }finally{Buffer.prototype.equals=realEquals;writeFileSync(target,original);}
 assert.equal(inspect({root}).guard.current_product_members,good.guard.current_product_members);
}
const product=good.members.find(row=>row.path.startsWith('projects/ngx-material-legacy/')).path;
for(const kind of ['addition','removal']){
 const target=kind==='addition'?root+'/projects/ngx-material-legacy/late-fixture-addition.ts':root+'/'+product;
 const original=kind==='removal'?readFileSync(target):null,mode=kind==='removal'?statSync(target).mode:undefined;
 let reads=0,fired=false;
 try{
  assert.throws(()=>inspect({root,readMember:p=>{
   const value=read(p);
   if(p===endProbe&&++reads===2){fired=true;if(kind==='addition')writeFileSync(target,'fixture late addition\\n',{flag:'wx'});else unlinkSync(target);}
   return value;
  }}),/late physical replay product membership changed/);
  assert.ok(fired,'late membership callback did not execute');
 }finally{if(fired){if(kind==='addition')unlinkSync(target);else writeFileSync(target,original,{mode});}}
 assert.equal(inspect({root}).guard.current_product_members,good.guard.current_product_members);
}
''')

    def test_profile_census_generation_and_retirement_rejection(self):
        script = self.root / 'scripts/prepare-main-private-npm-profile-v3.py'
        profile_path = 'compatibility/rc/parent-private-npm-current-profile-inputs-v3.json'
        review_path = 'compatibility/rc/parent-private-npm-current-profile-review-v3.json'
        sem_path = 'compatibility/rc/fixture-semantic-review-v3.json'
        retired_path = 'compatibility/rc/fixture-retired-support-v3.json'
        output = self.base / 'output'
        common = ['python3',str(script),'--root',str(self.root),'--commit',self.b,
                  '--out',str(output),'--profile-path',profile_path,'--review-path',review_path]
        def run(args, success=True):
            result = subprocess.run(common+args,cwd=self.root,env=self.env,capture_output=True,text=True,timeout=90)
            self.assertEqual(result.returncode == 0,success,result.stderr[-4000:])
            return result
        census = json.loads(run(['--census-only']).stdout)
        self.assertEqual(len(census['retired_support']),23)
        previous = json.loads((self.root/'compatibility/rc/parent-private-npm-current-profile-review-v2.json').read_bytes())
        evidence = previous['semantic_review_refs'][0]
        retired = {'schema_version':1,'role':'retired-current-support-review','line':'main',
                   'source_parent':self.b,'prior_source_parent':census['prior_source_parent'],
                   'retired':census['retired_support'],'evidence_refs':[evidence]}
        retired_file=self.base/'retired.json'; retired_file.write_bytes(canonical(retired))
        retired_ref={'path':retired_path,'sha256':hashlib.sha256(retired_file.read_bytes()).hexdigest(),
                     'bytes':retired_file.stat().st_size}
        semantic={'schema_version':1,'role':'current-source-semantic-review','line':'main',
                  'preconditions':'unchanged-maintained-tool-owned-npm','source_parent':self.b,
                  **{k:census[k] for k in ('source_files_sha256','support_files_sha256','input_files_sha256')},
                  'evidence_refs':sorted([evidence,retired_ref],key=lambda row:row['path'])}
        semantic_file=self.base/'semantic.json';semantic_file.write_bytes(canonical(semantic))
        index=self.base/'evidence.json';index.write_bytes(b'[]\n')
        args=['--semantic-review',str(semantic_file),'--semantic-review-path',sem_path,
              '--retired-review',str(retired_file),'--retired-review-path',retired_path,
              '--evidence-index',str(index)]
        bad=dict(retired);bad['retired']=retired['retired'][:-1];retired_file.write_bytes(canonical(bad))
        self.assertIn('retired support review',run(args,False).stderr)
        retired_file.write_bytes(canonical(retired))
        result=json.loads(run(args).stdout)
        self.assertEqual(result['status'],'candidate only; no semantic or security clearance')
        for target,source in [(profile_path,'profile.json'),(review_path,'review.json'),
                              (sem_path,'semantic-review.json'),(retired_path,'retired-review.json')]:
            shutil.copyfile(output/source,self.root/target)
        check="""import hashlib,importlib.util,json
from pathlib import Path
r=Path.cwd(); sp=importlib.util.spec_from_file_location('checker',r/'scripts/check-dependency-eligibility.py');m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
m.NPM_CURRENT_PRIVATE_PROFILE_SHA256=hashlib.sha256((r/m.NPM_CURRENT_PRIVATE_PROFILE_PATH).read_bytes()).hexdigest()
d=r/'compatibility/rc/tool-advisory-triage'; man=json.loads((d/'private-profile-source-manifests.json').read_bytes()); e=json.loads((d/'private-profile-remaining-evidence.json').read_bytes()); _,current=m._private_npm_current_profile(r,'main',man,e);current()
"""
        subprocess.run(['python3','-c',check],cwd=self.root,env=self.env,check=True,timeout=90)
        self.git('add','--',profile_path,review_path,sem_path,retired_path)
        self.commit('synthetic immutable C')
        commit_c=self.git('rev-parse','HEAD').decode().strip()
        raw=(self.root/profile_path).read_bytes(); digest=hashlib.sha256(raw).hexdigest()
        checker=self.root/'scripts/check-dependency-eligibility.py'
        text=checker.read_text()
        import re
        text,count=re.subn(r'^NPM_CURRENT_PRIVATE_PROFILE_SHA256 = "[a-f0-9]{64}"$',
                           'NPM_CURRENT_PRIVATE_PROFILE_SHA256 = "'+digest+'"',text,flags=re.M)
        self.assertEqual(count,1);checker.write_text(text)
        document=self.root/'compatibility/rc/historical-source-replay.md'
        descriptor={'schema_version':1,'line':'main','profile':{'path':profile_path,'sha256':digest,
                    'bytes':len(raw),'commit':commit_c}}
        with document.open('a') as stream:
            stream.write('\n<!-- npm-current-profile-checker-self-pin-v2 -->\n```json\n'
                         +json.dumps(descriptor,indent=2)+'\n```\n'
                         +'<!-- /npm-current-profile-checker-self-pin-v2 -->\n')
        self.git('add','--','scripts/check-dependency-eligibility.py',str(document.relative_to(self.root)))
        self.commit('synthetic checker and descriptor D')
        self.run_node("import {inspectHistoricalReplayCurrent as f} from './scripts/historical-source-replay.mjs'; const r=f(); if(r.guard.current_product_members<1) throw Error('empty product population');")
        subprocess.run(['python3','-c',check],cwd=self.root,env=self.env,check=True,timeout=90)
        # This fixture is a private temporary clone: late corruption must be rejected and restored.
        path=self.root/profile_path
        try:
            path.write_bytes(raw+b' ')
            with self.assertRaises(subprocess.CalledProcessError):
                self.run_node("import {inspectHistoricalReplayCurrent as f} from './scripts/historical-source-replay.mjs'; f();")
        finally:
            path.write_bytes(raw)
        self.run_node("import {inspectHistoricalReplayCurrent as f} from './scripts/historical-source-replay.mjs'; f();")

if __name__ == '__main__':
    unittest.main()
