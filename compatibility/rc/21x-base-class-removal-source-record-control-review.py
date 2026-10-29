# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Append original control/harness reading; final contract assessment stays open."""

import gzip
import hashlib
import json
from pathlib import Path


root = Path.cwd()
prefix = "compatibility/rc/21x-base-class-removal-source-"
original = json.loads(gzip.decompress((root / (prefix + "originals.json.gz")).read_bytes()))
prior = root / (prefix + "review-progress-dialog.json")
report = json.loads(prior.read_bytes())
assert (report["original_members_read"], report["original_hunks_read"]) == (22, 96)

notes = {
    "src/material/form-field/testing/error-harness.ts": [
        "Deletes the shared error harness base and folds getText/protected static predicate into the current MDC error harness. Tagged legacy inherits that shared base and uses .mat-error; actual owned error harness directly extends ComponentHarness with its legacy selector. Preserve the legacy locator and assess the inherited protected helper separately.",
        "Rebinds current with() to the moved protected helper, preserving the text predicate body. The owned legacy with() directly contains that predicate; its missing protected helper is already enumerated as an exact null-owned signature in api/signature-differences.json. This reading neither broadens that entry nor establishes its final acceptability.",
    ],
    "src/material/form-field/testing/form-field-harness.ts": [
        "Drops abstract locator declaration types from current imports after the generic base is removed. The owned legacy base still needs abstract locator hooks; no source-import deletion follows for it.",
        "Replaces generic control/error/locator hooks with a concrete current harness using MDC text-prefix/suffix,label,hints,text-field and current input/select/error harnesses. The tagged and actual legacy harness keeps historical selectors, legacy input/select/error types, four appearances and host-class label/floating behavior. Current fill/outline-only detection would break the retained contract.",
        "Narrows the no-argument getControl return to current FormFieldControlHarness. The retained legacy union includes MatLegacyInputHarness and MatLegacySelectHarness alongside public datepicker harnesses; preserve its own generic return boundary and custom-query overloads.",
        "Deletes the ordinary wrapper after moving its predicate, concrete locators and appearance methods into the flattened class. This does not remove the legacy wrapper/base boundary or justify MDC lookup behavior in historical tests.",
    ],
    "tools/public_api_guard/material/form-field-testing.md": [
        "Removes AsyncFactoryFn from current generated imports after abstract locator fields disappear. It is reference API data, not a legacy golden update.",
        "Removes TestElement from current generated imports for the same flattened declaration. The owned historical abstract locator signatures remain independently relevant.",
        "Records current error-base collapse, retained protected static predicate and loss of the current form-field harness's protected locator/error hooks and generic base. Tagged legacy extends these historical boundaries; the already enumerated owned error-helper difference requires its own contract judgment rather than an exception expansion.",
        "Records moved concrete form-field methods, current control return types, private locator hiding and static predicate. Preserve the legacy four-appearance return and legacy controls; generated current API is not proof of legacy API/native compatibility.",
    ],
    "src/material/menu/menu-content.ts": [
        "Moves the current lazy-content selector and MAT_MENU_CONTENT useExisting provider onto the formerly shared base. Tagged legacy uses the same historical public content token with MatLegacyMenuContent; actual owned content retains that provider while owning the removed implementation locally.",
        "Deletes the thin current content wrapper. The owned base's public DomPortalOutlet adaptation and explicit current constructor are prior separate work; this hunk does not restore ComponentFactoryResolver or erase the legacy content class/provider.",
    ],
    "src/material/menu/menu-trigger.ts": [
        "Replaces the shared menu-base import with current concrete MatMenu. The owned trigger intentionally recognizes its local historical _MatMenuBase and local panel protocol; do not narrow it to current MatMenu.",
        "Moves the ordinary trigger selector and mat-mdc-menu-trigger host class into its old base decorator. Tagged and actual legacy trigger use mat-menu-trigger; preserve that historical host selector for markup and harness lookup.",
        "Moves exportAs and changes the abstract base into concrete MatMenuTrigger. The actual legacy thin directive still relies on owned inherited bindings and constructor metadata, which require their own final assessment.",
        "Narrows the stored parent material menu to current MatMenu. Retained nested-menu state is owned by the historical base, with the local legacy panel token; a current concrete type is not interchangeable.",
        "Narrows constructor instanceof parent detection to current MatMenu. The actual owned trigger still detects the local base; copying this would stop recognizing its legacy parent menu.",
        "Narrows animation start/direct-descendant subscriptions to current MatMenu. The actual owned trigger has separately repaired native-motion attachment ownership; do not replace it with the current concrete guard or infer runtime equivalence from a name change.",
        "Narrows reset/lazy-content closing behavior to current MatMenu. The actual owned close path retains overlay/lazy views for native exit and releases only its attachment; preserve its separately tested lifetime contract pending whole-family qualification.",
        "Narrows the hover wait-for-animation guard to current MatMenu. The actual owned hover path now opens without waiting for a previous native panel animation; this original refolding is not authorization to regress that prior behavior repair.",
        "Deletes the current trigger wrapper after moving its selector, host class and export alias. It does not delete the retained legacy directive or permit MDC host-class migration.",
    ],
    "src/material/menu/menu.ts": [
        "Drops Directive from current imports as the shared directive is folded into a component. The retained local base is still a historical directive implementation.",
        "Moves ordinary current Component metadata/provider into the base and makes elevation prefix/base private constants with base elevation8. Tagged and actual legacy component needs its own template/token and protected elevation override4. Copying the hardcoded value would change legacy styling.",
        "Deletes the current wrapper and its constructor overload after relocating metadata and elevational defaults. The tagged and actual legacy wrapper retains its historical optional-detector overload and elevation4; assess that constructor independently rather than using current generated declarations as a baseline.",
    ],
    "src/material/menu/public-api.ts": [
        "Removes _MatMenuBase and _MatMenuTriggerBase from the ordinary barrel. The owned legacy barrel still exposes historical local aliases, local panel identity and retained public peer token aliases; current export removal does not authorize a legacy API deletion or modern API mirror.",
    ],
    "src/material/menu/testing/menu-harness.ts": [
        "Drops generic filter/component imports after the current menu harness bases disappear. The owned generic legacy harness still needs these structural contracts.",
        "Replaces the generic menu harness/item-class hook with current MatMenuHarness and the MDC trigger selector/predicate. The retained legacy concrete harness must keep .mat-menu-trigger and MatLegacyMenuItemHarness.",
        "Hardcodes getItems filters, returned item type and construction to current MatMenuItemHarness. The actual owned generic base keeps its legacy item-class hook and historical panel ancestry lookup.",
        "Narrows clickItem and nested filters from the generic item filters to current MenuItemHarnessFilters. Preserve the actual legacy concrete return/filter contract through its generic base.",
        "Narrows recursive submenu click tuple casting to current filters. This is part of current generic collapse, not proof that legacy and current submenu harnesses can be mixed.",
        "Folds the item base into concrete current MatMenuItemHarness with MDC host selector and current static predicate. Tagged/actual legacy item harness retains .mat-menu-item and its own parent menu-class hook.",
        "Hardcodes submenu selector, returned type and construction to current MatMenuHarness and deletes the old wrappers. The actual legacy base uses _menuClass to build MatLegacyMenuHarness; adopting this hunk would route legacy submenu queries to MDC selectors.",
    ],
    "tools/public_api_guard/material/menu-testing.md": [
        "Records both current harness bases/generics/protected class hooks being removed and concrete MDC item/menu return/filter signatures replacing them. The tagged and actual legacy harnesses still rely on those own generic hooks and selectors. Current generated API remains reference data only.",
    ],
    "tools/public_api_guard/material/menu.md": [
        "Records ordinary menu/base collapse and changed constructor declaration; removes current elevation override fields. The retained legacy constructor and protected elevation4 boundary require their own signature proof.",
        "Removes protected _baseElevation from current API because it became private. The actual legacy component still overrides it to4, so this is a relevant extension contract rather than harmless declaration cleanup.",
        "Removes protected _elevationPrefix from current API. Preserve the local historical protected field needed by the legacy elevation implementation.",
        "Records merged menu Ivy inputs/outputs/queries/projection metadata and current content/base collapse. Preserve the legacy class/provider/constructor identities; current generated component metadata is not legacy AOT acceptance.",
        "Records current lazy-content directive/factory metadata moving off the removed base. The actual owned legacy content uses a locally adapted public portal constructor; this golden does not restore old removed Angular tooling.",
        "Records trigger/base collapse with the existing constructor overload family. The retained legacy trigger has its own local panel/item identities; whole constructor/DI proof remains required.",
        "Records current trigger directive/factory input/output and optional/self metadata moving onto the concrete class. This does not qualify the actual legacy factory or native menu behavior.",
    ],
    "src/material/paginator/paginator.ts": [
        "Removes Directive from ordinary current imports after the shared paginator base is folded into a component. The historical local generic base remains relevant to the retained legacy wrapper.",
        "Moves modern component metadata, ID counter/label ID and form-field appearance field onto the old base, removing generic defaults. The tagged and actual legacy paginator has mat-paginator host metadata,a distinct legacy defaults token and a legacy form-field appearance type; do not copy modern metadata/types.",
        "Adds an erased number[] assertion around the fallback empty page-size-options array. This introduces no new runtime pagination behavior; the owned historical expression already maps the same fallback array. Minimum compiler/type validation is separate.",
        "Replaces generic defaults with MatPaginatorDefaultOptions and injects the current defaults token directly. Tagged and actual legacy constructor injects MAT_LEGACY_PAGINATOR_DEFAULT_OPTIONS and forwards its own compatible subset; preserve that token and wider legacy appearances.",
        "Moves the ordinary outline fallback appearance into the flattened constructor. Tagged and actual legacy code intentionally leaves appearance unset unless a non-null configured value exists; adopting outline unconditionally would change historical form-field styling.",
        "Deletes the current wrapper after moving its metadata, ID and constructor appearance logic. It is not a reason to add a modern label-ID contract or delete the separately owned legacy wrapper/default options.",
    ],
    "src/material/paginator/testing/paginator-harness.ts": [
        "Replaces abstract paginator locator hooks with private MDC navigation/value locators,current MatSelectHarness and concrete static predicate. The tagged and actual legacy harness retains historical navigation selectors and MatLegacySelectHarness under .mat-paginator-page-size.",
        "Deletes the former current wrapper after relocating its concrete locators. The owned legacy wrapper still supplies required protected locator hooks; current visibility changes do not justify replacing historical lookup behavior.",
    ],
    "tools/public_api_guard/material/paginator-testing.md": [
        "Records generic base/protected navigation hooks disappearing and two current locators becoming public with current MatSelectHarness type. Keep the tagged legacy hook visibility,selectors and select type; no new public MDC locator mirror is introduced.",
    ],
    "tools/public_api_guard/material/paginator.md": [
        "Records current wrapper/base collapse, generic defaults removal and moved appearance field. The actual owned legacy defaults constructor and form-field appearance semantics remain separate contracts.",
        "Records the modern page-size label ID moving into the consolidated current declaration. The tagged legacy wrapper does not define that current-only member; do not add it solely to resemble current API.",
        "Records current factory/component metadata replacing the old directive metadata, including inherited disabled and input/output declarations. This does not qualify legacy Ivy/AOT, constructor DI or native paginator geometry.",
    ],
    "src/material/radio/radio.ts": [
        "Narrows MatRadioChange.source from the shared button base to current MatRadioButton. Actual owned legacy events use the local historical button-base type; replacing it with the modern concrete class would narrow the accepted source contract.",
        "Narrows MAT_RADIO_GROUP's type argument to current MatRadioGroup. Tagged and actual legacy intentionally use the public group token alias while supplying a legacy group; distinguish token identity from narrowed TypeScript type rather than inventing a new token.",
        "Folds current group directive metadata,CVA provider,MAT_RADIO_GROUP useExisting and MDC host class into a concrete group. Tagged and actual legacy group retains its own CVA provider,legacy host class and query boundary.",
        "Narrows selected storage from generic T to current MatRadioButton. Retained legacy group selection remains typed to MatLegacyRadioButton through the owned generic base.",
        "Replaces the abstract generic radio QueryList with ContentChildren querying current MatRadioButton. Actual tagged/owned legacy queries MatLegacyRadioButton; copying this would stop discovering legacy children.",
        "Narrows selected setter to current MatRadioButton. The retained legacy group generic keeps value/selection consistency for its own button type; no selection algorithm repair is introduced by this hunk.",
        "Folds current radio button Component metadata and MDC checked classes/template into its old base. Tagged and actual legacy button retains historical mat-radio-button/checked/disabled classes,template and wrapper constructor.",
        "Narrows radioGroup from shared generic base to current MatRadioGroup. The actual owned base preserves the historical generic parent protocol; current subtype spelling is not interchangeability proof.",
        "Moves concrete current radio DI/attribute decorators into the merged constructor and changes the detector from protected to private. The legacy explicit constructor still supplies its own group,public focus/dispatcher services and attribute metadata; the owned protected detector remains part of the historical extension surface.",
        "Deletes current group/button wrappers after moving decorators and constructors. This does not delete legacy wrappers or authorize current event,query,host or parent-group narrowing.",
    ],
    "src/material/radio/testing/radio-harness.ts": [
        "Replaces the generic group harness/button hook with a current concrete group,MDC selector and private current button-class constant. The tagged and actual legacy harness keeps its generic hook and .mat-radio-group/.mat-radio-button selectors.",
        "Narrows getCheckedRadioButton to current MatRadioButtonHarness. The actual legacy generic return remains MatLegacyRadioButtonHarness; do not rebind it to MDC lookup behavior.",
        "Narrows getRadioButtons filters and returned buttons to current concrete harness types. Preserve the owned legacy generic filter/return relationship.",
        "Narrows checkRadioButton's filter parameter to current RadioButtonHarnessFilters. The actual legacy wrapper already selects the appropriate public filter shape through its generic hook; current collapse is not a new legacy behavioral fix.",
        "Narrows the protected group-name predicate's harness argument to current MatRadioGroupHarness. The actual owned protected helper remains generic and is invoked by the legacy static predicate; final signature compatibility must be assessed independently.",
        "Moves the current button harness/predicate and generic label locator into the flattened base. Tagged and actual legacy overrides use separate .mat-radio-label-content and .mat-radio-label locators,so the modern shared label locator is not a replacement.",
        "Deletes the current button wrapper after relocating its predicate and label locators. Keep the actual legacy wrapper's historical click/text distinction and selector.",
    ],
    "tools/public_api_guard/material/radio-testing.md": [
        "Records current radio harness-base removal,concrete return/filter types and loss of the generic button-class hook while retaining protected label/name helpers. The tagged/owned legacy generic and historical locator contracts remain relevant; these current API declarations are not legacy goldens.",
    ],
    "tools/public_api_guard/material/radio.md": [
        "Records current group-token narrowing,button/base collapse,constructor parameter narrowing and removal of protected detector. Preserve actual legacy event/base/group typing and explicit wrapper DI; token alias identity alone does not prove full type compatibility.",
        "Records current parent-group type,new component/factory metadata and change-event source narrowing. The actual legacy uses its local source/group bases and historical host/query metadata; this is not an API-equivalent rename.",
        "Records current group wrapper/generic-base collapse into one concrete declaration. Actual owned legacy group still has a generic base and legacy child query.",
        "Records concrete current radio QueryList/selected getter/setter and merged group directive/factory metadata. Legacy selection/query/provider identity and native forms behavior remain separate final acceptance obligations.",
    ],
}

