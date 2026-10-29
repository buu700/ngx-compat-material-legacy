# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Append three original family reviews without final applicability claims."""

import gzip
import hashlib
import json
from pathlib import Path


root = Path.cwd()
prefix = "compatibility/rc/21x-base-class-removal-source-"
original = json.loads(gzip.decompress((root / (prefix + "originals.json.gz")).read_bytes()))
prior = root / (prefix + "review-progress-controls.json")
report = json.loads(prior.read_bytes())
assert (report["original_members_read"], report["original_hunks_read"]) == (40, 170)

notes = {
    "src/material/select/select.ts": [
        "Removes the shared option-base import from current source. The actual owned select base still uses local historical option/group/event types; this is not authority to narrow them to modern MatOption.",
        "Folds current Component metadata, MDC host/state classes, template, animations and current form-field/option-parent providers into the old generic base. Tagged/actual legacy keeps historical markup, local form-field/option-parent identities and MatLegacySelectChange; wholesale adoption would change the legacy boundary.",
        "Replaces abstract option/group/custom-trigger slots with current concrete ContentChildren/ContentChild queries. Tagged/actual legacy queries MatLegacyOption, MAT_LEGACY_OPTGROUP and its own trigger class through the historical public trigger token.",
        "Replaces abstract overlay positions, scrolling, settled-position and generic change-event hooks with current nonoverlapping positions, MDC above-panel classes, measured option geometry and private current methods. Actual/tagged legacy overlaps the trigger, centers the selected option with historical item/padding calculations, restores computed scroll and emits its own change event. These are material geometry/API differences.",
        "Moves preferred overlay origin and width fields from the ordinary wrapper into the base. The actual legacy wrapper measures its trigger/font and computes historical offsets; modern width fields are not required legacy additions.",
        "Moves hideSingleSelectionIndicator input/state into the flattened class and synchronizes current option parent properties. The retained historical legacy API does not acquire this current-only option presentation contract by virtue of the base removal.",
        "Moves current panelWidth input/default logic into the flattened class. Actual legacy configuration excludes panelWidth and keeps its historical minimum-width/viewport/padding calculations; do not introduce current sizing semantics to make types resemble modern select.",
        "Narrows selectionChange from generic C to MatSelectChange. Actual legacy remains EventEmitter<MatLegacySelectChange> via its owned generic base and own event factory.",
        "Moves current viewport width recomputation into base ngOnInit. Actual/tagged legacy viewport callback instead remeasures the trigger and marks for check; copying would alter overlay geometry and change-detection behavior.",
        "Moves current connected-form-field origin and overlay-width measurement into base open before _canOpen. Actual legacy open measures its own trigger,font and overlay offsets after opening through the owned base. Preserve its historical positioning path and separately repaired render scheduling.",
        "Moves current stateChanges notification after open into the flattened base for MDC form-field integration. Do not infer an equivalent missing legacy notification from this relocation; retained legacy form-field/state wiring needs its own final behavior assessment.",
        "Moves current stateChanges notification after close into the flattened base for MDC form-field integration. Preserve the owned historical close/motion lifecycle rather than importing current integration behavior solely because it is now in a base body.",
        "Replaces protected disabled-option skip behavior with the current open-panel keyboard policy, and moves private width measurement/current option detector synchronization into the class. Actual legacy keeps the tagged skip-disabled predicate and historical geometry. Protected/private API and keyboard behavior both require individual treatment.",
        "Moves the ordinary wrapper's label-float override onto the base, replacing private-field reads with public accessors. Tagged/actual historical base still has its own getter; this current relocation is not proof of identical overridden-accessor behavior for legacy subclasses.",
        "Deletes the current wrapper after moving its metadata, queries, panel width, origin/viewport/open/close behavior, scrolling, change factory and skip predicate. The retained legacy wrapper still supplies different hooks, local types and overlapping geometry; current component removal does not remove that requirement.",
    ],
    "src/material/select/testing/select-harness.ts": [
        "Removes generic filter/component imports from current harness code after the generic base is deleted. Actual owned generic legacy harness still needs those structural types.",
        "Collapses generic option/group/prefix hooks into a concrete current harness with .mat-mdc-select, mat-mdc prefix and modern option/group harness classes. Tagged/actual legacy needs .mat-select, mat prefix and local legacy option/group harnesses.",
        "Narrows option/group filters and returned harnesses to modern concrete classes. The actual legacy generic base and wrapper preserve distinct legacy filter/return types and historical panel ancestry lookup.",
        "Narrows clickOptions to current OptionHarnessFilters. The retained legacy wrapper supplies its own option-filter type through the generic base; this is not a new selection-action fix for legacy.",
        "Deletes the modern wrapper after relocating its static predicate and class/prefix hooks. It does not justify deleting the actual legacy wrapper or routing its lookups to MDC selectors.",
    ],
    "tools/public_api_guard/material/select-testing.md": [
        "Drops ComponentHarness from current generated imports after generic harness removal. This is reference API data, not a legacy golden update.",
        "Records current harness/base collapse, loss of protected class/prefix hooks, and concrete modern option/group/filter return types. Preserve the tagged/actual legacy generic protocol and selectors pending final contract qualification.",
        "Removes the abstract option/group/prefix declarations and records the moved current static predicate. The actual owned legacy subclass still provides these historical hooks; current declaration cleanup does not authorize removing them.",
    ],
    "tools/public_api_guard/material/select.md": [
        "Removes the shared option-base import from current generated API. Actual historical option-base identity is locally owned and remains a separate type boundary.",
        "Records ordinary select/generic-base collapse with current constructor and moved members. Tagged/actual legacy still supplies event/scroll/position hooks, own option types and historical markup; the modern concrete declaration is not a release baseline.",
        "Replaces abstract customTrigger with current MatSelectTrigger. Actual legacy uses MatLegacySelectTrigger and the historical public query token; assess type identity rather than assuming current class interchangeability.",
        "Removes protected generic change factory and adds current hideSingleSelectionIndicator declarations. Actual legacy needs the protected own event factory and does not gain current presentation API automatically.",
        "Records concrete current option/group queries and moved overlay-width field. Actual legacy queries and geometry remain historical and locally typed.",
        "Records current panelWidth/origin/position members, public scrolling, concrete event emitter and removal of protected settled/skip hooks. These changes narrow extension points and expose current sizing semantics; preserve actual legacy contracts until independently assessed.",
        "Records merged current component/factory inputs, queries, projection and moved animation export. It does not establish actual legacy Ivy/AOT, provider identity, native geometry or engine-free motion acceptance.",
    ],
    "src/material/slide-toggle/slide-toggle.ts": [
        "Removes Directive from ordinary imports after the shared generic base is folded into the current component. The owned historical generic base remains a directive.",
        "Removes FocusOrigin from current imports when the flattened current class retains focus() without options/origin. Actual/tagged legacy still exposes focus(options,origin) and FocusMonitor behavior; preserve that conservative historical API.",
        "Folds ordinary Component metadata,MDC host/state classes,template and CVA provider into the base. Actual/tagged legacy uses mat-slide-toggle, mat-checked/mat-disabled, input-based markup and its own CVA token.",
        "Makes _onChange/_uniqueId private, replaces the protected generic event factory with current MatSlideToggleChange, and moves MDC switch/button ID/focus into the class. Actual/tagged legacy needs protected hooks, an input element, origin-aware focus and its own event type; these are substantive API/DOM differences.",
        "Narrows change from EventEmitter<T> to current MatSlideToggleChange. Actual owned legacy retains its generic emitter and MatLegacySlideToggleChange factory/source.",
        "Moves current DI/attribute metadata into the constructor, removes idPrefix and hardcodes mat-mdc-slide-toggle IDs plus a current label ID. Tagged/actual legacy passes mat-slide-toggle- and a distinct legacy default-options token; do not copy modern ID/config behavior.",
        "Deletes the former current wrapper after moving its metadata, switch/label fields, constructor and ID initialization. The legacy wrapper still owns input change/click behavior, constructor forwarding and historical host classes.",
        "Removes current wrapper focus and event factory after moving their concrete implementations upward. Actual/tagged legacy focus(options,origin) and protected factory remain required; no modern zero-argument focus substitution is justified.",
    ],
    "src/material/slide-toggle/testing/slide-toggle-harness.ts": [
        "Collapses the shared harness into a concrete current harness with a button locator,MDC host,predicate,toggle-by-button and aria-checked state. Actual/tagged legacy uses input state and clicks .mat-slide-toggle-bar,so current lookup/action behavior is not interchangeable.",
        "Changes base required detection from the native required attribute to aria-required === true for the current button implementation. Actual/tagged legacy input still uses native required detection; copying would change historical tests.",
        "Deletes the modern wrapper after relocating its button locator and overrides. Actual legacy still supplies its historical input locator,bar click and checked property; retain the abstract hooks and existing behavior.",
    ],
    "tools/public_api_guard/material/slide-toggle-testing.md": [
        "Records current harness/base collapse and relocation of current checked/required/toggle methods. The retained legacy wrapper still has distinct native input and bar-click semantics.",
        "Records the current native-element locator becoming public, concrete methods and moved static predicate. Preserve the tagged legacy protected locator contract; no modern public button-locator API is introduced.",
    ],
    "tools/public_api_guard/material/slide-toggle.md": [
        "Drops FocusOrigin from current generated imports. Actual/tagged legacy origin-aware focus remains a historical contract.",
        "Records current wrapper/generic-base collapse,constructor prefix removal,concrete event type,button IDs and private event factory/onChange changes. Actual legacy retains its own config token,prefix,input,protected event factory and focus(options,origin).",
        "Records loss of protected _onChange/_uniqueId and merged current component/factory metadata with a switch element. This is not legacy factory/forms/native acceptance or authorization to remove historical extension fields.",
    ],
    "src/material/snack-bar/snack-bar-container.ts": [
        "Removes Directive from ordinary imports as the shared container becomes the modern component. Actual owned historical base remains separately owned.",
        "Folds current Component metadata,mdc-snackbar host classes,template and animation engine trigger into the shared BasePortalOutlet class. Tagged/actual legacy has snack-bar-container selector,mat-snack-bar-container host and historical template; current structure/motion is not a replacement.",
        "Moves current MDC label ViewChild into the consolidated container. Actual legacy has no need for this current label wrapper/query contract.",
        "Changes _elementRef from protected to private. Tagged/actual legacy container override uses the protected element to apply center/top classes; this is a required retained extension boundary.",
        "Makes _afterPortalAttached private. Actual/tagged legacy overrides this hook to preserve historical alignment classes after base attachment; copying current visibility would break that behavior.",
        "Moves MDC label class toggling into the now private attachment hook. Do not add MDC structural/typography/color classes to legacy content; its historical alignment override and DOM remain distinct.",
        "Deletes current wrapper after moving metadata,label query and MDC attachment behavior. It does not delete the retained legacy leaf/base boundary or authorize an ordinary component fork.",
    ],
    "src/material/snack-bar/snack-bar-ref.ts": [
        "Replaces the shared container-base import with modern MatSnackBarContainer. Untouched tagged legacy publicly aliases this shared ref,while actual owned legacy already owns the historical ref locally to retain its local base contract.",
        "Narrows the public containerInstance property to current MatSnackBarContainer. Actual owned legacy property remains the local historical base; minimum21 peer also declares the modern concrete container,so final alias/subtype/API/DI consequences must be assessed explicitly.",
        "Narrows the ref constructor to current concrete MatSnackBarContainer. Actual owned constructor still accepts the local historical base and subscribes to its exit stream. Read the complete tagged/current-owned historical ref bodies;current-minimum runtime and full type qualification remain open.",
    ],
    "src/material/snack-bar/snack-bar.ts": [
        "Drops Type/shared-container-base imports from ordinary service after configurable component hooks become concrete. The actual historical local service still needs typed configurable simple/container components.",
        "Collapses injectable base/current service and moves providedIn current MatSnackBarModule onto the concrete service. Actual legacy service is explicitly provided by MatLegacySnackBarModule and uses local historical base behavior; no modern provider scope is copied.",
        "Replaces protected abstract simple/container/handset hooks with public modern classes and mat-mdc-snack-bar-handset. Actual/tagged legacy supplies LegacySimpleSnackBar,MatLegacySnackBarContainer and mat-snack-bar-handset; preserve these historical component/style choices.",
        "Narrows parent service from shared base to current MatSnackBar. Actual legacy parent delegation still uses its locally owned historical base and explicit MatLegacySnackBar wrapper.",
        "Narrows attached container return to current MatSnackBarContainer. Actual legacy portal construction still attaches its configured local container,whose extension and ref protocols remain separate.",
        "Narrows attached ComponentRef type to the current concrete container. This is not evidence that the local historical container or public portal behavior is interchangeable with MDC.",
        "Deletes the old current wrapper after relocating injectable metadata,constructor and concrete hooks. The actual legacy service wrapper still needs its own classes,handset style,parent and default-config protocol.",
    ],
    "src/material/snack-bar/testing/snack-bar-harness.ts": [
        "Folds the abstract message/action/annotation harness hooks into current MatSnackBarHarness with MDC host/label/action selectors. Actual/tagged legacy uses .mat-snack-bar-container, .mat-simple-snackbar > span and the legacy action button selector.",
        "Removes the annotation assertion from current hasAction. Actual/tagged legacy rejects this API on custom content through _assertContentAnnotated;preserve that behavioral contract.",
        "Removes the annotation assertion from current getMessage. Actual/tagged legacy still requires simple annotated content;copying would change custom-content error behavior.",
        "Deletes the abstract annotation hook and makes _assertHasAction private while dropping its annotation check. Actual legacy still overrides the annotation hook and inherits its protected action assertion;retain that extension/guard boundary.",
        "Deletes the modern wrapper and no-op annotation override after moving selectors/predicate. The actual legacy annotation override is substantive and must not be replaced with current no-op behavior.",
    ],
    "tools/public_api_guard/material/snack-bar-testing.md": [
        "Records current harness/base collapse and removal of protected selectors,annotation/action hooks. Actual/tagged legacy retains historical locators and rejects message/action APIs on custom content.",
        "Records current concrete host/static predicate and hides message selector. The tagged legacy host intentionally lacks :not([mat-exit]) despite its old comment; preserve the actual tagged selector rather than silently changing it to match current harness behavior.",
    ],
    "tools/public_api_guard/material/snack-bar.md": [
        "Removes Type from ordinary generated API after configurable component slots disappear. Actual owned historical service still uses those slots.",
        "Records modern service/base collapse,public concrete component/handset properties and constructor parent narrowing. Actual legacy service uses historical protected hooks and explicit module provisioning;this is not a legacy API baseline.",
        "Deletes the shared service base declaration,including configurable simple/container components and handset class. The actual legacy wrapper/base remains needed to preserve historical component/style contracts.",
        "Records current container/base collapse and removal of protected element/attachment hook while adding MDC label query. Actual/tagged legacy override needs those protected members and must keep historical content structure/alignment.",
        "Records current container component/factory metadata replacing shared directive metadata. Actual legacy uses a different selector/template and owned engine-free lifecycle;no native/AOT qualification follows from this golden.",
        "Records current ref constructor/container-property narrowing to modern concrete container. Tagged legacy alias now requires an explicit locally owned historical ref decision;actual owned ref has that local base type,but final public minimum/DI/subtype behavior remains unqualified in this reading step.",
    ],
}

