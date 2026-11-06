/** Targeted live legacy-control styles against untouched tagged CSS fixtures. */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mixinArgumentCatalog,mixinArgumentProgram} from './sass-mixin-arguments.mjs';
import {installConsumer, buildLab, readPackedPackage, versionsFor, withChromium} from './check-companion-computed-styles.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const FIXTURES = ['owned-legacy-select', 'owned-legacy-snack-bar', 'owned-legacy-button', '05-custom-map-nested'];
import {OWNED_STYLE_PROBES,OWNED_STYLE_CONTEXTS,ownedThemeVariant,ownedStyleCaseIds,assessOwnedStyles,assessSnackLifecycle,ownedStyleContextProgram} from './owned-style-contract.mjs';
export {OWNED_STYLE_PROBES,OWNED_STYLE_CONTEXTS,ownedThemeVariant,ownedStyleCaseIds,assessOwnedStyles,ownedStyleContextProgram};

/** Wait for actual browser animation/font completion; never disable motion or round pixels. */
export async function settleOwnedStyleFrame(evaluate, timeoutMs=5000) {
  const deadlineMs=Math.max(1,Math.min(5000,timeoutMs));
  return evaluate(`(async()=>{
    const deadline=performance.now()+${deadlineMs};
    const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const active=()=>document.getAnimations().filter(animation=>animation.pending || !['finished','idle'].includes(animation.playState));
    let observed=0;
    await frames();
    for(;;){
      const running=active();observed=Math.max(observed,running.length);
      if(performance.now()>deadline)throw new Error('owned style frame did not settle before timeout');
      if(document.fonts.status==='loaded'&&running.length===0){
        await frames();
        if(document.fonts.status==='loaded'&&active().length===0)
          return {fonts_status:'loaded',active_animations:0,stable_frames:2,observed_animations:observed};
      }else{
        await Promise.race([
          Promise.allSettled([document.fonts.ready,...running.map(animation=>animation.finished)]),
          new Promise(resolve=>setTimeout(resolve,Math.min(50,Math.max(1,deadline-performance.now())))),
        ]);
      }
    }
  })()`);
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
@Component({standalone:true,selector:'modern-button-style-lab',imports:[MatButtonModule],template:\`<div class="mat-datepicker-content"><button matButton="text" id="s-mdc-text">Text inherited</button><button matButton="elevated" id="s-mdc-raised">Raised inherited</button><button matButton="filled" id="s-mdc-flat">Flat inherited</button><button matButton="outlined" id="s-mdc-stroked">Outlined inherited</button></div><button matButton="text" id="s-mdc-outside">Outside datepicker</button>\`})
export class ModernButtonStyleLab {}
@Component({standalone:true,selector:'owned-style-lab',imports:[ReactiveFormsModule,ModernButtonStyleLab,MatLegacyButtonModule,MatLegacySelectModule,MatLegacyOptionModule,MatLegacyFormFieldModule,MatLegacySnackBarModule],template:\`
<div id="style-context"><div class="alternate" style="font-size:27px;line-height:2.75"><button mat-raised-button id="s-button">Inherited</button><modern-button-style-lab></modern-button-style-lab></div>
<mat-select id="s-standalone" placeholder="Visible disabled" [disabled]="true"><mat-option value="yes">Yes</mat-option></mat-select><mat-form-field><mat-select id="s-combined" placeholder="Combined" [disabled]="true"><mat-option value="yes">Yes</mat-option></mat-select></mat-form-field><mat-form-field><mat-select id="s-disabled" placeholder="Empty disabled" [disabled]="true"><mat-option value="yes">Yes</mat-option></mat-select></mat-form-field>
<mat-form-field><mat-select id="s-value" placeholder="Disabled value" value="yes" [disabled]="true"><mat-option value="yes">Yes</mat-option></mat-select></mat-form-field>
<mat-form-field><mat-select id="s-invalid" placeholder="Invalid" [formControl]="invalid"><mat-option value="yes">Yes</mat-option></mat-select></mat-form-field>
</div>\`})
export class OwnedStyleLab implements AfterViewInit {
 events:string[]=[];ref:any; invalid=new FormControl('',Validators.required);
 snack=inject(MatLegacySnackBar);cdr=inject(ChangeDetectorRef);
 ngAfterViewInit(){(window as any).__ownedStyleLab=this;}
 prepare(){this.invalid.markAsTouched();this.cdr.detectChanges();this.ref=this.snack.open('Tagged action','Action',{duration:0});this.ref.onAction().subscribe(()=>this.events.push('action'));this.ref.afterDismissed().subscribe((e:any)=>this.events.push('dismissed:'+e.dismissedByAction));document.getElementById('s-combined')!.classList.add('mat-select-invalid');}
}
bootstrapApplication(OwnedStyleLab,{providers:[provideZoneChangeDetection()]}).catch(error=>{(window as any).__ownedStyleError=String(error);});
`;
export async function renderOwnedStyles({tarball,argumentEvidence}) {
  const packed=readPackedPackage(tarball);const line=packed.version.startsWith('22.')?'main':packed.version.startsWith('21.')?'21.x':null;
  if(!line||packed.name!=='@ngx-compat/material-legacy')throw new Error('owned style proof requires the real packed library');
  const versions=versionsFor(packed);
  const {consumer,env,installed}=installConsumer(tarball,versions);
  const sass=createRequire(join(root,'package.json'))('sass');
  try {
    await buildLab(consumer,env,versions,source,{strictDeclarations:true});
    const nodeModules=join(consumer,'node_modules');const allowed=[realpathSync(installed),realpathSync(join(nodeModules,'@angular/cdk')),realpathSync(join(nodeModules,'@angular/material'))];
    const catalog=mixinArgumentCatalog();
    const original=catalog.original_entry_identity;
    const packedIndex=hash(readFileSync(join(installed,'_index.scss')));
    const customThemes=Object.fromEntries(['theme-light','theme-dark'].map(context=>{
      const measurement=argumentEvidence?.results?.find(p=>p.case_id==='mixin-argument/all-legacy-component-themes/'+ownedThemeVariant(context));
      const probe=catalog.cases.find(p=>p.case_id===measurement?.case_id);
      if(!probe || measurement.error || measurement.line!==line
        || measurement.identity.catalog_sha256!==catalog.sha256 || measurement.identity.sass_version!==sass.info
        || !['expected','actual'].every(role=>typeof measurement[role]?.css==='string'&&measurement[role].css.trim().length>0
          && measurement[role].css_sha256===hash(measurement[role].css)
          && measurement[role].program_sha256===hash(mixinArgumentProgram(catalog,probe)))
        || !measurement.expected.sources.some(p=>p.root===0&&p.path===original.path&&p.sha256===original.sha256&&p.bytes===original.bytes)
        || !measurement.actual.sources.some(p=>p.root===0&&p.path==='_index.scss'&&p.sha256===packedIndex))
        throw new Error('custom owned styles require authenticated original and exact packed '+context+' mixin measurements');
      return [context,measurement];
    }));
    const customTypography=customThemes['theme-light'];
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
      [`typography-${mode}`,customTypography[mode==='reference'?'expected':'actual'].css],
      ...Object.entries(customThemes).map(([context,measurement])=>[context+'-'+mode,measurement[mode==='reference'?'expected':'actual'].css]),
    ]));
    writeFileSync(join(dist,'index.html'),'<!doctype html><html><head><style id="light-sheet">'+sheetTexts['light-reference']+'</style><style id="custom-sheet"></style><style id="typography-sheet"></style></head><body><owned-style-lab></owned-style-lab><script src="app.js"></script></body></html>');
    const observations=await withChromium(dist,async({evaluate,browser})=>{
      for(let i=0;i<200;i++){if(await evaluate('!!window.__ownedStyleLab || !!window.__ownedStyleError'))break;await new Promise(r=>setTimeout(r,100));}
      if(!(await evaluate('!!window.__ownedStyleLab')))throw new Error(await evaluate('window.__ownedStyleError||"owned style lab not ready"'));
      await evaluate('window.__ownedStyleLab.prepare()');
      for(let i=0;i<100;i++){if(await evaluate('!!document.querySelector(".mat-simple-snackbar-action button") && !!document.querySelector("#s-invalid.mat-select-invalid")'))break;await new Promise(r=>setTimeout(r,30));}
      if(!(await evaluate('!!document.querySelector("#s-invalid.mat-select-invalid")')))throw new Error('required select did not reach invalid state');
      const reader=`(() => {const effectiveOpacity=el=>{let n=el,opacity=1;while(n){const style=getComputedStyle(n);if(style.visibility!=='visible'||style.display==='none')return '0';opacity*=Number(style.opacity);n=n.parentElement;}const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(el).color;ctx.fillRect(0,0,1,1);return String(opacity*ctx.getImageData(0,0,1,1).data[3]/255);};const probes=${JSON.stringify(OWNED_STYLE_PROBES)};const context=document.body.dataset.ownedStyleContext;return Object.fromEntries(Object.entries(probes).filter(([id,p])=>p.context===context).map(([id,p])=>{if(p.selector.startsWith('#s-combined'))document.getElementById('s-combined').classList.add('mat-select-invalid');const el=document.querySelector(p.selector);if(el&&p.state==='focus')el.focus();let component=null;if(el&&p.state==='disabled'){component=window.ng?.getComponent(el);if(!component)throw new Error('legacy action button component unavailable');component.disabled=true;window.ng.applyChanges(component);}const s=el?getComputedStyle(el):null;const values=Object.fromEntries(p.properties.map(k=>[k,s?(k==='effective-opacity'?effectiveOpacity(el):k==='state-active'?String(p.state==='focus'?document.activeElement===el:component.disabled===true&&el.disabled===true&&el.classList.contains('mat-button-disabled')):k==='rect-height'?String(el.getBoundingClientRect().height):k==='rect-width'?String(el.getBoundingClientRect().width):s.getPropertyValue(k).trim()):null]));if(el&&p.state==='disabled'){component.disabled=false;window.ng.applyChanges(component);}if(el&&p.state==='focus')el.blur();return [id,{found:!!el,values}]}));})()`;
      const themeFrames={reference:{},candidate:{},negative:{}};
      const captureThemeFrame=async(mode,context)=>{
        if(!ownedThemeVariant(context))return;
        const frame=await evaluate(`(()=>{const overlay=document.querySelector('.mat-snack-bar-container'),nested=document.getElementById('style-context');return {context:document.body.dataset.ownedStyleContext,body_scope:document.body.classList.contains('sass-argument-probe'),nested_scope:nested.classList.contains('shell'),overlay_in_body:!!overlay&&document.body.contains(overlay),overlay_outside_nested:!!overlay&&!nested.contains(overlay),mutation_present:!!document.getElementById('owned-mutation'),sheet:document.getElementById('typography-sheet').textContent};})()`);
        const {sheet,...scope}=frame;themeFrames[mode][context]={...scope,theme_stylesheet_sha256:hash(sheet)};
      };
      await evaluate('window.__ownedStyleSheets='+JSON.stringify(sheetTexts));
      const captures={reference:{},candidate:{}};
      const settlement={reference:{},candidate:{},negative:{}};
      for(const mode of ['reference','candidate'])for(const context of OWNED_STYLE_CONTEXTS){
        await evaluate(ownedStyleContextProgram(context,mode));
        settlement[mode][context]=await settleOwnedStyleFrame(evaluate);
        Object.assign(captures[mode],await evaluate(reader));
        await captureThemeFrame(mode,context);
      }
      const negative={};
      for(const context of OWNED_STYLE_CONTEXTS) {
        await evaluate(ownedStyleContextProgram(context,'candidate'));
        const css=Object.values(OWNED_STYLE_PROBES).filter(p=>p.context===context).map(p=>{
          const property=p.properties.includes('line-height')?'line-height':p.properties[0];
          return `${p.selector} {${property}: ${property.includes('color')?'rgb(1, 2, 3)':'1px'} !important;}`;
        }).join('\n');
        await evaluate(`(()=>{const mutation=document.createElement('style');mutation.id='owned-mutation';mutation.textContent=${JSON.stringify(css)};document.head.appendChild(mutation);return true;})()`);
        settlement.negative[context]=await settleOwnedStyleFrame(evaluate);
        Object.assign(negative,await evaluate(reader));
        await captureThemeFrame('negative',context);
        await evaluate("document.getElementById('owned-mutation').remove()");
      }
      const lifecycle=await evaluate(`(async()=>{const lab=window.__ownedStyleLab;const first=document.querySelector('.mat-snack-bar-container');document.querySelector('.mat-simple-snackbar-action button').click();const wait=async(p)=>{const end=performance.now()+5000;while(!p()&&performance.now()<end)await new Promise(r=>setTimeout(r,20));return p()};await wait(()=>lab.events.includes('dismissed:true')&&!document.querySelector('.mat-snack-bar-container'));const first_events=[...lab.events],first_removed=!document.querySelector('.mat-snack-bar-container');lab.events=[];lab.ref=lab.snack.open('Reopened action','Again',{duration:0});lab.ref.onAction().subscribe(()=>lab.events.push('action'));lab.ref.afterDismissed().subscribe(e=>lab.events.push('dismissed:'+e.dismissedByAction));await wait(()=>!!document.querySelector('.mat-snack-bar-container'));const second=document.querySelector('.mat-snack-bar-container');const reopened=!!second&&second!==first;lab.ref.dismiss();await wait(()=>lab.events.includes('dismissed:false')&&!document.querySelector('.mat-snack-bar-container'));const second_events=[...lab.events],second_removed=!document.querySelector('.mat-snack-bar-container');lab.events=[];lab.ref=lab.snack.open('Mutant','Again',{duration:0});lab.ref.onAction().subscribe(()=>lab.events.push('action'));lab.ref.afterDismissed().subscribe(e=>lab.events.push('dismissed:'+e.dismissedByAction));await wait(()=>!!document.querySelector('.mat-snack-bar-container'));lab.ref.dismiss();await wait(()=>lab.events.includes('dismissed:false')&&!document.querySelector('.mat-snack-bar-container'));return {first_events,first_removed,reopened,second_events,second_removed,negative_events:[...lab.events],negative_removed:!document.querySelector('.mat-snack-bar-container')};})()`);return {browser,settlement,theme_frames:themeFrames,...captures,negative,lifecycle};
    },{debugPort:9349});
    return {line,versions,custom_typography_theme:customTypography,custom_themes:customThemes,tarball_sha256:hash(readFileSync(tarball)),source_kind:'packed',reference_kind:'untouched-material-16.2.14-css',strict_templates:true,skip_lib_check:false,identities,...observations,results:Object.fromEntries(Object.entries(assessOwnedStyles(observations.reference,observations.candidate,observations.negative)).map(([id,item])=>id.includes('/snack-')?[id,{...item,lifecycle:observations.lifecycle,result:item.result==='pass'&&assessSnackLifecycle(observations.lifecycle)?'pass':'fail'}]:[id,item]))};
  } finally {rmSync(consumer,{recursive:true,force:true});}
}