seen = {member["path"] for member in report["initial_member_reviews"]}
assert len(notes) == 18
for section in original["sections"]:
    path = section["path"]
    if path not in notes:
        continue
    assert path not in seen
    assert len(notes[path]) == len(section["hunks"]), path
    report["initial_member_reviews"].append({
        "path": path,
        "patch_sha256": section["patch_sha256"],
        "status": "original-hunks-read;owned/minimum/family validation incomplete",
        "hunks": [
            {
                "index": hunk["index"], "header": hunk["header"], "sha256": hunk["sha256"],
                "initial_technical_review": note, "final_applicability_qualified": False,
            }
            for hunk, note in zip(section["hunks"], notes[path])
        ],
    })

seen = {member["path"] for member in report["initial_member_reviews"]}
hunks_read = sum(len(member["hunks"]) for member in report["initial_member_reviews"])
assert (len(seen), hunks_read) == (40, 170)
report.update(
    status="in-progress:complete original data authenticated;first40members170hunks read;substantive whole-SHA review incomplete",
    original_members_read=40, original_hunks_read=170,
    original_members_remaining=32, original_hunks_remaining=159,
    remaining_original_members=[
        {"path": section["path"], "hunks": len(section["hunks"]), "patch_sha256": section["patch_sha256"]}
        for section in original["sections"] if section["path"] not in seen
    ],
    prior_review_progress={"path": str(prior.relative_to(root)), "sha256": hashlib.sha256(prior.read_bytes()).hexdigest()},
)

