#!/usr/bin/env node
/**
 * Execute every declared required browser-matrix cell against packed artifacts.
 *
 *   node scripts/browser-required-cells.mjs --tarball <main.tgz> --tarball-21x <21.tgz>
 *   node scripts/run-browser-matrix-slice.mjs --all-required --tarball <main.tgz> --tarball-21x <21.tgz>
 *
 * Chromium uses CDP. Firefox uses WebDriver BiDi. WebKit uses system WebKitGTK.
 * A cell is recorded only when the page probe returns ok. This does not claim G10.
 * Enabled-motion and SSR stay unexpanded because the declaration has no cell ids
 * for them. Pass --ssr to also run scripts/ssr-dialog.mjs for the main tarball.
 */
import {createHash} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256File} from './resolve-run-library.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheRoot = '/tmp/ngx-required-cells';

export function sessionRoot() {
  return process.env.NGX_REQUIRED_CELLS_ROOT || cacheRoot;
}

/** Create an owned session parent if needed, then a unique child directory.
 *  mkdtemp does not create a missing parent, so a cold start must do this
 *  before Chromium, Firefox, or WebKit profile setup. */
export function allocateLauncherDir(prefix, parent = sessionRoot()) {
  mkdirSync(parent, {recursive: true});
  return mkdtempSync(join(parent, prefix));
}
const matrixPath = join(root, 'compatibility/rc/matrices/browser-matrix.json');
const reportPath = join(root, 'compatibility/rc/reports/browser-matrix-required.json');
const probePath = join(root, 'scripts/browser-required-probe.js');
const webkitScript = join(root, 'scripts/browser-webkit-session.py');
const CSP_NONCE = 'rc07csp';
const CDP_PORTS = {chromium: 9333, firefox: 9334};

function firefoxBin() {
  if (process.env.FIREFOX_BIN && existsSync(process.env.FIREFOX_BIN)) return process.env.FIREFOX_BIN;
  if (existsSync('/usr/bin/firefox')) return '/usr/bin/firefox';
  throw new Error('No Firefox binary found; set FIREFOX_BIN');
}

export function summarizeCells(requiredIds, outcomes) {
  const required = new Set(requiredIds);
  const executed = [];
  const failed = [];
  const unknown = [];
  const seen = new Set();
  for (const row of outcomes) {
    if (!row || typeof row.id !== 'string' || !required.has(row.id)) {
      unknown.push(row && row.id ? row.id : '(blank)');
      continue;
    }
    if (seen.has(row.id)) {
      unknown.push(row.id);
      continue;
    }
    seen.add(row.id);
    if (row.ok === true && typeof row.evidence === 'string' && row.evidence.length > 0) executed.push(row.id);
    else failed.push(row.id);
  }
  const missing = requiredIds.filter(id => !seen.has(id));
  return {
    executed_cell_ids: executed,
    executed_count: executed.length,
    failed_cell_ids: failed,
    missing_cell_ids: missing,
    unknown_cell_ids: unknown,
    ok: failed.length === 0 && missing.length === 0 && unknown.length === 0 && executed.length === requiredIds.length,
  };
}

function exactVersion(spec, fallback) {
  const match = String(spec || '').match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : fallback;
}

