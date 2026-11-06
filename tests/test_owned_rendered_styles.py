"""Wrong nonempty styles, missing elements and borrowed receipts cannot pass."""
import copy
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from owned_rendered_admission import owned_schema,owned_rendered_ok
from owned_style_fixture import style_receipt

class OwnedRenderedStylesTests(unittest.TestCase):
    def test_assessment_rejects_wrong_values_and_inert_mutation(self):
        code=r'''
import assert from 'node:assert/strict';
import {OWNED_STYLE_PROBES, ownedStyleCaseIds, assessOwnedStyles} from './scripts/sass-owned-rendered.mjs';
assert.equal(ownedStyleCaseIds().length,57);
assert.equal(Object.values(OWNED_STYLE_PROBES).filter(p=>p.context==='typography').length,8);
for(const probe of Object.values(OWNED_STYLE_PROBES).filter(p=>p.context==='typography'&&p.properties.includes('font-family')))for(const property of ['font-family','font-size','line-height','rect-height','rect-width'])assert.ok(probe.properties.includes(property));
const reference=Object.fromEntries(Object.entries(OWNED_STYLE_PROBES).map(([id,p])=>[id,{found:true,values:Object.fromEntries(p.properties.map(k=>[k,k.startsWith('rect-')?'40':k==='visibility'?'visible':['opacity','effective-opacity'].includes(k)?'1':k==='state-active'?'true':'tagged-value']))}]));
for(const [id,p]of Object.entries(OWNED_STYLE_PROBES))if(['theme-light','theme-dark'].includes(p.context))for(const property of p.properties)if(['color','background-color'].includes(property))reference[id].values[property]=p.context==='theme-light'?'rgb(11, 22, 33)':'rgb(44, 55, 66)';
const negative=structuredClone(reference);
for(const [id,p] of Object.entries(OWNED_STYLE_PROBES)){const property=p.properties.includes('line-height')?'line-height':p.properties[0];negative[id].values[property]='wrong-but-nonempty';}
assert.ok(Object.values(assessOwnedStyles(reference,reference,negative)).every(r=>r.result==='pass'));
const baseline=assessOwnedStyles(reference,reference,negative);
for(const [id,p] of Object.entries(OWNED_STYLE_PROBES)){
 const bad=structuredClone(reference);bad[id].values[p.properties[0]]='unrelated-wrong-value';
 const failed=Object.entries(assessOwnedStyles(reference,bad,negative)).filter(([,r])=>r.result==='fail').map(([id])=>id);
 const affected=[id,...Object.entries(baseline).filter(([,row])=>{const w=row.customization_witness;return w&&w.property===p.properties[0]&&[w.baseline_case_id,w.themed_case_id].includes('owned-style/'+id);}).map(([id])=>id)];
 assert.deepEqual(failed.toSorted(),[...new Set(affected)].toSorted());
 bad[id]={found:false,values:{}};assert.equal(assessOwnedStyles(reference,bad,negative)[id].result,'fail');
}
assert.ok(Object.values(assessOwnedStyles(reference,reference,reference)).every(r=>r.result==='fail'));
for(const id of Object.keys(negative)){const inert=structuredClone(negative);inert[id]=structuredClone(reference[id]);assert.equal(assessOwnedStyles(reference,reference,inert)[id].result,'fail');}
const flat=structuredClone(reference);
for(const [id,p]of Object.entries(OWNED_STYLE_PROBES))if(['theme-light','theme-dark'].includes(p.context))flat[id]=structuredClone(reference['light/'+id.split('/')[1]]);
for(const [id,p]of Object.entries(OWNED_STYLE_PROBES))if(['theme-light','theme-dark'].includes(p.context))assert.equal(assessOwnedStyles(flat,flat,negative)[id].result,'fail','inert full theme '+id);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_receipts_bind_both_lines_reference_bytes_and_properties(self):
        for line in ('main','21.x'):
            version='22.1.7' if line=='main' else '21.2.14'
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64}],'oracles':{'current_peer':[{'id':'@angular/material','version':version},{'id':'@angular/cdk','version':version},{'id':'@angular/core','version':'22.1.7' if line=='main' else '21.2.23'}]}})
            for case in owned_schema():
                body=style_receipt(ROOT,active,case,'one')
                self.assertTrue(owned_rendered_ok(ROOT,active,body,'one'),case)
                for field,value in [('source_kind','workspace'),('line','foreign'),('tarball_sha256','a'*64),('binding',{}),('properties',[]),('found',False),('mutation_detected',False),('skip_lib_check',True),('settlement',{})]:
                    bad=copy.deepcopy(body);bad[field]=value;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'),(case,field))
                for field,value in [('fonts_status','loading'),('active_animations',1),('stable_frames',1),('observed_animations',-1)]:
                    bad=copy.deepcopy(body);bad['settlement']['reference'][field]=value;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                bad=copy.deepcopy(body);bad['properties'][0]['candidate']='wrong-value';self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                bad=copy.deepcopy(body);bad['identities']['owned-legacy-select']['reference_sha256']='f'*64;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                bad=copy.deepcopy(body);bad['mutation']['observed']=bad['mutation']['reference'];self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))

                if body['context']=='typography':
                    for field,value in [('custom_typography_theme',{}),('reference_kind','untouched-material-16.2.14-css')]:
                        bad=copy.deepcopy(body);bad[field]=value;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                    for field,value in [('case_id','mixin-argument/all-legacy-component-themes/custom-dark-theme'),('line','foreign'),('identity',{}),('expected',{}),('actual',{})]:
                        bad=copy.deepcopy(body);bad['custom_typography_theme'][field]=value;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                    bad=copy.deepcopy(body);bad['custom_typography_theme']['expected']=copy.deepcopy(bad['custom_typography_theme']['actual']);self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))

                    for value in (('0','NaN','-1','rgba(0,0,0,0.5)') if any(p['property']=='rect-height' for p in body['properties']) else ()):
                        bad=copy.deepcopy(body)
                        for prop in bad['properties']:
                            if prop['property']=='rect-height':prop.update(reference=value,candidate=value)
                        self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))

                if body['context'] in ('theme-light','theme-dark'):
                    snack='/snack-' in case;dark=body['context']=='theme-dark'
                    target=('snack-container' if dark else 'snack-primary-action') if snack else ('visible-disabled-placeholder' if dark else 'invalid-arrow')
                    witness=body['customization_witness']
                    self.assertEqual(witness['baseline_case_id'],'owned-style/light/'+target)
                    self.assertEqual(witness['themed_case_id'],'owned-style/'+body['context']+'/'+target)
                    self.assertEqual(witness['property'],'background-color' if snack and dark else 'color')
                    for field,value in [('custom_theme',{}),('theme_frames',{}),('customization_witness',{}),('reference_kind','untouched-material-16.2.14-css')]:
                        bad=copy.deepcopy(body);bad[field]=value;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                    for field,value in [('case_id','mixin-argument/all-legacy-component-themes/raw-color-config'),('line','foreign'),('identity',{}),('expected',{}),('actual',{})]:
                        bad=copy.deepcopy(body);bad['custom_theme'][field]=value;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                    for mode in ('reference','candidate','negative'):
                        for field,value in [('context','light'),('body_scope',False),('body_scope',1),('nested_scope',True),('overlay_in_body',False),('overlay_outside_nested',False),('mutation_present',mode!='negative'),('theme_stylesheet_sha256','f'*64)]:
                            bad=copy.deepcopy(body);bad['theme_frames'][mode][field]=value;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'),(case,mode,field))
                    bad=copy.deepcopy(body)
                    for mode in ('reference','candidate'):bad['customization_witness'][mode]['themed']=bad['customization_witness'][mode]['baseline']
                    self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                    bad=copy.deepcopy(body);bad['customization_witness']['baseline_case_id']='owned-style/light/button-inheritance'
                    self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))

    def test_added_cases_preserve_the_original_branch_roster(self):
        task=json.loads((ROOT/'compatibility/rc/custom-owned-rendered-worksheet.json').read_bytes())
        matrix_path='compatibility/rc/matrices/full-verify.json'
        before=json.loads(subprocess.check_output(['git','show',task['source_parent']+':'+matrix_path],cwd=ROOT))
        after=json.loads((ROOT/matrix_path).read_bytes())
        groups=lambda data:next(row for row in data['checks'] if row['check_id']=='sass-seal')['acceptance']['cases_by_line']
        old=groups(before)[task['line']]['owned-rendered'];new=groups(after)[task['line']]['owned-rendered']
        self.assertEqual(len(old),24);self.assertEqual(new[:24],old);self.assertEqual(len(new),57)
        expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {ownedStyleCaseIds} from './scripts/sass-owned-rendered.mjs';console.log(JSON.stringify(ownedStyleCaseIds()));"],cwd=ROOT))
        self.assertEqual(new,expected)
        baseline={'21.x':'2f5201af2294a1c99552fb1876583b4e8d11b5f2','main':'9734b4a9ada49cdfe3dc8b4dfe44d1e04664a2ed'}[task['line']]
        before_current=json.loads(subprocess.check_output(['git','show',baseline+':'+matrix_path],cwd=ROOT))
        current=groups(before_current)[task['line']]['owned-rendered']
        self.assertEqual(len(current),37);self.assertEqual(new[:37],current)
        groups(after)[task['line']]['owned-rendered']=current
        self.assertEqual(after,before_current)

    def test_actual_writer_preserves_current_theme_and_overlay_receipts(self):
        subjects=[];inputs=[]
        for line in ('main','21.x'):
            version='22.1.7' if line=='main' else '21.2.14'
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64}],'oracles':{'current_peer':[{'id':'@angular/material','version':version},{'id':'@angular/cdk','version':version},{'id':'@angular/core','version':'22.1.7' if line=='main' else '21.2.23'}]}})
            for suffix in ('light/snack-action','typography/snack-action','theme-light/snack-primary-action','theme-dark/snack-container'):
                body=style_receipt(ROOT,active,'owned-style/'+suffix,'writer');context=body['context']
                item={k:body[k] for k in ('case_id','group','kind','result','selector','context','reference_kind','found','properties','mutation_detected','mutation','lifecycle') if k in body}
                if 'customization_witness' in body:item['customization_witness']=body['customization_witness']
                rendered={k:body[k] for k in ('line','identities','versions','browser')}
                rendered['settlement']={mode:{context:frame} for mode,frame in body['settlement'].items()}
                if context=='typography':rendered['custom_typography_theme']=body['custom_typography_theme']
                if context in ('theme-light','theme-dark'):
                    rendered['custom_themes']={context:body['custom_theme']}
                    rendered['theme_frames']={mode:{context:frame} for mode,frame in body['theme_frames'].items()}
                inputs.append([item,rendered,dict(runId='synthetic',invocationId='writer',binding=active.binding,tarballSha256='d'*64)])
                subjects.append((active,context))
        code="import {readFileSync} from 'node:fs';import {ownedStyleAssertionBody} from './scripts/sass-seal.mjs';console.log(JSON.stringify(JSON.parse(readFileSync(0)).map(args=>ownedStyleAssertionBody(...args))));"
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,input=json.dumps(inputs),capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stderr)
        outputs=json.loads(result.stdout);self.assertEqual(len(outputs),8)
        for (active,context),body in zip(subjects,outputs):
            self.assertTrue(owned_rendered_ok(ROOT,active,body,'writer'))
            if context in ('theme-light','theme-dark'):
                for field in ('custom_theme','theme_frames','customization_witness'):
                    bad=copy.deepcopy(body);del bad[field];self.assertFalse(owned_rendered_ok(ROOT,active,bad,'writer'))

    def test_actual_context_program_scopes_body_overlays_and_resets_prior_sheets(self):
        code=r"""
import assert from 'node:assert/strict';
import {OWNED_STYLE_CONTEXTS,ownedStyleContextProgram} from './scripts/sass-owned-rendered.mjs';
const classes=()=>{const values=new Set();return {add:value=>values.add(value),toggle:(value,on)=>on?values.add(value):values.delete(value),contains:value=>values.has(value)}};
const nodes=Object.fromEntries(['light-sheet','custom-sheet','typography-sheet','style-context'].map(id=>[id,{textContent:'stale',className:'stale'}]));
const button={classList:classes()};
globalThis.document={body:{classList:classes(),dataset:{}},getElementById:id=>nodes[id],querySelector:selector=>{assert.equal(selector,'.mat-simple-snackbar-action button');return button;}};
globalThis.window={__ownedStyleSheets:Object.fromEntries(OWNED_STYLE_CONTEXTS.flatMap(context=>['reference','candidate'].map(mode=>[context+'-'+mode,context+'-'+mode+' CSS'])))};
for(const context of [...OWNED_STYLE_CONTEXTS,...OWNED_STYLE_CONTEXTS.toReversed()])for(const mode of ['reference','candidate']){
 assert.equal(eval(ownedStyleContextProgram(context,mode)),true);
 assert.equal(nodes['light-sheet'].textContent,'light-'+mode+' CSS');
 assert.equal(nodes['custom-sheet'].textContent,context==='custom'?'custom-'+mode+' CSS':'');
 const full=['typography','theme-light','theme-dark'].includes(context);
 assert.equal(nodes['typography-sheet'].textContent,full?context+'-'+mode+' CSS':'');
 assert.equal(document.body.classList.contains('sass-argument-probe'),full);
 assert.equal(nodes['style-context'].className,context==='custom'?'shell':'');
 assert.equal(document.body.dataset.ownedStyleContext,context);assert.equal(button.classList.contains('mat-primary'),true);
}
assert.throws(()=>ownedStyleContextProgram('unknown','reference'));
assert.throws(()=>ownedStyleContextProgram('light','negative'));
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_actual_animation_and_font_wait_cannot_fake_settlement(self):
        code=r"""
import assert from 'node:assert/strict';
import {settleOwnedStyleFrame} from './scripts/sass-owned-rendered.mjs';
const evaluate=async program=>await eval(program);
globalThis.requestAnimationFrame=callback=>setTimeout(callback,1);
let animation={playState:'running',pending:false};let finish;let scheduled=false;
animation.finished=new Promise(resolve=>{finish=resolve;});
globalThis.document={fonts:{status:'loaded',ready:Promise.resolve()},getAnimations:()=>{if(!scheduled){scheduled=true;setTimeout(()=>{animation.playState='finished';finish();},12);}return [animation];}};
let result=await settleOwnedStyleFrame(evaluate,1000);
assert.equal(result.active_animations,0);assert.equal(result.stable_frames,2);assert.equal(result.observed_animations,1);
document.fonts.status='loading';document.fonts.ready=new Promise(resolve=>setTimeout(()=>{document.fonts.status='loaded';resolve();},12));
result=await settleOwnedStyleFrame(evaluate,1000);assert.equal(result.fonts_status,'loaded');
animation={playState:'paused',pending:false,finished:new Promise(()=>{})};
await assert.rejects(settleOwnedStyleFrame(evaluate,20),/did not settle/);
animation={playState:'running',pending:false};
animation.finished=new Promise((resolve,reject)=>setTimeout(()=>{animation.playState='idle';reject(new Error('cancelled'));},5));animation.finished.catch(()=>{});
result=await settleOwnedStyleFrame(evaluate,1000);assert.equal(result.active_animations,0);
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