owned_groups = {
    "legacy-form-field": {
        "testing/error-harness.ts": "Complete file,legacy selector,direct predicate and absent inherited protected helper;not final API qualification.",
        "testing/form-field-harness.ts": "Complete file,historical locators,four appearances,legacy control/error types and predicate;not native qualification.",
        "testing/form-field-harness-base.ts": "Complete file,generic/abstract hooks,control-query overloads and state/text methods;not full minimum contract qualification.",
    },
    "legacy-menu": {
        **{path: "Complete file,legacy wrapper/provider/selector/constructor or generic harness;not final API/native qualification."
           for path in ["menu-content.ts", "menu-trigger.ts", "menu.ts", "public-api.ts", "testing/menu-harness.ts", "internal/menu-content-base.ts", "testing/menu-harness-base.ts", "internal/menu-panel-token.ts"]},
        "internal/menu-base.ts": "Selected imports,query/event/type fields,elevation hooks and constructor defaults;not a complete file or final behavior assessment.",
        "internal/menu-trigger-base.ts": "Selected parent/item DI,local instanceof checks,close/removal ownership,keyboard dispatcher,overlay config and hover methods;not a complete file/native assessment.",
    },
    "legacy-paginator": {
        **{path: "Complete file,legacy wrapper/defaults or historical harness locators/actions;not native/floor qualification."
           for path in ["paginator.ts", "testing/paginator-harness.ts", "testing/paginator-harness-base.ts"]},
        "internal/paginator-base.ts": "Imports,generic base,inputs/options,constructor/lifecycle and selected paging methods;not the complete file or final API assessment.",
    },
    "legacy-radio": {
        **{path: "Complete file,legacy wrapper/CVA/group/button or harness locator and return/filter protocol;not final native/API qualification."
           for path in ["radio.ts", "testing/radio-harness.ts", "testing/radio-harness-base.ts", "public-api.ts"]},
        "internal/radio-base.ts": "Imports,local change source and generic group/button declarations,selected/query references,button parent/constructor and protected detector;not the complete file or final behavior assessment.",
    },
}
for family, paths in owned_groups.items():
    for relative, scope in paths.items():
        path = "projects/ngx-material-legacy/" + family + "/" + relative
        raw = (root / path).read_bytes()
        report["current_source_leads"].append({
            "path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "read_scope": scope,
        })