function readPackedPackage(tarball) {
  const result = spawnSync('tar', ['-xOzf', tarball, 'package/package.json'], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error((result.stderr || 'unable to read packed package.json').slice(-500));
  return JSON.parse(result.stdout);
}

function versionsFor(pkg) {
  const peers = pkg.peerDependencies || {};
  const core = exactVersion(peers['@angular/core'], '22.1.7');
  const major = Number(core.split('.')[0]);
  return {
    core,
    cdk: exactVersion(peers['@angular/cdk'], major >= 22 ? '22.1.7' : '21.2.14'),
    material: exactVersion(peers['@angular/material'], major >= 22 ? '22.1.7' : '21.2.14'),
    rxjs: exactVersion(peers.rxjs, '7.8.2'),
    typescript: major >= 22 ? '6.0.3' : '5.9.2',
    zone: major >= 22 ? '0.16.3' : '0.15.1',
    tslib: '2.8.1',
    sass: '1.104.1',
  };
}

function dependenciesWithLibrary(dependencies, librarySpec) {
  const deps = {};
  for (const [key, value] of Object.entries(dependencies)) {
    if (key === 'rxjs') deps['@ngx-compat/material-legacy'] = librarySpec;
    deps[key] = value;
  }
  if (!Object.prototype.hasOwnProperty.call(deps, '@ngx-compat/material-legacy')) {
    deps['@ngx-compat/material-legacy'] = librarySpec;
  }
  return deps;
}

function labHtml() {
  return [
    '<div id="surface" class="lab-light mat-app-background" dir="ltr">',
    '<div id="wrap-button" *ngIf="!cspOnly">',
    '<button id="p-button" mat-button type="button">Default</button>',
    '<button id="p-button-disabled" mat-button type="button" disabled>Off</button>',
    '<button id="p-button-focus" mat-raised-button type="button">Focus</button>',
    '</div>',
    '<div id="wrap-card" *ngIf="!cspOnly"><mat-card id="p-card"><mat-card-title>Title</mat-card-title><mat-card-content>Body</mat-card-content></mat-card></div>',
    '<div id="wrap-checkbox" *ngIf="!cspOnly">',
    '<mat-checkbox id="p-checkbox">Check</mat-checkbox>',
    '<mat-checkbox id="p-checkbox-disabled" disabled>Off</mat-checkbox>',
    '<mat-checkbox id="p-checkbox-invalid" required>Req</mat-checkbox>',
    '</div>',
    '<div id="wrap-chips" *ngIf="!cspOnly">',
    '<button id="p-mark-invalid" type="button" (click)="markInvalid()">Mark invalid</button>',
    '<mat-chip-list [errorStateMatcher]="matcher"><mat-chip>One</mat-chip></mat-chip-list>',
    '<mat-chip-list disabled><mat-chip>Off</mat-chip></mat-chip-list>',
    '</div>',
    '<div id="wrap-core" *ngIf="!cspOnly"><mat-pseudo-checkbox id="p-core" state="checked"></mat-pseudo-checkbox></div>',
    '<div id="wrap-dialog"><button id="p-dialog-open" type="button" (click)="openDialog()">Open dialog</button></div>',
    '<div id="wrap-field" *ngIf="!cspOnly">',
    '<mat-form-field id="p-field"><mat-label>Name</mat-label><input id="p-field-input" matInput [errorStateMatcher]="matcher"><mat-hint id="p-hint">Hint text</mat-hint></mat-form-field>',
    '<mat-form-field id="p-field-disabled"><input matInput disabled value="off"></mat-form-field>',
    '</div>',
    '<div id="wrap-input" *ngIf="!cspOnly">',
    '<mat-form-field id="p-input-field"><input id="p-input" matInput [errorStateMatcher]="matcher" value="typed"></mat-form-field>',
    '<mat-form-field id="p-input-disabled-field"><input matInput disabled value="off"></mat-form-field>',
    '</div>',
    '<div id="wrap-autocomplete" *ngIf="!cspOnly">',
    '<mat-form-field id="p-auto-field"><input id="p-auto" matInput #autoTrigger="matAutocompleteTrigger" [matAutocomplete]="labAuto" [errorStateMatcher]="matcher"><mat-autocomplete #labAuto="matAutocomplete"><mat-option value="a">Alpha</mat-option></mat-autocomplete></mat-form-field>',
    '<input id="p-auto-disabled" matInput disabled [matAutocomplete]="labAutoOff">',
    '<mat-autocomplete #labAutoOff="matAutocomplete"><mat-option value="b">Beta</mat-option></mat-autocomplete>',
    '</div>',
    '<div id="wrap-list" *ngIf="!cspOnly">',
    '<mat-list id="p-list"><mat-list-item>Item</mat-list-item></mat-list>',
    '<mat-list><button mat-list-item id="p-list-focus" type="button">Focus</button><button mat-list-item id="p-list-disabled" type="button" disabled>Off</button></mat-list>',
    '</div>',
    '<div id="wrap-menu" *ngIf="!cspOnly">',
    '<button id="p-menu-trigger" type="button" #menuTrigger="matMenuTrigger" [matMenuTriggerFor]="labMenu">Menu</button>',
    '<mat-menu #labMenu="matMenu"><button mat-menu-item id="p-menu-item" type="button">Item</button></mat-menu>',
    '<button mat-menu-item id="p-menu-disabled" type="button" [disabled]="true">Off</button>',
    '</div>',
    '<div id="wrap-paginator" *ngIf="!cspOnly">',
    '<mat-paginator [length]="50" [pageSize]="10"></mat-paginator>',
    '<mat-paginator id="p-paginator-disabled" [length]="50" [pageSize]="10" disabled></mat-paginator>',
    '</div>',
    '<div id="wrap-bar" *ngIf="!cspOnly"><mat-progress-bar id="p-bar" mode="determinate" [value]="40"></mat-progress-bar></div>',
    '<div id="wrap-spinner" *ngIf="!cspOnly"><mat-progress-spinner id="p-spin" mode="determinate" [value]="55" diameter="48"></mat-progress-spinner></div>',
    '<div id="wrap-radio" *ngIf="!cspOnly">',
    '<mat-radio-group><mat-radio-button id="p-radio" value="a">A</mat-radio-button></mat-radio-group>',
    '<mat-radio-button id="p-radio-disabled" disabled>Off</mat-radio-button>',
    '<mat-radio-button id="p-radio-invalid" name="lab-req" required value="req">Req</mat-radio-button>',
    '</div>',
    '<div id="wrap-select" *ngIf="!cspOnly">',
    '<mat-form-field><mat-select id="p-select" [errorStateMatcher]="matcher"><mat-option value="a">A</mat-option></mat-select></mat-form-field>',
    '<mat-form-field><mat-select id="p-select-disabled" disabled><mat-option value="b">B</mat-option></mat-select></mat-form-field>',
    '</div>',
    '<div id="wrap-toggle" *ngIf="!cspOnly">',
    '<mat-slide-toggle id="p-toggle">Toggle</mat-slide-toggle>',
    '<mat-slide-toggle id="p-toggle-disabled" disabled>Off</mat-slide-toggle>',
    '<mat-slide-toggle id="p-toggle-invalid" required>Req</mat-slide-toggle>',
    '</div>',
    '<div id="wrap-slider" *ngIf="!cspOnly">',
    '<button id="p-slider-invalidate" type="button" (click)="forceSliderInvalid = true">Invalidate</button>',
    '<mat-slider id="p-slider" #sl="ngModel" name="slider" [labForceInvalid]="forceSliderInvalid" [(ngModel)]="sliderValue" min="0" max="100"></mat-slider>',
    '<span id="slider-invalid">{{sl.invalid}}</span>',
    '<mat-slider id="p-slider-disabled" disabled [value]="10"></mat-slider>',
    '</div>',
    '<div id="wrap-snack" *ngIf="!cspOnly"><button id="p-snack" type="button" (click)="openSnack()">Snack</button></div>',
    '<div id="wrap-table" *ngIf="!cspOnly">',
    '<table mat-table id="p-table" [dataSource]="rows">',
    '<ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let row"><button id="p-table-focus" type="button">{{row.name}}</button></td></ng-container>',
    '<tr mat-header-row *matHeaderRowDef="cols"></tr><tr mat-row *matRowDef="let row; columns: cols"></tr>',
    '</table></div>',
    '<div id="wrap-tabs" *ngIf="!cspOnly"><mat-tab-group><mat-tab label="One">One</mat-tab><mat-tab label="Two">Two</mat-tab><mat-tab label="Off" disabled>Off</mat-tab></mat-tab-group></div>',
    '<div id="wrap-tooltip" *ngIf="!cspOnly">',
    '<button id="p-tooltip" type="button" #tip="matTooltip" matTooltip="Hello tip">Tip</button>',
    '<button id="p-tooltip-off" type="button" #tipOff="matTooltip" matTooltip="Nope" matTooltipDisabled>Off</button>',
    '</div>',
    '</div>',
  ].join('');
}

function labSource(zoneless) {
  const zoneImport = zoneless ? '' : "import 'zone.js';\n";
  const zoneNamed = zoneless ? ', provideZonelessChangeDetection' : '';
  const zoneProvider = zoneless ? 'provideZonelessChangeDetection(), ' : '';
  return `${zoneImport}import {CSP_NONCE, ChangeDetectorRef, Component, Directive, Input, NgModule, QueryList, ViewChild, ViewChildren, forwardRef, inject${zoneNamed}} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AbstractControl, FormsModule, NG_VALIDATORS, ValidationErrors, Validator} from '@angular/forms';
import {ErrorStateMatcher, MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyAutocompleteModule} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyCardModule} from '@ngx-compat/material-legacy/legacy-card';
import {MatLegacyCheckboxModule} from '@ngx-compat/material-legacy/legacy-checkbox';
import {MatLegacyChipList, MatLegacyChipsModule} from '@ngx-compat/material-legacy/legacy-chips';
import {MatLegacyPseudoCheckboxModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacyFormField, MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInput, MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyListModule} from '@ngx-compat/material-legacy/legacy-list';
import {MatLegacyMenuModule} from '@ngx-compat/material-legacy/legacy-menu';
import {MatLegacyPaginatorModule} from '@ngx-compat/material-legacy/legacy-paginator';
import {MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {MatLegacyProgressSpinnerModule} from '@ngx-compat/material-legacy/legacy-progress-spinner';
import {MatLegacyRadioModule} from '@ngx-compat/material-legacy/legacy-radio';
import {MatLegacySelect, MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySlideToggleModule} from '@ngx-compat/material-legacy/legacy-slide-toggle';
import {MatLegacySliderModule} from '@ngx-compat/material-legacy/legacy-slider';
import {MatLegacySnackBar, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatLegacyTableModule} from '@ngx-compat/material-legacy/legacy-table';
import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';
import {MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';

@Directive({
  selector: '[labForceInvalid]',
  standalone: false,
  providers: [{provide: NG_VALIDATORS, useExisting: forwardRef(() => LabForceInvalid), multi: true}],
})
export class LabForceInvalid implements Validator {
  @Input() labForceInvalid = false;
  private changed: () => void = () => {};
  validate(_control: AbstractControl): ValidationErrors | null {
    return this.labForceInvalid ? {lab: true} : null;
  }
  registerOnValidatorChange(fn: () => void): void { this.changed = fn; }
  ngOnChanges(): void { this.changed(); }
}

export class LabMatcher implements ErrorStateMatcher {
  on = false;
  isErrorState(): boolean { return this.on; }
}

@Component({standalone: false, selector: 'dialog-body', template: '<p id="dialog-body">Open</p>'})
export class DialogBody {}

@Component({
  standalone: false,
  selector: 'lab-root',
  template: ${JSON.stringify(labHtml())},
})
export class LabRoot {
  private dialog = inject(MatLegacyDialog);
  private snack = inject(MatLegacySnackBar);
  cspOnly = typeof window !== 'undefined' && !!(window as unknown as {__cspOnly?: boolean}).__cspOnly;
  matcher = new LabMatcher();
  forceSliderInvalid = false;
  sliderValue = 20;
  cols = ['name'];
  rows = [{name: 'Ada'}];
  @ViewChild('menuTrigger') menuTrigger!: any;
  @ViewChild('autoTrigger') autoTrigger!: any;
  @ViewChild('tip') tip!: any;
  @ViewChild('tipOff') tipOff!: any;
  @ViewChildren(MatLegacyInput) inputs!: QueryList<MatLegacyInput>;
  @ViewChildren(MatLegacySelect) selects!: QueryList<MatLegacySelect>;
  @ViewChildren(MatLegacyChipList) chipLists!: QueryList<MatLegacyChipList>;
  @ViewChildren(MatLegacySelect, {read: ChangeDetectorRef}) selectDetectors!: QueryList<ChangeDetectorRef>;
  @ViewChildren(MatLegacyChipList, {read: ChangeDetectorRef}) chipDetectors!: QueryList<ChangeDetectorRef>;
  @ViewChildren(MatLegacyFormField, {read: ChangeDetectorRef}) fieldDetectors!: QueryList<ChangeDetectorRef>;
  openDialog(): void { this.dialog.open(DialogBody); }
  openMenu(): void { this.menuTrigger.openMenu(); }
  openSnack(): void { this.snack.open('Saved', 'OK'); }
  markInvalid(): void {
    this.matcher.on = true;
    this.inputs.forEach(input => input.updateErrorState());
    this.selects.forEach(select => select.updateErrorState());
    this.chipLists.forEach(list => list.updateErrorState());
    this.selectDetectors.forEach(detector => detector.markForCheck());
    this.chipDetectors.forEach(detector => detector.markForCheck());
    this.fieldDetectors.forEach(detector => detector.markForCheck());
  }
  ngAfterViewInit(): void {
    const lab = this;
    (window as unknown as {__lab: unknown}).__lab = {
      closeTransient() {
        try { lab.dialog.closeAll(); } catch { /* overlay already gone */ }
        try { lab.snack.dismiss(); } catch { /* snack already gone */ }
        try { lab.menuTrigger && lab.menuTrigger.closeMenu(); } catch { /* menu already closed */ }
        try { lab.autoTrigger && lab.autoTrigger.closePanel(); } catch { /* panel already closed */ }
        try { lab.tip && lab.tip.hide(0); } catch { /* tooltip already hidden */ }
        lab.matcher.on = false;
        lab.forceSliderInvalid = false;
      },
      openDialog() { lab.openDialog(); },
      openMenu() { lab.openMenu(); },
      openSnack() { lab.openSnack(); },
      matcher: lab.matcher,
      setSliderFlag(on: boolean) { lab.forceSliderInvalid = on; },
      selectSecondTab() {
        const label = document.querySelectorAll('#wrap-tabs .mat-tab-label')[1] as HTMLElement | undefined;
        if (label) label.click();
      },

    };
    document.documentElement.dataset.labReady = '1';
  }
}

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    MatLegacyAutocompleteModule,
    MatLegacyButtonModule,
    MatLegacyCardModule,
    MatLegacyCheckboxModule,
    MatLegacyChipsModule,
    MatLegacyPseudoCheckboxModule,
    MatLegacyDialogModule,
    MatLegacyFormFieldModule,
    MatLegacyInputModule,
    MatLegacyListModule,
    MatLegacyMenuModule,
    MatLegacyPaginatorModule,
    MatLegacyProgressBarModule,
    MatLegacyProgressSpinnerModule,
    MatLegacyRadioModule,
    MatLegacySelectModule,
    MatLegacySlideToggleModule,
    MatLegacySliderModule,
    MatLegacySnackBarModule,
    MatLegacyTableModule,
    MatLegacyTabsModule,
    MatLegacyTooltipModule,
  ],
  declarations: [LabRoot, DialogBody, LabForceInvalid],
  bootstrap: [LabRoot],
  providers: [
    ...((window as unknown as {__cspNonce?: string}).__cspNonce ? [{provide: CSP_NONCE, useValue: (window as unknown as {__cspNonce: string}).__cspNonce}] : []),
    ${zoneProvider}{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}},
  ],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err);
  document.body.appendChild(node);
});
`;
}

function themeSource() {
  return `@use '@ngx-compat/material-legacy' as mat with ($theme-ignore-duplication-warnings: true);
$primary: mat.define-palette(mat.$indigo-palette);
$accent: mat.define-palette(mat.$pink-palette, A200, A100, A400);
$warn: mat.define-palette(mat.$red-palette);
$light: mat.define-light-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: mat.define-typography-config(),
  density: 0,
));
$dense: mat.define-light-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: mat.define-typography-config(),
  density: -2,
));
$dark: mat.define-dark-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: mat.define-typography-config(),
  density: 0,
));
@include mat.core();
@include mat.legacy-core();
.lab-light { @include mat.all-legacy-component-themes($light); }
.lab-dense {
  @include mat.all-legacy-component-themes($dense);
  --lab-density: #{mat.get-density-config($dense)};
}
.lab-dark { @include mat.all-legacy-component-themes($dark); }
`;
}

function parseArgs(argv) {
  let tarball = null;
  let tarball21 = null;
  let buildOnly = false;
  let runSsr = false;
  const families = [];
  const lines = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tarball' || arg === '--tarball-21x') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) throw new Error(`${arg} requires a path`);
      if (arg === '--tarball') tarball = resolve(value);
      else tarball21 = resolve(value);
      continue;
    }
    if (arg === '--build-only') { buildOnly = true; continue; }
    if (arg === '--ssr') { runSsr = true; continue; }
    if (arg === '--family' || arg === '--line') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      if (arg === '--family') families.push(value);
      else lines.push(value);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!tarball) throw new Error('--tarball is required');
  return {tarball, tarball21, buildOnly, runSsr, families, lines};
}

