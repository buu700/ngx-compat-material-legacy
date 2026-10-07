#!/usr/bin/env node
/**
 * Rendered computed-style acceptance producer for the thirteen ordinary
 * companions (badge, bottom-sheet, button-toggle, datepicker, divider,
 * expansion, grid-list, icon, sidenav, stepper, sort, toolbar, tree).
 *
 *   node scripts/check-companion-computed-styles.mjs --run <run.json>
 *   node scripts/check-companion-computed-styles.mjs --tarball <21.x.tgz> [--tarball-main <main.tgz>] [--out <report>]
 *
 * One Chromium page renders the CURRENT peer components from a fresh consumer
 * install of the packed library. The same DOM is themed twice:
 *   - oracle: the installed peer's own M2 theme (mat.m2-define-*-theme plus
 *     mat.<companion>-theme), compiled from the consumer's @angular/material
 *     only, with no legacy package on the Sass load path;
 *   - candidate: the packed library's public companion bridges
 *     (legacy.all-current-companion-bridges) for the same theme inputs.
 * Each rostered case reads the computed property of the element that
 * consumes the token in light, dark, density -2, alternate typography, RTL
 * and a nested dark-inside-light theme (datepicker popups and the bottom
 * sheet are real body overlays themed through the overlay container), and
 * requires candidate == oracle. A negative read injects a distinct
 * wrong-but-nonempty value for one token at a time on the candidate scope;
 * each case then requires the consuming property to show that value and no
 * longer match the oracle. A button renders before any calendar, as in a
 * typical app, and headless Chromium is started with hover-capable input so
 * the peer's (hover: hover) state rules apply.
 *
 * The roster comes from companion-computed-cases.mjs: reviewed bindings
 * filtered by the peer's own per-dimension M2 mixins. A rostered case that is
 * not observed fails. With RC_ASSERTION_OUTPUT_DIR (rc-verify) one
 * kind:assertion file per 21.x case is written there. main would be rendered as a
 * report slice only. No G06/G07/G08 claim is made here.
 */
