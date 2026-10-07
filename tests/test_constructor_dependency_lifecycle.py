"""Borrowed constructor dependencies must keep their caller-owned lifecycle."""
from pathlib import Path
import subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
def public_runtime_available():
    return subprocess.run(['node','-e',"require.resolve('@angular/core');require('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class ConstructorDependencyLifecycle(unittest.TestCase):
    @unittest.skipUnless(public_runtime_available(),'Angular/TypeScript diagnostic runtime unavailable; packed native case remains required')
    def test_real_public_injector_borrowed_identity_and_context_restoration(self):
        code=r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript');
const coreUrl=pathToFileURL(require.resolve('@angular/core')).href;
const {Injector,InjectionToken,inject,runInInjectionContext}=await import(coreUrl);
const source=readFileSync('projects/ngx-material-legacy/internal/public-constructor-context.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace("'@angular/core'",JSON.stringify(coreUrl));
const {constructWithPublicDependencies}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const token=new InjectionToken('borrowed'),missing=new InjectionToken('missing');
let destroyed=0;
const borrowed={ngOnDestroy(){destroyed++;}};
class Parent {value=inject(token);optional=inject(missing,{optional:true});}
class Child extends Parent {}
const result=constructWithPublicDependencies(Parent,Child,[{provide:token,useValue:borrowed}]);
assert.equal(result.value,borrowed);assert.equal(result.optional,null);
assert.ok(result instanceof Child&&result instanceof Parent);
assert.equal(destroyed,0);
// Negative reproduces the superseded helper's actual Angular lifecycle hazard.
const owning=Injector.create({providers:[{provide:token,useValue:borrowed}]});
assert.equal(owning.get(token),borrowed);owning.destroy();assert.equal(destroyed,1);
const outer=Injector.create({providers:[{provide:token,useValue:'outer'}]});
class Throws {constructor(){assert.equal(inject(token),borrowed);throw new Error('parent rejected');}}
runInInjectionContext(outer,()=>{
 assert.throws(()=>constructWithPublicDependencies(Throws,Throws,[{provide:token,useValue:borrowed}]),/parent rejected/);
 assert.equal(inject(token),'outer');
 class Missing {value=inject(missing);}
 assert.throws(()=>constructWithPublicDependencies(Missing,Missing,[]));
 assert.equal(inject(token),'outer');
});
outer.destroy();assert.equal(destroyed,1);
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
