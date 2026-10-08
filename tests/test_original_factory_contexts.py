"""Complete untouched compiler/JIT ancestry, parameters and strict diagnostic tracing."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class OriginalFactoryContextTests(unittest.TestCase):
    def test_complete_selected_factory_ancestry_flags_attributes_body_and_identity_guards(self):
        code=r"""
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{originalFactoryContract}from'./scripts/api-surface.mjs';
import{originalCompilerFactoryContext,originalContextDi,FACTORY_CONTEXT_REFERENCE}from'./scripts/api-original-factory-contexts.mjs';
import{expectedFactoryDi}from'./scripts/api-di-observe.mjs';
const ref=JSON.parse(readFileSync(FACTORY_CONTEXT_REFERENCE));assert.equal(Object.keys(ref.contexts).length,544);
assert.equal(ref.archive_validation.archives,4);assert.equal(ref.archive_validation.members,144);
assert.equal(ref.original_core_inherited_factory.version,'16.2.12');
assert.equal(Object.values(ref.contexts).filter(c=>!c.effective_factory_kind).length,0);
function shape(file,name){const originalFactory=originalFactoryContract(file,name);return{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)};}
const origin=shape('/baseline/src/material/legacy-autocomplete/autocomplete-origin.ts','MatLegacyAutocompleteOrigin');
assert.deepEqual(expectedFactoryDi(origin).map(p=>[p.ident,p.spec,p.optional]),[['ElementRef','@angular/core',false]]);
const group=shape('/baseline/src/material/core/option/optgroup.ts','MatOptgroup');
assert.deepEqual(expectedFactoryDi(group).map(p=>[p.ident,p.optional]),[['MAT_OPTION_PARENT_COMPONENT',true]]);
const nav=shape('/baseline/src/material/legacy-list/list.ts','MatLegacyNavList');
assert.equal(nav.originalFactoryContext.zero_argument_inherited_fallback,true);assert.deepEqual(expectedFactoryDi(nav),[]);
for(const [name,count]of [['MatTestLegacyDialogOpener',1],['MatTestLegacyDialogOpenerModule',0]]){
 const s=shape('/baseline/src/material/legacy-dialog/testing/dialog-opener.ts',name);assert.equal(s.originalFactory.declaration_kind,'published-jit-decorators');assert.equal(expectedFactoryDi(s).length,count);
}
const validator=shape('/baseline/src/material/checkbox/checkbox-required-validator.ts','MatCheckboxRequiredValidator');assert.deepEqual(expectedFactoryDi(validator),[]);assert.equal(validator.originalFactoryContext.zero_argument_inherited_fallback,true);assert.ok(validator.originalFactoryContext.ancestry.some(a=>a.key.startsWith('@angular/forms:')));
const checkbox=shape('/baseline/src/material/legacy-checkbox/checkbox.ts','MatLegacyCheckbox');assert.equal(checkbox.originalFactoryContext.factory_parameters.filter(p=>p.attribute).length,1);assert.equal(expectedFactoryDi(checkbox).length,6);
const table=shape('/baseline/src/material/legacy-table/table.ts','MatLegacyTable');const p=expectedFactoryDi(table);assert.equal(p.length,11);assert.equal(p.find(x=>x.ident==='STICKY_POSITIONING_LISTENER').skipSelf,true);
const common=shape('/baseline/src/material/core/common-module.ts','MatCommonModule');assert.equal(expectedFactoryDi(common,{devMode:true}).length,4);assert.equal(expectedFactoryDi(common,{devMode:false}).length,3);assert.throws(()=>expectedFactoryDi(common));
for(const change of [s=>s.originalFactoryContext.factory_parameters=[],s=>s.originalFactoryContext.ancestry=[],s=>s.originalFactory.declaration+=' ',s=>s.originalFactoryContext.effective_factory_kind='invalid']){
 const altered=structuredClone(origin);change(altered);assert.throws(()=>originalContextDi(altered));
}
assert.throws(()=>originalCompilerFactoryContext(origin.originalFactory,p=>p===FACTORY_CONTEXT_REFERENCE?Buffer.concat([readFileSync(p),Buffer.from(' ')]):readFileSync(p)));
assert.throws(()=>originalCompilerFactoryContext(origin.originalFactory,p=>p.endsWith('environment-package-lock.json')?Buffer.from('{}'):readFileSync(p)));
assert.equal(originalFactoryContract('/unrelated/candidate/dialog-opener.ts','MatTestLegacyDialogOpener'),null);
const materialContexts=Object.values(ref.contexts).filter(c=>c.package==='@angular/material');assert.equal(materialContexts.length,407);
for(const c of materialContexts)assert.deepEqual(originalCompilerFactoryContext(c.compiler_factory),c);
assert.equal(createHash('sha256').update(readFileSync('reference/material-16.2.14/factory-metadata.json')).digest('hex'),'1b124aab1f570e111647f8142cdea8066ae9db673efc405a6999c178709602b6');
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-7000:])

    def test_actual_public_injector_factory_and_borrowed_element_identity(self):
        code=r"""
import assert from 'node:assert/strict';import{createRequire}from'node:module';import{pathToFileURL}from'node:url';
import{runFactory,factoryExecutionProblems}from'./scripts/api-di-observe.mjs';
const require=createRequire(import.meta.url),load=spec=>import(pathToFileURL(require.resolve(spec)).href);
await load('@angular/compiler');const core=await load('@angular/core');
class ElementOwner {element=core.inject(core.ElementRef);}
core.Injectable()(ElementOwner);
const element=new core.ElementRef({fixture:'synthetic element; no native node qualification'});
const borrowed=core.Injector.create({providers:[{provide:core.ElementRef,useValue:element}]});
const before=Object.getPrototypeOf(borrowed).get;
try{
 const factory=runFactory(()=>ElementOwner.ɵfac(),core.Injector,core.runInInjectionContext,{injector:borrowed});
 assert.equal(factory.outcome,'returned');assert.ok(factory.value instanceof ElementOwner);assert.equal(factory.value.element,element);
 assert.equal(factory.requests.length,1);assert.equal(factory.requests[0].token,core.ElementRef);assert.equal(factory.requests[0].optional,false);
 assert.equal(Object.getPrototypeOf(borrowed).get,before);assert.equal(borrowed.get(core.ElementRef),element);
 assert.deepEqual(factoryExecutionProblems('dependencies',factory),[]);
 const incomplete=runFactory(()=>ElementOwner.ɵfac(),core.Injector,core.runInInjectionContext);
 assert.equal(incomplete.outcome,'threw');assert.equal(incomplete.requests[0].unresolved,true);
 assert.equal(factoryExecutionProblems('dependencies',incomplete).length,2);
}finally{borrowed.destroy();}
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-7000:])

    def test_tracing_no_stubs_no_global_patch_and_borrowed_injector_lifetime(self):
        code=r"""