tagged_paths = [
    "src/material/form-field/testing/error-harness.ts",
    "src/material/legacy-form-field/testing/error-harness.ts",
    "src/material/legacy-form-field/testing/form-field-harness.ts",
    "src/material/legacy-menu/menu-content.ts", "src/material/legacy-menu/menu-trigger.ts",
    "src/material/legacy-menu/menu.ts", "src/material/legacy-menu/testing/menu-harness.ts",
    "src/material/legacy-menu/public-api.ts", "src/material/legacy-paginator/paginator.ts",
    "src/material/legacy-paginator/testing/paginator-harness.ts", "src/material/legacy-radio/radio.ts",
    "src/material/legacy-radio/testing/radio-harness.ts",
]
report["control_tagged_members_read"] = [
    {key: member[key] for key in ["path", "blob", "sha256", "bytes"]}
    for member in original["tagged_reference"]["members"] if member["path"] in tagged_paths
]
assert len(report["control_tagged_members_read"]) == 12

report["control_minimum_or_prior_evidence_leads"] = []
for path in [
    "node_modules/@angular/material/types/menu.d.ts",
    "node_modules/@angular/material/types/radio.d.ts",
    "node_modules/@angular/material/types/paginator.d.ts",
    "node_modules/@angular/material/types/form-field-testing-control.d.ts",
    "node_modules/@angular/material/types/_form-field-control-harness-chunk.d.ts",
    "compatibility/rc/api/signature-differences.json",
    "compatibility/rc/harness-predicate-boundary-source-proof.json",
    "compatibility/rc/menu-content-resolver-context-source-proof.json",
    "compatibility/rc/menu-construction-consumer-decision.json",
    "compatibility/rc/menu-item-di-source-proof.json",
]:
    raw = (root / path).read_bytes()
    report["control_minimum_or_prior_evidence_leads"].append({
        "path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
        "read_scope": "Selected public declarations/reexports or prior proof/decision summaries and exact error-helper signature entry;not complete minimum validation or prior-test reruns.",
    })

