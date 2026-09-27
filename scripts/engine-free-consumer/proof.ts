import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';

const require = createRequire(import.meta.url);
const checks = [];
function check(name, ok, detail) {
  checks.push({name, ok, ...(detail ? {detail} : {})});
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'http://localhost/'});
const window = dom.window;
function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, {configurable: true, writable: true, value});
}
setGlobal('window', window);
setGlobal('document', window.document);
setGlobal('navigator', window.navigator);
setGlobal('HTMLElement', window.HTMLElement);
setGlobal('Element', window.Element);
setGlobal('Node', window.Node);
setGlobal('Document', window.Document);
setGlobal('DocumentFragment', window.DocumentFragment);
setGlobal('Event', window.Event);
setGlobal('KeyboardEvent', window.KeyboardEvent);
setGlobal('MouseEvent', window.MouseEvent);
setGlobal('FocusEvent', window.FocusEvent);
setGlobal('InputEvent', window.InputEvent);
setGlobal('SVGElement', window.SVGElement);
setGlobal('getComputedStyle', window.getComputedStyle.bind(window));
setGlobal('MutationObserver', window.MutationObserver);
setGlobal('requestAnimationFrame', (cb) => setTimeout(() => cb(Date.now()), 0));
setGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
setGlobal('customElements', window.customElements);
setGlobal('isSecureContext', true);

let animationsInstalled = true;
try {
  require.resolve('@angular/animations');
} catch {
  animationsInstalled = false;
}
check('animations package absent', animationsInstalled === false);

const packed = require('@ngx-compat/material-legacy/package.json');
const depText = JSON.stringify({
  dependencies: packed.dependencies || {},
  peerDependencies: packed.peerDependencies || {},
  peerDependenciesMeta: packed.peerDependenciesMeta || {},
});
check('packed manifest has no animations dependency', !depText.includes('@angular/animations'));

await import('@angular/compiler');
const core = await import('@ngx-compat/material-legacy/legacy-core');
const material = await import('@angular/material/core');

const identity = [
  ['LEGACY_VERSION', core.LEGACY_VERSION, material.VERSION],
  ['MAT_LEGACY_DATE_LOCALE', core.MAT_LEGACY_DATE_LOCALE, material.MAT_DATE_LOCALE],
  ['MAT_LEGACY_DATE_FORMATS', core.MAT_LEGACY_DATE_FORMATS, material.MAT_DATE_FORMATS],
  ['LegacyDateAdapter', core.LegacyDateAdapter, material.DateAdapter],
  ['LegacyNativeDateAdapter', core.LegacyNativeDateAdapter, material.NativeDateAdapter],
  ['MAT_LEGACY_NATIVE_DATE_FORMATS', core.MAT_LEGACY_NATIVE_DATE_FORMATS, material.MAT_NATIVE_DATE_FORMATS],
  ['LegacyNativeDateModule', core.LegacyNativeDateModule, material.NativeDateModule],
  ['MatLegacyNativeDateModule', core.MatLegacyNativeDateModule, material.MatNativeDateModule],
  ['LegacyErrorStateMatcher', core.LegacyErrorStateMatcher, material.ErrorStateMatcher],
  ['LegacyShowOnDirtyErrorStateMatcher', core.LegacyShowOnDirtyErrorStateMatcher, material.ShowOnDirtyErrorStateMatcher],
  ['MatLegacyLine', core.MatLegacyLine, material.MatLine],
  ['MatLegacyLineModule', core.MatLegacyLineModule, material.MatLineModule],
  ['MAT_LEGACY_RIPPLE_GLOBAL_OPTIONS', core.MAT_LEGACY_RIPPLE_GLOBAL_OPTIONS, material.MAT_RIPPLE_GLOBAL_OPTIONS],
  ['MatLegacyRipple', core.MatLegacyRipple, material.MatRipple],
  ['MatLegacyRippleModule', core.MatLegacyRippleModule, material.MatRippleModule],
];
for (const [name, left, right] of identity) {
  check(name + ' runtime identity', left === right && left != null);
}

