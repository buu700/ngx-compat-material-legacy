# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite focus acceptance and JS/Python failure concordance."""
import copy,hashlib,json,subprocess,sys,unittest,tempfile,shutil
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_strong_focus_infrastructure import C,CASE,CONTRACT,expected,focus_assertion_ok,focus_envelope_ok
sha=lambda s:hashlib.sha256(s.encode()).hexdigest()

def sample():
    peers=[];variants=[]
    for c in C['cases']:
        p=dict(line='main',peer_version=C['peer_version'],peer_package_json_sha256=C['peer_package_json_sha256'],program=c['peer_program'],program_sha256=c['peer_program_sha256'],css=c['peer_css'],css_sha256=c['peer_css_sha256'],css_bytes=len(c['peer_css'].encode()),sources=copy.deepcopy(C['peer_sources']))
        peers.append(p);css=expected(c,p);assert css is not None
        m=dict(line='main',css=css,css_sha256=sha(css),css_bytes=len(css.encode()),program_sha256=c['program_sha256'],sass_version='dart-sass\t1.104.1\t(Sass Compiler)',sources=copy.deepcopy(C['measurement_sources']))
        variants.append(dict(name=c['name'],measurement=m))
    m=copy.deepcopy(variants[0]['measurement']);m['program_sha256']=C['default_program_sha256']
    return dict(case_id=CASE,line='main',comparison=CONTRACT,current_infrastructure=dict(classification='conforming-current-infrastructure',contract=CONTRACT,variants=variants,peers=peers),actual_measurement=m,expected_sha256=C['cases'][0]['original_sha256'],expected_bytes=len(C['cases'][0]['original_css'].encode()),actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'])

def rehash(m):m['css_sha256']=sha(m['css']);m['css_bytes']=len(m['css'].encode())

class StrongFocusInfrastructureTests(unittest.TestCase):
    def test_exact_output_and_rehashed_mutations_fail_in_both_languages(self):
        good=sample();self.assertTrue(focus_assertion_ok(good));bad=[]
        def add(fn):
            body=copy.deepcopy(good);fn(body);self.assertFalse(focus_assertion_ok(body));bad.append(body)
        def change_css(b,index,before,after):
            m=b['current_infrastructure']['variants'][index]['measurement'];assert before in m['css'];m['css']=m['css'].replace(before,after,1);rehash(m)
        add(lambda b:change_css(b,0,'--mat-mdc-focus-indicator-border-color','--wrong-owned-border'))
        add(lambda b:change_css(b,1,'overflow: visible','overflow: hidden'))
        add(lambda b:change_css(b,2,'--mat-focus-indicator-fallback-border-style: none;',''))
        add(lambda b:change_css(b,7,'overflow: visible','overflow: hidden'))
        add(lambda b:b['current_infrastructure']['variants'].pop())
        add(lambda b:b['current_infrastructure']['variants'].reverse())
        add(lambda b:b['current_infrastructure']['variants'][4]['measurement'].__setitem__('program_sha256','0'*64))
        add(lambda b:b['actual_measurement']['sources'][0].__setitem__('sha256','0'*64))
        def peer(b):
            p=b['current_infrastructure']['peers'][0];p['css']+='\n.extra {color:red}';p['css_sha256']=sha(p['css']);p['css_bytes']=len(p['css'].encode())
        add(peer)
        add(lambda b:b['current_infrastructure']['peers'][1]['sources'][0].__setitem__('sha256','0'*64))
        add(lambda b:b.__setitem__('line','21.x'))
        add(lambda b:b.__setitem__('comparison','different'))
        source="""import {readFileSync} from 'node:fs'; import {focusResultsMatch} from './scripts/sass-strong-focus-infrastructure.mjs';const rows=JSON.parse(readFileSync(0,'utf8'));const out=rows.map(b=>b.line==='main' && b.comparison==='historical-strong-focus-with-public-peer' && focusResultsMatch({css:b.actual_measurement.css,sha256:b.actual_measurement.css_sha256,actual_measurement:b.actual_measurement},b.current_infrastructure));process.stdout.write(JSON.stringify(out));"""
        r=subprocess.run(['node','--input-type=module','-e',source],cwd=ROOT,input=json.dumps([good]+bad),text=True,capture_output=True,check=True,timeout=60)
        self.assertEqual(json.loads(r.stdout),[True]+[False]*len(bad))

    def test_loaded_helper_images_and_accessors_fail_closed(self):
        body=sample()
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);shutil.copytree(ROOT/'scripts',root/'scripts');(root/'fixtures/sass').mkdir(parents=True)
            shutil.copy2(ROOT/'fixtures/sass/strong-focus-infrastructure-contract.json',root/'fixtures/sass')
            py="""import json,sys
from pathlib import Path
sys.path.insert(0,'scripts')
from sass_strong_focus_infrastructure import focus_assertion_ok
b=json.load(sys.stdin)
assert focus_assertion_ok(b)
p=Path(sys.argv[1]);old=p.read_bytes();p.write_bytes(old+b'\\n# changed')
assert not focus_assertion_ok(b)
"""
            js="""import {readFileSync,writeFileSync} from 'node:fs';import {focusResultsMatch} from './scripts/sass-strong-focus-infrastructure.mjs';const b=JSON.parse(readFileSync(0,'utf8'));const a={css:b.actual_measurement.css,sha256:b.actual_measurement.css_sha256,actual_measurement:b.actual_measurement},c=b.current_infrastructure;if(!focusResultsMatch(a,c))throw Error('baseline');const p=process.argv[1],old=readFileSync(p);writeFileSync(p,Buffer.concat([old,Buffer.from('\\n// changed')]));if(focusResultsMatch(a,c))throw Error('stale source accepted');"""
            for path in ('scripts/sass_strong_focus_infrastructure.py','scripts/sass-strong-focus-infrastructure.mjs'):
                original=(root/path).read_bytes()
                for cmd in ([sys.executable,'-c',py,path],['node','--input-type=module','-e',js,path]):
                    subprocess.run(cmd,cwd=root,input=json.dumps(body),text=True,capture_output=True,check=True,timeout=60)
                    (root/path).write_bytes(original)
            accessor="""import {readFileSync} from 'node:fs';import {focusResultsMatch} from './scripts/sass-strong-focus-infrastructure.mjs';const b=JSON.parse(readFileSync(0,'utf8'));const m=b.actual_measurement,c=b.current_infrastructure,a={css:m.css,sha256:m.css_sha256,actual_measurement:m};let n=0;const css=m.css;Object.defineProperty(m,'css',{enumerable:true,get(){if(++n===5)c.variants[0].measurement.css+=' tampered';return css}});if(focusResultsMatch(a,c)||n!==0)throw Error('accessor accepted or invoked');"""
            subprocess.run(['node','--input-type=module','-e',accessor],cwd=root,input=json.dumps(body),text=True,capture_output=True,check=True,timeout=60)
        class Trap(dict):
            def __getitem__(self,key):raise AssertionError('must not invoke')
        bad=copy.deepcopy(body);bad['actual_measurement']=Trap(bad['actual_measurement']);self.assertFalse(focus_assertion_ok(bad))

    def test_envelope_binds_run_oracle_and_package(self):
        body=sample();active=SimpleNamespace(binding={'source_line':'main'},manifest={'run_id':'run','artifacts':[{'id':'library','sha256':'a'*64}]})
        oracle='76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d'
        body.update(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,run_id='run',invocation_id='inv',binding=active.binding,oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle_sha256=oracle,tarball_sha256='a'*64)
        self.assertTrue(focus_envelope_ok(active,body,'inv',oracle))
        for key in ('tarball_sha256','oracle_sha256','invocation_id','run_id'):
            b=copy.deepcopy(body);b[key]='wrong';self.assertFalse(focus_envelope_ok(active,b,'inv',oracle))
        b=copy.deepcopy(body);b['current_companion']={};self.assertFalse(focus_envelope_ok(active,b,'inv',oracle))