report["control_contract_followups"] = [
    {
        "symbol": "legacy-form-field/testing/MatLegacyErrorHarness",
        "observation": "Untouched tagged base has protected static _getErrorPredicate;owned direct ComponentHarness subclass has with/getText but no helper. Exact historical-to-null pair already exists in signature-differences.json with generic rationale.",
        "status": "existing enumerated difference;final scoped acceptability/signature assessment required;not a newly reproduced failure",
        "exception_changed": False,
        "product_changed": False,
    },
    {
        "symbol": "legacy-menu/panel-content-item identities",
        "observation": "Owned panel token is local;content/default-options/scroll-strategy retain historical public aliases. PeerMatMenuItem provider/query adaptation is separately owned prior work. Current concrete MatMenu narrowing must not erase the legacy base recognition or claim new identity proof.",
        "status": "final provider/minimum/source assessment still required",
    },
    {
        "symbol": "legacy-radio/group-event identities",
        "observation": "Historical public MAT_RADIO_GROUP alias is retained while actual legacy group/button/event types are locally owned. Minimum peer declares the token with current MatRadioGroup;token runtime identity and TypeScript assignability are separate questions.",
        "status": "final scoped token/type proof still required;no replacement token proposed",
    },
]

for path in [
    "legacy-form-field/testing/form-field-harness-base.ts", "legacy-menu/testing/menu-harness-base.ts",
    "legacy-paginator/testing/paginator-harness-base.ts", "legacy-radio/testing/radio-harness-base.ts",
    "legacy-radio/public-api.ts",
]:
    report["maintenance_leads"].append({
        "path": "projects/ngx-material-legacy/" + path,
        "observation": "Existing header lacks Ryan2026notice;several base headers also describe removal at22although the original is17-era. Later bounded license/comment maintenance lead;no product file changed here.",
    })

