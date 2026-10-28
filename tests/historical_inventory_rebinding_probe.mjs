/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source-only rechecks of existing changes; no current native execution claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectHarnessPreparation} from '../scripts/harness-animation-preparation-evidence.mjs';
import {autocompleteSelectionSpecSubject} from '../scripts/autocomplete-selection-spec-subject.mjs';
import {deriveHistoricalRoster} from '../scripts/historical-case-roster.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),ts=createRequire(import.meta.url)('typescript');
assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
const harness=inspectHarnessPreparation(read),spec=autocompleteSelectionSpecSubject({root,read,line});
assert.equal(harness.files,12);assert.equal(harness.configurations,13);
assert.equal(harness.case_callbacks_unchanged,165);assert.equal(harness.fixture_classes_unchanged,15);
assert.equal(harness.dialog_optional_provider_forwarding_and_priority_preserved,true);
const first={main:'4221697247dc7e06478a9397d9b31b6c5253e9ff','21.x':'2db51eee7acadc90585fcda197c99bc505ba9f15'}[line];
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const old=execFileSync('git',['--no-replace-objects','show',first+'^:'+spec.path],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(hash(old),'9fa9e54e3f7cc9ee9a7a7b236e3b14e28ee1b824312b026361c51fbcb912e1d9');
const middle=execFileSync('git',['--no-replace-objects','show',first+':'+spec.path],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(hash(middle),'09a96761ccbb96309989dfc13517170c3600fb2bd57b3fb7e9c9cb02f788d423');
assert.ok(middle.equals(spec.original_source),'two autocomplete transitions are not contiguous');
const parse=raw=>{const sf=ts.createSourceFile('source.ts',raw.toString(),ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);return sf;};
const collect=(root,predicate)=>{const items=[];function walk(n){if(predicate(n))items.push(n);ts.forEachChild(n,walk);}walk(root);return items;};
const cases=file=>collect(file,n=>ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&['it','fit','xit'].includes(n.expression.text));
const before=parse(old),after=parse(middle),current=parse(read(spec.path));
const beforeCases=cases(before),afterCases=cases(after),currentCases=cases(current);
assert.equal(beforeCases.length,173);assert.equal(afterCases.length,173);assert.equal(currentCases.length,173);
const names=(rows,file)=>rows.map(n=>n.arguments[0].getText(file));
assert.deepEqual(names(beforeCases,before),names(afterCases,after));assert.deepEqual(names(afterCases,after),names(currentCases,current));
const target='should not throw errors when closing without options';
const index=beforeCases.findIndex(n=>n.arguments[0].text===target);assert.ok(index>=0);
for(let i=0;i<beforeCases.length;i++)if(i!==index)assert.equal(beforeCases[i].getText(before),afterCases[i].getText(after));
const a=beforeCases[index],b=afterCases[index];
assert.equal(before.text.slice(0,a.getStart(before)),after.text.slice(0,b.getStart(after)));
assert.equal(before.text.slice(a.end),after.text.slice(b.end));
const assertions=(node,file)=>collect(node,n=>ts.isCallExpression(n)&&n.expression.getText(file).startsWith('expect(')).map(n=>n.getText(file));
const oldAssertions=assertions(a,before),newAssertions=assertions(b,after);assert.equal(oldAssertions.length,2);
for(const text of oldAssertions)assert.ok(newAssertions.includes(text),'original empty-options assertion removed');
const templates=file=>collect(file,n=>ts.isPropertyAssignment(n)&&['template','styles','styleUrls'].includes(n.name.getText(file))).map(n=>n.getText(file));
assert.deepEqual(templates(before),templates(after));assert.deepEqual(templates(after),templates(current));
const roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length,2231);assert.equal(roster.paths.length,57);assert.equal(roster.discovery_negative_ids.length,5);
const callbacks=collect(current,n=>ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&['it','fit','xit'].includes(n.expression.text));
assert.equal(callbacks.length,173);assert.equal(spec.packet.insertions.length,5);spec.assertCurrent();
console.log(JSON.stringify({schema_version:1,line,node:process.version,typescript:ts.version,
 shim_files:12,shim_configurations:13,shim_case_callbacks_preserved:165,shim_fixture_classes_preserved:15,
 historical_reference_tag:harness.historical_origin.tag,tagged_reference_members:harness.historical_origin.facts.length,
 autocomplete_cases_preserved:173,empty_selection_existing_assertions_preserved:2,
 empty_selection_other_cases_byte_preserved:172,autocomplete_additive_insertions:5,
 autocomplete_fixture_template_properties_preserved:templates(current).length,
 global_case_ids:2231,complete_case_cells_with_discovery_controls:2236,global_case_ids_sha256:hash(JSON.stringify(roster.ids)),historical_paths:57,discovery_controls:5,
 actual_Angular_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}));
