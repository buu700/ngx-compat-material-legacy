# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Record read original hunks and explicit remaining scope,never admit a decision."""
from pathlib import Path
import json,gzip,hashlib
r=Path.cwd();prefix='compatibility/rc/21x-base-class-removal-source-';original=json.loads(gzip.decompress((r/(prefix+'originals.json.gz')).read_bytes()));notes={
'src/material/autocomplete/autocomplete-origin.ts':[
'Removes the shared origin base and its ElementRef constructor. The retained legacy origin still has its own historical base; a current concrete-class refolding is not a reason to remove that owned constructor contract.',
'Moves the same ElementRef parameter property into the ordinary current origin. Validate the actual owned origin signature and prior constructor evidence before any family-level conclusion;no new legacy API change is proposed.'],
'src/material/autocomplete/autocomplete-trigger.ts':[
'Replaces shared option/panel/origin base imports with ordinary current Material classes. Legacy-owned option,panel and origin types are distinct and must not be narrowed merely to follow these names.',
'Moves the MDC directive host,ARIA-controls and current value-accessor metadata onto the merged trigger. The retained trigger uses the tagged mat-autocomplete-trigger class,aria-owns and its own legacy value-accessor token. Existing event typing casts require their prior source context;they do not justify changing host structure.',
'Narrowing the pending-autoselection field to MatOption is a current class identity change. Preserve the retained generic legacy option relationship;this is not a new selection-state algorithm.',
'Narrowing the autocomplete input to current MatAutocomplete would exclude the retained legacy panel/query contract. The existing owned trigger base remains the relevant boundary.',
'Narrowing connectedTo to current MatAutocompleteOrigin changes the accepted type boundary. The owned historical origin and its construction contract require separate comparison,not a name-only substitution.',
'Changes the overridable above-panel class to a private hardcoded MDC class. The retained trigger has mat-autocomplete-panel-above;adopting this line would violate the historical selector/style contract.',
'Changes the activeOption return type to current MatOption. Do not infer legacy option or harness interchangeability from the unchanged method body.',
'Changes the clear-previous-selection helper argument to current MatOption. Retained legacy option identity and selection events stay in scope;no new runtime selection fix is shown by this hunk alone.',
'Deletes the old thin current trigger wrapper after relocating its decorator and class constant. The owned legacy wrapper remains needed for its different host metadata and above-panel class.'],
'src/material/autocomplete/autocomplete.ts':[
'Removes Directive from the ordinary component import after the shared base is removed. This does not remove the owned historical directive/base boundary.',
'Removes shared option/optgroup base types from imports. The retained panel still queries MatLegacyOption and the distinct legacy group token;new current class types are not interchangeable by spelling.',
'Changes selected/activated event source and option types to current concrete classes. Preserve the retained event/type boundary;complete signature compatibility is not established by this original-source observation.',
'Folds current Component metadata into the old base and makes visible/hidden classes private MDC constants,creates an animation emitter,and narrows its key manager. The actual legacy panel retains tagged classes and a null animation stream;this hunk cannot be copied wholesale.',
'Moves concrete current ContentChildren queries into the merged class. The retained panel uses MatLegacyOption and MAT_LEGACY_OPTGROUP;query token identity and legacy coexistence matter.',
'Moves current-only hide-single-selection-indicator inputs and option change-detector propagation into the merged body. This is relocation from the existing current subclass,not authorization to add modern inputs to the legacy API.',
'Changes the key-manager generic type from the shared base to current MatOption. Keep the owned legacy option model and its separately reviewed public key-manager use.',
'Moves animation-emitter completion into the merged ngOnDestroy. The legacy panel explicitly has _animationDone=null;copying unconditional completion would be invalid. Lifecycle evidence remains required for any proposed motion change.',
'Narrowing _emitSelectEvent to current MatOption affects the public event/type boundary. Retain the legacy event source and option relationship pending complete contract review.',
'Deletes the generic disabled-option skip predicate and the old current wrapper after moving metadata,queries,indicator inputs and destruction. The legacy base still skips disabled options,so this is a substantive applicability boundary rather than a harmless class rename.',
'Keeps the current concrete skip predicate returning false while dropping its unused argument. That concrete current behavior differs from the retained historical legacy default;do not adopt it by inheritance or a type rename.'],
'src/material/autocomplete/testing/autocomplete-harness.ts':[
'Removes BaseHarnessFilters after eliminating generic harness parameters. The owned legacy harness still needs generic legacy option and group/filter contracts.',
'Folds the current harness into ComponentHarness with hardcoded MDC host/prefix and current option/group harness classes. The owned legacy harness retains mat and MatLegacyOptionHarness/MatLegacyOptgroupHarness.',
'Narrows getOptions/getOptionGroups and their locators to current harness classes. Preserve the legacy concrete return/filter boundary;this does not prove current and legacy harness behavior equal.',
'Changes selectOption filter type to current OptionHarnessFilters. The retained legacy generic/filter type must remain aligned with its own option harness.',
'Replaces the generic visible-class prefix with mat-mdc-autocomplete-visible. The retained panel and harness use mat-autocomplete-visible;copying would break legacy detection.',
'Removes generic and current wrapper panel-selector methods while retaining aria-controls for current Material. Tagged legacy and actual owned code use aria-owns,which is a required lookup distinction.'],
'src/material/core/option/optgroup.ts':[
'Removes the ordinary Directive import after base/component collapse. The retained legacy option group still has a locally owned historical base.',
'Deletes the shared label,ID,inert-state and optional-parent constructor body from its old location. The owned base retains those responsibilities;its previously qualified legacy ID namespace is a separate existing change,not part of this upstream adoption.',
'Moves those same fields and constructor into the current component/mixin. Retain the legacy host classes and distinct provider/token boundary rather than replacing the owned group with current MatOptgroup.'],
'src/material/core/option/option.ts':[
'Removes the shared Directive import. This is ordinary current class consolidation,not a request to remove the legacy owned base.',
'Replaces shared optgroup type import with current MatOptgroup. Retained legacy group identity and local token forwarding remain relevant.',
'Narrows option-selection source type and merges the current MDC Component metadata into the old base. The actual legacy host/classes/template and event source must remain historical;no modern option markup is adopted.',
'Moves optional injected parent/group parameters into the merged current constructor and makes group mutable/current-typed. The legacy wrapper still forwards explicit historical arguments and local tokens;constructor/provider/signature proof remains separate.',
'Deletes the thin current MatOption wrapper and its super forwarding after consolidation. This does not justify deleting the owned legacy wrapper or changing its historical constructor forwarding.'],
 'tools/public_api_guard/material/autocomplete-testing.md':[
'The original generated API records loss of the generic base and current-only concrete option/group/filter returns and protected selector surface. This is evidence of a current contract change,not an expectation to regenerate a legacy golden or narrow legacy harness types.'],
 'tools/public_api_guard/material/autocomplete.md':[
'Removes shared option/group type imports from the current generated declaration. Legacy type identities remain independently owned.',
'Replaces the current subclass plus exported base with one concrete class and non-null animation emitter. Constructor and inheritance contracts must be assessed against the untouched legacy declaration;name accounting alone is insufficient.',
'Records current option types,hide-indicator accessors and concrete query properties while removing protected class-extension points. Those changes are not a legacy API target.',
'Records zero-argument current skip predicate and folded Ivy Component/factory metadata. Do not treat generated metadata relocation as proof of legacy factory or query-scope identity.',
'Records origin constructor relocation,event-source type narrowing and trigger/base collapse. Retained legacy constructors/events stay in scope;this reference does not grant API/runtime acceptance.',
'Records current trigger Ivy directive/factory metadata after moving inherited inputs to the concrete class. Actual owned metadata and both minimums still require their proper evidence;no candidate golden is changed.'],
 'tools/public_api_guard/material/core.md':[
'Records optgroup base removal and merged label/input/factory metadata. The optional parent and provider identities need legacy-specific review;the current concrete declaration is not a replacement golden.',
'Records option/base collapse and group changing from readonly shared-base type to mutable current MatOptgroup. This is an explicit TS contract distinction even where runtime bodies are moved.',
'Records merged current option Ivy Component and optional constructor-factory metadata. Full owned legacy AOT/construction identity is not proved by this generated current declaration.',
'Records current MatOptionSelectionChange source narrowing. Preserve the legacy-owned option/event relationship and assess signatures separately.'],
}
selected=[]
for section in original['sections']:
 if section['path']not in notes:continue
 decisions=notes[section['path']];assert len(decisions)==len(section['hunks']),(section['path'],len(decisions),len(section['hunks']))
 selected.append({'path':section['path'],'patch_sha256':section['patch_sha256'],'status':'original-hunks-read;owned/minimum/family validation incomplete','hunks':[{'index':h['index'],'header':h['header'],'sha256':h['sha256'],'initial_technical_review':n,'final_applicability_qualified':False}for h,n in zip(section['hunks'],decisions)]})