/** Install inputs buildConsumer writes. Qualification reads this object, not a parallel copy. */
export function candidateInstallSpec(versions, zoneless) {
  const dependencies = {
    '@angular/cdk': versions.cdk,
    '@angular/common': versions.core,
    '@angular/compiler': versions.core,
    '@angular/compiler-cli': versions.core,
    '@angular/core': versions.core,
    '@angular/forms': versions.core,
    '@angular/material': versions.material,
    '@angular/platform-browser': versions.core,
    '@angular/platform-browser-dynamic': versions.core,
    rxjs: versions.rxjs,
    sass: versions.sass,
    tslib: versions.tslib,
    typescript: versions.typescript,
  };
  if (!zoneless) dependencies['zone.js'] = versions.zone;
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      experimentalDecorators: true,
      strict: true,
      skipLibCheck: false,
      lib: ['ES2022', 'DOM'],
      rootDir: 'src',
      outDir: 'out',
      types: [],
    },
    files: ['src/main.ts'],
    angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
  };
  if (Number(String(versions.typescript).split('.')[0]) >= 6) tsconfig.compilerOptions.ignoreDeprecations = '6.0';
  return {
    dependencies,
    npmrc: 'install-links=true\nfund=false\naudit=false\n',
    tsconfig,
    labSource: labSource(zoneless),
    themeSource: themeSource(),
  };
}