cyph_root = Path("/home/parallels/cyph")
cyph_files = []
for path in [
    "shared/css/cyph.base.scss", "shared/css/mixins.scss",
    "shared/js/cyph/modules/cyph-shared.module.ts",
    "shared/js/cyph/components/account-menu/account-menu.component.html",
    "shared/js/cyph/components/dynamic-form/dynamic-form.component.html",
    "shared/js/cyph/components/dynamic-form/dynamic-form.component.scss",
]:
    raw = (cyph_root / path).read_bytes()
    cyph_files.append({"path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
report["control_cyph_read_only_source_sanity"] = {
    "root": str(cyph_root), "files": cyph_files,
    "read_scope": "Searches and selected form/menu/radio/paginator markup,styles and imports;no full consumer compile or rendered geometry.",
    "observations": [
        "mixins.scss targets mat-paginator .mat-select-value-text and cyph.base.scss targets mat-form-field spacing.",
        "Account menu uses matMenuTriggerFor,mat-menu and mat-menu-item.",
        "Dynamic form uses mat-form-field and ngModel/name/required radio group/button markup;its SCSS targets .mat-form-field-infix and nested mat-radio-button padding.",
        "Shared module imports MatLegacyRadioModule as MatRadioModule.",
    ],
    "modified": False, "consumer_build_executed": False, "native_or_geometry_qualified": False,
}

assert report["substantive_whole_SHA_review_complete"] is False
assert report["current_owned_family_or_minimum_contract_qualified"] is False
assert report["canonical_dispositions_changed"] == report["source_admissions_changed"] == report["product_changes"] == 0
output = root / (prefix + "review-progress-controls.json")
with output.open("x") as stream:
    stream.write(json.dumps(report, indent=2) + "\n")
print(json.dumps({
    "members_read": 40, "hunks_read": 170, "remaining_files": 32, "remaining_hunks": 159,
    "new_original_files": 18, "new_original_hunks": 74,
    "whole_source_review_complete": False, "canonical_changes": 0, "product_changes": 0,
}))
