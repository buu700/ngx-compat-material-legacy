/** Targeted live legacy-control styles against untouched tagged CSS fixtures. */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {installConsumer, buildLab, readPackedPackage, versionsFor, withChromium} from './check-companion-computed-styles.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const FIXTURES = ['owned-legacy-select', 'owned-legacy-snack-bar', 'owned-legacy-button', '05-custom-map-nested'];
export const OWNED_STYLE_PROBES = Object.freeze({
  'light/disabled-placeholder': {context:'light', selector:'#s-disabled .mat-select-placeholder', properties:['color']},
  'light/disabled-value': {context:'light', selector:'#s-value .mat-select-value-text', properties:['color']},
  'light/invalid-arrow': {context:'light', selector:'#s-invalid .mat-select-arrow', properties:['color']},
  'light/snack-container': {context:'light', selector:'.mat-snack-bar-container', properties:['color','background-color']},
  'light/snack-action': {context:'light', selector:'.mat-simple-snackbar-action', properties:['color','line-height']},
  'light/snack-primary-action': {context:'light', selector:'.mat-simple-snackbar-action button', properties:['color']},
  'custom/disabled-placeholder': {context:'custom', selector:'#s-disabled .mat-select-placeholder', properties:['color']},
  'custom/invalid-arrow': {context:'custom', selector:'#s-invalid .mat-select-arrow', properties:['color']},
  'light/button-inheritance': {context:'light', selector:'#s-button', properties:['font-size','font-weight','line-height','height']},
  'custom/button-inheritance': {context:'custom', selector:'#s-button', properties:['font-size','font-weight','line-height','height']},
  'light/datepicker-text-button': {context:'light', selector:'#s-mdc-text', properties:['font-size','font-weight','line-height','height']},
  'light/datepicker-raised-button': {context:'light', selector:'#s-mdc-raised', properties:['font-size','font-weight','line-height','height']},
  'light/datepicker-flat-button': {context:'light', selector:'#s-mdc-flat', properties:['font-size','font-weight','line-height','height']},
  'light/datepicker-stroked-button': {context:'light', selector:'#s-mdc-stroked', properties:['font-size','font-weight','line-height','height']},
  'light/outside-datepicker-button': {context:'light', selector:'#s-mdc-outside', properties:['font-size','font-weight','line-height','height']},
  'custom/datepicker-text-button': {context:'custom', selector:'#s-mdc-text', properties:['font-size','font-weight','line-height','height']},
  'custom/datepicker-raised-button': {context:'custom', selector:'#s-mdc-raised', properties:['font-size','font-weight','line-height','height']},
  'custom/datepicker-flat-button': {context:'custom', selector:'#s-mdc-flat', properties:['font-size','font-weight','line-height','height']},
  'custom/datepicker-stroked-button': {context:'custom', selector:'#s-mdc-stroked', properties:['font-size','font-weight','line-height','height']},
  'custom/outside-datepicker-button': {context:'custom', selector:'#s-mdc-outside', properties:['font-size','font-weight','line-height','height']},
});
export const ownedStyleCaseIds = () => Object.keys(OWNED_STYLE_PROBES).map(id => `owned-style/${id}`);
export function assessOwnedStyles(reference, candidate, negative) {
  return Object.fromEntries(Object.entries(OWNED_STYLE_PROBES).map(([id,spec])=>{
    const before=reference?.[id], after=candidate?.[id];
    const properties=spec.properties.map(property=>({property,reference:before?.values?.[property]??null,candidate:after?.values?.[property]??null}));
    const found=before?.found===true&&after?.found===true;
    const match=found&&properties.every(p=>typeof p.reference==='string'&&p.reference!==''&&p.candidate===p.reference);
    const mutation=negative?.[id];
    const mutationProperty=spec.properties.includes('line-height')?'line-height':spec.properties[0];
    const mutationReference=before?.values?.[mutationProperty];
    const mutationObserved=mutation?.values?.[mutationProperty];
    const sensitivity=mutation?.found===true&&typeof mutationReference==='string'&&mutationReference!==''&&typeof mutationObserved==='string'&&mutationObserved!==''&&mutationObserved!==mutationReference;
    return [id,{case_id:`owned-style/${id}`,group:'owned-rendered',kind:'assertion',result:match&&sensitivity?'pass':'fail',selector:spec.selector,context:spec.context,found,properties,mutation_detected:sensitivity,mutation:{found:mutation?.found===true,property:mutationProperty,reference:mutationReference??null,observed:mutationObserved??null}}];
  }));
}
const source = `
import 'zone.js';
import {AfterViewInit, ChangeDetectorRef, Component, inject, provideZoneChangeDetection} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacyOptionModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacySnackBar, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
@Component({standalone:true,selector:'owned-style-lab',imports:[ReactiveFormsModule,MatButtonModule,MatLegacyButtonModule,MatLegacySelectModule,MatLegacyOptionModule,MatLegacyFormFieldModule,MatLegacySnackBarModule],template:\`
<div id="style-context"><div class="alternate" style="font-size:27px;line-height:2.75"><button mat-raised-button id="s-button">Inherited</button><div class="mat-datepicker-content"><button matButton="text" id="s-mdc-text">Text inherited</button><button matButton="elevated" id="s-mdc-raised">Raised inherited</button><button matButton="filled" id="s-mdc-flat">Flat inherited</button><button matButton="outlined" id="s-mdc-stroked">Outlined inherited</button></div><button matButton="text" id="s-mdc-outside">Outside datepicker</button></div>
<mat-form-field><mat-select id="s-disabled" placeholder="Empty disabled" [disabled]="true"><mat-option value="yes">Yes</mat-option></mat-select></mat-form-field>
<mat-form-field><mat-select id="s-value" placeholder="Disabled value" value="yes" [disabled]="true"><mat-option value="yes">Yes</mat-option></mat-select></mat-form-field>
<mat-form-field><mat-select id="s-invalid" placeholder="Invalid" [formControl]="invalid"><mat-option value="yes">Yes</mat-option></mat-select></mat-form-field>
</div>\`})
export class OwnedStyleLab implements AfterViewInit {
 invalid=new FormControl('',Validators.required);
 snack=inject(MatLegacySnackBar);cdr=inject(ChangeDetectorRef);
 ngAfterViewInit(){(window as any).__ownedStyleLab=this;}
 prepare(){this.invalid.markAsTouched();this.cdr.detectChanges();this.snack.open('Tagged action','Action',{duration:0});}
}
bootstrapApplication(OwnedStyleLab,{providers:[provideZoneChangeDetection()]}).catch(error=>{(window as any).__ownedStyleError=String(error);});
`;
export async function renderOwnedStyles({tarball}) {
  const packed=readPackedPackage(tarball);const line=packed.version.startsWith('22.')?'main':packed.version.startsWith('21.')?'21.x':null;
  if(!line||packed.name!=='@ngx-compat/material-legacy')throw new Error('owned style proof requires the real packed library');
  const versions=versionsFor(packed);
  const {consumer,env,installed}=installConsumer(tarball,versions);
  const sass=createRequire(join(root,'package.json'))('sass');
  try {
    await buildLab(consumer,env,versions,source,{strictDeclarations:true});
    const nodeModules=join(consumer,'node_modules');const allowed=[realpathSync(installed),realpathSync(join(nodeModules,'@angular/cdk')),realpathSync(join(nodeModules,'@angular/material'))];
    const sheets={},identities={};
    for(const id of FIXTURES){
      const referencePath=join(root,'reference/material-16.2.14/sass-css',id+'.css');
      const reference=readFileSync(referencePath,'utf8');
      const fixture=readFileSync(join(root,'fixtures/sass',id+'.scss'),'utf8');
      const compiled=sass.compileString(fixture.replaceAll("'@angular/material'","'@ngx-compat/material-legacy'"),{loadPaths:[nodeModules],style:'expanded',silenceDeprecations:['if-function','global-builtin','color-functions','import']});
      if(compiled.loadedUrls.some(url=>url.protocol==='file:'&&!allowed.some(base=>realpathSync(fileURLToPath(url)).startsWith(base+sep))))throw new Error('owned style compile borrowed a workspace stylesheet');
      sheets[id]={reference,candidate:compiled.css};identities[id]={reference_sha256:hash(reference),candidate_sha256:hash(compiled.css),fixture_sha256:hash(fixture)};
    }
    const dist=join(consumer,'dist');mkdirSync(dist,{recursive:true});
    const light=FIXTURES.filter(id=>id!=='05-custom-map-nested');
    for(const mode of ['reference','candidate']) {
      writeFileSync(join(dist,`light-${mode}.css`),light.map(id=>sheets[id][mode]).join('\n'));
      writeFileSync(join(dist,`custom-${mode}.css`),sheets['05-custom-map-nested'][mode]);
    }
    const sheetTexts = Object.fromEntries(['reference','candidate'].flatMap(mode => [
      [`light-${mode}`,light.map(id=>sheets[id][mode]).join('\n')],
      [`custom-${mode}`,sheets['05-custom-map-nested'][mode]],
    ]));
    writeFileSync(join(dist,'index.html'),'<!doctype html><html><head><style id="light-sheet">'+sheetTexts['light-reference']+'</style><style id="custom-sheet"></style></head><body><owned-style-lab></owned-style-lab><script src="app.js"></script></body></html>');
    const observations=await withChromium(dist,async({evaluate,browser})=>{
      for(let i=0;i<200;i++){if(await evaluate('!!window.__ownedStyleLab || !!window.__ownedStyleError'))break;await new Promise(r=>setTimeout(r,100));}
      if(!(await evaluate('!!window.__ownedStyleLab')))throw new Error(await evaluate('window.__ownedStyleError||"owned style lab not ready"'));
      await evaluate('window.__ownedStyleLab.prepare()');
      for(let i=0;i<100;i++){if(await evaluate('!!document.querySelector(".mat-simple-snackbar-action button") && !!document.querySelector("#s-invalid.mat-select-invalid")'))break;await new Promise(r=>setTimeout(r,30));}
      if(!(await evaluate('!!document.querySelector("#s-invalid.mat-select-invalid")')))throw new Error('required select did not reach invalid state');
      const reader=`(() => {const probes=${JSON.stringify(OWNED_STYLE_PROBES)};const context=document.getElementById('style-context').classList.contains('shell')?'custom':'light';return Object.fromEntries(Object.entries(probes).filter(([id,p])=>p.context===context).map(([id,p])=>{const el=document.querySelector(p.selector);const s=el?getComputedStyle(el):null;return [id,{found:!!el,values:Object.fromEntries(p.properties.map(k=>[k,s?s.getPropertyValue(k).trim():null]))}]}));})()`;
      await evaluate('window.__ownedStyleSheets='+JSON.stringify(sheetTexts));
      const captures={reference:{},candidate:{}};
      for(const mode of ['reference','candidate'])for(const context of ['light','custom']){
        await evaluate(`(()=>{document.getElementById('light-sheet').textContent=window.__ownedStyleSheets['light-${mode}'];document.getElementById('custom-sheet').textContent=${JSON.stringify(context==='custom')}?window.__ownedStyleSheets['custom-${mode}']:'';document.getElementById('style-context').className=${JSON.stringify(context==='custom'?'shell':'')};document.querySelector('.mat-simple-snackbar-action button').classList.add('mat-primary');return true;})()`);
        await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))');
        Object.assign(captures[mode],await evaluate(reader));
      }
      const negative={};
      for(const context of ['light','custom']) {
        await evaluate(`(()=>{document.getElementById('style-context').className=${JSON.stringify(context==='custom'?'shell':'')};document.getElementById('light-sheet').textContent=window.__ownedStyleSheets['light-candidate'];document.getElementById('custom-sheet').textContent=${JSON.stringify(context==='custom')}?window.__ownedStyleSheets['custom-candidate']:'';return true;})()`);
        const css=Object.values(OWNED_STYLE_PROBES).filter(p=>p.context===context).map(p=>{
          const property=p.properties.includes('line-height')?'line-height':p.properties[0];
          return `${p.selector} {${property}: ${property.includes('color')?'rgb(1, 2, 3)':'1px'} !important;}`;
        }).join('\n');
        await evaluate(`(()=>{const mutation=document.createElement('style');mutation.id='owned-mutation';mutation.textContent=${JSON.stringify(css)};document.head.appendChild(mutation);return true;})()`);
        await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))');
        Object.assign(negative,await evaluate(reader));
        await evaluate("document.getElementById('owned-mutation').remove()");
      }
      return {browser,...captures,negative};
    },{debugPort:9349});
    return {line,versions,tarball_sha256:hash(readFileSync(tarball)),source_kind:'packed',reference_kind:'untouched-material-16.2.14-css',strict_templates:true,skip_lib_check:false,identities,...observations,results:assessOwnedStyles(observations.reference,observations.candidate,observations.negative)};
  } finally {rmSync(consumer,{recursive:true,force:true});}
}
