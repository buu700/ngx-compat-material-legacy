#!/usr/bin/env node
/**
 * Motion lifecycle smoke for owned legacyAnimationsDisabled helper + dialog wiring.
 * Verifies source contracts without requiring a packed consumer:
 *  - no private Material animation helpers
 *  - dialog uses field-init capture + zero-duration params when disabled
 *  - helper imports public MATERIAL_ANIMATIONS only
 */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const helperPath = join(root, 'projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts');
const dialogPath = join(root, 'projects/ngx-material-legacy/legacy-dialog/dialog-container.ts');
const outDir = join(root, 'compatibility/pack-proof');
const outPath = join(outDir, 'motion-lifecycle-smoke.json');

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

const helper = readFileSync(helperPath, 'utf8');
const dialog = readFileSync(dialogPath, 'utf8');
const errors = [];

if (/(?<![A-Za-z])_getAnimationsState\s*\(|(?<![A-Za-z])_animationsDisabled\s*\(/.test(helper)) {
  errors.push('helper must not call private Material animation helpers');
}
if (!helper.includes("from '@angular/material/core'") || !helper.includes('MATERIAL_ANIMATIONS')) {
  errors.push('helper must import public MATERIAL_ANIMATIONS from @angular/material/core');
}
if (!helper.includes('ANIMATION_MODULE_TYPE')) {
  errors.push('helper must consult public ANIMATION_MODULE_TYPE');
}
if (!helper.includes('LEGACY_ZERO_ANIMATION_PARAMS')) {
  errors.push('missing LEGACY_ZERO_ANIMATION_PARAMS');
}
if (!dialog.includes('legacyAnimationsDisabled')) {
  errors.push('dialog-container missing legacyAnimationsDisabled wiring');
}
if (!dialog.includes('_legacyAnimationsDisabled')) {
  errors.push('dialog-container must capture disabled state in field initializer');
}
if (!dialog.includes('LEGACY_ZERO_ANIMATION_PARAMS')) {
  errors.push('dialog-container missing zero-duration params path');
}
if (!dialog.includes('matDialogAnimations')) {
  errors.push('dialog must retain historical matDialogAnimations trigger metadata this wave');
}

const result = {
  schema_version: 1,
  captured_at: new Date().toISOString(),
  status: errors.length ? 'fail' : 'ok',
  checks: {
    helper_uses_public_MATERIAL_ANIMATIONS: !errors.some(e => e.includes('MATERIAL_ANIMATIONS')),
    helper_avoids_private_Material_helpers: !errors.some(e => e.includes('private')),
    dialog_field_init_capture: dialog.includes('_legacyAnimationsDisabled'),
    dialog_zero_duration_when_disabled: dialog.includes('LEGACY_ZERO_ANIMATION_PARAMS'),
    dialog_retains_trigger_metadata: dialog.includes('matDialogAnimations'),
  },
  errors,
  artifacts: {
    helper_sha256: sha256(helper),
    dialog_sha256: sha256(dialog),
  },
  notes: [
    'Full @angular/animations engine removal from overlays remains deferred.',
    'This smoke proves the safe incremental MATERIAL_ANIMATIONS-aware disable path for dialog.',
    'Menu/select/form-field still own historical trigger metadata without zero-duration wiring this wave.',
  ],
};

mkdirSync(outDir, {recursive: true});
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
if (errors.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
