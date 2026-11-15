/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exerciseParameterDecorators, parameterDecoratorSubjects, reviewParameterDecoratorUses} from '../scripts/parameter-decorator-current-5628.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p), 'utf8'), options = {};
const args = process.argv.slice(2); for (let i = 0; i < args.length; i += 2) {assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1];}
const subjects = await parameterDecoratorSubjects(root);
try {
  const report = await reviewParameterDecoratorUses({root, subjects, compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  assert.equal(report.frozen_uses, 89); assert.equal(report.current_uses, 116); assert.equal(report.source_override_used, false); assert.equal(report.current_delta_uses, 27);

  // Reconcile every prior use and its exact references, including the changed
  // tokens and added constructor annotations. Token identity remains separate.
  const prior=JSON.parse(read('compatibility/rc/historical-menu-parameter-requalification-diagnostic.json'));
  const expected=JSON.parse(read('compatibility/rc/parameter-decorator-current-5628-expected-deltas.json'));
  const key=c=>JSON.stringify([c.file,c.module,c.symbol]);
  const refs=c=>c.references.map(({line,...rest})=>JSON.stringify(rest)).sort();
  for(const old of prior.cases) assert.equal(report.cases.filter(c=>key(c)===key(old)).length,1,'prior parameter use absent or ambiguous');
  const changes=[];
  for(const current of report.cases){const old=prior.cases.find(c=>key(c)===key(current));const b=refs(current);if(!old){changes.push({file:current.file,module:current.module,symbol:current.symbol,kind:'additional-use',removed:[],added:b.map(JSON.parse)});continue;}const a=refs(old);if(JSON.stringify(a)!==JSON.stringify(b))changes.push({file:current.file,module:current.module,symbol:current.symbol,kind:'changed-use',removed:a.filter(x=>!b.includes(x)).map(JSON.parse),added:b.filter(x=>!a.includes(x)).map(JSON.parse)});}
  changes.sort((a,b)=>key(a).localeCompare(key(b)));assert.deepEqual(changes,expected.changes);assert.equal(changes.length,27);assert.equal(changes.filter(c=>c.kind==='additional-use').length,2);report.prior_roles_reconciled=true;
  assert.equal(report.cases.flatMap(c => c.references).length, 215); assert.equal(report.cases.filter(c => c.unused_import_erasure).length, 5); assert.deepEqual(report.authored_annotations.map(c => c.annotation_count), [213, 213, 213]); assert.deepEqual(report.behaviors.map(c => c.cases.length), [15, 15, 15]);
  for (const subject of report.authored_annotations) {
    assert.equal(subject.annotation_count, subject.annotations.length);
    assert.deepEqual(subject.annotations.filter(row => row.file === 'legacy-menu/internal/menu-item-base.ts')
      .map(row => [row.target_class, row.parameter_index, row.symbol]),
      [['_LegacyMenuItemBase', 1, 'Inject'], ['_LegacyMenuItemBase', 3, 'Inject'], ['_LegacyMenuItemBase', 3, 'Optional']]);
  }
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const core = model.runtime;
    for (const [id, api] of [
      ['inject-token-cloned', {...core, Inject: class extends core.Inject {constructor(token) {super({...token});}}}],
      ['optional-replaced-with-self', {...core, Optional: core.Self}],
      ['self-replaced-with-skipSelf', {...core, Self: core.SkipSelf}],
      ['skipSelf-replaced-with-self', {...core, SkipSelf: core.Self}],
      ['host-replaced-with-optional', {...core, Host: core.Optional}],
    ]) {assert.throws(() => exerciseParameterDecorators(core, api), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
    const Base = core.Optional;
    function Shifted(...args) {if (new.target) return Reflect.construct(Base, args, new.target); const annotation = Base(...args); const changed = (target, key, index) => annotation(target, key, index + 1); changed.annotation = annotation.annotation; return changed;}
    Shifted.prototype = Base.prototype;
    assert.throws(() => exerciseParameterDecorators(core, {...core, Optional: Shifted}), assert.AssertionError); mutations.push({id: model.subject.line + ':parameter-slot-shifted', rejected: true});
  }
  const file = 'projects/ngx-material-legacy/legacy-slider/slider.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['duplicate-import', text + "\nimport {Optional as Duplicate} from '@angular/core';\n", /missing\/ambiguous parameter import/],
    ['runtime-alias', text + '\nconst Alias = Optional;\n', /unreviewed parameter alias/],
    ['type-only-runtime', text.replace('  Optional,', '  type Optional,'), /runtime parameter decorator imported type only/],
    ['optional-extra-argument', text.replace('@Optional()', '@Optional(true)'), /historical parameter decorator arity/],
    ['inject-argument-omitted', text.replace('@Inject(LEGACY_ANIMATION_MODE)', '@Inject()'), /historical parameter decorator arity/],
    ['class-decorator-misuse', text + '\n@Optional() class Invalid {}\n', /constructor annotation/],
    ['dynamic-token-expression', text.replace('@Inject(LEGACY_ANIMATION_MODE)', '@Inject({token: LEGACY_ANIMATION_MODE})'), /unreviewed token expression shape/],
  ]) {assert.notEqual(changed, text); await assert.rejects(reviewParameterDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? changed : read(p)}), pattern); mutations.push({id, rejected: true});}
  const alias = text.replace('  Optional,', '  Optional as Maybe,').replaceAll('@Optional()', '@Maybe()'); const aliased = await reviewParameterDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? alias : read(p)}); assert.equal(aliased.cases.find(c => c.file === 'legacy-slider/slider.ts' && c.symbol === 'Optional').local_name, 'Maybe'); report.alias_positive = true;
  const ownedFile = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts', ownedText = read(ownedFile);
  for (const [id, changed] of [
    ['owned-inject-imported-type-only', ownedText.replace('  Inject,', '  type Inject,')],
    ['owned-optional-imported-type-only', ownedText.replace('  Optional,', '  type Optional,')],
    ['owned-panel-optional-omitted', ownedText.replace('@Inject(MAT_MENU_PANEL) @Optional()', '@Inject(MAT_MENU_PANEL)')],
    ['owned-document-token-omitted', ownedText.replace('@Inject(DOCUMENT)', '@Inject()')],
  ]) {
    assert.notEqual(changed, ownedText);
    await assert.rejects(reviewParameterDecoratorUses({root, subjects, skipDiagnostics: true,
      readSource: path => path === ownedFile ? changed : read(path)}));
    mutations.push({id, rejected: true});
  }
  const addedFile='projects/ngx-material-legacy/legacy-table/internal/column-classes.ts',addedText=read(addedFile),bad=addedText.replace('@Optional()', '@Optional(true)');
  assert.notEqual(bad,addedText);await assert.rejects(reviewParameterDecoratorUses({root,subjects,skipDiagnostics:true,readSource:p=>p===addedFile?bad:read(p)}),/historical parameter decorator arity/);mutations.push({id:'new-column-optional-arity',rejected:true});
  const missing=addedText.replace('@Inject(CdkColumnDef)', '@Inject()');assert.notEqual(missing,addedText);await assert.rejects(reviewParameterDecoratorUses({root,subjects,skipDiagnostics:true,readSource:p=>p===addedFile?missing:read(p)}),/historical parameter decorator arity/);mutations.push({id:'new-column-inject-missing-token',rejected:true});
  report.mutations = mutations; assert.equal(mutations.length, 25);
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 89, current_uses: 116, current_delta_uses: 27, references: 215, annotation_shapes_per_subject: 213, factory_metadata_objects: 2, unused_imports: 5, subjects: 3, controls_per_subject: 15, mutations: mutations.length, compiler: report.type_compilation.compiler, native_host_boundary_executed: false}));
} finally {subjects.dispose();}