import {spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {
  existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';
import {
  BINDINGS, CHECK_ID, COMPANIONS, DEFAULT_SCENARIOS, DIMENSIONS, GROUP_DIMENSIONS, GROUP_ORACLE,
  NEGATIVE_SCENARIO, PEER_PACKAGE, SCENARIOS,
  assessCase, assessNotApplicable, assessOracle, candidateScss, caseFileName, compilePeerOnly,
  deriveRoster, oracleScss, peerDimensionTokens, peerIdentity, peerKeywordTokens, sentinelCss, sentinelTable,
} from './companion-computed-cases.mjs';

export {COMPANIONS, DIMENSIONS};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultReport = join(root, 'compatibility/rc/reports/companion-computed-styles.json');
const matrixPath = join(root, 'compatibility/rc/matrices/full-verify.json');
const require = createRequire(join(root, 'package.json'));
const SILENCE = ['if-function', 'global-builtin', 'color-functions', 'import'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

/** Matrix main roster for this check, or null groups when unresolved. */
export function matrixRoster(matrix, line = '21.x') {
  const row = (matrix.checks || []).find((item) => item.check_id === CHECK_ID);
  if (!row) throw new Error(`matrix has no ${CHECK_ID} row`);
  return row.acceptance.cases_by_line[line];
}

/** Compare the derived roster with the matrix main groups (null groups are reported, not filled). */
export function compareRoster(derived, groups) {
  const errors = [];
  for (const group of [GROUP_DIMENSIONS, GROUP_ORACLE]) {
    const listed = groups?.[group];
    if (listed === null || listed === undefined) continue;
    const want = derived[group];
    const missing = want.filter((id) => !listed.includes(id));
    const extra = listed.filter((id) => !want.includes(id));
    if (missing.length || extra.length || listed.join('\n') !== want.join('\n')) {
      errors.push(`${group}: matrix roster differs from the peer-derived roster (missing ${missing.length}, extra ${extra.length})`);
    }
  }
  return errors;
}

/**
 * Assess every rostered case from page observations. Pure; used by the
 * producer and by fixture tests. `observations` maps binding id ->
 * {oracle, candidate, negative, unthemed}.
 */
export function assessAll({roster, observations, sentinels, dimensionTokens, identity, isolation}) {
  const results = [];
  const byCompanion = {};
  const keywords = peerKeywordTokens(dimensionTokens);
  for (const binding of roster.rostered) {
    const result = assessCase(binding, observations[binding.id], sentinels[binding.token], {peerKeyword: keywords[binding.token] || null});
    result.companion = binding.companion;
    result.dimension = binding.dimension;
    result.element = binding.element;
    result.property = binding.property;
    result.token = binding.token;
    result.locate = binding.locate;
    result.unthemed = observations[binding.id]?.unthemed?.value ?? null;
    results.push(result);
    (byCompanion[binding.companion] ||= []).push(result);
  }
  for (const entry of roster.notApplicable) {
    const result = assessNotApplicable(entry, dimensionTokens);
    Object.assign(result, {companion: entry.companion, dimension: entry.dimension, not_applicable: true,
      peer_mixin: entry.peer_mixin, peer_source_file: entry.peer_source_file, peer_source_sha256: entry.peer_source_sha256});
    results.push(result);
  }
  const oracle = [];
  for (const companion of COMPANIONS) {
    const mine = byCompanion[companion] || [];
    const applicable = DIMENSIONS.filter((d) => mine.some((r) => r.dimension === d));
    const result = assessOracle(companion, mine, {identity, isolation, applicable});
    result.companion = companion;
    result.applicable_dimensions = applicable;
    result.peer_source_file = dimensionTokens?.[companion]?.peer_source_file ?? null;
    result.peer_source_sha256 = dimensionTokens?.[companion]?.peer_source_sha256 ?? null;
    oracle.push(result);
  }
  return {dimensionCases: results, oracleCases: oracle};
}

/** kind:assertion bodies, one per rostered main case. */
export function assertionBodies({dimensionCases, oracleCases}, ctx) {
  const common = {
    schema_version: 1,
    kind: 'assertion',
    check_id: CHECK_ID,
    line: ctx.line,
    run_id: ctx.runId,
    invocation_id: ctx.invocationId,
    peer_package: ctx.identity.package,
    peer_version: ctx.identity.version,
    peer_package_json_sha256: ctx.identity.package_json_sha256,
    oracle: 'current peer components themed by the peer M2 theme (mat.m2-define-*-theme + mat.<companion>-theme), compiled from the consumer peer only, rendered in the same Chromium page and DOM as the candidate',
    candidate: 'packed library public companion theme mixins and separate legacy.all-current-companion-bridges for the same theme inputs',
    oracle_css_sha256: ctx.oracleCssSha256,
    candidate_css_sha256: ctx.candidateCssSha256,
    tarball_sha256: ctx.tarballSha256,
    browser: ctx.browser,
  };
  const bodies = [];
  for (const result of dimensionCases) {
    const {case_id: caseId, result: outcome, ...rest} = result;
    bodies.push({...common, group: GROUP_DIMENSIONS, case_id: caseId, result: outcome,
      peer_source_file: ctx.dimensionTokens[result.companion]?.peer_source_file ?? null,
      peer_source_sha256: ctx.dimensionTokens[result.companion]?.peer_source_sha256 ?? null,
      ...rest});
  }
  for (const result of oracleCases) {
    const {case_id: caseId, result: outcome, ...rest} = result;
    bodies.push({...common, group: GROUP_ORACLE, case_id: caseId, result: outcome,
      oracle_isolation: ctx.isolation, ...rest});
  }
  return bodies;
}

export function writeAssertionFiles(dir, bodies) {
  mkdirSync(dir, {recursive: true});
  const written = [];
  for (const body of bodies) {
    const file = join(dir, caseFileName(body.case_id));
    if (existsSync(file)) throw new Error(`duplicate assertion file ${file}`);
    writeFileSync(file, JSON.stringify(body, null, 2) + '\n');
    written.push(file);
  }
  return written;
}

function exactVersion(spec, fallback) {
  const match = String(spec || '').match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : fallback;
}

export function readPackedPackage(tarball) {
  const result = spawnSync('tar', ['-xOzf', tarball, 'package/package.json'], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error((result.stderr || 'unable to read packed package.json').slice(-500));
  return JSON.parse(result.stdout);
}

export function versionsFor(pkg) {
  const peers = pkg.peerDependencies || {};
  const core = exactVersion(peers['@angular/core'], '22.1.7');
  const major = Number(core.split('.')[0]);
  return {
    core,
    cdk: exactVersion(peers['@angular/cdk'], major >= 22 ? '22.1.7' : '21.2.14'),
    material: exactVersion(peers['@angular/material'], major >= 22 ? '22.1.7' : '21.2.14'),
    rxjs: '7.8.2',
    typescript: major >= 22 ? '6.0.3' : '5.9.2',
    zone: major >= 22 ? '0.16.3' : '0.15.1',
    tslib: '2.8.1',
  };
}

function parseArgs(argv) {
  let tarball21 = null;
  let out = defaultReport;
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tarball-21x' || arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, `${arg} requires a path`);
      if (arg === '--tarball-21x') tarball21 = resolve(value);
      else out = resolve(value);
      i += 1;
      continue;
    }
    rest.push(arg);
  }
  const parsed = parseLegacyArgs(rest);
  if (parsed.unknown.length) fail(2, `Unknown argument: ${parsed.unknown[0]}`);
  return {tarball21, out, ...parsed};
}

function resolveChromeBin() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const candidate of [
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser',
    '/usr/bin/chromium', '/snap/bin/chromium',
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('No Chrome/Chromium binary found; set CHROME_BIN');
}

/** Lab app: every fixture the reviewed bindings locate, plus two body overlays. */
export function labSource() {
  return `import 'zone.js';
import {AfterViewInit, ChangeDetectorRef, Component, NgModule, NgZone, ViewChild, inject} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MatBadgeModule} from '@angular/material/badge';
import {MatBottomSheet, MatBottomSheetModule} from '@angular/material/bottom-sheet';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MATERIAL_ANIMATIONS, MatNativeDateModule} from '@angular/material/core';
import {
  DateRange, DefaultMatCalendarRangeStrategy, MAT_DATE_RANGE_SELECTION_STRATEGY, MatDatepicker, MatDatepickerModule,
} from '@angular/material/datepicker';
import {MatDividerModule} from '@angular/material/divider';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatSortModule} from '@angular/material/sort';
import {MatStepperModule} from '@angular/material/stepper';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule} from '@angular/material/tree';
import {FlatTreeControl} from '@angular/cdk/tree';

interface TreeNode { name: string; children?: TreeNode[]; }
interface FlatNode { expandable: boolean; name: string; level: number; }

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();
const at = (day: number) => new Date(year, month, day);
const todayDay = now.getDate();
const plainDay = todayDay <= 14 ? 21 : 6;
const filteredDay = todayDay <= 14 ? 23 : 8;
(window as any).__ccsDays = {today: String(todayDay), plain: String(plainDay), filtered: String(filteredDay)};

@Component({standalone: false, selector: 'ccs-sheet', template: '<p id="ccs-sheet-text">Bottom sheet content</p>'})
export class SheetContent {}

@Component({
  standalone: false,
  selector: 'lab-root',
  providers: [{provide: MAT_DATE_RANGE_SELECTION_STRATEGY, useClass: DefaultMatCalendarRangeStrategy}],
  template: \`
  <!-- A button rendered before any calendar, as in a typical app, so MatButton
       styles precede the calendar's and the calendar's own button rules apply. -->
  <button matButton type="button" id="ccs-early-button">Early</button>
  <div id="ccs-root" class="ccs-root">
   <div id="ccs-inner" class="ccs-inner">
    <section class="ccs-badges">
      <span id="ccs-badge" matBadge="7" [matBadgeOverlap]="false">Badge</span>
      <span id="ccs-badge-accent" matBadge="7" matBadgeColor="accent" [matBadgeOverlap]="false">Badge</span>
      <span id="ccs-badge-warn" matBadge="7" matBadgeColor="warn" [matBadgeOverlap]="false">Badge</span>
      <span id="ccs-badge-disabled" matBadge="7" [matBadgeDisabled]="true" [matBadgeOverlap]="false">Badge</span>
      <span id="ccs-badge-small" matBadge="7" matBadgeSize="small" [matBadgeOverlap]="false">Badge</span>
      <span id="ccs-badge-large" matBadge="7" matBadgeSize="large" [matBadgeOverlap]="false">Badge</span>
      <span id="ccs-badge-overlap" matBadge="7">Badge</span>
      <span id="ccs-badge-small-overlap" matBadge="7" matBadgeSize="small">Badge</span>
      <span id="ccs-badge-large-overlap" matBadge="7" matBadgeSize="large">Badge</span>
    </section>
    <section>
      <mat-button-toggle-group id="ccs-toggle-group" value="a">
        <mat-button-toggle id="ccs-toggle-checked" value="a">A</mat-button-toggle>
        <mat-button-toggle id="ccs-toggle-plain" value="b">B</mat-button-toggle>
        <mat-button-toggle id="ccs-toggle-disabled" value="c" [disabled]="true">C</mat-button-toggle>
        <mat-button-toggle id="ccs-toggle-hover" value="d">D</mat-button-toggle>
        <mat-button-toggle id="ccs-toggle-focus" value="e">E</mat-button-toggle>
      </mat-button-toggle-group>
      <mat-button-toggle-group value="a" [disabled]="true">
        <mat-button-toggle id="ccs-toggle-disabled-checked" value="a">A</mat-button-toggle>
        <mat-button-toggle value="b">B</mat-button-toggle>
      </mat-button-toggle-group>
      <mat-button-toggle-group id="ccs-legacy-toggle-group" appearance="legacy" value="a">
        <mat-button-toggle id="ccs-legacy-toggle-checked" value="a">A</mat-button-toggle>
        <mat-button-toggle id="ccs-legacy-toggle-plain" value="b">B</mat-button-toggle>
        <mat-button-toggle id="ccs-legacy-toggle-disabled" value="c" [disabled]="true">C</mat-button-toggle>
        <mat-button-toggle id="ccs-legacy-toggle-focus" value="e">E</mat-button-toggle>
      </mat-button-toggle-group>
      <mat-button-toggle-group appearance="legacy" value="a" [disabled]="true">
        <mat-button-toggle id="ccs-legacy-toggle-disabled-checked" value="a">A</mat-button-toggle>
        <mat-button-toggle value="b">B</mat-button-toggle>
      </mat-button-toggle-group>
    </section>
    <section>
      <mat-form-field>
        <mat-label>Primary</mat-label>
        <input matInput [matDatepicker]="pPrimary" [value]="today" [matDatepickerFilter]="filter" />
        <mat-datepicker-toggle id="ccs-dp-toggle-primary" matIconSuffix [for]="pPrimary"></mat-datepicker-toggle>
        <mat-datepicker #pPrimary panelClass="ccs-dp-primary"></mat-datepicker>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Accent</mat-label>
        <input matInput [matDatepicker]="pAccent" [value]="today" />
        <mat-datepicker-toggle id="ccs-dp-toggle-accent" matIconSuffix [for]="pAccent"></mat-datepicker-toggle>
        <mat-datepicker #pAccent color="accent" panelClass="ccs-dp-accent"></mat-datepicker>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Warn</mat-label>
        <input matInput [matDatepicker]="pWarn" [value]="today" />
        <mat-datepicker-toggle id="ccs-dp-toggle-warn" matIconSuffix [for]="pWarn"></mat-datepicker-toggle>
        <mat-datepicker #pWarn color="warn" panelClass="ccs-dp-warn"></mat-datepicker>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Touch</mat-label>
        <input matInput [matDatepicker]="pTouch" [value]="today" />
        <mat-datepicker #pTouch [touchUi]="true" panelClass="ccs-dp-touch"></mat-datepicker>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Idle</mat-label>
        <input matInput [matDatepicker]="pIdle" />
        <mat-datepicker-toggle id="ccs-dp-toggle-idle" matIconSuffix [for]="pIdle"></mat-datepicker-toggle>
        <mat-datepicker #pIdle></mat-datepicker>
      </mat-form-field>
      <mat-form-field id="ccs-dp-range">
        <mat-label>Range</mat-label>
        <mat-date-range-input [rangePicker]="rp">
          <input matStartDate placeholder="Start" />
          <input matEndDate placeholder="End" />
        </mat-date-range-input>
        <mat-date-range-picker #rp></mat-date-range-picker>
      </mat-form-field>
      <mat-form-field id="ccs-dp-range-disabled">
        <mat-label>Disabled range</mat-label>
        <mat-date-range-input [rangePicker]="rp2" [disabled]="true">
          <input matStartDate placeholder="Start" />
          <input matEndDate placeholder="End" />
        </mat-date-range-input>
        <mat-date-range-picker #rp2></mat-date-range-picker>
      </mat-form-field>
      <mat-calendar id="ccs-cal-range" [startAt]="monthStart" [selected]="range" [comparisonStart]="cmpStart" [comparisonEnd]="cmpEnd"></mat-calendar>
      <mat-calendar id="ccs-cal-focus" [startAt]="today"></mat-calendar>
      <mat-calendar id="ccs-cal-today-disabled" [startAt]="today" [dateFilter]="notToday"></mat-calendar>
      <mat-calendar id="ccs-cal-selected-disabled" [startAt]="monthStart" [selected]="day20" [dateFilter]="notDay20"></mat-calendar>
      <mat-calendar id="ccs-cal-preview" [startAt]="monthStart" [selected]="previewRange"></mat-calendar>
      <mat-calendar id="ccs-cal-hover" [startAt]="monthStart"></mat-calendar>
    </section>
    <mat-divider id="ccs-divider"></mat-divider>
    <section>
      <mat-expansion-panel id="ccs-exp-expanded" [expanded]="true">
        <mat-expansion-panel-header>
          <mat-panel-title>Title</mat-panel-title>
          <mat-panel-description>Description</mat-panel-description>
        </mat-expansion-panel-header>
        <p>Expansion content</p>
        <mat-action-row><button type="button">OK</button></mat-action-row>
      </mat-expansion-panel>
      <mat-expansion-panel id="ccs-exp-collapsed">
        <mat-expansion-panel-header><mat-panel-title>Collapsed</mat-panel-title></mat-expansion-panel-header>
        <p>Hidden</p>
      </mat-expansion-panel>
      <mat-expansion-panel id="ccs-exp-disabled" [disabled]="true">
        <mat-expansion-panel-header><mat-panel-title>Disabled</mat-panel-title></mat-expansion-panel-header>
        <p>Hidden</p>
      </mat-expansion-panel>
      <mat-expansion-panel id="ccs-exp-focus">
        <mat-expansion-panel-header><mat-panel-title>Focus</mat-panel-title></mat-expansion-panel-header>
        <p>Hidden</p>
      </mat-expansion-panel>
      <mat-expansion-panel id="ccs-exp-hover">
        <mat-expansion-panel-header><mat-panel-title>Hover</mat-panel-title></mat-expansion-panel-header>
        <p>Hidden</p>
      </mat-expansion-panel>
    </section>
    <mat-grid-list id="ccs-grid" cols="1" rowHeight="160px">
      <mat-grid-tile>
        <mat-grid-tile-header><span matLine>Header primary</span><span matLine>Header secondary</span></mat-grid-tile-header>
        Tile
        <mat-grid-tile-footer><span matLine>Footer primary</span><span matLine>Footer secondary</span></mat-grid-tile-footer>
      </mat-grid-tile>
    </mat-grid-list>
    <section>
      <mat-icon id="ccs-icon">home</mat-icon>
      <mat-icon id="ccs-icon-primary" color="primary">home</mat-icon>
      <mat-icon id="ccs-icon-accent" color="accent">home</mat-icon>
      <mat-icon id="ccs-icon-warn" color="warn">home</mat-icon>
    </section>
    <mat-sidenav-container id="ccs-sidenav-container" style="height: 160px">
      <mat-sidenav id="ccs-sidenav" mode="side" [opened]="true">Side drawer</mat-sidenav>
      <mat-sidenav-content>Content</mat-sidenav-content>
    </mat-sidenav-container>
    <mat-sidenav-container id="ccs-sidenav-over-container" style="height: 160px" [hasBackdrop]="true">
      <mat-sidenav id="ccs-sidenav-over" mode="over" [opened]="true" [disableClose]="true">Over drawer</mat-sidenav>
      <mat-sidenav-content>Content</mat-sidenav-content>
    </mat-sidenav-container>
    <mat-stepper id="ccs-stepper" [linear]="true" [selectedIndex]="3">
      <mat-step label="Edit" [completed]="true" [editable]="true"><p>0</p></mat-step>
      <mat-step label="Done" [completed]="true" [editable]="false"><p>1</p></mat-step>
      <mat-step label="Error" [completed]="true" [hasError]="true" errorMessage="Error"><p>2</p></mat-step>
      <mat-step label="Selected" [completed]="false"><p>3</p></mat-step>
      <mat-step label="Optional" [optional]="true" [completed]="false"><p>4</p></mat-step>
    </mat-stepper>
    <mat-stepper id="ccs-stepper-accent" color="accent" [linear]="false" [selectedIndex]="1">
      <mat-step label="Edit" [completed]="true"><p>0</p></mat-step>
      <mat-step label="Selected"><p>1</p></mat-step>
    </mat-stepper>
    <mat-stepper id="ccs-stepper-warn" color="warn" [linear]="false" [selectedIndex]="1">
      <mat-step label="Edit" [completed]="true"><p>0</p></mat-step>
      <mat-step label="Selected"><p>1</p></mat-step>
    </mat-stepper>
    <mat-stepper id="ccs-stepper-states" [linear]="false">
      <mat-step label="Hovered"><p>0</p></mat-step>
      <mat-step label="Focused"><p>1</p></mat-step>
    </mat-stepper>
    <table matSort>
      <thead><tr><th id="ccs-sort" mat-sort-header="name">Name</th></tr></thead>
    </table>
    <mat-toolbar id="ccs-toolbar"><span>Toolbar</span></mat-toolbar>
    <mat-toolbar id="ccs-toolbar-primary" color="primary"><span>Primary</span></mat-toolbar>
    <mat-toolbar id="ccs-toolbar-accent" color="accent"><span>Accent</span></mat-toolbar>
    <mat-toolbar id="ccs-toolbar-warn" color="warn"><span>Warn</span></mat-toolbar>
    <mat-tree id="ccs-tree" [dataSource]="dataSource" [treeControl]="treeControl">
      <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>{{node.name}}</mat-tree-node>
      <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
        <button matTreeNodeToggle type="button">{{node.name}}</button>
      </mat-tree-node>
    </mat-tree>
   </div>
  </div>
  \`,
})
export class LabRoot implements AfterViewInit {
  private sheet = inject(MatBottomSheet);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('pPrimary') pPrimary!: MatDatepicker<Date>;
  @ViewChild('pAccent') pAccent!: MatDatepicker<Date>;
  @ViewChild('pWarn') pWarn!: MatDatepicker<Date>;
  @ViewChild('pTouch') pTouch!: MatDatepicker<Date>;
  today = at(todayDay);
  monthStart = at(1);
  range = new DateRange<Date>(at(5), at(12));
  cmpStart = at(10);
  cmpEnd = at(18);
  day20 = at(20);
  previewRange = new DateRange<Date>(at(3), null);
  filter = (d: Date | null) => !d || d.getDate() !== filteredDay || d.getMonth() !== month;
  notToday = (d: Date | null) => !d || d.getDate() !== todayDay || d.getMonth() !== month;
  notDay20 = (d: Date | null) => !d || d.getDate() !== 20 || d.getMonth() !== month;
  private _transformer = (node: TreeNode, level: number): FlatNode => ({
    expandable: !!node.children && node.children.length > 0, name: node.name, level,
  });
  treeControl = new FlatTreeControl<FlatNode>(node => node.level, node => node.expandable);
  treeFlattener = new MatTreeFlattener(this._transformer, node => node.level, node => node.expandable, node => node.children);
  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  hasChild = (_: number, node: FlatNode) => node.expandable;
  constructor() {
    this.dataSource.data = [{name: 'Root', children: [{name: 'Child'}]}];
  }
  ngAfterViewInit() {
    setTimeout(() => {
      this.pPrimary.open();
      this.pAccent.open();
      this.pWarn.open();
      this.pTouch.open();
      this.sheet.open(SheetContent, {panelClass: 'ccs-sheet-panel', hasBackdrop: false});
      this.cdr.detectChanges();
      setTimeout(() => { (window as any).__ccsReady = true; }, 300);
    });
  }
}

@NgModule({
  imports: [
    BrowserModule, MatBadgeModule, MatBottomSheetModule, MatButtonModule, MatButtonToggleModule, MatDatepickerModule,
    MatDividerModule, MatExpansionModule, MatFormFieldModule, MatGridListModule, MatIconModule,
    MatInputModule, MatNativeDateModule, MatSidenavModule, MatSortModule, MatStepperModule,
    MatToolbarModule, MatTreeModule,
  ],
  providers: [{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
  declarations: [LabRoot, SheetContent],
  bootstrap: [LabRoot],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err && err.stack || err);
  document.body.appendChild(node);
});
`;
}

function sleep(ms) { return new Promise((resolveSleep) => setTimeout(resolveSleep, ms)); }

export function installConsumer(tarball, versions) {
  const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-companion-computed-'));
  const installTarball = join(consumer, 'library.tgz');
  writeFileSync(installTarball, readFileSync(tarball));
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({
    name: 'ngx-compat-companion-computed',
    private: true,
    dependencies: {
      '@angular/cdk': versions.cdk,
      '@angular/common': versions.core,
      '@angular/compiler': versions.core,
      '@angular/compiler-cli': versions.core,
      '@angular/core': versions.core,
      '@angular/forms': versions.core,
      '@angular/material': versions.material,
      '@angular/platform-browser': versions.core,
      '@angular/platform-browser-dynamic': versions.core,
      '@ngx-compat/material-legacy': `file:${installTarball}`,
      rxjs: versions.rxjs,
      tslib: versions.tslib,
      typescript: versions.typescript,
      'zone.js': versions.zone,
    },
  }, null, 2));
  writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
  const env = {...process.env, NODE_OPTIONS: ''};
  delete env.NODE_PATH;
  const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
    cwd: consumer, encoding: 'utf8', timeout: 600000, env,
  });
  if (install.status !== 0) throw new Error((install.stderr || install.stdout || 'npm install failed').slice(-2000));
  const installed = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
  if (relative(realpathSync(consumer), installed).startsWith('..')) {
    throw new Error(`Library resolved outside the consumer: ${installed}`);
  }
  return {consumer, installed, env};
}