seen = {member["path"] for member in report["initial_member_reviews"]}
assert len(notes) == 14
for section in original["sections"]:
    path = section["path"]
    if path not in notes:
        continue
    assert path not in seen
    assert len(notes[path]) == len(section["hunks"]), path
    report["initial_member_reviews"].append({
        "path": path, "patch_sha256": section["patch_sha256"],
        "status": "original-hunks-read;owned/minimum/family validation incomplete",
        "hunks": [
            {"index": hunk["index"], "header": hunk["header"], "sha256": hunk["sha256"],
             "initial_technical_review": note, "final_applicability_qualified": False}
            for hunk, note in zip(section["hunks"], notes[path])
        ],
    })
seen = {member["path"] for member in report["initial_member_reviews"]}
hunks_read = sum(len(member["hunks"]) for member in report["initial_member_reviews"])
assert (len(seen), hunks_read) == (54, 246)
report.update(
    status="in-progress:complete original data authenticated;first54members246hunks read;substantive whole-SHA review incomplete",
    original_members_read=54, original_hunks_read=246,
    original_members_remaining=18, original_hunks_remaining=83,
    remaining_original_members=[
        {"path": section["path"], "hunks": len(section["hunks"]), "patch_sha256": section["patch_sha256"]}
        for section in original["sections"] if section["path"] not in seen
    ],
    prior_review_progress={"path": str(prior.relative_to(root)), "sha256": hashlib.sha256(prior.read_bytes()).hexdigest()},
)

