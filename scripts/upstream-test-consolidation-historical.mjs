/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {posix} from 'node:path';
import {gunzipSync} from 'node:zlib';

export const HISTORICAL_CONSOLIDATION_CAPSULE = 'compatibility/rc/upstream-test-consolidation-historical-subjects.json';
export const HISTORICAL_CONSOLIDATION_SHA256 = '00d0917447af71f78ffe79f34220f6cd76ce5cda2ea64a93eb8e9bbbb019250c';
export const INDIVIDUAL_CONSOLIDATION_FAMILIES = Object.freeze({
  '126e4ec8869507ca449db1365a0b061c8713f9d8': 'dialog',
  'a41ce098b0eb4e56c05f3ac596aa97fd5a5d53ab': 'checkbox',
  'e1514fbe829af2a0630db7223bad2268dd0da407': 'snack-bar',
  '518ac69a7e0f787327e971c710a13bb2da6461cc': 'form-field',
  'bff5283469258fc90ad9eddbd31cab829d7ebfdf': 'core',
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const objectHash = (kind, bytes) => createHash('sha1')
  .update(Buffer.from(kind + ' ' + bytes.length + '\0')).update(bytes).digest('hex');
const replaceOnce = (text, before, after) => {
  assert.equal(text.split(before).length, 2, 'finite reviewed substitution missing or repeated');
  return text.replace(before, after);
};

/**
 * Preserve complete tagged sources. Only these already-owned import/setup
 * adaptations are admitted; no whitespace, template or expectation rewriting.
 * This proves source retention, not execution or modern-suite equivalence.
 */
export function retainedConsolidationSources(bytes, readRepo) {
  assert.equal(hash(bytes), HISTORICAL_CONSOLIDATION_SHA256);
  const packet = JSON.parse(bytes);
  assert.equal(packet.historical_tag, '16.2.14');
  assert.equal(packet.tag_commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  const commit = Buffer.from(packet.commit);
  assert.equal(objectHash('commit', commit), packet.tag_commit);
  assert.equal(hash(commit), packet.commit_sha256);
  assert.equal(packet.members.length, 12);
  const facts = [];
  for (const member of packet.members) {
    const raw = gunzipSync(Buffer.from(member.gzip_base64, 'base64'));
    assert.equal(raw.length, member.bytes);
    assert.equal(hash(raw), member.sha256);
    assert.equal(objectHash('blob', raw), member.git_blob_sha1);
    let expected = raw.toString();
    const adaptations = [];
    if (member.purpose === 'legacy-caller') {
      expected = expected.replace(/'@angular\/material\/(legacy-[a-z-]+(?:\/testing)?)'/g,
        (_, entry) => "'@ngx-compat/material-legacy/" + entry + "'");
      adaptations.push('published legacy package import redirects');
      const shared = packet.members.filter(m => m.purpose === 'shared-suite');
      let routes = 0;
      for (const source of shared) {
        const specifier = '@angular/material/' + source.historical_path
          .replace(/^src\/material\//, '').replace(/\.ts$/, '');
        if (!expected.includes("'" + specifier + "'")) continue;
        const local = posix.relative(posix.dirname(member.candidate_path), source.candidate_path);
        expected = replaceOnce(expected, "'" + specifier + "'", "'" + local + "'");
        routes++;
      }
      assert.equal(routes, 1);
      adaptations.push('owned complete historical shared suite route');
      if (member.family === 'snack-bar') {
        expected = replaceOnce(expected,
          "import {NoopAnimationsModule} from '@angular/platform-browser/animations';",
          "import {LEGACY_NOOP_ANIMATIONS} from '../../internal/testing/owned-animation-modules';");
        expected = replaceOnce(expected,
          '      imports: [MatLegacySnackBarModule, NoopAnimationsModule],\n      declarations: [SnackbarHarnessTest],\n    }).compileComponents();',
          '      imports: [MatLegacySnackBarModule],\n      declarations: [SnackbarHarnessTest], providers: [LEGACY_NOOP_ANIMATIONS]}).compileComponents();');
        adaptations.push('existing owned no-op animation test provider; no assertion changes');
      }
    } else {
      assert.equal(member.purpose, 'shared-suite');
      if (member.historical_path === 'src/material/core/testing/option-shared.spec.ts') {
        expected = replaceOnce(expected,
          "import {\n  MatOption,\n  MatOptionModule,\n  MAT_OPTION_PARENT_COMPONENT,\n  MatOptionParentComponent,\n} from '@angular/material/core';",
          "import {\n  MatLegacyOption as MatOption,\n  MatLegacyOptionModule as MatOptionModule,\n  MAT_LEGACY_OPTION_PARENT_COMPONENT as MAT_OPTION_PARENT_COMPONENT,\n  MatLegacyOptionParentComponent as MatOptionParentComponent,\n} from '@angular/material/legacy-core';");
        adaptations.push('existing distinct legacy option and parent-token fixture imports');
      }
    }
    const actual = readRepo(member.candidate_path);
    assert.ok(Buffer.isBuffer(actual));
    assert.equal(actual.toString(), expected, member.candidate_path + ' no longer retains complete tagged source');
    facts.push({family: member.family, purpose: member.purpose,
      historical_path: member.historical_path, candidate_path: member.candidate_path,
      reference_sha256: member.sha256, candidate_sha256: hash(actual), candidate_bytes: actual.length,
      adaptations});
  }
  return facts;
}

export function individualConsolidationScope(sha, facts) {
  const family = INDIVIDUAL_CONSOLIDATION_FAMILIES[sha];
  assert.ok(family);
  return {scope_kind: 'outside owned production; retain complete historical legacy suites',
    reference: {path: HISTORICAL_CONSOLIDATION_CAPSULE, sha256: HISTORICAL_CONSOLIDATION_SHA256},
    retained_sources: facts.filter(f => f.family === family),
    whole_modern_suite_equivalence_claimed: false, product_runtime_executed: false};
}