import assert from 'node:assert/strict';import{runFactory,factoryExecutionProblems}from'./scripts/api-di-observe.mjs';
let active;const context=(injector,fn)=>{active=injector;return fn();};
const required=function Required(){};let destroyed=0;
class Missing {static create(){return new Missing();}get(){throw Error('No provider');}destroy(){destroyed++;}}
const original=Missing.prototype.get,result=runFactory(()=>active.get(required),Missing,context);
assert.equal(result.outcome,'threw');assert.equal(result.value,undefined);assert.equal(result.requests.length,1);assert.equal(result.requests[0].unresolved,true);assert.equal(Missing.prototype.get,original);assert.equal(destroyed,1);
assert.equal(factoryExecutionProblems('dependencies',result).length,2);
const owned={marker:'genuine borrowed value'},borrowed={get(token,notFound,flags){assert.equal(token,required);assert.deepEqual(flags,{optional:true,skipSelf:true});return owned;},destroy(){destroyed++;}};
const returned=runFactory(()=>active.get(required,null,{optional:true,skipSelf:true}),Missing,context,{injector:borrowed});
assert.equal(returned.value,owned);assert.equal(returned.outcome,'returned');assert.equal(returned.requests[0].optional,true);assert.equal(returned.requests[0].skipSelf,true);assert.equal(destroyed,1);
assert.deepEqual(factoryExecutionProblems('dependencies',returned),[]);
for(const [flags,wanted]of [[8,{optional:true,self:false,skipSelf:false,host:false}],[15,{optional:true,self:true,skipSelf:true,host:true}],[0,{optional:false,self:false,skipSelf:false,host:false}]]){
 const f=runFactory(()=>active.get(required,null,flags),Missing,context,{injector:{get(){return owned;}}});for(const [key,v]of Object.entries(wanted))assert.equal(f.requests[0][key],v);
}
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-7000:])