/** Candidate CSS from the packed library only (consumer node_modules on the load path). */
function compileCandidate(sass, nodeModules, installed, identity) {
  const entry = join(dirname(nodeModules), 'ccs-candidate.scss');
  const compiled = sass.compileString(candidateScss(), {
    loadPaths: [nodeModules], style: 'expanded', url: pathToFileURL(entry), silenceDeprecations: SILENCE,
  });
  const allowed = [installed, identity.realpath, identity.cdk_realpath];
  const loaded = compiled.loadedUrls.map((url) => url.pathname).filter((p) => p !== entry)
    .map((p) => (existsSync(p) ? realpathSync(p) : p));
  const foreign = loaded.filter((p) => !allowed.some((dir) => p.startsWith(dir + sep)));
  if (foreign.length) throw new Error(`candidate Sass loaded files outside the packed library and peers: ${foreign.slice(0, 5).join(', ')}`);
  const external = loaded.filter((p) => p.includes(`${sep}@material${sep}`) || p.includes('/@material+'));
  if (external.length) throw new Error(`candidate Sass loaded external @material files: ${external.slice(0, 5).join(', ')}`);
  return {css: compiled.css, sha256: sha256(compiled.css), loaded_files: loaded.length};
}

export async function buildLab(consumer, env, versions, source = labSource(), {strictDeclarations = false} = {}) {
  mkdirSync(join(consumer, 'src'), {recursive: true});
  writeFileSync(join(consumer, 'src/main.ts'), source);
  const compilerOptions = {
    target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler', experimentalDecorators: true,
    strict: true, skipLibCheck: !strictDeclarations, lib: ['ES2022', 'DOM'], rootDir: 'src', outDir: 'out', types: [],
  };
  if (Number(versions.typescript.split('.')[0]) >= 6) compilerOptions.ignoreDeprecations = '6.0';
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions, files: ['src/main.ts'],
    angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
  }, null, 2));
  const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {cwd: consumer, encoding: 'utf8', timeout: 300000, env});
  if (compiled.status !== 0) throw new Error(`ngc failed:\n${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-4000));
  const esbuild = require('esbuild');
  const linkerRequire = createRequire(join(consumer, 'node_modules/@angular/compiler-cli/package.json'));
  const {transformSync} = linkerRequire('@babel/core');
  const linkerPlugin = linkerRequire('@angular/compiler-cli/linker/babel').default;
  const {needsLinking} = linkerRequire('@angular/compiler-cli/linker');
  mkdirSync(join(consumer, 'dist'), {recursive: true});
  await esbuild.build({
    absWorkingDir: consumer, entryPoints: ['out/main.js'], bundle: true, format: 'iife',
    outfile: 'dist/app.js', platform: 'browser', logLevel: 'silent',
    plugins: [{
      name: 'ng-linker',
      setup(build) {
        build.onLoad({filter: /\.m?js$/}, (args) => {
          const source = readFileSync(args.path, 'utf8');
          if (!source.includes('ɵɵngDeclare') || !needsLinking(args.path, source)) return null;
          const linked = transformSync(source, {
            filename: args.path, compact: false, configFile: false, babelrc: false,
            plugins: [[linkerPlugin, {linkerJitMode: false}]],
          });
          return {contents: linked.code, loader: 'js'};
        });
      },
    }],
  });
  const bundle = readFileSync(join(consumer, 'dist/app.js'), 'utf8');
  if (bundle.includes('ɵɵngDeclare') || /(?:from|require\()\s*['"]@angular\/compiler['"]/.test(bundle)) {
    throw new Error('bundle still contains partial declarations or compiler imports');
  }
}

/** In-page helpers. Bindings are installed once; reads return {id: {found, value, token_value}}. */
function pageHelpers(bindings) {
  return `(() => {
  const bindings = ${JSON.stringify(bindings.map((b) => ({id: b.id, property: b.property, token: b.token, locate: b.locate, hover: b.hover || null})))};
  const days = window.__ccsDays || {};
  function locate(spec) {
    if (!spec) return null;
    const nodes = [...document.querySelectorAll(spec.css)];
    let el = nodes[spec.nth || 0] || null;
    if (el && spec.day !== undefined && spec.day !== null) {
      const want = typeof spec.day === 'number' ? String(spec.day) : days[spec.day];
      const cells = [...el.querySelectorAll('.mat-calendar-body-cell')];
      el = cells.find((cell) => ((cell.querySelector('.mat-calendar-body-cell-content') || {}).textContent || '').trim() === want) || null;
    }
    if (el && spec.sub) el = el.querySelector(spec.sub);
    return el;
  }
  function setClass(el, cls) {
    if (!el) return;
    for (const name of [...el.classList]) if (name.startsWith('ccs-oracle-') || name.startsWith('ccs-candidate-') || name.startsWith('ccs-bridge-')) el.classList.remove(name);
    if (cls) el.classList.add(cls);
  }
  window.__ccs = {
    bindings,
    locate,
    apply(mode, scenario) {
      const cls = (theme) => (mode === 'unthemed' ? '' : 'ccs-' + mode + '-' + theme);
      const root = document.getElementById('ccs-root');
      const inner = document.getElementById('ccs-inner');
      const overlay = document.querySelector('.cdk-overlay-container');
      setClass(root, cls(scenario.outer));
      setClass(inner, cls(scenario.inner));
      setClass(overlay, cls(scenario.overlay));
      for (const el of [root, overlay]) if (el) el.setAttribute('dir', scenario.dir);
      return {root: root ? root.className : null, inner: inner ? inner.className : null, overlay: overlay ? overlay.className : null,
        direction: root ? getComputedStyle(root).direction : null, width: window.innerWidth};
    },
    read(ids) {
      const wanted = new Set(ids);
      const out = {};
      for (const b of bindings) {
        if (!wanted.has(b.id)) continue;
        const el = locate(b.locate);
        if (!el) { out[b.id] = {found: false, value: null, token_value: null}; continue; }
        const style = getComputedStyle(el, b.locate.pseudo || null);
        out[b.id] = {found: true, value: style.getPropertyValue(b.property).trim(), token_value: style.getPropertyValue(b.token).trim()};
      }
      return out;
    },
    prepare() {
      const marks = [];
      const focus = [
        ['#ccs-toggle-focus', 'cdk-keyboard-focused'],
        ['#ccs-legacy-toggle-focus', 'cdk-keyboard-focused'],
        ['#ccs-exp-focus .mat-expansion-panel-header', 'cdk-keyboard-focused'],
        ['#ccs-cal-focus', 'cdk-keyboard-focused'],
      ];
      for (const [css, cls] of focus) {
        const el = document.querySelector(css);
        if (el) el.classList.add(cls);
        marks.push({css, cls, found: !!el});
      }
      const stepFocus = document.querySelectorAll('#ccs-stepper-states .mat-step-header')[1];
      if (stepFocus) stepFocus.classList.add('cdk-keyboard-focused');
      marks.push({css: '#ccs-stepper-states .mat-step-header[1]', cls: 'cdk-keyboard-focused', found: !!stepFocus});
      const previewCell = locate({css: '#ccs-cal-preview', day: 8});
      if (previewCell) previewCell.dispatchEvent(new MouseEvent('mouseenter', {bubbles: false}));
      marks.push({css: '#ccs-cal-preview day 8', event: 'mouseenter', found: !!previewCell});
      let n = 0;
      const hovers = [];
      for (const b of bindings) {
        if (!b.hover) continue;
        const el = typeof b.hover === 'string' ? document.querySelector(b.hover) : locate(b.hover);
        if (!el) { hovers.push({id: b.id, found: false}); continue; }
        if (!el.hasAttribute('data-ccs-hover')) el.setAttribute('data-ccs-hover', String(n++));
        hovers.push({id: b.id, found: true, selector: '[data-ccs-hover="' + el.getAttribute('data-ccs-hover') + '"]'});
      }
      return {marks, hovers};
    },
  };
  return true;
})()`;
}

const INDEX_HTML = `<!doctype html><html><head>
<style>*, *::before, *::after { transition: none !important; animation: none !important; } html, body { margin: 0; }</style>
<link rel="stylesheet" href="/theme.css">
<style id="ccs-sentinel" media="not all"></style>
</head><body><lab-root></lab-root><script src="/app.js"></script></body></html>
`;

export async function withChromium(distDir, run, {debugPort: portOverride = null} = {}) {
  const server = createServer((req, res) => {
    const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
    try {
      const body = readFileSync(join(distDir, file));
      res.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'});
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const {port} = server.address();
  const chromeBin = resolveChromeBin();
  const debugPort = Number(portOverride || process.env.COMPANION_CDP_PORT || 9334);
  const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-companion-'));
  const chrome = spawn(chromeBin, [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${chromeDir}`,
    '--no-sandbox', '--disable-gpu', '--window-size=1280,1000', '--force-device-scale-factor=1',
    // Headless reports (hover: none); the peer gates hover styles on (hover: hover).
    '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',
    `http://127.0.0.1:${port}/`,
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  let chromeLog = '';
  chrome.stderr.on('data', (chunk) => { chromeLog += chunk; });
  let ws;
  try {
    const jsonGet = async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} ${response.status}`);
      return response.json();
    };
    let version = null;
    for (let i = 0; i < 80 && !version; i += 1) {
      try { version = await jsonGet(`http://127.0.0.1:${debugPort}/json/version`); } catch { await sleep(250); }
    }
    if (!version) throw new Error(`Chromium did not open debugging port ${debugPort}\n${chromeLog.slice(-1000)}`);
    const page = (await jsonGet(`http://127.0.0.1:${debugPort}/json/list`)).find((target) => target.type === 'page');
    if (!page) throw new Error('Chromium opened no page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolveOpen, reject) => {
      ws.addEventListener('open', resolveOpen);
      ws.addEventListener('error', reject);
    });
    let nextId = 0;
    const pending = new Map();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    });
    const send = (method, params = {}) => {
      const id = ++nextId;
      return new Promise((resolveSend, reject) => {
        pending.set(id, {resolve: resolveSend, reject});
        ws.send(JSON.stringify({id, method, params}));
      });
    };
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'evaluate failed');
      return result.result?.value;
    };
    await send('Runtime.enable');
    await send('Page.enable');
    return await run({send, evaluate, browser: version.Browser || null, port});
  } finally {
    try { ws?.close(); } catch { /* already closed */ }
    chrome.kill();
    await new Promise((resolveExit) => chrome.once('exit', resolveExit));
    server.close();
  }
}