check('LegacyAnimationCurves owned', String(core.LegacyAnimationCurves.STANDARD_CURVE).includes('cubic-bezier'));
check('LegacyAnimationDurations owned', core.LegacyAnimationDurations.ENTERING === '225ms');
check(
  'legacyDefaultRippleAnimationConfig owned',
  core.legacyDefaultRippleAnimationConfig.enterDuration === 225 &&
    core.legacyDefaultRippleAnimationConfig.exitDuration === 150,
);
check('legacyIsNumberValue empty string', core.legacyIsNumberValue('') === false);
check('legacyIsNumberValue whitespace', core.legacyIsNumberValue('  ') === false);
check('legacyIsNumberValue null', core.legacyIsNumberValue(null) === false);
check('legacyIsNumberValue true', core.legacyIsNumberValue(true) === false);
check('legacyIsNumberValue numeric prefix', core.legacyIsNumberValue('123hello') === false);
check('legacyIsNumberValue zero', core.legacyIsNumberValue(0) === true);
check(
  'legacyGetEventTarget composed path',
  core.legacyGetEventTarget({composedPath: () => ['node'], target: 'fallback'}) === 'node',
);
check(
  'legacyGetEventTarget empty path',
  core.legacyGetEventTarget({composedPath: () => [], target: 'fallback'}) === 'fallback',
);
check('MatLegacyPseudoCheckbox owned', typeof core.MatLegacyPseudoCheckbox === 'function');
check('LegacyRippleRenderer owned', typeof core.LegacyRippleRenderer === 'function');
check('legacySetLines owned', typeof core.legacySetLines === 'function');

class ColorBase {
  constructor(_elementRef) {
    this._elementRef = _elementRef;
  }
}
const Colored = core.legacyMixinColor(ColorBase);
const host = document.createElement('div');
const colored = new Colored({nativeElement: host});
colored.color = 'primary';
colored.color = 'accent';
check('color primary removed', !host.classList.contains('mat-primary') && host.classList.contains('mat-accent'));
colored.color = 'none';
check('color none class', host.classList.contains('mat-none') && !host.classList.contains('mat-accent'));
colored.color = undefined;
check('color undefined clears', host.className === '');

const {TestBed} = await import('@angular/core/testing');
const {Component, NgModule, ViewChild} = await import('@angular/core');
const {BrowserTestingModule, platformBrowserTesting} = await import('@angular/platform-browser/testing');
const {MATERIAL_ANIMATIONS} = await import('@angular/material/core');
const dialogApi = await import('@ngx-compat/material-legacy/legacy-dialog');
const snackApi = await import('@ngx-compat/material-legacy/legacy-snack-bar');
const menuApi = await import('@ngx-compat/material-legacy/legacy-menu');
const tabsApi = await import('@ngx-compat/material-legacy/legacy-tabs');
const selectApi = await import('@ngx-compat/material-legacy/legacy-select');
const formApi = await import('@ngx-compat/material-legacy/legacy-form-field');
const inputApi = await import('@ngx-compat/material-legacy/legacy-input');
const autoApi = await import('@ngx-compat/material-legacy/legacy-autocomplete');
const tipApi = await import('@ngx-compat/material-legacy/legacy-tooltip');
const optionApi = await import('@ngx-compat/material-legacy/legacy-core');

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

@Component({
  standalone: false,
  selector: 'proof-pizza',
  template: 'Pizza',
})
class Pizza {}

@Component({
  standalone: false,
  selector: 'proof-host',
  template: `
    <button #menuButton [matMenuTriggerFor]="menu">Menu</button>
    <mat-menu #menu="matMenu"><button mat-menu-item>Item</button></mat-menu>
    <mat-tab-group>
      <mat-tab label="One">Alpha</mat-tab>
      <mat-tab label="Two">Beta</mat-tab>
    </mat-tab-group>
    <mat-form-field>
      <mat-label>Choice</mat-label>
      <mat-select>
        <mat-option value="a">A</mat-option>
        <mat-option value="b">B</mat-option>
      </mat-select>
    </mat-form-field>
    <input matInput [matAutocomplete]="auto" />
    <mat-autocomplete #auto="matAutocomplete">
      <mat-option value="oak">Oak</mat-option>
    </mat-autocomplete>
    <button matTooltip="Hello tip">Tip</button>
  `,
})
class Host {
  @ViewChild(menuApi.MatLegacyMenuTrigger) menuTrigger;
  @ViewChild(tabsApi.MatLegacyTabGroup) tabs;
  @ViewChild(selectApi.MatLegacySelect) select;
  @ViewChild(autoApi.MatLegacyAutocompleteTrigger) autocomplete;
  @ViewChild(tipApi.MatLegacyTooltip) tooltip;
}

