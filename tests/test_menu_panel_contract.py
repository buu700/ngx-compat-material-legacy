"""The owned panel type preserves the untouched16 consumer contract."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def runtime_available():
    return subprocess.run(['node', '-e',
        "require.resolve('@angular/core');require.resolve('@angular/material/menu');require('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class MenuPanelContractTests(unittest.TestCase):
    def test_untouched_source_provenance(self):
        folder = ROOT / 'reference/material-16.2.14/interface-sources'
        source = (folder / 'menu-panel.ts').read_bytes()
        provenance = json.loads((folder / 'menu-panel-provenance.json').read_text())
        self.assertEqual(provenance['repository_commit'], 'df60e733c60e572ba538f6ad0ceff3e63e527b53')
        self.assertEqual(provenance['repository_path'], 'src/material/menu/menu-panel.ts')
        self.assertEqual(provenance['source_sha256'], '48ae888c7a12b733a45989cf0195bd42298203da9768e5354c31759004883b43')
        self.assertEqual(hashlib.sha256(source).hexdigest(), provenance['source_sha256'])
        self.assertEqual(len(source), provenance['source_bytes'])

    @unittest.skipUnless(runtime_available(), 'Angular/TypeScript type runtime unavailable; strict packed qualification remains required')
    def test_original_interface_and_real_strict_consumer_negatives(self):
        script = r"""
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');
const project=resolve('projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts');
const original=readFileSync('reference/material-16.2.14/interface-sources/menu-panel.ts','utf8');
const source=readFileSync(project,'utf8');
const declaration=text=>text.slice(text.indexOf('export interface MatMenuPanel'));
assert.equal(declaration(source),declaration(original),'every member,type,optional/readonly flag and original comment must be preserved');
const common=`import {EventEmitter,TemplateRef} from '@angular/core';
import type {MatMenuPanel as Panel} from ${JSON.stringify(project)};
declare const template:TemplateRef<any>;
const panel:Panel<number>={xPosition:'after',yPosition:'below',overlapTrigger:true,
 templateRef:template,close:new EventEmitter<void|'click'|'keydown'|'tab'>(),
 focusFirstItem:()=>{},resetActiveItem:()=>{},addItem:(_item:number)=>{}};
panel.focusFirstItem('keyboard');panel.close.emit('click');panel.addItem?.(7);
panel.parentMenu=panel;panel.overlayPanelClass=['one','two'];
`;
const fixtures=[['positive','',[]],
 ['position',"panel.xPosition='left';",[2322]],
 ['readonly',"panel.close=new EventEmitter();",[2540]],
 ['origin',"panel.focusFirstItem('unknown-origin');",[2345]],
 ['generic',"panel.addItem?.('wrong item');",[2345]],
 ['required',"const incomplete:Panel<number>={xPosition:'after'};",[2740]],
];
const temp=mkdtempSync(join(tmpdir(),'closeout-menu-panel-types-'));
try {
 const peerRoot=join(temp,'node_modules/@angular');mkdirSync(peerRoot,{recursive:true});
 for(const name of ['core','cdk','material']) {
  symlinkSync(dirname(require.resolve('@angular/'+name+'/package.json')),join(peerRoot,name),'dir');
 }
 const names=fixtures.map(([name,body])=>{const file=join(temp,name+'.ts');writeFileSync(file,common+body);return file;});
 const options={strict:true,noEmit:true,skipLibCheck:true,types:[],target:ts.ScriptTarget.ES2022,
  module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions:true};
 const host=ts.createCompilerHost(options);
 host.resolveModuleNames=(names,containing)=>names.map(name=>ts.resolveModuleName(name,
  name.startsWith('@angular/')?join(temp,'peer-resolution.ts'):containing,options,host).resolvedModule);
 const program=ts.createProgram(names,options,host);
 const diagnostics=ts.getPreEmitDiagnostics(program);
 assert.equal(diagnostics.filter(d=>!d.file||!names.includes(d.file.fileName)).length,0,
  ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));
 fixtures.forEach(([name,body,codes],index)=>{
  const actual=diagnostics.filter(d=>d.file?.fileName===names[index]).map(d=>d.code);
  assert.deepEqual(actual,codes,name+' must fail exactly its own original contract');
 });
 console.log(JSON.stringify({interface:'identical untouched16 declaration',strict_positive:1,strict_negatives:5,
  compiler:ts.version,node:process.version,peer:JSON.parse(readFileSync(require.resolve('@angular/core/package.json'),'utf8')).version}));
} finally {rmSync(temp,{recursive:true,force:true});}
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-4800:])