owned_groups = {
    "legacy-select": {
        "select.ts": "Imports,constants,event/config/trigger,component host/providers,query/position fields,open/viewport/scroll/settled/event hooks and selected geometry tail;not complete geometry/type/runtime qualification.",
        "internal/select-base.ts": "Selected local option/form-field imports,generic abstract hooks,constructor/initialization,skip predicate/key manager and label-float getter;not complete file/family qualification.",
        "testing/select-harness.ts": "Complete file,legacy prefix,option/group classes and filter/predicate boundary;not native qualification.",
        "testing/select-harness-base.ts": "Complete file,generic class hooks,filters,option/group returns,panel lookup and actions;not native qualification.",
    },
    "legacy-slide-toggle": {
        path: "Complete file,legacy config/CVA/event/focus/prefix or generic base and historical input/bar harness behavior;not final minimum/API/native qualification."
        for path in ["slide-toggle.ts", "internal/slide-toggle-base.ts", "testing/slide-toggle-harness.ts", "testing/slide-toggle-harness-base.ts"]
    },
    "legacy-snack-bar": {
        **{path: "Complete file,legacy wrapper/ref/harness/module or public alias identity;not final API/DI/minimum/native qualification."
           for path in ["snack-bar.ts", "snack-bar-container.ts", "public-api.ts", "testing/snack-bar-harness.ts", "testing/snack-bar-harness-base.ts", "internal/snack-bar-ref.ts", "snack-bar-module.ts"]},
        "internal/snack-bar-base.ts": "Selected imports,abstract component/style hooks,parent/default constructor,container/ref construction and local ref/data providers;not complete file or runtime qualification.",
        "internal/snack-bar-container-base.ts": "Imports,portal/event/config/constructor fields,protected element and attachment hook;not complete lifecycle/native qualification.",
    },
}
for family, paths in owned_groups.items():
    for relative, scope in paths.items():
        path = "projects/ngx-material-legacy/" + family + "/" + relative
        raw = (root / path).read_bytes()
        report["current_source_leads"].append({"path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "read_scope": scope})

tagged_paths = [
    "src/material/legacy-select/select.ts", "src/material/legacy-select/testing/select-harness.ts",
    "src/material/legacy-slide-toggle/slide-toggle.ts", "src/material/legacy-slide-toggle/testing/slide-toggle-harness.ts",
    "src/material/legacy-snack-bar/snack-bar.ts", "src/material/legacy-snack-bar/snack-bar-container.ts",
    "src/material/legacy-snack-bar/testing/snack-bar-harness.ts", "src/material/snack-bar/snack-bar-ref.ts",
]
report["select_slide_snack_tagged_members_read"] = [
    {**{key: member[key] for key in ["path", "blob", "sha256", "bytes"]},
     "read_scope": "Selected historical host/query/open/position/scroll/event declarations." if member["path"] == "src/material/legacy-select/select.ts" else "Complete tagged file read."}
    for member in original["tagged_reference"]["members"] if member["path"] in tagged_paths
]
assert len(report["select_slide_snack_tagged_members_read"]) == 8
report["select_slide_snack_minimum_or_prior_leads"] = []
for path in [
    "node_modules/@angular/material/types/select.d.ts", "node_modules/@angular/material/types/slide-toggle.d.ts",
    "node_modules/@angular/material/types/snack-bar.d.ts", "compatibility/rc/api/signature-differences.json",
    prefix + "tagged-alias-supplement.json",
]:
    raw = (root / path).read_bytes()
    report["select_slide_snack_minimum_or_prior_leads"].append({
        "path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
        "read_scope": "Selected current21.2.14 public tokens/exports/ref constructor/property and prior signature/alias evidence;not full minimum runtime/type validation.",
    })

def select_aria_rows(value):
    if isinstance(value, dict):
        if value.get("sha") == "60776637ee78cd942a3527402e3e8f9f25d871c1" and "final_disposition" in value:
            yield value
        for child in value.values():
            yield from select_aria_rows(child)
    elif isinstance(value, list):
        for child in value:
            yield from select_aria_rows(child)

report["separate_select_aria_subject"] = {
    "sha": "60776637ee78cd942a3527402e3e8f9f25d871c1",
    "observation": "Tagged legacy host includes aria-autocomplete:none;actual owned host omits it. A separate upstream attribute-removal subject exists. Do not restore or qualify this separate behavior change from base consolidation alone.",
    "lines": [],
    "canonical_changed": False,
}
for line, evidence_root in [
    ("21.x", root),
    ("main", Path("/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy")),
]:
    path = "compatibility/f10/disposition-ledger/ledger.json"
    raw = (evidence_root / path).read_bytes()
    rows = list(select_aria_rows(json.loads(raw)))
    assert len(rows) == 1
    report["separate_select_aria_subject"]["lines"].append({
        "line": line, "evidence_root": str(evidence_root), "path": path,
        "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "row": rows[0],
        "main_reference_is_not_21x_acceptance": True,
    })

report["tagged_alias_followup"] = "Tagged legacy publicly aliases the shared historical snack-bar ref. Actual owned local ref and minimum21 concrete-container constructor/property were read;final constructor/type/DI/subtype/lifetime assessment remains required. No alias exception is broadened here."
report["select_slide_snack_contract_followups"] = [
    "Finish strict select option/event/query/constructor and historical geometry/state/lifecycle assessment;current-only width/indicator behavior is not added.",
    "Keep origin-aware legacy slide-toggle focus,input-based required/checked behavior,protected hooks,event and distinct defaults token in final source/minimum proof.",
    "Complete snack-bar tagged public alias to locally owned ref type/DI/constructor and lifetime assessment,plus protected container/annotation hooks;do not substitute modern concrete container inheritance.",
    "Review separate pending21 select aria-autocomplete subject independently;main metadata is context only and source changes do not establish native/independent acceptance.",
]
for path in [
    "legacy-select/testing/select-harness-base.ts", "legacy-slide-toggle/testing/slide-toggle-harness-base.ts",
    "legacy-snack-bar/testing/snack-bar-harness-base.ts", "legacy-snack-bar/internal/snack-bar-base.ts",
    "legacy-snack-bar/internal/snack-bar-ref.ts",
]:
    report["maintenance_leads"].append({
        "path": "projects/ngx-material-legacy/" + path,
        "observation": "Existing header lacks Ryan2026notice;several headers also describe base removal at22although the original is17-era. Later bounded maintenance lead;no product file changed here.",
    })

cyph_root = Path("/home/parallels/cyph")
cyph_files = []
for path in [
    "shared/css/cyph.base.scss", "shared/css/mixins.scss",
    "shared/js/cyph/modules/cyph-shared.module.ts", "shared/js/cyph/modules/cyph-web.module.ts",
    "shared/js/cyph/components/dynamic-form/dynamic-form.component.html",
    "shared/js/cyph/services/material-dialog.service.ts",
]:
    raw = (cyph_root / path).read_bytes()
    cyph_files.append({"path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
report["select_slide_snack_cyph_read_only_sanity"] = {
    "root": str(cyph_root), "files": cyph_files,
    "read_scope": "Selected legacy imports,select/slide-toggle markup,style selectors and snack-bar service usage;not full consumer source coverage,build or rendered geometry.",
    "observations": [
        "mixins.scss targets .mat-select-content/.mat-select-panel-done-animating and calls legacy select theming;cyph.base.scss targets .mat-slide-toggle-content.",
        "Dynamic form nests mat-option in mat-select and uses input-style ngModel/name/required slide-toggle markup.",
        "Shared/web modules import legacy select,slide-toggle and snack-bar modules;material dialog service opens/dismisses legacy snack bars and observes onAction.",
        "The scoped shared TypeScript search found legacy snack-bar service usage;it does not prove absence of all dynamic/generated/external ref consumers.",
    ],
    "modified": False, "consumer_build_executed": False, "native_or_geometry_qualified": False,
}

assert report["substantive_whole_SHA_review_complete"] is False
assert report["current_owned_family_or_minimum_contract_qualified"] is False
assert report["canonical_dispositions_changed"] == report["source_admissions_changed"] == report["product_changes"] == 0
output = root / (prefix + "review-progress-select-slide-snack.json")
with output.open("x") as stream:
    stream.write(json.dumps(report, indent=2) + "\n")
print(json.dumps({
    "members_read": 54, "hunks_read": 246, "remaining_files": 18, "remaining_hunks": 83,
    "new_original_files": 14, "new_original_hunks": 76,
    "whole_source_review_complete": False, "canonical_changes": 0, "product_changes": 0,
}))
