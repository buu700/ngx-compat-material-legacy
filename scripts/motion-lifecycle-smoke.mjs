#!/usr/bin/env node
/**
 * Engine-free motion lifecycle check.
 *
 * Primary overlay entries must use the public MATERIAL_ANIMATIONS helper and
 * CSS/timer motion. Deleted /animations recipe modules are not required and
 * are not restored. Pass --self-check to test the predicates without reading
 * the tree or writing a receipt.
 */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const trackedReceipt = join(root, 'compatibility/pack-proof/motion-lifecycle-smoke.json');

function receiptPath() {
  const directed = process.env.RC_ASSERTION_OUTPUT_DIR;
  if (process.env.RC_CHECK_ID === 'motion-smoke' && directed) {
    const target = join(directed, 'motion-lifecycle-smoke.json');
    if (resolve(target) === resolve(trackedReceipt)) {
      throw new Error('motion receipt must not overwrite the tracked pack-proof file');
    }
    return target;
  }
  return trackedReceipt;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

const engineImport = /from\s+['"]@angular\/animations['"]/;
const privateHelper = /(?<![A-Za-z])_getAnimationsState\s*\(|(?<![A-Za-z])_animationsDisabled\s*\(/;

export function lifecycleErrors(files) {
  const errors = [];
  const helper = files.helper ?? '';
  if (privateHelper.test(helper)) errors.push('helper must not call private Material animation helpers');
  if (!helper.includes('MATERIAL_ANIMATIONS') || !helper.includes("from '@angular/material/core'")) {
    errors.push('helper must import public MATERIAL_ANIMATIONS');
  }
  if (!helper.includes('legacyAnimationsDisabled')) errors.push('helper missing legacyAnimationsDisabled');
  const primaries = [
    'dialog',
    'menu',
    'menuHtml',
    'select',
    'selectHtml',
    'formField',
    'formFieldHtml',
    'snackBar',
    'tabs',
    'tabBody',
    'tooltip',
    'tooltipBase',
  ];
  for (const name of primaries) {
    const text = files[name] ?? '';
    if (!text) errors.push(`missing primary source: ${name}`);
    if (engineImport.test(text)) errors.push(`${name} imports @angular/animations`);
    if (/(^|\n)\s*animations\s*:/.test(text)) errors.push(`${name} still declares an animations metadata array`);
  }
  if (files.dialog && !files.dialog.includes('mat-legacy-dialog-container-open')) {
    errors.push('dialog is missing its CSS open class');
  }
  if (files.menuHtml && !files.menuHtml.includes('mat-menu-panel-animations-enabled')) {
    errors.push('menu panel is missing its CSS motion class');
  }
  if (files.menu && !files.menu.includes('_onCssAnimationDone')) {
    errors.push('menu is missing the CSS animation callback');
  }
  if (files.selectHtml && !files.selectHtml.includes('mat-select-panel-animations-enabled')) {
    errors.push('select panel is missing its CSS motion class');
  }
  if (files.snackBar && !files.snackBar.includes('mat-snack-bar-container-enter')) {
    errors.push('snack-bar is missing its CSS enter class');
  }
  if (files.tabs && !files.tabs.includes('_onContentTransitionEnd')) {
    errors.push('tabs are missing the CSS transition callback');
  }
  if (files.tooltipBase && !files.tooltipBase.includes('legacyAnimationsDisabled')) {
    errors.push('tooltip does not honor the motion helper');
  }
  return errors;
}

if (process.argv.includes('--self-check')) {
  const clean = {
    helper: "import {MATERIAL_ANIMATIONS} from '@angular/material/core';\nexport function legacyAnimationsDisabled() { return false; }\n",
    dialog: 'const OPEN_CLASS = "mat-legacy-dialog-container-open";\n',
    menu: '_onCssAnimationDone()\n',
    menuHtml: '[class.mat-menu-panel-animations-enabled]\n',
    select: 'legacyAnimationsDisabled()\n',
    selectHtml: '[class.mat-select-panel-animations-enabled]\n',
    formField: 'legacyAnimationsDisabled()\n',
    formFieldHtml: 'class="mat-form-field-subscript-message"\n',
    snackBar: "'[class.mat-snack-bar-container-enter]'\n",
    tabs: '_onContentTransitionEnd()\n',
    tabBody: 'class TabBody {}\n',
    tooltip: 'class Tooltip {}\n',
    tooltipBase: 'legacyAnimationsDisabled()\n',
  };
  const failures = [];
  if (lifecycleErrors(clean).length !== 0) failures.push('clean fixture should pass');
  if (!lifecycleErrors({...clean, dialog: `${clean.dialog}\nimport {trigger} from '@angular/animations';\n`}).some(item => item.includes('dialog imports'))) {
    failures.push('engine import should fail');
  }
  if (!lifecycleErrors({...clean, tooltip: 'animations: []\n'}).some(item => item.includes('tooltip still declares'))) {
    failures.push('animations metadata should fail');
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log('motion lifecycle self-check passed');
  process.exit(0);
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const files = {
  helper: read('projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts'),
  dialog: read('projects/ngx-material-legacy/legacy-dialog/dialog-container.ts'),
  menu: read('projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts'),
  menuHtml: read('projects/ngx-material-legacy/legacy-menu/menu.html'),
  select: read('projects/ngx-material-legacy/legacy-select/select.ts'),
  selectHtml: read('projects/ngx-material-legacy/legacy-select/select.html'),
  formField: read('projects/ngx-material-legacy/legacy-form-field/form-field.ts'),
  formFieldHtml: read('projects/ngx-material-legacy/legacy-form-field/form-field.html'),
  snackBar: read('projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts'),
  tabs: read('projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts'),
  tabBody: read('projects/ngx-material-legacy/legacy-tabs/tab-body.ts'),
  tooltip: read('projects/ngx-material-legacy/legacy-tooltip/tooltip.ts'),
  tooltipBase: read('projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts'),
};
const errors = lifecycleErrors(files);
const result = {
  schema_version: 3,
  captured_at: new Date().toISOString(),
  status: errors.length ? 'fail' : 'ok',
  evidence_binding: 'source-lifecycle',
  artifact: null,
  errors,
  helper_sha256: sha256(files.helper),
  limitations: [
    'Checks current source. It does not consume a packed tarball and is not a release receipt.',
    'Deleted /animations recipe modules are not required.',
  ],
};
const outPath = receiptPath();
mkdirSync(dirname(outPath), {recursive: true});
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
if (errors.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({status: result.status, errors: result.errors}));