/** Drive the page: prepare states, then oracle/candidate reads per scenario and one negative read. */
async function observe({send, evaluate}, bindings, sentinels) {
  for (let i = 0; i < 200; i += 1) {
    if (await evaluate('window.__ccsReady === true || !!document.getElementById("bootstrap-error")')) break;
    await sleep(100);
  }
  if (await evaluate('!!document.getElementById("bootstrap-error")')) {
    throw new Error(await evaluate('document.getElementById("bootstrap-error").textContent'));
  }
  if (!(await evaluate('window.__ccsReady === true'))) throw new Error('lab did not become ready');
  await evaluate(pageHelpers(bindings));
  const prepared = await evaluate('window.__ccs.prepare()');
  await sleep(200);
  const environment = {prepared, hover_media_emulation: null, forced_hover: []};
  try {
    await send('Emulation.setEmulatedMedia', {features: [{name: 'hover', value: 'hover'}, {name: 'any-hover', value: 'hover'}, {name: 'pointer', value: 'fine'}]});
    environment.hover_media_emulation = 'requested';
  } catch (error) {
    environment.hover_media_emulation = `unsupported: ${String(error.message || error).slice(0, 200)}`;
  }
  environment.hover_media = await evaluate('matchMedia("(hover: hover)").matches');
  await send('DOM.enable');
  await send('CSS.enable');
  const {root} = await send('DOM.getDocument', {depth: -1});
  for (const hover of prepared.hovers.filter((h) => h.found)) {
    const {nodeId} = await send('DOM.querySelector', {nodeId: root.nodeId, selector: hover.selector});
    if (nodeId) await send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: ['hover']});
    environment.forced_hover.push({id: hover.id, forced: Boolean(nodeId)});
  }
  const byScenario = {};
  for (const binding of bindings) for (const scenario of binding.scenarios) (byScenario[scenario] ||= []).push(binding.id);
  const observations = Object.fromEntries(bindings.map((b) => [b.id, {oracle: {}, candidate: {}, bridge: {}, bridge_negative: null, negative: null, unthemed: null}]));
  const applied = {};
  const frame = () => evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
  let viewport = 'wide';
  const setViewport = async (want) => {
    if (want === viewport) return;
    if (want === 'narrow') await send('Emulation.setDeviceMetricsOverride', {width: 480, height: 1000, deviceScaleFactor: 1, mobile: false});
    else await send('Emulation.clearDeviceMetricsOverride');
    viewport = want;
    await sleep(150);
  };
  for (const [scenario, ids] of Object.entries(byScenario)) {
    const spec = SCENARIOS[scenario];
    if (!spec) throw new Error(`unknown scenario ${scenario}`);
    await setViewport(spec.viewport);
    for (const mode of ['oracle', 'candidate', 'bridge']) {
      applied[`${mode}:${scenario}`] = await evaluate(`window.__ccs.apply(${JSON.stringify(mode)}, ${JSON.stringify(spec)})`);
      await frame();
      const values = await evaluate(`window.__ccs.read(${JSON.stringify(ids)})`);
      for (const id of ids) observations[id][mode][scenario] = values[id];
    }
  }
  await setViewport('wide');
  const unthemedIds = bindings.map((b) => b.id);
  applied.unthemed = await evaluate(`window.__ccs.apply('unthemed', ${JSON.stringify(SCENARIOS.light)})`);
  await frame();
  const unthemed = await evaluate(`window.__ccs.read(${JSON.stringify(unthemedIds)})`);
  for (const id of unthemedIds) observations[id].unthemed = unthemed[id];
  // Negative: one token at a time, the candidate light scope gets a wrong value.
  // Bindings observed only in narrow scenarios get theirs at the narrow viewport.
  const byToken = new Map();
  for (const b of bindings) {
    const group = byToken.get(b.token) || {wide: [], narrow: []};
    (b.scenarios.includes(NEGATIVE_SCENARIO) ? group.wide : group.narrow).push(b.id);
    byToken.set(b.token, group);
  }
  const injected = [];
  for (const mode of ['candidate', 'bridge']) {
    applied[`${mode}:negative`] = await evaluate(`(() => { document.getElementById('ccs-sentinel').media = 'all'; return window.__ccs.apply(${JSON.stringify(mode)}, ${JSON.stringify(SCENARIOS[NEGATIVE_SCENARIO])}); })()`);
    for (const viewportName of ['wide', 'narrow']) {
      const work = [...byToken].filter(([, group]) => group[viewportName].length);
      if (!work.length) continue;
      await setViewport(viewportName);
      for (const [token, group] of work) {
        const ids = group[viewportName];
        await evaluate(`document.getElementById('ccs-sentinel').textContent = ${JSON.stringify(sentinelCss(sentinels, token, NEGATIVE_SCENARIO, mode))}`);
        await frame();
        const negative = await evaluate(`window.__ccs.read(${JSON.stringify(ids)})`);
        for (const id of ids) observations[id][mode === 'candidate' ? 'negative' : 'bridge_negative'] = {...negative[id], isolated_token: token};
        injected.push(token);
      }
    }
  }
  await setViewport('wide');
  applied.negative_tokens = injected.length;
  await evaluate(`(() => { const el = document.getElementById('ccs-sentinel'); el.media = 'not all'; el.textContent = ''; })()`);
  return {observations, applied, environment};
}

