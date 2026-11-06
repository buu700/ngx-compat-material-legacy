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
from migration_workspace_admission import old_workspace_assertion_ok, old_workspace_ids
from migration_workspace_fixture import workspace_receipt
from migration_cli_fixture import write_cli_archive

class WorkspaceAdmissionTests(unittest.TestCase):
    def test_retained_consumer_inputs_and_engine_negatives(self):
        for line in ('main','21.x'):
            with tempfile.TemporaryDirectory() as tmp:
                active=SimpleNamespace(run_dir=Path(tmp),binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},write_cli_archive(Path(tmp))]})
                def rewrite(body,name,value):
                    upgraded=body['upgraded_consumer'];record=upgraded['support'][name]
                    raw=json.dumps(value).encode() if isinstance(value,dict) else value
                    (active.run_dir/record['path']).write_bytes(raw)
                    record.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
                    field={'application':'application_sha256','styles':'styles_sha256','css':'css_sha256','lock':'lock_sha256'}.get(name)
                    if field:upgraded[field]=record['sha256']
                def data(body,name):return json.loads((active.run_dir/body['upgraded_consumer']['support'][name]['path']).read_text())
                mutations=['missing-support','missing-style-source','wrong-invocation','omitted-engine-proof','installed-engine','application-change','sass-call-change','css-selector-omitted','declared-engine','locked-engine','nested-locked-engine','wrong-core','skipped-lib-check','loose-templates','path-alias','engine-bundle-input','async-bundle-input','outside-bundle-input','wrong-bundle-digest','wrong-tool']
                for mutation in mutations:
                    body=workspace_receipt(ROOT,active,'old-workspace/upgraded-consumer','one');self.assertTrue(old_workspace_assertion_ok(ROOT,active,body,'one'))
                    upgraded=body['upgraded_consumer']
                    if mutation=='missing-support':del upgraded['support']
                    elif mutation=='missing-style-source':del upgraded['support']['styles']
                    elif mutation=='wrong-invocation':upgraded['support']['application']['path']=upgraded['support']['application']['path'].replace('/one/','/other/')
                    elif mutation=='omitted-engine-proof':del upgraded['animation_engine']
                    elif mutation=='installed-engine':upgraded['animation_engine']['installed_packages']=['node_modules/@angular/animations']
                    elif mutation=='application-change':rewrite(body,'application',(active.run_dir/upgraded['support']['application']['path']).read_bytes()+b'\n// extra edit')
                    elif mutation=='sass-call-change':rewrite(body,'styles',(active.run_dir/upgraded['support']['styles']['path']).read_bytes().replace(b'mat.legacy-core()',b'mat.core()'))
                    elif mutation=='css-selector-omitted':rewrite(body,'css',b'.other{}')
                    elif mutation=='declared-engine':
                        package=data(body,'package');package['dependencies']['@angular/animations']=upgraded['versions']['core'];rewrite(body,'package',package)
                        lock=data(body,'lock');lock['packages']['']['dependencies']=package['dependencies'];lock['packages']['node_modules/@angular/animations']={'version':upgraded['versions']['core']};rewrite(body,'lock',lock)
                    elif mutation in ('locked-engine','nested-locked-engine','wrong-core'):
                        lock=data(body,'lock');key={'locked-engine':'node_modules/@angular/animations','nested-locked-engine':'node_modules/example/node_modules/@angular/animations','wrong-core':'node_modules/@angular/core'}[mutation]
                        lock['packages'][key]={'version':'0.0.0'};rewrite(body,'lock',lock)
                    elif mutation in ('skipped-lib-check','loose-templates','path-alias'):
                        config=data(body,'tsconfig')
                        if mutation=='skipped-lib-check':config['compilerOptions']['skipLibCheck']=True
                        elif mutation=='loose-templates':config['angularCompilerOptions']['strictTemplates']=False
                        else:config['compilerOptions']['paths']={'@ngx-compat/*':['/workspace/*']}
                        rewrite(body,'tsconfig',config)
                    elif mutation in ('engine-bundle-input','async-bundle-input','outside-bundle-input','wrong-bundle-digest','wrong-tool'):
                        bundle=data(body,'bundle_inputs')
                        if mutation=='wrong-bundle-digest':bundle['bundle_sha256']='0'*64
                        elif mutation=='wrong-tool':bundle['tool_version']='0.0.0'
                        else:bundle['inputs'].append({'path':{'engine-bundle-input':'node_modules/@angular/animations/fesm2022/animations.mjs','async-bundle-input':'node_modules/@angular/platform-browser/fesm2022/async.mjs','outside-bundle-input':'../workspace/library.js'}[mutation],'sha256':'a'*64})
                        upgraded['bundle']=bundle;rewrite(body,'bundle_inputs',bundle)
                    self.assertFalse(old_workspace_assertion_ok(ROOT,active,body,'one'),(line,mutation))
                for name in ('application','styles','css','package','lock','tsconfig','bundle','bundle_inputs'):
                    body=workspace_receipt(ROOT,active,'old-workspace/upgraded-consumer','one')
                    path=active.run_dir/body['upgraded_consumer']['support'][name]['path'];path.write_bytes(path.read_bytes()+b'tamper')
                    self.assertFalse(old_workspace_assertion_ok(ROOT,active,body,'one'),(line,name))

    def test_both_lines_and_unbound_or_failed_evidence(self):
        temporary=tempfile.TemporaryDirectory();self.addCleanup(temporary.cleanup)
        for line in ('main','21.x'):
            active=SimpleNamespace(run_dir=Path(temporary.name),binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},write_cli_archive(Path(temporary.name))]})
            for case in [*old_workspace_ids(ROOT),'old-workspace/upgraded-consumer']:
                body=workspace_receipt(ROOT,active,case,'one')
                self.assertTrue(old_workspace_assertion_ok(ROOT,active,body,'one'),case)
                for field,value in [('tarball_used',False),('binding',{}),('line','foreign'),('invocation_id','borrowed'),('artifacts',{}),('material_manifest_sha256','f'*64),('cli_support',[])]:
                    bad=copy.deepcopy(body);bad[field]=value
                    self.assertFalse(old_workspace_assertion_ok(ROOT,active,bad,'one'),(case,field))
                for field,value in [('result','fail'),('skip_lib_check',True),('node','v18.0.0'),('versions',{}),('library_sha256','f'*64),('strict_templates',False)]:
                    bad=copy.deepcopy(body);bad['upgraded_consumer'][field]=value
                    self.assertFalse(old_workspace_assertion_ok(ROOT,active,bad,'one'),(case,field))
                bad=copy.deepcopy(body);bad['upgraded_consumer']['browser']['after']['value']=''
                self.assertFalse(old_workspace_assertion_ok(ROOT,active,bad,'one'))
                if case!='old-workspace/upgraded-consumer':
                    bad=copy.deepcopy(body);bad['after']+='unrelated mutation'
                    self.assertFalse(old_workspace_assertion_ok(ROOT,active,bad,'one'))
