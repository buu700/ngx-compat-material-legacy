/** Build and interact with the application that the packed CLI migrated. */
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {buildLab, readPackedPackage, versionsFor, withChromium} from './check-companion-computed-styles.mjs';
import {digest} from './migration-run-inputs.mjs';

export const OLD_APPLICATION = `
import 'zone.js';
import {AfterViewInit, Component, ViewChild, provideZoneChangeDetection} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatLegacyButtonModule} from '@angular/material/legacy-button';
import {MatLegacySelect, MatLegacySelectModule} from '@angular/material/legacy-select';
import {MatLegacyOptionModule} from '@angular/material/legacy-core';
@Component({standalone: true, selector: 'migrated-app', imports: [MatLegacyButtonModule, MatLegacySelectModule, MatLegacyOptionModule, ReactiveFormsModule],
 template: '<button mat-raised-button id="migrated-button">Migrated</button><mat-select [formControl]="control"><mat-option value="yes">Yes</mat-option></mat-select>'})
export class MigratedApplication implements AfterViewInit {
 control = new FormControl('', {nonNullable: true, validators: Validators.required});
 @ViewChild(MatLegacySelect) select!: MatLegacySelect;
 ngAfterViewInit() { (window as any).__migratedApp = this; }
}
bootstrapApplication(MigratedApplication, {providers: [provideZoneChangeDetection()]}).catch(error => {
 (window as any).__migrationError = String(error);
});
`;
export const OLD_STYLES = `@use '@angular/material' as mat;
$primary: mat.define-palette(mat.$indigo-palette);
$accent: mat.define-palette(mat.$pink-palette);
$theme: mat.define-light-theme((color: (primary: $primary, accent: $accent)));
@include mat.legacy-core();
@include mat.legacy-button-theme($theme);
@include mat.legacy-select-theme($theme);
`;
export async function proveMigratedConsumer(work, application, styles, input) {
  const library = input.artifacts.library;
  const packed = readPackedPackage(library.absolute);
  if (packed.name !== '@ngx-compat/material-legacy' || packed.version.split('.')[0] !== (input.line === 'main' ? '22' : '21')) throw new Error('wrong library artifact line');
  const versions = versionsFor(packed);
  const packageJson = {name:'migrated-material-16-consumer',private:true,dependencies:{
    ...Object.fromEntries(['animations','common','compiler','compiler-cli','core','forms','platform-browser','platform-browser-dynamic'].map(n=>['@angular/'+n,versions.core])),
    '@angular/cdk':versions.cdk,'@angular/material':versions.material,'@ngx-compat/material-legacy':`file:${library.absolute}`,
    rxjs:versions.rxjs,typescript:versions.typescript,tslib:versions.tslib,'zone.js':versions.zone,
  }};
  // The historical install was authenticated and migrated first. Replace it only now.
  rmSync(join(work,'node_modules'),{recursive:true,force:true});
  rmSync(join(work,'package-lock.json'));
  writeFileSync(join(work,'package.json'),JSON.stringify(packageJson,null,2));
  const env={...process.env,NODE_OPTIONS:''};delete env.NODE_PATH;
  writeFileSync(join(work,'.npmrc'),'install-links=true\nfund=false\naudit=false\n');
  const install=spawnSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock'],{cwd:work,env,encoding:'utf8',timeout:600000});
  if(install.status!==0)throw new Error(`upgraded consumer install failed: ${(install.stderr||install.stdout).slice(-3000)}`);
  for(const [name,version] of Object.entries(packageJson.dependencies)) {
    if(name==='@ngx-compat/material-legacy')continue;
    const actual=JSON.parse(readFileSync(join(work,'node_modules',...name.split('/'),'package.json'),'utf8')).version;
    if(actual!==version)throw new Error(`upgraded peer ${name}@${actual} differs from ${version}`);
  }
  const installed=realpathSync(join(work,'node_modules/@ngx-compat/material-legacy'));
  if(relative(realpathSync(work),installed).startsWith('..'))throw new Error('upgraded consumer borrowed library resolution');
  await buildLab(work,env,versions,application,{strictDeclarations:true});
  const sass = createRequire(new URL('../package.json',import.meta.url))('sass');
  const compiled=sass.compileString(styles,{loadPaths:[join(work,'node_modules')],silenceDeprecations:['if-function','global-builtin','color-functions','import']});
  if(!compiled.css.includes('.mat-select')||!compiled.css.includes('.mat-raised-button'))throw new Error('migrated Sass omitted legacy control styles');
  const cssPath=join(work,'dist/migrated.css');writeFileSync(cssPath,compiled.css);
  writeFileSync(join(work,'dist/index.html'),'<!doctype html><html><head><link rel="stylesheet" href="migrated.css"></head><body><migrated-app></migrated-app><script src="app.js"></script></body></html>');
  const browserProof=await withChromium(join(work,'dist'),async({evaluate,browser})=>{
    for(let i=0;i<200;i++){if(await evaluate('!!window.__migratedApp || !!window.__migrationError'))break;await new Promise(r=>setTimeout(r,100));}
    const before=await evaluate('({ready:!!window.__migratedApp,error:window.__migrationError||null,invalid:window.__migratedApp?.control.invalid,button:document.querySelector("#migrated-button")?.textContent})');
    if(!before.ready||before.error||before.invalid!==true||before.button!=='Migrated')throw new Error('migrated consumer failed initial control/form contract');
    await evaluate('window.__migratedApp.select.open()');
    let found=false;for(let i=0;i<100;i++){if(await evaluate('!!document.querySelector(".cdk-overlay-container mat-option")')){found=true;break;}await new Promise(r=>setTimeout(r,30));}
    if(!found)throw new Error('migrated select did not create a body overlay');
    await evaluate('document.querySelector(".cdk-overlay-container mat-option").click()');
    for(let i=0;i<100;i++){if(await evaluate('window.__migratedApp.control.value==="yes" && !window.__migratedApp.select.panelOpen'))break;await new Promise(r=>setTimeout(r,30));}
    const after=await evaluate('({value:window.__migratedApp.control.value,valid:window.__migratedApp.control.valid,panelOpen:window.__migratedApp.select.panelOpen})');
    if(after.value!=='yes'||after.valid!==true||after.panelOpen!==false)throw new Error('migrated select interaction/form update failed');
    return {browser,before,after,result:'pass'};
  },{debugPort:9346});
  const lock=readFileSync(join(work,'package-lock.json'));
  return {result:'pass',line:input.line,versions,node:process.version,strict_templates:true,skip_lib_check:false,
    application_sha256:digest(application),styles_sha256:digest(styles),css_sha256:digest(compiled.css),
    lock_sha256:digest(lock),library_sha256:library.sha256,cli_sha256:input.artifacts['migrate-cli'].sha256,browser:browserProof};
}