function frozenPeerVersion(runPath) {
  if (!runPath) return null;
  const manifest = JSON.parse(readFileSync(runPath, 'utf8'));
  for (const item of manifest?.oracles?.current_peer || []) {
    if (item && item.id === PEER_PACKAGE && typeof item.version === 'string') return exactVersion(item.version, item.version);
  }
  return null;
}

async function renderLine({tarball, line, runId, expectPeerVersion, matrixGroups}) {
  const errors = [];
  const pkg = readPackedPackage(tarball);
  const versions = versionsFor(pkg);
  const {consumer, installed, env} = installConsumer(tarball, versions);
  const nodeModules = join(consumer, 'node_modules');
  const identity = peerIdentity(nodeModules);
  if (expectPeerVersion && identity.version !== expectPeerVersion) {
    errors.push(`consumer peer ${PEER_PACKAGE}@${identity.version} is not the run's frozen ${expectPeerVersion}`);
  }
  const sass = require('sass');
  const dimensionTokens = peerDimensionTokens(sass, nodeModules, identity);
  const roster = deriveRoster(dimensionTokens);
  if (line === '21.x') errors.push(...compareRoster(roster.groups, matrixGroups));
  const oracle = compilePeerOnly(sass, nodeModules, oracleScss(), 'ccs-oracle.scss', identity);
  const isolation = {
    peer_only: true,
    load_paths: ['<consumer>/node_modules'],
    peer_realpath_prefix: relative(consumer, identity.realpath),
    loaded_files: oracle.loaded_files,
    legacy_package_loaded: false,
  };
  const candidate = compileCandidate(sass, nodeModules, installed, identity);
  const sentinels = sentinelTable(roster.rostered);
  await buildLab(consumer, env, versions);
  const dist = join(consumer, 'dist');
  writeFileSync(join(dist, 'theme.css'), `${oracle.css}\n${candidate.css}\n`);
  writeFileSync(join(dist, 'index.html'), INDEX_HTML);
  const rendered = await withChromium(dist, async (cdp) => ({browser: cdp.browser, ...(await observe(cdp, roster.rostered, sentinels))}));
  const assessed = assessAll({roster, observations: rendered.observations, sentinels, dimensionTokens, identity, isolation});
  const failed = [...assessed.dimensionCases, ...assessed.oracleCases].filter((r) => r.result !== 'pass');
  return {
    line, runId, errors, identity, versions, roster, assessed, failed, isolation,
    browser: rendered.browser, environment: rendered.environment, applied: rendered.applied,
    tarballSha256: sha256File(tarball), oracleCssSha256: oracle.sha256, candidateCssSha256: candidate.sha256,
    dimensionTokens, sentinels,
  };
}

