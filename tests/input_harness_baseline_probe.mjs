/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {inputHarnessPublicSubjects, inputHarnessHost} from '../scripts/input-harness-public-subjects.mjs';
const subjects = await inputHarnessPublicSubjects(), observations = [];
try {
  for (const model of subjects.models) {
    const disabled = inputHarnessHost({properties: {disabled: true}, attributes: {disabled: 'false'}}), input = new model.runtime.MatInputHarness(disabled.locator);
    const placeholder = inputHarnessHost({properties: {placeholder: ''}, attributes: {'data-placeholder': 'application data'}}), second = new model.runtime.MatInputHarness(placeholder.locator);
    const observation = {line: model.subject.line, is_disabled: await input.isDisabled(), placeholder: await second.getPlaceholder(),
      disabled_protocol_calls: disabled.calls, placeholder_protocol_calls: placeholder.calls};
    assert.equal(observation.is_disabled, model.subject.line === 'original');
    assert.equal(observation.placeholder, 'application data');
    observations.push(observation);
  }
  console.log(JSON.stringify({schema_version: 1, scope: 'Actual complete public harness modules with TestElement property/attribute protocol; no Angular view or native browser', observations,
    capsule_sha256: subjects.capsule_sha256, rxjs: subjects.rxjs, g11_claim: 'not-passed'}, null, 2));
} finally {subjects.dispose();}
