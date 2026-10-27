/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete original/source inspection. This never grants native admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
import {historicalBehaviorRequirements} from './upstream-historical-behavior-evidence.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const ts=createRequire(import.meta.url)('typescript');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const objectHash=(kind,text)=>createHash('sha1').update(kind+' '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
const ref=path=>({path,sha256:hash(read(path)),bytes:read(path).length});
const sha='008212a9807fd01fd32fe136a075763b7b2c854d';
const originals='compatibility/rc/autocomplete-landscape-current-originals.json.gz';
const diagnostic='compatibility/rc/autocomplete-landscape-current-diagnostics.json.gz';
const base='projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts';
const spec='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts';
const proposedNames=[
 'MatAutocomplete > Fallback positions > should fit an above-position panel inside the handset landscape viewport',
 'MatAutocomplete > Fallback positions > should reset landscape configuration and unsubscribe without destroying the observer',
 'MatAutocomplete > Fallback positions > should reuse one handset subscription across panel close and reopen',
 'MatAutocomplete > Fallback positions > should allow the panel to expand when the number of results increases',
 'MatAutocomplete > Fallback positions > should fall back to above position when requested if options are added while the panel is open',
];
const judgments=[
 'The import adds public BreakpointObserver/Breakpoints from @angular/cdk/layout. Both actual advertised CDK minima retain the public entry point. The owned source uses that public service for one fixed HandsetLandscape query, without a modern component or private upstream import.',
 'The original injected observer and Subscription.EMPTY field introduce per-trigger observation. The owned trigger preserves the historical eleven-argument constructor and obtains the service from the supplied public ViewContainerRef.injector instead of requiring ambient inject(). The diagnostic excludes constructor and view execution; those remain separate obligations.',
 'The added destruction call releases the trigger-owned landscape subscription. It does not complete the borrowed observer stream. Current complete prototype teardown is exercised with a real owned initialization Subject in the synthetic fixture; no production method or lifecycle assertion was changed to cure the stale fixture.',
 'The complete new-overlay branch observes one HandsetLandscape stream before attachment. Landscape enables flexible dimensions/growth with margin8; portrait resets all three settings. The existing closing/reopening path reuses the overlay and one subscription. Seven source-protocol/lifetime cases per retained minimum and all six original corruptions are required; they do not measure viewport geometry.',
 'This hunk adds only a default-position comment. The owned initial strategy still uses flexibleDimensions(false) and push(false), then the breakpoint callback controls landscape-specific settings. No selector, theme, consumer map or stylesheet change follows from this comment.',
 'The sole upstream spec hunk changes75px to100px in an MDC form-field positioning test. Preserve the untouched legacy75px assertion and its mat-form-field-flex selector. The three already-added local landscape regressions, legacy grow/reopen case and original75px fallback case remain distinct required native observations; none ran in this source inspection.',
];

