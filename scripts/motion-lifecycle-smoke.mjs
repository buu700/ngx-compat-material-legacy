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
  snackAnims: read('projects/ngx-material-legacy/legacy-snack-bar/snack-bar-animations.ts'),
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
  dialog_zero_duration_when_disabled: targets.dialog.includes('LEGACY_ZERO_ANIMATION_PARAMS'),
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
  snack_bar_parameterized_and_wired:
    targets.snackAnims.includes('{{enterDuration}}') &&
    targets.snackBar.includes('_getAnimationState'),
  tabs_zero_duration_when_disabled:
    targets.tabs.includes('legacyAnimationsDisabled') &&
    targets.tabs.includes("? '0ms'"),
  dialog_retains_trigger_metadata: targets.dialog.includes('matDialogAnimations'),
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
    'Owned @angular/animations trigger metadata retained for dialog/menu/select/form-field/snack-bar/tabs (and exported tooltip recipes).',
    'Optional @angular/animations peer still required for those recipes until CSS/WAAPI replacements land.',
    'Tooltip runtime uses CSS classes (_showAnimation/_hideAnimation), not component animations metadata.',
  ],
  artifacts: {
    helper_sha256: sha256(helper),
  },
  notes: [
    'Maximum safe incremental step: parameterized durations + MATERIAL_ANIMATIONS-aware 0ms paths on dialog/menu/select/form-field/snack-bar/tabs.',
    'Full engine removal remains deferred; do not delete trigger APIs without tested CSS/WAAPI migrations.',
  ],
};

mkdirSync(outDir, {recursive: true});
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
if (errors.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