/** Defects of the candidate fixture. An empty list means those assumptions are gone and the guard opens. */
export function candidateQualificationDefects(spec) {
  const defects = [];
  const dependencies = spec && spec.dependencies && typeof spec.dependencies === 'object' ? spec.dependencies : {};
  if (Object.prototype.hasOwnProperty.call(dependencies, '@angular/animations')) {
    defects.push('candidate installs @angular/animations');
  }
  if (String(spec && spec.npmrc || '').split('\n').includes('legacy-peer-deps=true')) {
    defects.push('candidate sets legacy-peer-deps=true');
  }
  const skipLibCheck = spec && spec.tsconfig && spec.tsconfig.compilerOptions
    ? spec.tsconfig.compilerOptions.skipLibCheck
    : false;
  if (skipLibCheck === true) defects.push('candidate sets skipLibCheck');
  if (typeof (spec && spec.labSource) === 'string' && /\.detectChanges\s*\(/.test(spec.labSource)) {
    defects.push('candidate drives operations with detectChanges()');
  }
  if (typeof (spec && spec.labSource) === 'string' && /\.openPanel\s*\(|\.show\s*\(/.test(spec.labSource)) {
    defects.push('candidate opens overlays through the component API');
  }
  return defects;
}

export function fixtureQualificationDefects(pkg) {
  const versions = versionsFor(pkg || {peerDependencies: {}});
  const defects = [];
  for (const zoneless of [false, true]) {
    for (const defect of candidateQualificationDefects(candidateInstallSpec(versions, zoneless))) {
      if (!defects.includes(defect)) defects.push(defect);
    }
  }
  return defects;
}

export function fixtureQualificationDefectsFromTarball(tarball) {
  return fixtureQualificationDefects(readPackedPackage(tarball));
}

export async function buildConsumer(tarball, zoneless) {
  const versions = versionsFor(readPackedPackage(tarball));
  const spec = candidateInstallSpec(versions, zoneless);
  const stamp = createHash('sha256')
    .update(JSON.stringify({
      versions,
      dependencies: spec.dependencies,
      npmrc: spec.npmrc,
      tsconfig: spec.tsconfig,
      labSource: spec.labSource,
      themeSource: spec.themeSource,
      probe: readFileSync(probePath, 'utf8'),
      zoneless,
    }))
    .digest('hex')
    .slice(0, 12);
  const tarballSha = sha256File(tarball).slice(0, 12);
  const consumer = join(cacheRoot, `ngx-required-${tarballSha}-${zoneless ? 'zoneless' : 'zoneful'}-${stamp}`);
  if (existsSync(join(consumer, 'dist/app.js')) && existsSync(join(consumer, 'dist/theme.css'))) {
    return {consumer, versions, bundleHasZone: readFileSync(join(consumer, 'dist/app.js'), 'utf8').includes('Zone.__symbol__')};
  }
  mkdirSync(consumer, {recursive: true});
  const installTarball = join(consumer, 'library.tgz');
  writeFileSync(installTarball, readFileSync(tarball));
  const deps = dependenciesWithLibrary(spec.dependencies, `file:${installTarball}`);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({name: 'ngx-required-cells', private: true, dependencies: deps}, null, 2));
  writeFileSync(join(consumer, '.npmrc'), spec.npmrc);
  const env = {...process.env, NODE_OPTIONS: ''};
  delete env.NODE_PATH;
  const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
    cwd: consumer, encoding: 'utf8', timeout: 300000, env,
  });
  if (install.status !== 0) throw new Error((install.stderr || install.stdout || 'npm install failed').slice(-2000));
  mkdirSync(join(consumer, 'src'), {recursive: true});
  writeFileSync(join(consumer, 'src/main.ts'), spec.labSource);
  writeFileSync(join(consumer, 'src/theme.scss'), spec.themeSource);
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(spec.tsconfig, null, 2));
  const sass = createRequire(join(consumer, 'node_modules/sass/package.json'))('sass');
  let css;
  try {
    css = sass.compile(join(consumer, 'src/theme.scss'), {
      loadPaths: [join(consumer, 'node_modules')],
      style: 'expanded',
      silenceDeprecations: ['if-function', 'global-builtin', 'color-functions', 'import'],
    }).css;
  } catch (err) {
    throw new Error(`theme compile failed: ${err}`);
  }
  const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {
    cwd: consumer, encoding: 'utf8', timeout: 240000, env,
  });
  if (compiled.status !== 0) throw new Error(`${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-4000));
  const linkerRequire = createRequire(join(consumer, 'node_modules/@angular/compiler-cli/package.json'));
  const {transformSync} = linkerRequire('@babel/core');
  const linkerPlugin = linkerRequire('@angular/compiler-cli/linker/babel').default;
  const {needsLinking} = linkerRequire('@angular/compiler-cli/linker');
  const esbuild = createRequire(join(root, 'package.json'))('esbuild');
  await esbuild.build({
    absWorkingDir: consumer,
    entryPoints: ['out/main.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/app.js',
    platform: 'browser',
    logLevel: 'silent',
    plugins: [{
      name: 'ng-linker',
      setup(build) {
        build.onLoad({filter: /\.m?js$/}, args => {
          const source = readFileSync(args.path, 'utf8');
          if (!source.includes('ɵɵngDeclare')) return null;
          if (!needsLinking(args.path, source)) return null;
          const linked = transformSync(source, {
            filename: args.path,
            compact: false,
            configFile: false,
            babelrc: false,
            plugins: [[linkerPlugin, {linkerJitMode: false}]],
          });
          return {contents: linked.code, loader: 'js'};
        });
      },
    }],
  });
  const bundle = readFileSync(join(consumer, 'dist/app.js'), 'utf8');
  const bundleHasZone = bundle.includes('Zone.__symbol__');
  if (bundle.includes('ɵɵngDeclare') || /(?:from|require\()\s*['"]@angular\/compiler['"]/.test(bundle) || (zoneless && bundleHasZone)) {
    throw new Error(`bundle refused partial=${bundle.includes('ɵɵngDeclare')} zone=${bundleHasZone}`);
  }
  mkdirSync(join(consumer, 'dist'), {recursive: true});
  writeFileSync(join(consumer, 'dist/theme.css'), css);
  copyFileSync(probePath, join(consumer, 'dist/probe.js'));
  const page = '<!doctype html><html><head><link rel="stylesheet" href="/theme.css"></head><body><lab-root></lab-root><script src="/app.js"></script><script src="/probe.js"></script></body></html>\n';
  const nonceBoot = `<script nonce="${CSP_NONCE}">window.__cspOnly=true;window.__cspViolations=[];document.addEventListener('securitypolicyviolation',function(event){window.__cspViolations.push(event.violatedDirective+' '+(event.sample||event.blockedURI||''));});</script>`;
  const nonceSet = `<script nonce="${CSP_NONCE}">window.__cspNonce=${JSON.stringify(CSP_NONCE)};</script>`;
  const app = `<script nonce="${CSP_NONCE}" src="/app.js"></script>`;
  writeFileSync(join(consumer, 'dist/index.html'), page);
  writeFileSync(join(consumer, 'dist/csp.html'), `<!doctype html><html><body><lab-root></lab-root>${nonceBoot}${nonceSet}${app}</body></html>\n`);
  writeFileSync(join(consumer, 'dist/csp-missing.html'), `<!doctype html><html><body><lab-root></lab-root>${nonceBoot}${app}</body></html>\n`);
  return {consumer, versions, bundleHasZone};
}

function startServer(consumer) {
  const cspHeader = `default-src 'none'; script-src 'nonce-${CSP_NONCE}'; style-src 'nonce-${CSP_NONCE}'`;
  const server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    const file = path === '/' ? 'index.html' : path.replace(/^\//, '');
    try {
      const body = readFileSync(join(consumer, 'dist', file));
      const headers = {'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'};
      if (file === 'csp.html' || file === 'csp-missing.html') headers['content-security-policy'] = cspHeader;
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise(resolveListen => {
    server.listen(0, '127.0.0.1', () => {
      const {port} = server.address();
      resolveListen({server, origin: `http://127.0.0.1:${port}`});
    });
  });
}