export function inspectAutocompleteLandscapeSource(){
 assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
 assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
 const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const originalRaw=read(originals);assert.equal(hash(originalRaw),'ed5f7e096b8abce0c2f95366d19ab7c1671e98a790a1e69bd03add1add299e9f');
 const original=JSON.parse(gunzipSync(originalRaw));assert.equal(original.sha,sha);assert.equal(objectHash('commit',original.raw_commit),sha);
 assert.equal(original.upstream_code_executed,false);assert.equal(hash(original.diff),'6aef092d6a8579b310fbf94242da1a1adf3125f3934ba5d7649d56f49290855b');
 assert.deepEqual(original.members.map(m=>m.path),['src/material/autocomplete/autocomplete-trigger.ts','src/material/autocomplete/autocomplete.spec.ts']);
 for(const member of original.members)for(const side of ['before','after']){
  const value=member[side];assert.equal(objectHash('blob',value.text),value.git_blob);assert.equal(hash(value.text),value.sha256);assert.equal(Buffer.byteLength(value.text),value.bytes);
 }
 const hunks=[];
 for(const chunk of original.diff.split(/^diff --git /m).slice(1)){
  const lines=chunk.split(/(?<=\n)/),path=lines[0].trim().split(' b/')[1],starts=lines.flatMap((text,index)=>text.startsWith('@@')?[index]:[]);
  for(const [index,start]of starts.entries())hunks.push({path,header:lines[start].trim(),hunk_sha256:hash(lines.slice(start,starts[index+1]??lines.length).join('')),decision:judgments[hunks.length]});
 }
 assert.equal(hunks.length,6);assert.ok(hunks.every(h=>h.decision?.length>120));
 const source=ts.createSourceFile(base,read(base).toString(),ts.ScriptTarget.Latest,true),type=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatAutocompleteTriggerBase');assert.ok(type);
 const ctor=type.members.find(ts.isConstructorDeclaration);assert.equal(ctor.parameters.length,11);
 assert.ok(ctor.getText(source).includes('this._viewContainerRef.injector.get(BreakpointObserver)'));
 const field=type.members.find(n=>n.name?.getText(source)==='_initialized');assert.equal(field.initializer.getText(source),'new Subject<void>()');
 const diag=JSON.parse(gunzipSync(read(diagnostic)));assert.equal(diag.line,line);assert.equal(diag.g11_claim,'not-passed');assert.equal(diag.source.sha256,hash(read(base)));
 assert.equal(diag.node,process.version);assert.equal(diag.typescript,ts.version);assert.equal(diag.floors.length,2);assert.equal(diag.mutants.length,6);
 for(const floor of diag.floors){assert.equal(floor.cases.length,7);assert.ok(floor.cases.every(c=>c.result==='pass'));}
 assert.ok(diag.mutants.every(m=>m.result==='rejected'&&m.failed_case_ids.length));
 const caps=JSON.parse(read('compatibility/rc/autocomplete-landscape-cdk-sources/identities.json')),cap=caps.find(c=>c.line===line);assert.ok(cap);
 const peer=realpathSync(join(root,'node_modules/@angular/cdk')),manifest=JSON.parse(readFileSync(join(peer,'package.json')));
 const product=JSON.parse(read('projects/ngx-material-legacy/package.json'));assert.equal(product.peerDependencies['@angular/cdk'],'^'+cap.version);assert.equal(manifest.version,cap.version);
 for(const member of cap.members){const retained=read(member.retained.path);assert.equal(hash(retained),member.retained.sha256);
  const bytes=gunzipSync(retained);assert.equal(hash(bytes),member.member_sha256);
  assert.equal(hash(readFileSync(join(peer,member.archive_member.replace(/^package\//,'')))),member.member_sha256,'installed minimum source differs');}
 const roster=deriveHistoricalRoster(root),matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json'));
 const groups=matrix.checks.find(row=>row.check_id==='historical-legacy-artifact').acceptance.cases_by_line[line];
 assert.ok(Object.values(groups).every(Array.isArray));const ids=Object.values(groups).flat();assert.equal(ids.length,2236);
 const cases=proposedNames.map(name=>{const matches=roster.cases.filter(c=>c.full_name===name&&c.candidate===spec);assert.equal(matches.length,1);const row=matches[0];assert.ok(ids.includes(row.case_id));return {case_id:row.case_id,index:row.index,full_name:row.full_name,historical_path:row.historical_path,candidate:row.candidate};});
 assert.deepEqual(cases.slice(0,4).map(c=>c.index),[105,106,107,108]);
 assert.equal(historicalBehaviorRequirements(sha),null,'the recorded missing registration has changed; review this source worksheet');
 const specText=read(spec).toString();assert.ok(specText.includes("inputReference.style.bottom = '75px';"));
 return {schema_version:1,line,sha,status:'source-review-complete-native-admission-unfinished',
  role:'Current whole-patch compatibility review and explicit native binding gap; no terminal admission',
  upstream_originals:ref(originals),complete_original_hunk_reviews:hunks,original_files:2,original_hunks:6,
  current_sources:[base,'projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts',spec,
   'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.html','projects/ngx-material-legacy/legacy-autocomplete/autocomplete.scss'].map(ref),
  current_constructor_parameter_count:11,current_public_view_injector_observer_lookup:true,
  diagnostic:ref(diagnostic),diagnostic_producer:ref('tests/autocomplete_landscape_probe.mjs'),
  private_node:process.version,private_typescript:ts.version,diagnostic_cases_per_retained_minimum:7,diagnostic_mutants_rejected:6,
  actual_advertised_CDK_minimum:cap.version,actual_minimum_retained_members_matched:cap.members.length,
  proposed_named_native_requirements:cases,complete_historical_matrix_count:2236,
  native_contract_registered:false,actual_Angular_view_or_geometry_or_native_or_packed_or_floor_executed:false,
  proposed_source_judgment:'already-adapted, subject to the registered complete same-run packed/historical native contract and separate floor qualification',
  original_legacy75px_assertion_changed:false,consumer_TS_HTML_CSS_SCSS_changes_required:false,
  canonical_SHA_dispositions_changed:0,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,4);assert.equal(process.argv[2],'--out');
 const result=inspectAutocompleteLandscapeSource();writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({line:result.line,original_files:result.original_files,original_hunks:result.original_hunks,
  actual_minimum:result.actual_advertised_CDK_minimum,native_requirements:result.proposed_named_native_requirements.length,native_executed:false}));
}
