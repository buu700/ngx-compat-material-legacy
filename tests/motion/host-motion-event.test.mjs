import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  legacyHostMotionEvent,
  legacyNextMotionCompletion,
} from '../../projects/ngx-material-legacy/legacy-core/internal/motion-event.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const host = {};
const child = {};

assert.equal(legacyHostMotionEvent({target: host, currentTarget: host}), true);
assert.equal(legacyHostMotionEvent({target: child, currentTarget: host}), false);
assert.equal(legacyHostMotionEvent({target: null, currentTarget: host}), false);

assert.equal(legacyNextMotionCompletion(undefined, 'mat-menu-enter'), 'mat-menu-enter');
assert.equal(legacyNextMotionCompletion('mat-menu-enter', 'mat-menu-enter'), undefined);
assert.equal(legacyNextMotionCompletion('mat-menu-enter', 'mat-menu-exit'), 'mat-menu-exit');
assert.equal(legacyNextMotionCompletion(undefined, ''), undefined);

function source(path) {
  return readFileSync(join(root, path), 'utf8');
}

for (const path of [
  'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
  'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts',
]) {
  assert.ok(source(path).includes('legacyHostMotionEvent'), path);
}

const menu = source('projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts');
assert.ok(menu.includes('this._completedAnimation = undefined'));
assert.ok(menu.includes('legacyNextMotionCompletion'));

const tabs = source('projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts');
assert.ok(tabs.includes('event.target !== this._contentElement?.nativeElement'));

const dialog = source('projects/ngx-material-legacy/legacy-dialog/dialog-container.ts');
assert.ok(dialog.includes('clearTimeout(this._animationTimer)'));
assert.ok(dialog.includes('Promise.resolve().then(() => this._finishDialogOpen())'));

console.log('host motion event tests passed');
