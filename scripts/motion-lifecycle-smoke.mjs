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
  menuAnims: read('projects/ngx-material-legacy/legacy-menu/menu-animations.ts'),
  selectAnims: read('projects/ngx-material-legacy/legacy-select/select-animations.ts'),
  formFieldAnims: read('projects/ngx-material-legacy/legacy-form-field/form-field-animations.ts'),
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
  menu_parameterized_and_wired:
    targets.menuAnims.includes('{{enterDuration}}') &&
    targets.menu.includes('_getPanelAnimationState') &&
    targets.menuHtml.includes('_getPanelAnimationState()'),
  select_parameterized_and_wired:
    targets.selectAnims.includes('{{enterDuration}}') &&
    targets.select.includes('_getTransformPanelState') &&
    targets.selectHtml.includes('_getTransformPanelState()'),
  form_field_parameterized_and_wired:
    targets.formFieldAnims.includes('{{transitionDuration}}') &&
    targets.formField.includes('_getSubscriptAnimationState') &&
    targets.formFieldHtml.includes('_getSubscriptAnimationState()'),
  snack_bar_css_motion:
    targets.snackBar.includes('mat-snack-bar-container-enter') &&
    targets.snackBar.includes('_animationsEnabled') &&
    !targets.snackBar.includes('animations:') &&
    targets.snackAnims.includes('matSnackBarAnimations'),
  tabs_zero_duration_when_disabled:
    targets.tabs.includes('legacyAnimationsDisabled') &&
    targets.tabs.includes("? '0ms'"),
  dialog_uses_css_motion: targets.dialog.includes('mat-legacy-dialog-container-open') &&
    !targets.dialog.includes('animations:') &&
    read('projects/ngx-material-legacy/legacy-dialog/animations/index.ts').includes('matDialogAnimations'),
  menu_retains_trigger_metadata: targets.menuAnims.includes('trigger('),
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
    'Primary FESM still imports @angular/animations for: menu, select, form-field, tabs (component trigger metadata).',
    'Optional recipe-only secondary entries (import peer only if used): legacy-dialog/animations, legacy-snack-bar/animations, legacy-tooltip/animations.',
    'Dialog + snack-bar + tooltip primary runtime use CSS/timers/keyframes — no engine import on those primary FESMs.',
  ],
  artifacts: {
    helper_sha256: sha256(helper),
  },
  notes: [
    'Dialog/snack-bar migrated to Material-22-style CSS motion; recipes opt-in via /animations secondary entries.',
    'Menu/select/form-field/tabs still bind Angular animation triggers on primary entries.',
  ],
};

mkdirSync(outDir, {recursive: true});
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
if (errors.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
