/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line, production, variant = 'ordinary'] = process.argv.slice(2);
globalThis.ngDevMode = production !== 'true';
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const payload = JSON.parse(readFileSync(new URL('./document-token-payload.json', import.meta.url)));
const token = common.DOCUMENT, sentinel = Object.freeze({document_protocol: true});
const cases = [], annotations = [];
const check = (id, action) => {action(); cases.push(id);};
check('public-document-token-and-current-core-reexport-identity', () => {
  assert.ok(token instanceof core.InjectionToken);
  assert.equal(token.ɵprov, undefined);
  if (line === 'original') assert.equal(core.DOCUMENT, undefined);
  else assert.equal(token, core.DOCUMENT);
});
for (const row of payload.cases) {
  const ref = row.references[0];
  check('actual-source-token-boundary/' + row.file, () => {
    const boundToken = variant === 'clone-token' ? new core.InjectionToken('DocumentToken') : token;
    const injector = core.Injector.create({providers: [{provide: token, useValue: sentinel}]});
    try {
      if (ref.role === 'constructor-token') {
        const annotation = new Function('Inject', row.local_name, 'return ' + ref.expression)(core.Inject, boundToken);
        class MetadataTarget {}
        annotation(MetadataTarget, undefined, ref.index);
        if (ref.optional) core.Optional()(MetadataTarget, undefined, ref.index);
        const metadata = MetadataTarget.__parameters__[ref.index];
        assert.equal(metadata[0].token, token);
        assert.equal(metadata.length, ref.optional ? 2 : 1);
        const resultToken = new core.InjectionToken('document-annotation-result');
        const deps = variant === 'drop-optional' ? metadata.filter(m => m.ngMetadataName !== 'Optional') : metadata;
        const scope = core.Injector.create({providers: [{provide: token, useValue: sentinel},
          {provide: resultToken, useFactory: document => document, deps: [deps]}]});
        try {assert.equal(scope.get(resultToken), sentinel);} finally {scope.destroy();}
        const absent = core.Injector.create({providers: [{provide: resultToken, useFactory: document => document, deps: [deps]}]});
        try {
          if (ref.optional) {
            let value; assert.doesNotThrow(() => {value = absent.get(resultToken);}); assert.equal(value, null);
          } else assert.throws(() => absent.get(resultToken));
        } finally {absent.destroy();}
        annotations.push({file: row.file, index: ref.index, optional: ref.optional, actual_Inject_annotation_replayed: true,
          genuine_provider_dependency_resolution: true, metadata_target_is_protocol: true});
      } else {
        const call = core.runInInjectionContext(injector, () =>
          new Function('inject', row.local_name, 'return ' + ref.expression)(core.inject, boundToken));
        assert.equal(call, sentinel);
      }
    } finally {injector.destroy();}
  });
}
check('public-inject-provider-null-parent-override-and-distinct-lookalike', () => {
  const lookalike = new core.InjectionToken('DocumentToken');
  const parent = core.Injector.create({providers: [{provide: token, useValue: sentinel}]});
  const inherited = core.Injector.create({providers: [], parent});
  const child = core.Injector.create({providers: [{provide: token, useValue: null}], parent});
  try {
    assert.equal(inherited.get(token), sentinel); assert.equal(child.get(token), null); assert.equal(parent.get(token), sentinel);
    assert.equal(core.runInInjectionContext(child, () => core.inject(token)), null);
    assert.equal(core.runInInjectionContext(inherited, () => core.inject(lookalike, {optional: true})), null);
    assert.throws(() => inherited.get(lookalike));
  } finally {child.destroy(); inherited.destroy(); parent.destroy();}
});
check('whole-owned-progress-location-factory-with-genuine-document-token', () => {
  let source = payload.progress_factory;
  if (variant === 'static-progress-path') {
    const expression = "(_location ? _location.pathname + _location.search : '')";
    assert.ok(source.includes('getPathname: () => ' + expression));
    source = source.replace('return {', 'const snapshot = ' + expression + '; return {')
      .replace('getPathname: () => ' + expression, 'getPathname: () => snapshot');
  }
  if (variant === 'drop-progress-search') {
    assert.ok(source.includes(' + _location.search'));
    source = source.replace(' + _location.search', '');
  }
  const factory = new Function('inject', 'DOCUMENT', source + ';return MAT_PROGRESS_BAR_LOCATION_FACTORY;')(
    core.inject, variant === 'clone-progress-token' ? new core.InjectionToken('DocumentToken') : token);
  const location = {pathname: '/one', search: '?a=1', hash: '#not-included'};
  for (const [document, expected] of [[null, ''], [{}, ''], [{location}, '/one?a=1']]) {
    const injector = core.Injector.create({providers: [{provide: token, useValue: document}]});
    try {
      let result; assert.doesNotThrow(() => {result = core.runInInjectionContext(injector, factory);});
      assert.equal(result.getPathname(), expected);
      if (document?.location) {location.pathname = '/two'; location.search = '?b=2'; assert.equal(result.getPathname(), '/two?b=2');}
    } finally {injector.destroy();}
  }
});
check('public-injection-context-is-restored', () => assert.throws(() => core.inject(token)));
console.log(JSON.stringify({line, production: production === 'true', cases, annotations,
  genuine_public_token_and_DI_executed: true, document_values_and_metadata_targets_are_protocols: true,
  whole_owned_progress_location_factory_executed: true, actual_legacy_components_executed: false,
  native_or_packed_qualified: false}));