function summarize(item) {
  const dims = item.assessed.dimensionCases;
  const byCompanion = {};
  for (const r of dims) {
    const row = (byCompanion[r.companion] ||= {cases: 0, passed: 0, not_applicable: [], failed: []});
    if (r.not_applicable) row.not_applicable.push(r.dimension);
    row.cases += 1;
    if (r.result === 'pass') row.passed += 1; else row.failed.push(r.case_id);
  }
  return byCompanion;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const jobs = [];
  let expectPeerVersion = null;
  if (args.runPath) {
    const resolved = resolveLibraryFromRun(args.runPath);
    expectPeerVersion = frozenPeerVersion(args.runPath);
    jobs.push({line: '21.x', tarball: resolved.tarball, runId: resolved.runId});
  } else if (args.tarball) {
    jobs.push({line: '21.x', tarball: args.tarball, runId: null});
  } else {
    fail(2, '--tarball or --run is required');
  }
  if (!existsSync(jobs[0].tarball)) fail(2, `Missing tarball: ${jobs[0].tarball}`);
  if (args.tarball21) {
    if (!existsSync(args.tarball21)) fail(2, `Missing tarball: ${args.tarball21}`);
    jobs.push({line: 'main', tarball: args.tarball21, runId: null});
  }
  const envRun = process.env.RC_RUN_ID || null;
  const assertionDir = process.env.RC_ASSERTION_OUTPUT_DIR || null;
  const invocationId = process.env.RC_INVOCATION_ID || null;
  if (assertionDir && (!envRun || !invocationId)) fail(2, 'RC_ASSERTION_OUTPUT_DIR requires RC_RUN_ID and RC_INVOCATION_ID');
  if (assertionDir && jobs[0].runId && envRun !== jobs[0].runId) fail(2, `RC_RUN_ID ${envRun} does not match the run manifest ${jobs[0].runId}`);
  const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
  const lines = [];
  let assertionsWritten = 0;
  for (const job of jobs) {
    let item;
    try {
      item = await renderLine({...job, expectPeerVersion: job.line === '21.x' ? expectPeerVersion : null,
        matrixGroups: matrixRoster(matrix, job.line)});
    } catch (error) {
      lines.push({line: job.line, result: 'fail', errors: [String(error && error.stack || error).slice(0, 4000)]});
      continue;
    }
    if (job.line === '21.x' && assertionDir) {
      const bodies = assertionBodies(item.assessed, {
        line: '21.x', runId: envRun, invocationId, identity: item.identity, dimensionTokens: item.dimensionTokens,
        oracleCssSha256: item.oracleCssSha256, candidateCssSha256: item.candidateCssSha256,
        tarballSha256: item.tarballSha256, browser: item.browser, isolation: item.isolation,
      });
      assertionsWritten = writeAssertionFiles(assertionDir, bodies).length;
    }
    const ok = item.errors.length === 0 && item.failed.length === 0;
    lines.push({
      line: item.line,
      run_id: item.runId,
      result: ok ? 'pass' : 'fail',
      coverage_role: item.line === '21.x' ? '21.x roster producer' : 'slice (main groups stay null)',
      tarball_sha256: item.tarballSha256,
      browser: item.browser,
      peer: {package: item.identity.package, version: item.identity.version, package_json_sha256: item.identity.package_json_sha256},
      versions: item.versions,
      oracle_isolation: item.isolation,
      oracle_css_sha256: item.oracleCssSha256,
      candidate_css_sha256: item.candidateCssSha256,
      environment: item.environment,
      applied: item.applied,
      roster: {
        [GROUP_DIMENSIONS]: item.roster.groups[GROUP_DIMENSIONS].length,
        [GROUP_ORACLE]: item.roster.groups[GROUP_ORACLE].length,
        not_applicable: item.roster.notApplicable,
        unbound_peer_tokens: item.roster.unbound,
      },
      companions: summarize(item),
      failed_case_ids: item.failed.map((r) => r.case_id),
      failures: item.failed.slice(0, 400).map((r) => ({case_id: r.case_id, reasons: r.reasons})),
      cases: item.assessed.dimensionCases,
      oracle_cases: item.assessed.oracleCases,
      errors: item.errors,
    });
  }
  const mainLine = lines.find((l) => l.line === '21.x') || lines[0];
  const ok = lines.every((l) => l.result === 'pass');
  const report = {
    schema_version: 2,
    role: 'companion rendered computed styles vs in-page current-peer M2 oracle',
    check_id: CHECK_ID,
    coverage: 'slice',
    run_id: mainLine.run_id ?? null,
    invocation_id: invocationId,
    assertions_written: assertionsWritten,
    result: ok ? 'pass' : 'fail',
    g06_g07_g08_claim: 'not-passed',
    lines,
    error: ok ? null : lines.flatMap((l) => [...(l.errors || []), ...((l.failed_case_ids || []).map((id) => `case failed: ${id}`))].map((e) => `${l.line}: ${e}`)).slice(0, 200),
    limitations: [
      'Oracle: the consumer-installed current @angular/material peer, M2-themed by its own m2-define-*-theme and <companion>-theme mixins, compiled from the peer only, rendered in the same page and DOM as the candidate.',
      'Candidate: legacy.all-current-companion-bridges from the packed library. 16.2.14 rules that per-companion legacy theme mixins also emit are not part of this candidate.',
      'Scenarios: light, dark, density -2, alternate typography (Georgia), RTL, nested dark-in-light, plus complete custom2018/legacy light/dark palettes and typography and custom nested dark-in-light; toolbar mobile height also uses all four rich themes at a 480px viewport. Popups and the bottom sheet are real CDK body overlays themed through the overlay container.',
      'Each case needs complete public-theme candidate and bridge aggregate == oracle on the consuming computed property in every required scenario; each route must consume an isolated wrong-but-nonempty token and fail its normal comparison.',
      'A token the peer M2 mixin declares with a CSS-wide keyword (badge container sizes unset, icon color and expansion header line-height/tracking inherit) has no computed token value; its consuming property must still match and consume the injected value.',
      'This report is a slice. The rc-verify coordinator report built from the assertion files is the acceptance input. No G06/G07/G08 claim.',
    ],
  };
  mkdirSync(dirname(args.out), {recursive: true});
  writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    ok,
    assertions_written: assertionsWritten,
    lines: lines.map((l) => ({line: l.line, result: l.result, peer: l.peer?.version, roster: l.roster,
      failed: (l.failed_case_ids || []).length,
      failures: (l.failures || []).map(({case_id, reasons}) => ({case_id, reasons})),
      errors: (l.errors || []).map((e) => String(e).slice(0, 400))})),
    report: relative(root, args.out),
  }, null, 2));
  if (!ok) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
