"""Floor admission rejects borrowed, stale, arithmetic-only or failed receipts."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from consumer_floor_admission import floor_assertion_ok, reviewed_configurations
from consumer_floor_fixture import write_floor_receipt

class FloorAdmissionTests(unittest.TestCase):
    def test_engine_present_or_unproven_receipts_are_rejected_after_rehash(self):
        plan=json.loads((ROOT/'compatibility/rc/consumer-floor-plan.json').read_text())
        for line in ('main','21.x'):
            with tempfile.TemporaryDirectory() as tmp:
                active=SimpleNamespace(run_dir=Path(tmp),binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},{'id':'migrate-cli','sha256':'e'*64}]})
                case=next(k for k,c in reviewed_configurations(plan,line).items() if c['group']=='library-runtime')
                def rehash(record, value):
                    path=active.run_dir/record['path'];raw=json.dumps(value).encode();path.write_bytes(raw)
                    record.update(sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw))
                for mutation in ('omitted-install-proof','installed-engine','locked-engine','omitted-policy','false-policy','old-provider','engine-bundle','nested-engine-bundle','browser-engine-bundle','async-engine-bundle','engine-lock','nested-engine-lock','old-version-roster'):
                    body=write_floor_receipt(ROOT,active,case,'one')
                    self.assertTrue(floor_assertion_ok(ROOT,active,body,'one'))
                    detail=json.loads((active.run_dir/body['consumer_detail']['path']).read_text())
                    if mutation=='omitted-install-proof':del detail['isolation']['animation_engine']
                    elif mutation=='installed-engine':detail['isolation']['animation_engine']['installed_packages']=['node_modules/@angular/animations']
                    elif mutation=='locked-engine':detail['isolation']['animation_engine']['lock_packages']=['node_modules/@angular/animations']
                    elif mutation=='omitted-policy':del detail['harness']['result']['engineFreeAnimationPolicy']
                    elif mutation=='false-policy':detail['harness']['result']['engineFreeAnimationPolicy']=False
                    elif mutation=='old-provider':detail['harness']['result']['animationsProvider']='provideNoopAnimations'
                    elif mutation.endswith('-bundle'):
                        path={'engine-bundle':'node_modules/@angular/animations/fesm2022/animations.mjs','nested-engine-bundle':'node_modules/example/node_modules/@angular/animations/fesm2022/animations.mjs','browser-engine-bundle':'node_modules/@angular/platform-browser/fesm2022/animations.mjs','async-engine-bundle':'node_modules/@angular/platform-browser/fesm2022/async.mjs'}[mutation]
                        detail['harness']['bundle']['inputs'].append({'path':path,'sha256':'f'*64})
                    elif mutation.endswith('-lock'):
                        lock=json.loads((active.run_dir/body['consumer_lock']['path']).read_text())
                        key='node_modules/@angular/animations' if mutation=='engine-lock' else 'node_modules/example/node_modules/@angular/animations'
                        lock['packages'][key]={'version':detail['floor_configuration']['framework']}
                        rehash(body['consumer_lock'],lock);detail['consumer_lock']=body['consumer_lock']
                    elif mutation=='old-version-roster':
                        body['installed_versions']['@angular/animations']=detail['floor_configuration']['framework']
                        detail['installed_floor_versions']=body['installed_versions']
                    rehash(body['consumer_detail'],detail)
                    self.assertFalse(floor_assertion_ok(ROOT,active,body,'one'),(line,mutation))

    def test_platform_profile_positive_and_cross_platform_rejections(self):
        plan=json.loads((ROOT/'compatibility/rc/consumer-floor-plan.json').read_text())
        for line in ('main','21.x'):
            with tempfile.TemporaryDirectory() as tmp:
                active=SimpleNamespace(run_dir=Path(tmp),binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},{'id':'migrate-cli','sha256':'e'*64}]})
                for case, config in reviewed_configurations(plan,line).items():
                    body=write_floor_receipt(ROOT,active,case,'one')
                    self.assertTrue(floor_assertion_ok(ROOT,active,body,'one'))
                    for platform in ('unknown',None,'linux-arm64'):
                        bad=copy.deepcopy(body)
                        if platform is None: del bad['runtime']['platform']
                        else: bad['runtime']['platform']=platform
                        self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'),(case,platform))
                    body['runtime']['platform']='linux-arm64'
                    body['runtime']['archive_sha256']=plan['node_sources_by_platform']['linux-arm64'][config['node']]['sha256']
                    if config['group']=='library-runtime':
                        path=active.run_dir/body['consumer_detail']['path']; detail=json.loads(path.read_text())
                        detail['node_runtime']['platform']='linux-arm64'; raw=json.dumps(detail).encode();path.write_bytes(raw)
                        body['consumer_detail'].update(sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw))
                    self.assertTrue(floor_assertion_ok(ROOT,active,body,'one'),case)
                    bad=copy.deepcopy(body);bad['runtime']['archive_sha256']='0'*64
                    self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'))

    def test_both_lines_and_invalid_receipts(self):
        plan=json.loads((ROOT/'compatibility/rc/consumer-floor-plan.json').read_text())
        for line in ('main','21.x'):
            with tempfile.TemporaryDirectory() as tmp:
                active=SimpleNamespace(run_dir=Path(tmp),binding={'source_line':line,'source_commit':'a'*40},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},{'id':'migrate-cli','sha256':'e'*64}]})
                for case in reviewed_configurations(plan,line):
                    body=write_floor_receipt(ROOT,active,case,'one')
                    self.assertTrue(floor_assertion_ok(ROOT,active,body,'one'),case)
                    for field, value in [('runtime',{'version':'v24.21.0'}),('exit_code',1),('line','other'),('invocation_id','borrowed'),('binding',{}),('configuration',{}),('artifacts',{})]:
                        bad=copy.deepcopy(body);bad[field]=value
                        self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'),(case,field))
                    self.assertFalse(floor_assertion_ok(ROOT,active,{'case_id':case,'kind':'assertion','result':'pass'},'one'))
                    if body['group']=='library-runtime':
                        bad=copy.deepcopy(body);bad['installed_versions']['rxjs']='7.8.2'
                        if body['installed_versions']['rxjs']!='7.8.2':self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'))
                        detail=active.run_dir/body['consumer_detail']['path'];detail.write_text('{}')
                        self.assertFalse(floor_assertion_ok(ROOT,active,body,'one'))
                    else:
                        bad=copy.deepcopy(body);bad['cli']['second_apply']['applied']=1
                        self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'))
                        bad=copy.deepcopy(body);del bad['cli']['support_files']['lib/ts-rewrite.js']
                        self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'))