@NgModule({
  declarations: [Pizza, Host],
  imports: [
    dialogApi.MatLegacyDialogModule,
    snackApi.MatLegacySnackBarModule,
    menuApi.MatLegacyMenuModule,
    tabsApi.MatLegacyTabsModule,
    selectApi.MatLegacySelectModule,
    formApi.MatLegacyFormFieldModule,
    inputApi.MatLegacyInputModule,
    autoApi.MatLegacyAutocompleteModule,
    tipApi.MatLegacyTooltipModule,
    optionApi.MatLegacyPseudoCheckboxModule,
  ],
  providers: [{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
})
class ProofModule {}

async function settle(fixture) {
  await new Promise((resolve) => setTimeout(resolve, 20));
  try {
    fixture.detectChanges();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();
  }
}

try {
  TestBed.configureTestingModule({imports: [ProofModule]});
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const dialog = TestBed.inject(dialogApi.MatLegacyDialog);
  const ref = dialog.open(Pizza);
  await settle(fixture);
  check('dialog opens', document.body.textContent.includes('Pizza'));
  ref.close();
  await settle(fixture);
  check('dialog closes', !document.body.textContent.includes('Pizza'));

  const snack = TestBed.inject(snackApi.MatLegacySnackBar);
  const snackRef = snack.open('Snack hello');
  await settle(fixture);
  check('snack-bar opens', document.body.textContent.includes('Snack hello'));
  snackRef.dismiss();
  await new Promise((resolve) => setTimeout(resolve, 50));
  try {
    fixture.detectChanges();
  } catch {
    // Exit removal can schedule a follow-up check; the container is the signal.
  }
  check('snack-bar closes', document.querySelector('snack-bar-container') == null);

  const host = fixture.componentInstance;
  host.menuTrigger.openMenu();
  await settle(fixture);
  check('menu opens', document.body.textContent.includes('Item'));
  host.menuTrigger.closeMenu();
  await settle(fixture);
  check('menu closes', !document.body.textContent.includes('Item'));

  const tabLabels = document.querySelectorAll('.mat-tab-label');
  if (tabLabels.length > 1) {
    (tabLabels[1] as HTMLElement).click();
    fixture.detectChanges();
  }
  check(
    'tabs change',
    host.tabs.selectedIndex === 1,
    'index=' + host.tabs.selectedIndex + ' labels=' + tabLabels.length,
  );

  host.select.open();
  await settle(fixture);
  check('select opens', document.body.textContent.includes('A') && host.select.panelOpen === true);
  host.select.close();
  await settle(fixture);
  check('select closes', host.select.panelOpen === false);

  host.autocomplete.openPanel();
  await settle(fixture);
  check('autocomplete opens', document.body.textContent.includes('Oak'));
  host.autocomplete.closePanel();
  await settle(fixture);
  check('autocomplete closes', !document.body.textContent.includes('Oak'));

  host.tooltip.show();
  await settle(fixture);
  check('tooltip shows', document.body.textContent.includes('Hello tip'));
  host.tooltip.hide();
  await new Promise((resolve) => setTimeout(resolve, 50));
  try {
    fixture.detectChanges();
  } catch {
    // Tooltip exit can detach without another host check.
  }
  check('tooltip hides', document.querySelector('mat-tooltip-component') == null);
} catch (error) {
  check('engine-free overlay behavior', false, String(error && error.stack ? error.stack : error));
}

const failed = checks.filter((item) => !item.ok);
console.log('PROOF ' + JSON.stringify({ok: failed.length === 0, checks}));
if (failed.length) process.exit(1);

