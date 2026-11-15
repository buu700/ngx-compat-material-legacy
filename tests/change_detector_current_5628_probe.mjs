/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewChangeDetectorUses, scanChangeDetectorUses} from '../scripts/change-detector-current-5628.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const report = reviewChangeDetectorUses({root, compilerRoot: process.env.CLOSEOUT_TYPESCRIPT_ROOT, runtimeMutations: true});
// Reconcile every prior public import role and method call, preserving multiplicity.
const prior=JSON.parse(read('compatibility/rc/owned-menu-item-detector-requalification.json'));
const normRef=({line,...rest})=>JSON.stringify(rest);
for(const old of prior.cases){const matches=report.cases.filter(c=>c.file===old.file);assert.equal(matches.length,1);const before=old.references.map(normRef).sort(),after=matches[0].references.map(normRef).sort();if(old.file==='legacy-tabs/internal/tab-body-base.ts') {assert.deepEqual(after.filter(x=>!before.includes(x)),[JSON.stringify({role:'type:PropertyDeclaration',context:'private readonly _changeDetectorRef: ChangeDetectorRef;'})]);assert.ok(before.every(x=>after.includes(x)));} else assert.deepEqual(after,before);}
const callKey=({line,source_sha256,receiver_declarations,...rest})=>JSON.stringify({...rest,receiver_declarations:receiver_declarations.map(({line,...r})=>r)});
const count=x=>{const m=new Map;for(const item of x.calls){const k=callKey(item);m.set(k,(m.get(k)||0)+1);}return m;};
const before=count(prior),after=count(report),changes=[];for(const k of new Set([...before.keys(),...after.keys()])){const a=before.get(k)||0,b=after.get(k)||0;if(a!==b)changes.push({call:JSON.parse(k),before:a,after:b});}
assert.equal(changes.length,4);assert.deepEqual(changes.map(x=>[x.call.file,x.before,x.after]).sort(),[['legacy-menu/internal/menu-content-base.ts',1,2],['legacy-radio/internal/radio-base.ts',6,7],['legacy-tabs/internal/tab-body-base.ts',0,1],['legacy-tabs/internal/tab-nav-bar-base.ts',1,2]]);
assert.ok(changes.every(x=>x.call.method==='markForCheck'&&x.after===x.before+1));report.prior_roles_and_call_counts_reconciled=true;
const file = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
const trigger = 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts';
const context = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
const mutations = [];
for (const [id, path, transform, pattern] of [
  ['duplicate-import', file, text => text + "\nimport {ChangeDetectorRef as OtherDetector} from '@angular/core';\n", /missing\/ambiguous detector import/],
  ['unreviewed-import-role', file, text => text + '\nconst constructedDetector = new ChangeDetectorRef();\n', /unreviewed detector import role/],
  ['unreviewed-type-context', file, text => text + '\ntype ExtraDetector = ChangeDetectorRef;\n', /unreviewed detector type context/],
  ['removed-or-deprecated-method', file, text => text.replace('this._changeDetectorRef.detectChanges()', 'this._changeDetectorRef.checkNoChanges()'), /unreviewed detector method/],
  ['computed-detector-call', file, text => text.replace('this._changeDetectorRef.detectChanges()', "this._changeDetectorRef['detectChanges']()"), /unreviewed computed detector call/],
  ['extra-call-argument', file, text => text.replace('this._changeDetectorRef.detectChanges()', 'this._changeDetectorRef.detectChanges(true)'), /detector method arguments changed/],
  ['runtime-token-type-only', trigger, text => text.replace('  ChangeDetectorRef,', '  type ChangeDetectorRef,'), /runtime core binding imported type only/],
  ['owned-constructor-token-type-only', context, text => text.replace('  ChangeDetectorRef,', '  type ChangeDetectorRef,'), /runtime core binding imported type only/],
]) {
  const before = read(path), after = transform(before); assert.notEqual(before, after);
  assert.throws(() => scanChangeDetectorUses({root, readSource: name => name === path ? after : read(name)}), pattern);
  mutations.push({id, rejected: true});
}
const alias = read(file).replace('  ChangeDetectorRef,', '  ChangeDetectorRef as BoundDetector,')
  .replace('_changeDetectorRef: ChangeDetectorRef', '_changeDetectorRef: BoundDetector');
assert.equal(scanChangeDetectorUses({root, readSource: name => name === file ? alias : read(name)})
  .cases.find(row => row.file === 'legacy-form-field/form-field.ts').local_name, 'BoundDetector');
const unrelated = read(file) + '\nfunction unrelatedDetector(){const _changeDetectorRef={checkNoChanges(){}};_changeDetectorRef.checkNoChanges();}\n';
assert.equal(scanChangeDetectorUses({root, readSource: name => name === file ? unrelated : read(name)}).calls.length, 100);
const newReceiver='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts', newText=read(newReceiver), badNew=newText.replace('this._changeDetectorRef.markForCheck()', 'this._changeDetectorRef.checkNoChanges()');
assert.notEqual(badNew,newText);assert.throws(()=>scanChangeDetectorUses({root,readSource:p=>p===newReceiver?badNew:read(p)}),/unreviewed detector method/);mutations.push({id:'new-receiver-deprecated-method',rejected:true});
report.source_mutations = mutations; report.alias_positive = true; report.unrelated_same_name_receiver_excluded = true;
assert.equal(report.runtime_mutations.length, 8);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, frozen_uses: 38, current_uses: 42, supplementary_uses: 4,
  import_references: 50, receiver_declarations: 50, bound_calls: 100, mark_calls: 91, detect_calls: 9,
  runtime_subjects: 6, states_per_subject: 7, source_mutations: 9, runtime_mutations: 8,
  compiler: report.type_compilation.compiler, alias_positive: true, unrelated_same_name_receiver_excluded: true,
  actual_legacy_native_or_scheduler_qualified: false}));
