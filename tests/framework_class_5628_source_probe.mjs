/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite class-decorator source/metadata registration only. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {classDecoratorSubjects,reviewClassDecoratorUses} from '../scripts/class-decorator-use-review.mjs';
const files=['legacy-slide-toggle/slide-toggle.ts','legacy-progress-bar/progress-bar.ts','legacy-radio/radio.ts','legacy-checkbox/checkbox.ts','legacy-tabs/tab-header.ts','legacy-tabs/tab-group.ts','legacy-tabs/ink-bar.ts','legacy-button/button.ts','legacy-slider/slider.ts','legacy-progress-spinner/progress-spinner.ts','legacy-tooltip/tooltip.ts','legacy-card/card.ts','legacy-tabs/internal/tab-header-base.ts','legacy-core/pseudo-checkbox/pseudo-checkbox.ts'];
const read=p=>readFileSync(p,'utf8'),prior=JSON.parse(read('compatibility/f10/authored-use-reviews/historical-menu-requalified-class-decorator-boundaries.json'));
const subjects=await classDecoratorSubjects();
try {
  const opts={subjects,population:'current',sourceFiles:files};
  const report=await reviewClassDecoratorUses(opts);
  assert.equal(report.cases.length,17);assert.equal(report.cases.flatMap(c=>c.references).length,30);
  assert.deepEqual(report.behaviors.map(x=>x.cases.length),[13,13,13]);
  assert.deepEqual(report.authored_metadata.map(x=>x.metadata_constructor_count),[30,30,30]);
  const normalized=x=>({local_name:x.local_name,references:x.references.map(({line,...rest})=>rest),unused_import_erasure:x.unused_import_erasure});
  for(const c of report.cases){const matching=prior.reviews.filter(x=>x.file===c.file&&x.module===c.module&&x.symbol===c.symbol);assert.equal(matching.length,1);assert.deepEqual(normalized(c),normalized(matching[0].recorded_case),'class metadata role drift');}
  const path='projects/ngx-material-legacy/legacy-checkbox/checkbox.ts',text=read(path),mutations=[];
  async function reject(id,changed,pattern){assert.notEqual(changed,text);await assert.rejects(reviewClassDecoratorUses({...opts,skipDiagnostics:true,readSource:p=>p===path?changed:read(p)}),pattern);mutations.push(id);}
  await reject('deprecated-option',text.replace('standalone: false,','standalone: false, animations: [],'),/removed\/deprecated\/unreviewed class option/);
  await reject('missing-standalone',text.replace('standalone: false,',''),/historical standalone mode must be explicit/);
  await reject('type-only-decorator',text.replace('  Component,','  type Component,'),/runtime class decorator imported type only/);
  await reject('wrong-decorator-binding',text.replace('@Component(', '@ForeignComponent('),/class metadata role drift|missing selected metadata source|unexpected unused class import|unreviewed|Expected/);
  report.mutations=mutations;report.prior_roles_identical=true;
  report.scope='Only these 17 bindings and class metadata registration; whole current class population, actual compiler pipeline, components, native, packed, floors and G11 are separate.';
  const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify({cases:report.cases.length,references:30,prior_roles_identical:true,mutations,scope:report.scope}));
} finally {subjects.dispose();}
