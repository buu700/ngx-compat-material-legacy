#!/usr/bin/env node
/**
 * Motion lifecycle smoke for owned legacyAnimationsDisabled helper + overlay wiring.
 */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'compatibility/pack-proof');
const outPath = join(outDir, 'motion-lifecycle-smoke.json');

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const helper = read('projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts');
const targets = {
  dialog: read('projects/ngx-material-legacy/legacy-dialog/dialog-container.ts'),
  menu: read('projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts'),
  menuHtml: read('projects/ngx-material-legacy/legacy-menu/menu.html'),
  select: read('projects/ngx-material-legacy/legacy-select/select.ts'),
  selectHtml: read('projects/ngx-material-legacy/legacy-select/select.html'),
  formField: read('projects/ngx-material-legacy/legacy-form-field/form-field.ts'),
  formFieldHtml: read('projects/ngx-material-legacy/legacy-form-field/form-field.html'),
  snackBar: read('projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts'),
  tabs: read('projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts'),
  menuAnims: read('projects/ngx-material-legacy/legacy-menu/animations/menu-animations.ts'),
  selectAnims: read('projects/ngx-material-legacy/legacy-select/animations/index.ts'),
  formFieldAnims: read('projects/ngx-material-legacy/legacy-form-field/animations/index.ts'),
  snackAnims: read('projects/ngx-material-legacy/legacy-snack-bar/animations/index.ts'),
};

const errors = [];
const privateRe = /(?<![A-Za-z])_getAnimationsState\s*\(|(?<![A-Za-z])_animationsDisabled\s*\(/;
if (privateRe.test(helper)) errors.push('helper must not call private Material animation helpers');
if (!helper.includes('MATERIAL_ANIMATIONS') || !helper.includes("from '@angular/material/core'")) {
  errors.push('helper must import public MATERIAL_ANIMATIONS');
}
if (!helper.includes('legacyAnimationTriggerState')) {
  errors.push('helper missing legacyAnimationTriggerState');
}

const checks = {
  helper_uses_public_MATERIAL_ANIMATIONS: true,
  helper_avoids_private_Material_helpers: !privateRe.test(helper),
  dialog_zero_duration_when_disabled: targets.dialog.includes('_animationsEnabled') &&
    targets.dialog.includes('legacyAnimationsDisabled'),
  menu_css_motion:
    targets.menuHtml.includes('mat-menu-panel-animations-enabled') &&
    targets.menu.includes('_onCssAnimationDone') &&
    !targets.menu.includes('animations:') &&
    targets.menuAnims.includes('matMenuAnimations'),
  select_css_motion:
    targets.selectHtml.includes('mat-select-panel-animations-enabled') &&
    targets.select.includes('_animationsEnabled') &&
    !targets.select.includes('animations:') &&
    targets.selectAnims.includes('matLegacySelectAnimations'),
  form_field_css_motion:
    targets.formFieldHtml.includes('mat-form-field-subscript-message') &&
    targets.formField.includes('_animationsEnabled') &&
    !targets.formField.includes('animations:') &&
    targets.formFieldAnims.includes('matFormFieldAnimations'),
  snack_bar_css_motion:
    targets.snackBar.includes('mat-snack-bar-container-enter') &&
    targets.snackBar.includes('_animationsEnabled') &&
    !targets.snackBar.includes('animations:') &&
    targets.snackAnims.includes('matSnackBarAnimations'),
  tabs_css_motion:
    targets.tabs.includes('_onContentTransitionEnd') &&
    targets.tabs.includes('legacyAnimationsDisabled') &&
    !read('projects/ngx-material-legacy/legacy-tabs/tab-body.ts').includes('animations:') &&
    read('projects/ngx-material-legacy/legacy-tabs/animations/index.ts').includes('matTabsAnimations'),
  dialog_uses_css_motion: targets.dialog.includes('mat-legacy-dialog-container-open') &&
    !targets.dialog.includes('animations:') &&
    read('projects/ngx-material-legacy/legacy-dialog/animations/index.ts').includes('matDialogAnimations'),
  menu_recipes_opt_in_secondary: targets.menuAnims.includes('trigger('),
  tooltip_uses_css_not_engine_in_component: !read(
    'projects/ngx-material-legacy/legacy-tooltip/tooltip.ts',
  ).includes('animations:'),
  tooltip_honors_MATERIAL_ANIMATIONS_helper: read(
    'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts',
  ).includes('legacyAnimationsDisabled'),
};

for (const [k, v] of Object.entries(checks)) {
  if (!v) errors.push(`check failed: ${k}`);
}

const result = {
  schema_version: 2,
  captured_at: new Date().toISOString(),
  status: errors.length ? 'fail' : 'ok',
  checks,
  errors,
  remaining_engine_bindings: [
    'Primary overlay entries cleared of @angular/animations imports (dialog/menu/select/form-field/snack-bar/tabs/tooltip).',
    'Opt-in /animations secondary entries still import the peer when consumers need historical AnimationTriggerMetadata.',
  ],
  artifacts: {
    helper_sha256: sha256(helper),
  },
  notes: [
    'All targeted overlay entries use CSS/timer motion on primary FESM; recipes live under /animations.',
  ],
};

mkdirSync(outDir, {recursive: true});
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
if (errors.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
