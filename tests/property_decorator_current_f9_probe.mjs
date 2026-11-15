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
import {exercisePropertyDecorators, propertyDecoratorSubjects, reviewPropertyDecoratorUses} from '../scripts/property-decorator-current-5628.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(join(root, p), 'utf8'), options = {};
const args = process.argv.slice(2); for (let i = 0; i < args.length; i += 2) {assert.ok(['--report', '--compiler-root'].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1];}
const subjects = await propertyDecoratorSubjects(root);
try {
  const report = await reviewPropertyDecoratorUses({root, subjects, compilerRoot: options['--compiler-root'] ?? process.env.CLOSEOUT_TYPESCRIPT_ROOT});
  assert.equal(report.frozen_uses, 99); assert.equal(report.current_uses, 104); assert.equal(report.source_override_used, false); assert.equal(report.current_delta_uses, 5);
  assert.equal(report.cases.flatMap(c => c.references).length, 324); assert.equal(report.cases.filter(c => c.unused_import_erasure).length, 9); assert.deepEqual(report.authored_annotations.map(c => c.annotation_count), [324, 324, 324]); assert.deepEqual(report.behaviors.map(c => c.cases.length), [14, 14, 14]);

  // Compare every original role, not only census totals. The removed panel
  // annotation is retained as an obligation elsewhere; it is not a pass here.
  const prior = JSON.parse(read('compatibility/rc/historical-menu-property-requalification-diagnostic.json'));
  const key = c => JSON.stringify([c.file, c.module, c.symbol]);
  const normalize = c => c.references.map(({line, ...rest}) => JSON.stringify(rest)).sort();
  const changes = [];
  for (const old of prior.cases) {
    const matches = report.cases.filter(row => key(row) === key(old));
    assert.equal(matches.length, 1, 'prior use disappeared or duplicated');
    const before = normalize(old), after = normalize(matches[0]);
    if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({file:old.file,symbol:old.symbol,before:before.filter(x=>!after.includes(x)),after:after.filter(x=>!before.includes(x))});
  }
  assert.deepEqual(changes, [{file:'legacy-tabs/internal/tab-nav-bar-base.ts',symbol:'Input',
    before:[JSON.stringify({expression:'Input()',target_class:'MatTabNavPanel',member:'id',member_kind:'PropertyDeclaration',argument_shapes:[]})],after:[]},
    {file:'legacy-core/pseudo-checkbox/pseudo-checkbox.ts',symbol:'Input',
      before:[JSON.stringify({expression:'Input({transform: booleanAttribute})',target_class:'MatLegacyPseudoCheckbox',member:'disabled',member_kind:'PropertyDeclaration',argument_shapes:['ObjectLiteralExpression']})],
      after:[JSON.stringify({expression:'Input()',target_class:'MatLegacyPseudoCheckbox',member:'disabled',member_kind:'PropertyDeclaration',argument_shapes:[]})]}]);
  const additions=report.cases.filter(c=>!prior.cases.some(old=>key(old)===key(c)));
  assert.deepEqual(additions.map(c=>c.file+'#'+c.symbol).sort(),['legacy-paginator/internal/page-size-options.ts#Input','legacy-paginator/paginator.ts#ViewChild']);
  assert.deepEqual(additions.map(c=>({file:c.file,symbol:c.symbol,refs:normalize(c)})).sort((a,b)=>a.file.localeCompare(b.file)),[
    {file:'legacy-paginator/internal/page-size-options.ts',symbol:'Input',refs:[JSON.stringify({expression:"Input('matLegacyPaginatorOptions')",target_class:'_MatLegacyPaginatorOptions',member:'values',member_kind:'PropertyDeclaration',argument_shapes:['StringLiteral']})]},
    {file:'legacy-paginator/paginator.ts',symbol:'ViewChild',refs:[JSON.stringify({expression:'ViewChild(MatLegacySelect)',target_class:'MatLegacyPaginator',member:'_pageSizeSelect',member_kind:'PropertyDeclaration',argument_shapes:['Identifier']}),JSON.stringify({expression:'ViewChild(MatLegacySelect, {read: ElementRef})',target_class:'MatLegacyPaginator',member:'_pageSizeSelectElement',member_kind:'PropertyDeclaration',argument_shapes:['Identifier','ObjectLiteralExpression']})].sort()},
  ]);
  report.prior_roles_reconciled = true;
  for (const subject of report.authored_annotations) {
    assert.equal(subject.annotation_count, subject.annotations.length);
    assert.deepEqual(subject.annotations.filter(row => row.file === 'legacy-menu/internal/menu-item-base.ts'),
      [{file: 'legacy-menu/internal/menu-item-base.ts', target_class: '_LegacyMenuItemBase', member: 'role',
        symbol: 'Input', metadata_name_and_registration_verified: true, selector_read_are_protocol: false}]);
  }
  const mutations = [];
  for (const model of subjects.models.filter(m => m.subject.line !== 'original')) {
    const core = model.runtime;
    for (const [id, api] of [
      ['input-alias-corrupted', {...core, Input: class extends core.Input {constructor(arg) {super(arg); this.alias = 'corrupted';}}}],
      ['output-replaced-with-input', {...core, Output: core.Input}],
      ['viewChild-replaced-with-contentChild', {...core, ViewChild: core.ContentChild}],
      ['contentChild-replaced-with-contentChildren', {...core, ContentChild: core.ContentChildren}],
      ['contentChildren-replaced-with-contentChild', {...core, ContentChildren: core.ContentChild}],
      ['input-transform-eager', {...core, Input: class extends core.Input {constructor(arg) {super(arg); arg?.transform?.('eager');}}}],
    ]) {assert.throws(() => exercisePropertyDecorators(core, api), assert.AssertionError); mutations.push({id: model.subject.line + ':' + id, rejected: true});}
    const Base = core.Input;
    function Renamed(...args) {if (new.target) return Reflect.construct(Base, args, new.target); const annotation = Base(...args); return (target, key) => annotation(target, key + 'Changed');}
    Renamed.prototype = Base.prototype;
    assert.throws(() => exercisePropertyDecorators(core, {...core, Input: Renamed}), assert.AssertionError); mutations.push({id: model.subject.line + ':property-registration-renamed', rejected: true});
  }
  const file = 'projects/ngx-material-legacy/legacy-slider/slider.ts', text = read(file);
  for (const [id, changed, pattern] of [
    ['duplicate-import', text + "\nimport {Input as Duplicate} from '@angular/core';\n", /missing\/ambiguous property import/],
    ['runtime-alias', text + '\nconst Alias = Input;\n', /unreviewed property alias/],
    ['type-only-runtime', text.replace('  Input,', '  type Input,'), /runtime property decorator imported type only/],
    ['input-argument-count', text.replace('@Input()', "@Input('alias', true)"), /property decorator argument count/],
    ['class-decorator-misuse', text + '\n@Input() class Invalid {}\n', /unreviewed property target/],
    ['unreviewed-input-field', text.replace('@Input()', '@Input({isSignal:true})'), /unreviewed input option/],
  ]) {assert.notEqual(changed, text); await assert.rejects(reviewPropertyDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? changed : read(p)}), pattern); mutations.push({id, rejected: true});}
  const queryFile = 'projects/ngx-material-legacy/legacy-tabs/tab-group.ts', queryText = read(queryFile), deprecated = queryText.replace('{descendants: true}', '{descendants: true, emitDistinctChangesOnly:false}'); assert.notEqual(deprecated, queryText); await assert.rejects(reviewPropertyDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === queryFile ? deprecated : read(p)}), /deprecated query option is not admitted/); mutations.push({id: 'deprecated-query-option', rejected: true});
  const alias = text.replace('  Input,', '  Input as Bind,').replaceAll('@Input(', '@Bind('); const aliased = await reviewPropertyDecoratorUses({root, subjects, skipDiagnostics: true, readSource: p => p === file ? alias : read(p)}); assert.equal(aliased.cases.find(c => c.file === 'legacy-slider/slider.ts' && c.symbol === 'Input').local_name, 'Bind'); report.alias_positive = true;
  const ownedFile = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts', ownedText = read(ownedFile);
  for (const [id, changed] of [
    ['owned-input-imported-type-only', ownedText.replace('  Input,', '  type Input,')],
    ['owned-role-input-omitted', ownedText.replace('@Input() role:', 'role:')],
  ]) {
    assert.notEqual(changed, ownedText);
    await assert.rejects(reviewPropertyDecoratorUses({root, subjects, skipDiagnostics: true,
      readSource: path => path === ownedFile ? changed : read(path)}));
    mutations.push({id, rejected: true});
  }
  const addedPath='projects/ngx-material-legacy/legacy-paginator/paginator.ts',addedText=read(addedPath);
  const badQuery=addedText.replace('{read: ElementRef}', '{read: ElementRef, emitDistinctChangesOnly: false}');
  assert.notEqual(badQuery,addedText); await assert.rejects(reviewPropertyDecoratorUses({root,subjects,skipDiagnostics:true,readSource:p=>p===addedPath?badQuery:read(p)}),/deprecated query option is not admitted/); mutations.push({id:'new-query-deprecated-option',rejected:true});
  const oldPanel='projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts', panelText=read(oldPanel),extraPanel=panelText+'\nclass MatTabNavPanel { @Input() id: string; }\n';
  await assert.rejects(reviewPropertyDecoratorUses({root,subjects,skipDiagnostics:true,readSource:p=>p===oldPanel?extraPanel:read(p)}),/325 !== 324/);mutations.push({id:'retired-panel-annotation-returned',rejected:true});
  const pseudo='projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts',pseudoText=read(pseudo);
  const restored=pseudoText.replace('  Input,','  Input,\n  booleanAttribute,').replace('@Input() disabled: boolean = false;', '@Input({transform: booleanAttribute}) disabled: boolean = false;');
  assert.notEqual(restored,pseudoText);const changed=await reviewPropertyDecoratorUses({root,subjects,skipDiagnostics:true,readSource:p=>p===pseudo?restored:read(p)});
  const own=report.cases.find(c=>c.file===pseudo.slice('projects/ngx-material-legacy/'.length)&&c.symbol==='Input');
  const reverted=changed.cases.find(c=>c.file===own.file&&c.symbol===own.symbol);
  assert.notDeepEqual(normalize(own),normalize(reverted));assert.ok(normalize(reverted).some(x=>x.includes('booleanAttribute')));mutations.push({id:'pseudo-disabled-transform-reintroduced',rejected:true});
  report.mutations = mutations; assert.equal(mutations.length, 26);
  if (options['--report']) {assert.equal(existsSync(options['--report']), false); writeFileSync(options['--report'], JSON.stringify(report, null, 2) + '\n');}
  console.log(JSON.stringify({line: report.line, frozen_uses: 99, current_uses: 104, current_delta_uses: 5, references: 324, annotation_shapes_per_subject: 324, unused_imports: 9, subjects: 3, controls_per_subject: 14, mutations: mutations.length, compiler: report.type_compilation.compiler, native_executed: false}));
} finally {subjects.dispose();}