function sleep(ms) { return new Promise(resolveSleep => setTimeout(resolveSleep, ms)); }

function chromeBin() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const candidate of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome', '/snap/bin/chromium']) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('No Chrome/Chromium binary found; set CHROME_BIN');
}

export async function withChromium(origin, fn, options = {}) {
  const bin = chromeBin();
  const userDir = allocateLauncherDir('chrome-');
  const port = options.port || CDP_PORTS.chromium;
  spawnSync('bash', ['-lc', `fuser -k ${port}/tcp >/dev/null 2>&1 || true`], {timeout: 5000});
  const chrome = spawn(bin, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDir}`,
    '--no-sandbox',
    '--disable-gpu',
    'about:blank',
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  let log = '';
  chrome.stderr.on('data', chunk => { log += chunk; });
  try {
    let version = null;
    for (let i = 0; i < 80; i += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (response.ok) { version = await response.json(); break; }
      } catch { /* retry */ }
      await sleep(250);
    }
    if (!version) throw new Error(`Chromium did not open a debugging port\n${log.slice(-500)}`);
    const browserWs = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolveOpen, rejectOpen) => {
      browserWs.addEventListener('open', resolveOpen);
      browserWs.addEventListener('error', () => rejectOpen(new Error('chromium socket error')));
    });
    let nextId = 0;
    const pending = new Map();
    browserWs.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    });
    const send = (method, params = {}, sessionId) => new Promise((resolveSend, rejectSend) => {
      const id = ++nextId;
      pending.set(id, {resolve: resolveSend, reject: rejectSend});
      const payload = {id, method, params};
      if (sessionId) payload.sessionId = sessionId;
      browserWs.send(JSON.stringify(payload));
    });
    const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
    const attached = await send('Target.attachToTarget', {targetId, flatten: true});
    const sessionId = attached.sessionId;
    await send('Runtime.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', {expression, returnByValue: true}, sessionId);
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 500));
      return result.result?.value;
    };
    const goto = async url => {
      await send('Page.navigate', {url}, sessionId);
      for (let i = 0; i < 80; i += 1) {
        const ready = await evaluate('document.readyState');
        if (ready === 'complete') return;
        await sleep(50);
      }
      throw new Error(`navigation did not finish: ${url}`);
    };
    if (options.reduced) {
      await send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]}, sessionId);
    }
    await goto(`${origin}${options.startPath || '/'}`);
    await fn({evaluate, goto, browser: {
      launched: true,
      engine: 'chromium',
      product: version.Browser || '',
      protocol: 'cdp',
      port,
      binary: bin,
    }});
    browserWs.close();
  } finally {
    chrome.kill();
  }
}

export async function withFirefox(origin, fn, options = {}) {
  const profile = allocateLauncherDir('ff-');
  const name = `ngx${Date.now()}`;
  const bin = firefoxBin();
  const created = spawnSync(bin, ['--headless', '--createprofile', `${name} ${profile}`], {encoding: 'utf8', timeout: 30000});
  if (created.status !== 0) throw new Error((created.stderr || created.stdout || 'createprofile failed').slice(-500));
  if (options.reduced) {
    writeFileSync(join(profile, 'user.js'), 'user_pref("ui.prefersReducedMotion", 1);\n');
  }
  const port = options.port || CDP_PORTS.firefox;
  spawnSync('bash', ['-lc', `fuser -k ${port}/tcp >/dev/null 2>&1 || true`], {timeout: 5000});
  const firefox = spawn(bin, [
    '--headless',
    '--profile', profile,
    `--remote-debugging-port=${port}`,
    '--remote-allow-hosts=127.0.0.1',
    'about:blank',
  ], {stdio: ['ignore', 'pipe', 'pipe']});
  let log = '';
  firefox.stdout.on('data', chunk => { log += chunk; });
  firefox.stderr.on('data', chunk => { log += chunk; });
  try {
    const started = Date.now();
    while (!log.includes('WebDriver BiDi listening')) {
      if (Date.now() - started > 20000) throw new Error(log.slice(-500) || 'Firefox BiDi did not listen');
      await sleep(100);
    }
    const match = log.match(/ws:\/\/127\.0\.0\.1:\d+/);
    if (!match) throw new Error(log.slice(-400));
    const socket = new WebSocket(`${match[0]}/session`);
    await new Promise((resolveOpen, rejectOpen) => {
      socket.addEventListener('open', resolveOpen);
      socket.addEventListener('error', () => rejectOpen(new Error('firefox socket error')));
    });
    const pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message);
    });
    let nextId = 0;
    const send = (method, params = {}) => new Promise((resolveSend, rejectSend) => {
      const id = ++nextId;
      pending.set(id, {resolve: resolveSend, reject: rejectSend});
      socket.send(JSON.stringify({id, method, params}));
    });
    const session = await send('session.new', {capabilities: {alwaysMatch: {acceptInsecureCerts: true}}});
    const createdContext = await send('browsingContext.create', {type: 'tab'});
    const context = createdContext.result?.context || createdContext.context;
    const evaluate = async expression => {
      const message = await send('script.evaluate', {
        expression,
        target: {context},
        awaitPromise: false,
      });
      const result = message.result?.result || message.result;
      if (result?.type === 'exception' || result?.exceptionDetails) throw new Error(JSON.stringify(result).slice(0, 500));
      return result?.value;
    };
    const goto = async url => {
      await send('browsingContext.navigate', {context, url, wait: 'complete'});
    };
    await goto(`${origin}${options.startPath || '/'}`);
    const capabilities = session.result?.capabilities || {};
    await fn({evaluate, goto, browser: {
      launched: true,
      engine: 'firefox',
      browserName: capabilities.browserName || '',
      version: capabilities.browserVersion || '',
      protocol: 'bidi',
      port,
      binary: bin,
    }});
    socket.close();
  } finally {
    firefox.kill();
  }
}

export function withWebKit(origin, fn, options = {}) {
  return new Promise((resolveDone, rejectDone) => {
    const runtimeDir = allocateLauncherDir('webkit-runtime-');
    chmodSync(runtimeDir, 0o700);
    const child = spawn('/usr/bin/python3', [webkitScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        DISPLAY: process.env.DISPLAY || ':0',
        GDK_BACKEND: 'x11',
        XDG_RUNTIME_DIR: runtimeDir,
        WEBKIT_DISABLE_COMPOSITING_MODE: '1',
        WEBKIT_DISABLE_DMABUF_RENDERER: '1',
        XDG_DATA_DIRS: '/usr/share:/usr/local/share',
        GSETTINGS_SCHEMA_DIR: '/usr/share/glib-2.0/schemas',
        ...(options.reduced ? {WEBKIT_REDUCED_MOTION: '1'} : {}),
      },
    });
    let buffer = '';
    let errLog = '';
    const queue = [];
    child.stderr.on('data', chunk => { errLog += chunk; });
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const waiter = queue.shift();
        if (waiter) {
          try { waiter.resolve(JSON.parse(line)); }
          catch (err) { waiter.reject(err); }
        }
        newline = buffer.indexOf('\n');
      }
    });
    child.on('exit', code => {
      const waiter = queue.shift();
      if (waiter) waiter.reject(new Error(`webkit exited ${code}: ${errLog.slice(-400)}`));
    });
    const request = payload => new Promise((resolveRequest, rejectRequest) => {
      queue.push({resolve: resolveRequest, reject: rejectRequest});
      child.stdin.write(JSON.stringify(payload) + '\n');
    });
    (async () => {
      const identity = await request({cmd: 'identity'});
      if (!identity.ok || identity.backend !== 'webkitgtk' || identity.api !== 'WebKit2-4.1') {
        throw new Error(identity.error || 'webkitgtk identity missing');
      }
      const loaded = await request({cmd: 'load', url: `${origin}${options.startPath || '/'}`});
      if (!loaded.ok) throw new Error(loaded.error || 'webkit load failed');
      const evaluate = async expression => {
        const response = await request({cmd: 'eval', expression});
        if (!response.ok) throw new Error(response.error || 'webkit eval failed');
        return response.value;
      };
      const agent = await evaluate('navigator.userAgent');
      await fn({
        evaluate,
        goto: async url => {
          const response = await request({cmd: 'load', url});
          if (!response.ok) throw new Error(response.error || 'webkit goto failed');
        },
        browser: {
          launched: true,
          engine: 'webkit',
          backend: 'webkitgtk',
          api: 'WebKit2-4.1',
          version: `${identity.major}.${identity.minor}.${identity.micro}`,
          userAgent: typeof agent === 'string' ? agent : '',
          safari_certification: false,
          protocol: 'webkitgtk-session',
        },
      });
      await request({cmd: 'quit'}).catch(() => {});
      child.kill();
      resolveDone();
    })().catch(err => {
      const detail = errLog.trim().slice(-800);
      const message = err instanceof Error ? err.message : String(err);
      child.kill();
      rejectDone(new Error(detail ? `${message}\n${detail}` : message));
    });
  });
}

function asJson(raw) {
  if (typeof raw === 'string') return JSON.parse(raw);
  return raw;
}

async function waitReady(driver) {
  let last = '';
  for (let i = 0; i < 90; i += 1) {
    const raw = await driver.evaluate('JSON.stringify({ready: document.documentElement.dataset.labReady || "", error: (document.getElementById("bootstrap-error") || {}).textContent || "", state: document.readyState, text: (document.body && document.body.innerText || "").slice(0, 180)})');
    const status = asJson(raw);
    last = JSON.stringify(status).slice(0, 400);
    if (status.error) throw new Error(`bootstrap failed: ${status.error}`);
    if (status.ready === '1') return;
    await sleep(500);
  }
  throw new Error(`lab did not become ready: ${last}`);
}

async function runCells(driver, ids) {
  const outcomes = [];
  for (const id of ids) {
    const parts = id.split('/');
    const family = parts[4];
    const state = parts[5];
    if (state === 'csp-nonce') continue;
    await driver.evaluate(`window.__begin(${JSON.stringify({family, state})})`);
    let status = null;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      status = asJson(await driver.evaluate('JSON.stringify(window.__poll())'));
      if (status && status.done) break;
      await sleep(40);
    }
    const ok = !!(status && status.done && status.ok && status.evidence);
    outcomes.push({id, ok, evidence: status && status.evidence ? status.evidence : 'no probe result'});
    console.log(`${ok ? 'executed' : 'failed'} ${id} ${status && status.evidence ? status.evidence : ''}`);
  }
  return outcomes;
}

async function runCsp(driver, origin, ids) {
  const outcomes = [];
  if (!ids.length) return outcomes;
  await driver.goto(`${origin}/csp-missing.html`);
  let missing = [];
  for (let i = 0; i < 40; i += 1) {
    missing = asJson(await driver.evaluate('JSON.stringify(window.__cspViolations || [])'));
    if (Array.isArray(missing) && missing.length) break;
    await sleep(50);
  }
  const missingDetected = Array.isArray(missing) && missing.some(item => String(item).includes('style-src'));
  await driver.goto(`${origin}/csp.html`);
  let opened = false;
  let styles = 0;
  let violations = [];
  for (let i = 0; i < 40 && !opened; i += 1) {
    const ready = asJson(await driver.evaluate('JSON.stringify(!!document.getElementById("p-dialog-open"))'));
    if (ready) break;
    await sleep(50);
  }
  await driver.evaluate('document.getElementById("p-dialog-open") && document.getElementById("p-dialog-open").click()');
  for (let i = 0; i < 40; i += 1) {
    const snapshot = asJson(await driver.evaluate(`JSON.stringify({opened: !!document.getElementById("dialog-body"), styles: Array.from(document.querySelectorAll("style")).filter(style => style.nonce === ${JSON.stringify(CSP_NONCE)}).length, violations: window.__cspViolations || []})`));
    opened = !!snapshot.opened;
    styles = snapshot.styles || 0;
    violations = snapshot.violations || [];
    if (opened && styles > 0) break;
    await sleep(50);
  }
  const clean = opened && styles > 0 && violations.length === 0 && missingDetected;
  const first = violations.length ? String(violations[0]).slice(0, 96) : '';
  const evidence = `missing=${missingDetected} opened=${opened} styles=${styles} violations=${violations.length}${first ? ' first=' + first : ''}`;
  for (const id of ids) {
    outcomes.push({id, ok: clean, evidence});
    console.log(`${clean ? 'executed' : 'failed'} ${id} ${evidence}`);
  }
  return outcomes;
}

const DRIVERS = {
  chromium: withChromium,
  firefox: withFirefox,
  webkit: withWebKit,
};

export async function executeIds(tarball, ids) {
  const outcomes = [];
  const engines = {};
  const groups = new Map();
  for (const id of ids) {
    const parts = id.split('/');
    if (parts[1] === 'main') throw new Error('refusing to execute a main browser cell from the 21.x roster');
    const engine = parts[2];
    const runtime = parts[3];
    const key = `21.x|${runtime}|${engine}`;
    const bucket = groups.get(key) || [];
    bucket.push(id);
    groups.set(key, bucket);
  }
  for (const [key, bucket] of groups) {
    const [, runtime, engine] = key.split('|');
    console.error(`building 21.x ${runtime} for ${bucket.length} ${engine} cells`);
    const built = await buildConsumer(tarball, runtime === 'zoneless');
    if (runtime === 'zoneless' && built.bundleHasZone) throw new Error('zoneless bundle contains Zone');
    const {server, origin} = await startServer(built.consumer);
    try {
      const drive = DRIVERS[engine];
      if (!drive) throw new Error(`no driver for ${engine}`);
      await drive(origin, async driver => {
        engines[engine] = driver.browser;
        await waitReady(driver);
        outcomes.push(...await runCells(driver, bucket));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      engines[engine] = {...(engines[engine] || {}), engine, launched: !!(engines[engine] && engines[engine].launched), error: message};
      console.error(`${engine} ${runtime} failed: ${message}`);
    } finally {
      server.close();
    }
  }
  return {outcomes, engines};
}

export async function main(argv) {
  const args = parseArgs(argv);
  const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
  const requiredIds = matrix.required_ids || [];
  const narrowed = args.families.length > 0 || args.lines.length > 0;
  if (!args.tarball21 && !narrowed && !args.buildOnly && requiredIds.some(id => id.split('/')[1] === '21.x')) {
    throw new Error('--tarball-21x is required to execute 21.x cells');
  }
  const artifacts = {
    main: {tarball: args.tarball, sha256: sha256File(args.tarball)},
  };
  if (args.tarball21) artifacts['21.x'] = {tarball: args.tarball21, sha256: sha256File(args.tarball21)};
  const outcomes = [];
  const browsers = {};
  const selected = requiredIds.filter(id => {
    const parts = id.split('/');
    if (args.families.length && !args.families.includes(parts[4])) return false;
    if (args.lines.length && !args.lines.includes(parts[1])) return false;
    return true;
  });
  const groups = new Map();
  for (const id of selected) {
    const [stage, line, engine, runtime, family, state] = id.split('/');
    if (args.families.length === 0 && stage !== 'pr' && stage !== 'release') continue;
    const key = `${line}|${runtime}|${engine}`;
    const bucket = groups.get(key) || [];
    bucket.push(id);
    groups.set(key, bucket);
    void family;
    void state;
  }
  for (const [key, ids] of groups) {
    const [line, runtime, engine] = key.split('|');
    const artifact = artifacts[line];
    if (!artifact) throw new Error(`no tarball for line ${line}`);
    console.error(`building ${line} ${runtime} for ${ids.length} ${engine} cells`);
    const built = await buildConsumer(artifact.tarball, runtime === 'zoneless');
    if (runtime === 'zoneless' && built.bundleHasZone) throw new Error(`zoneless bundle contains Zone for ${line}`);
    if (args.buildOnly && line === 'main' && runtime === 'zoneful') {
      console.log(JSON.stringify({built: built.consumer, versions: built.versions}));
      return 0;
    }
    const {server, origin} = await startServer(built.consumer);
    try {
      const drive = DRIVERS[engine];
      if (!drive) throw new Error(`no driver for ${engine}`);
      await drive(origin, async driver => {
        browsers[engine] = driver.browser;
        await waitReady(driver);
        outcomes.push(...await runCells(driver, ids.filter(id => !id.endsWith('/csp-nonce'))));
        if (engine === 'chromium') {
          outcomes.push(...await runCsp(driver, origin, ids.filter(id => id.endsWith('/csp-nonce'))));
        }
      });
    } finally {
      server.close();
    }
  }
  let ssr = null;
  if (args.runSsr) {
    const ssrRun = spawnSync(process.execPath, [join(root, 'scripts/ssr-dialog.mjs'), '--tarball', args.tarball], {
      cwd: root, encoding: 'utf8', timeout: 300000, env: {...process.env, NODE_OPTIONS: ''},
    });
    ssr = {exit_code: ssrRun.status, stderr_tail: (ssrRun.stderr || '').slice(-400)};
    console.error(`ssr-dialog exit ${ssrRun.status}`);
  }
  if (narrowed || args.buildOnly) {
    const summary = summarizeCells(selected, outcomes);
    console.log(JSON.stringify({ok: summary.ok, executed_count: summary.executed_count, failed: summary.failed_cell_ids, browsers}, null, 2));
    return summary.ok ? 0 : 1;
  }
  const summary = summarizeCells(requiredIds, outcomes);
  const report = {
    schema_version: 1,
    role: 'executed declared required browser cells',
    check_id: 'browser-matrix',
    coverage: 'slice',
    declared_required_count: matrix.required_count,
    declared_cell_count: matrix.cell_count,
    executed_cell_ids: summary.executed_cell_ids,
    executed_count: summary.executed_count,
    failed_cell_ids: summary.failed_cell_ids,
    missing_cell_ids: summary.missing_cell_ids,
    unknown_cell_ids: summary.unknown_cell_ids,
    cell_evidence: outcomes.map(row => ({id: row.id, ok: row.ok, evidence: row.evidence})),
    artifacts: Object.entries(artifacts).map(([line, item]) => ({line, tarball_sha256: item.sha256})),
    browsers,
    ssr_dialog: ssr,
    result: summary.ok ? 'pass' : 'fail',
    g10_claim: 'not-passed',
    limitations: [
      'Each executed id was probed in that cell\'s engine against that line\'s packed artifact.',
      'Enabled-motion and SSR remain unexpanded names in the declaration, so they are not required cell ids.',
      'Historical legacy density mixins are empty; density cells read the theme density config emitted beside all-legacy-component-themes.',
      'Does not claim G10. coverage stays slice because this is not an assertion-file roster.',
    ],
  };
  mkdirSync(dirname(reportPath), {recursive: true});
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    ok: summary.ok,
    executed_count: summary.executed_count,
    declared_required_count: matrix.required_count,
    failed: summary.failed_cell_ids.length,
    missing: summary.missing_cell_ids.length,
  }));
  return summary.ok ? 0 : 1;
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => process.exit(code)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