assert len(selected)==9 and sum(len(x['hunks'])for x in selected)==47
paths=['projects/ngx-material-legacy/legacy-autocomplete/autocomplete.ts','projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts','projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-base.ts','projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts','projects/ngx-material-legacy/legacy-autocomplete/testing/autocomplete-harness.ts','projects/ngx-material-legacy/legacy-autocomplete/testing/autocomplete-harness-base.ts','projects/ngx-material-legacy/legacy-core/option/option.ts','projects/ngx-material-legacy/legacy-core/option/optgroup.ts','projects/ngx-material-legacy/legacy-core/option/optgroup-base.ts']
refs=[]
for path in paths:
 raw=(r/path).read_bytes();refs.append({'path':path,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'read_scope':'Relevant classes,queries,host metadata,harness bindings and selected base members;not a full-family/API/native qualification.'})
packet={'schema_version':1,'line':'21.x','sha':original['sha'],'status':'in-progress:complete original data authenticated;first9members47hunks read;substantive whole-SHA review incomplete','complete_original_files':72,'complete_original_hunks':329,'original_members_read':9,'original_hunks_read':47,'original_members_remaining':63,'original_hunks_remaining':282,'initial_member_reviews':selected,'current_source_leads':refs,'remaining_original_members':[{'path':s['path'],'hunks':len(s['hunks']),'patch_sha256':s['patch_sha256']}for s in original['sections']if s['path']not in notes],'tagged_alias_followup':'There is no tagged legacy-snack-bar/snack-bar-ref.ts. Resolve its historical public-barrel alias using authenticated supplemental tagged sources before assessing the snack-bar ref hunk.','maintenance_leads':[{'path':'projects/ngx-material-legacy/legacy-autocomplete/testing/autocomplete-harness-base.ts','observation':'Existing header lacks the Ryan2026notice and describes removal at22although this original removal is17-era. This is a later bounded license/comment maintenance lead;no file was changed in this source-only step.'}],'substantive_whole_SHA_review_complete':False,'current_owned_family_or_minimum_contract_qualified':False,'proposed_final_disposition':None,'canonical_dispositions_changed':0,'source_admissions_changed':0,'product_changes':0,'cyph_modified':False,'consumer_build_executed':False,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
p=r/(prefix+'review-progress.json');assert not p.exists();p.write_text(json.dumps(packet,indent=2)+'\n');print(json.dumps({'original_members_read':9,'hunks_read':47,'remaining_files':63,'remaining_hunks':282,'whole_SHA_review_complete':False}))
