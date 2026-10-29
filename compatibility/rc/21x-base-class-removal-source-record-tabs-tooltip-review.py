# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finish original-hunk reading; current-contract qualification remains separate."""

import gzip
import hashlib
import json
from pathlib import Path


root = Path.cwd()
prefix = "compatibility/rc/21x-base-class-removal-source-"
original = json.loads(gzip.decompress((root / (prefix + "originals.json.gz")).read_bytes()))
prior = root / (prefix + "review-progress-table.json")
report = json.loads(prior.read_bytes())
assert (report["original_members_read"], report["original_hunks_read"]) == (60, 263)

notes = {
    "src/material/tabs/public-api.ts": [
        "Removes shared tab/body/group/header/label-wrapper/nav/link bases from the current public barrel while retaining current concrete classes. The untouched legacy barrel publicly aliases these historical bases and actual legacy resolves them locally; current export removal is not authorization to delete the finite historical legacy API.",
    ],
    "src/material/tabs/tab-body.ts": [
        "Folds modern Component metadata,MDC host,template and engine animation into the shared tab-body base. Actual/tagged legacy leaf retains mat-tab-body host/template and the owned engine-free lifecycle; do not substitute the ordinary component metadata.",
        "Replaces the abstract portal-host hook with a concrete current CdkPortalOutlet query. Tagged legacy queried CdkPortalOutlet;actual owned leaf queries its specifically constructed MatLegacyTabBodyPortal,which delegates to public portal primitives. Prior constructor/portal proof is a lead,not fresh native/minimum qualification.",
        "Deletes the modern wrapper and explicit constructor after moving its query/metadata upward. The retained legacy leaf/base and portal constructor contracts remain independently relevant; current constructor inheritance does not qualify manual legacy construction.",
    ],
    "src/material/tabs/tab-group.ts": [
        "Removes Directive from current imports after the generic shared directive becomes a component. Actual owned historical base remains a directive.",
        "Moves modern group Component metadata,provider,MDC classes,stretch and animation-duration host styles onto the shared base. Actual/tagged legacy group keeps historical host/classes,local group token,template and view structure; copying would change legacy styling/provider behavior.",
        "Replaces abstract tab/body/header slots with concrete modern MatTab queries and MatTabHeader type. Actual legacy queries MatLegacyTab,uses the historical minimal header interface and its own view children; preserve those type/identity boundaries.",
        "Moves current fitInkBarToContent and stretchTabs inputs/default fields into the shared class. These modern ink-bar/layout features are not required additions to the finite historical legacy API and must not alter its geometry.",
        "Changes the detector from protected to private. Actual owned legacy base retains the historical protected detector; current consolidation narrows an extension contract.",
        "Moves modern fit/stretch default initialization into the shared constructor. Actual/tagged legacy constructor initializes historical group configuration without imposing these current layout defaults.",
        "Deletes current wrapper after moving its queries,inputs,metadata and constructor behavior into the class. The actual legacy wrapper still supplies legacy child query,header interface,local group provider and historical host metadata.",
    ],
    "src/material/tabs/tab-header.ts": [
        "Removes Directive from ordinary current imports. The retained owned header base still uses its historical directive boundary.",
        "Deletes the shared header base containing disableRipple,constructor forwarding and protected _itemSelected. Actual owned local base retains these contracts and extends its owned public-peer paginated header adapter.",
        "Makes modern MatTabHeader extend MatPaginatedTabHeader directly with inherited lifecycle interfaces. Actual tagged/owned legacy header still extends its local historical base,queries legacy label wrappers and uses a separate legacy ink-bar view child.",
        "Moves the disableRipple getter/setter/state into the current concrete header. No new legacy ripple behavior is shown by this relocation;preserve the historical input and owned lifecycle repair.",
        "Moves _itemSelected preventDefault into the current concrete header. Actual owned historical base keeps that protected behavior; current relocation does not replace its key-manager/constructor/lifetime assessment.",
    ],
    "src/material/tabs/tab-label-wrapper.ts": [
        "Folds current InkBarItem mixin,disabled base,element reference,selector and MDC disabled/fit-content metadata into a single current wrapper class. Actual/tagged legacy extends the simple historical wrapper base and has mat-tab-disabled with disabled input only; preserve its element constructor,focus/offset methods and separate ink bar.",
        "Deletes the current wrapper and intermediate ink-bar mixin after moving that behavior above. This is not a reason to make legacy label wrappers InkBarItems or introduce modern fit-content geometry.",
    ],
    "src/material/tabs/tab-nav-bar/tab-nav-bar.ts": [
        "Removes Directive from current imports as the shared nav/link bases become current components. Actual owned legacy link remains a directive and its historical bases stay local.",
        "Removes current shared item-interface imports and folds modern nav metadata,MDC classes,fit/stretch/animation inputs and current MatTabLink query into the base. Actual/tagged legacy nav uses historical classes,legacy link query,structural item protocol and its own ink-bar view child;do not adopt current layout defaults.",
        "Moves current concrete view queries and modern ink-bar field into the nav base. Actual legacy has distinct legacy ink-bar/query identities and template structure.",
        "Adds current MAT_TABS_CONFIG injection and modern disablePagination/fit/stretch constructor initialization to the old nav base. Actual/tagged legacy constructor has the historical argument list and default behavior;this is a real constructor/DI/defaults boundary.",
        "Moves new MatInkBar(this._items) construction into current ngAfterContentInit. Actual legacy obtains MatLegacyInkBar from its view;do not replace that legacy object/lifecycle protocol.",
        "Moves the current ngAfterViewInit requirement that tabPanel must exist into the base. Historical legacy nav intentionally supports the navigation/link pattern without a tab panel;copying this throw would break that contract.",
        "Folds InkBarItem mixin and modern component/link template,MDC host classes and active classes into the shared link base. Actual/tagged legacy link is a directive using historical classes and a separately owned RippleRenderer;current component structure is not interchangeable.",
        "Moves the current link's destroyed Subject into its merged class. This is part of modern fit-ink-bar subscription ownership,not a new legacy lifetime requirement in isolation.",
        "Narrows link parent from historical nav base to current MatTabNav and changes elementRef construction through the mixin. Actual owned legacy constructor still accepts its own local parent protocol and public element ref.",
        "Moves the current fitInkBarToContent subscription into the shared constructor. Actual/tagged legacy nav/link has no requirement to acquire this modern ink-bar feature or subscription.",
        "Moves current destroyed emission/completion and mixin super.ngOnDestroy into the consolidated link. Actual legacy destroys its historical focus/ripple owners through its own wrapper/base;do not introduce modern mixin teardown or regress existing lifetime work.",
        "Deletes current nav/link wrappers after moving their metadata,queries,inputs,constructor defaults,required panel check and mixin lifecycle. Actual legacy still owns different wrapper/header/ink-bar/ripple/query contracts and optional tab-panel semantics.",
    ],
    "src/material/tabs/tab.ts": [
        "Removes Directive from current imports after shared tab base collapse. Actual historical local base remains a directive.",
        "Moves current Component metadata and concrete label/content queries into the old shared class,making _templateLabel and _explicitContent private. Actual/tagged legacy overrides templateLabel and explicit content queries through public historical tokens and uses protected/local hooks;current visibility/query changes would break that extension boundary.",
        "Makes _setTemplateLabelInput private. Actual/tagged legacy leaf calls the historical protected helper,which preserves manually assigned labels and nearest-tab filtering;retain it with the owned local tab identity.",
        "Deletes the current wrapper and its label/content overrides. It does not delete the retained legacy wrapper,local MAT_TAB provider or historical template/query behavior.",
    ],
    "tools/public_api_guard/material/tabs.md": [
        "Records current tab/base collapse,loss of public explicit content on the thin wrapper and inherited constructor relocation. The retained legacy class still supplies its own public historical content/query boundary.",
        "Removes _explicitContent from the current declaration after it becomes private. Actual tagged/owned legacy leaf still overrides that public field for its lazy-content query;this is not harmless legacy API cleanup.",
        "Removes protected label helper/storage,folds current tab metadata and collapses current body/base declarations. Preserve historical legacy protected/query contracts and leaf constructors;current generated declarations are reference data only.",
        "Records concrete current body portal query and merged component/factory inputs/outputs. Actual owned legacy portal construction/query and native motion remain independently qualified obligations.",
        "Records current group/base collapse and concrete current child queries. The retained legacy uses local tab/base/header types and local group token rather than modern concrete classes.",
        "Removes protected group detector and records modern fit-ink-bar input relocation. Actual historical protected extension and legacy ink-bar geometry remain relevant.",
        "Records modern stretch/view/header types and merged current group component/factory metadata. This does not qualify actual legacy queries,provider identity,AOT or native geometry.",
        "Records current header/base collapse,moved ripple and protected selection methods. Actual local historical header and its separately owned paginated-header lifecycle remain required.",
        "Records current header merged input metadata and deletion of shared header-base declaration. Keep the historical finite legacy alias and constructor surface;no current component is copied.",
        "Records current label-wrapper/intermediate mixin collapse into an ink-bar-mixed concrete class. Actual tagged/owned legacy simple wrapper still has element/focus/offset contract without modern fit-content behavior.",
        "Records moved label-wrapper Ivy metadata and current link/base collapse with parent narrowing. Actual legacy link remains a directive with its own constructor/ripple cleanup and historical parent type.",
        "Records current link component/factory metadata and current nav inherited method/input relocation. The actual legacy nav/link templates,optional panel,view ink-bar and generic item protocols remain distinct.",
        "Deletes current nav-base declaration,adds default-config constructor DI metadata and merges concrete nav component inputs/queries. Actual legacy retains its historical constructor and optional tab-panel pattern;this golden does not authorize API/style changes or establish native qualification.",
    ],
    "src/material/tooltip/tooltip.ts": [
        "Removes ComponentType from ordinary current imports once the generic component hook is hardcoded. Actual owned generic historical tooltip still needs that component-type boundary.",
        "Folds current Directive metadata,MDC trigger/disabled classes and concrete tooltip instance/portal type into the shared generic base. Actual/tagged legacy uses historical mat-tooltip-trigger classes and its own LegacyTooltipComponent;do not narrow it to the modern concrete component.",
        "Makes tooltip component,viewport margin and CSS prefix private and hardcodes modern TooltipComponent/mat-mdc. Actual owned historical base retains protected overridable component/margin and mat prefix;these extension/style hooks are necessary for legacy behavior.",
        "Moves scroll/default-option injection metadata into the current shared constructor. The tagged/actual legacy explicit constructor still marks Directionality optional;the current generated factory loses that optional marker. Actual legacy DI/constructor compatibility needs its own assessment rather than copied current metadata.",
        "Moves current minimum viewport threshold assignment into the merged constructor. Actual legacy keeps the historical protected margin;do not equate matching numeric defaults with interchangeable private hooks.",
        "Moves modern eight-pixel unbounded-anchor offsets into the base hook for all directions. Actual/tagged legacy base returns the supplied position unchanged,with historical CSS spacing. Adopting this would change legacy tooltip geometry.",
        "Deletes current directive wrapper/constructor/offset override and starts folding the current TooltipComponent metadata/multiline field into the shared component base. Actual legacy keeps its own directive classes,component template/handset behavior and historical component base;current structure is not a replacement.",
        "Replaces abstract tooltip-element hook with the current concrete static ViewChild. Actual tagged/owned LegacyTooltipComponent already supplies its own static query through the historical abstract hook.",
        "Hardcodes modern show/hide animation names privately and adds ElementRef to the former shared component constructor. Actual/tagged legacy component uses mat-tooltip-show/hide and a ChangeDetectorRef/BreakpointObserver/optional-animation constructor;preserve these type/manual/lifecycle contracts.",
        "Moves current multiline measurement into formerly no-op base _onShow. Actual/tagged legacy has handset behavior and the historical no-op hook;do not import modern size thresholds or detector work solely because current code moved them upward.",
        "Deletes the current component wrapper after moving metadata,element query,animation names,constructor and multiline behavior into the base. Actual legacy still supplies its distinct template/handset/animation/constructor hooks;motion changes require separate lifecycle/style evidence.",
    ],
    "src/material/tooltip/testing/tooltip-harness.ts": [
        "Folds the abstract panel/class/animation hooks into a concrete current harness with private MDC selectors and animation names. Actual tagged/owned legacy supplies .mat-tooltip/.mat-tooltip-trigger and historical show/hide/disabled names;current lookup/events would not match its markup/motion.",
        "Deletes the current wrapper after moving its predicate and hardcoded hooks. Actual legacy still needs its own concrete historical hooks and protected generic base;no modern harness API mirror is introduced.",
    ],
    "tools/public_api_guard/material/tooltip-testing.md": [
        "Records current harness/base collapse and loss of all protected panel/class/animation hooks while retaining concrete public actions. Actual tagged/owned legacy subclass still supplies these historical hooks;current generated API is not a legacy golden.",
    ],
    "tools/public_api_guard/material/tooltip.md": [
        "Removes ComponentType from current generated imports after generic component hook removal. Actual owned historical generic base still retains that finite type contract.",
        "Records current directive/generic-base collapse and removal of protected CSS/component overrides. Actual legacy explicit constructor,own component and mat prefix remain distinct;current declaration is not a legacy release baseline.",
        "Removes current generic component/margin declarations,replaces instance type and records merged directive/factory metadata including changed optional Directionality DI. Preserve actual legacy constructor metadata and protected geometry hooks pending strict source/minimum assessment.",
        "Records current component/base collapse,new ElementRef constructor/protected field and removed abstract show/hide names. Actual legacy has a different component constructor and historical animation-name hooks;current component inheritance cannot substitute for them.",
        "Records concrete current tooltip element and component/factory metadata while dropping abstract animation fields. Actual historical legacy query/animation/handset behavior and native lifecycle remain separate acceptance obligations.",
    ],
}

seen = {member["path"] for member in report["initial_member_reviews"]}
assert len(notes) == 12
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
assert (len(seen), hunks_read) == (72, 329)
assert seen == {section["path"] for section in original["sections"]}
report.update(
    status="progress:all72original members329hunks read;complete owned/minimum/contract assessment and final source qualification remain open",
    original_members_read=72, original_hunks_read=329,
    original_members_remaining=0, original_hunks_remaining=0,
    original_hunk_reading_complete=True,
    remaining_original_members=[],
    prior_review_progress={"path": str(prior.relative_to(root)), "sha256": hashlib.sha256(prior.read_bytes()).hexdigest()},
)

owned_groups = {
    "legacy-tabs": {
        **{path: "Complete file,legacy wrapper/query/provider/constructor or finite historical aliases;not final minimum/API/native qualification."
           for path in ["public-api.ts", "tab.ts", "tab-body.ts", "tab-group.ts", "tab-header.ts", "tab-label-wrapper.ts", "tab-nav-bar/tab-nav-bar.ts", "tab-label.ts", "internal/tab-token.ts", "internal/tab-label-wrapper-base.ts", "internal/tab-header-base.ts"]},
        "internal/tab-base.ts": "Imports,local group token,protected label/public content hooks and template-label filter/init methods;not complete file or final contract proof.",
        "internal/tab-body-base.ts": "Historical portal/event/state fields and constructor/transition subscriptions;not complete engine-free lifecycle/native proof.",
        "internal/tab-group-base.ts": "Local tab imports,abstract query/header slots,protected detector and historical constructor defaults;not complete behavior/type proof.",
        "internal/tab-nav-bar-base.ts": "Historical structural item slots,optional panel and constructor,active-link initialization,parent link constructor/focus teardown;not complete behavior/minimum proof.",
    },
    "legacy-tooltip": {
        **{path: "Complete file,legacy directive/component/harness/selectors/constructor or finite public aliases;not final runtime/minimum qualification."
           for path in ["tooltip.ts", "public-api.ts", "testing/tooltip-harness.ts", "testing/tooltip-harness-base.ts"]},
        "internal/tooltip-base.ts": "Selected generic/protected component,prefix,margin,constructor and zero-offset hooks,component constructor/query/animation/onShow/visibility methods;not complete file/lifecycle/native proof.",
    },
}
for family, paths in owned_groups.items():
    for relative, scope in paths.items():
        path = "projects/ngx-material-legacy/" + family + "/" + relative
        raw = (root / path).read_bytes()
        report["current_source_leads"].append({"path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "read_scope": scope})

tagged_paths = [
    "src/material/legacy-tabs/public-api.ts", "src/material/legacy-tabs/tab.ts", "src/material/legacy-tabs/tab-body.ts",
    "src/material/legacy-tabs/tab-group.ts", "src/material/legacy-tabs/tab-header.ts", "src/material/legacy-tabs/tab-label-wrapper.ts",
    "src/material/legacy-tabs/tab-nav-bar/tab-nav-bar.ts", "src/material/legacy-tooltip/tooltip.ts", "src/material/legacy-tooltip/testing/tooltip-harness.ts",
]
report["tabs_tooltip_tagged_members_read"] = [
    {**{key: member[key] for key in ["path", "blob", "sha256", "bytes"]}, "read_scope": "Complete tagged file read."}
    for member in original["tagged_reference"]["members"] if member["path"] in tagged_paths
]
assert len(report["tabs_tooltip_tagged_members_read"]) == 9
report["tabs_tooltip_minimum_or_prior_leads"] = []
for path in [
    "node_modules/@angular/material/types/tabs.d.ts", "node_modules/@angular/material/types/tooltip.d.ts",
    "compatibility/rc/tab-header-lifetime-source-proof.json", "compatibility/rc/tab-portal-construction-source-proof.json",
    "compatibility/rc/tooltip-render-source-proof.json", "compatibility/rc/tooltip-aria-source-proof.json",
]:
    raw = (root / path).read_bytes()
    report["tabs_tooltip_minimum_or_prior_leads"].append({
        "path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
        "read_scope": "Selected current21.2.14 public exports/tokens/label declaration or prior proof repair/limits;not complete minimum type/runtime validation or prior-test reruns.",
    })
report["tabs_tooltip_contract_followups"] = [
    "Finish actual local tab/group/panel token,query,protected label/content,header interface,portal and constructor/factory proof;prior scoped repair artifacts retain their own limits.",
    "Preserve legacy separate view ink bar,non-stretched historical layout,optional nav panel and directive link/ripple teardown. Current InkBarItem/required-panel behavior is not copied.",
    "Finish historical tooltip generic component/margin/CSS/zero-offset,constructor/optional DI,handset and animation hook proof against actual minimum peers;no MDC gap or multiline sizing is introduced.",
    "All original hunks are now read. Complete current owned/minimum/provider/signature/harness/lifecycle assessment for the whole SHA and resolve scoped followups before a qualified final disposition or separate admission worksheet.",
]
for path in [
    "legacy-tabs/internal/tab-label-wrapper-base.ts", "legacy-tabs/internal/tab-base.ts",
    "legacy-tooltip/testing/tooltip-harness-base.ts",
]:
    report["maintenance_leads"].append({
        "path": "projects/ngx-material-legacy/" + path,
        "observation": "Existing header lacks Ryan2026notice;later bounded maintenance lead. No product file changed here.",
    })

cyph_root = Path("/home/parallels/cyph")
cyph_files = []
for path in [
    "shared/css/cyph.base.scss", "shared/css/mixins.scss",
    "shared/js/cyph/components/help/help.component.html",
    "shared/js/cyph/components/account-contacts/account-contacts.component.html",
    "shared/js/cyph/components/account-menu/account-menu.component.html",
]:
    raw = (cyph_root / path).read_bytes()
    cyph_files.append({"path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
report["tabs_tooltip_cyph_read_only_sanity"] = {
    "root": str(cyph_root), "files": cyph_files,
    "read_scope": "Selected historical tab/tooltip styling,tab-group/label markup and tooltip inputs;not complete consumer source coverage,build or rendered geometry.",
    "observations": [
        "cyph.base.scss targets mat-tab-body/header,.mat-tab-label.mat-tab-disabled and .mat-tooltip including a fake-tooltip margin/padding override;its nano scroller targets mat-tab-group and nested mat-tab-body.",
        "mixins.scss calls legacy tab theming and styles .mat-tab-label-content/.mat-tab-label-active.",
        "Help and account contacts use mat-tab-group/mat-tab labels;account menu uses matTooltip,matTooltipPosition and disabled inputs.",
        "A scoped shared HTML search found no mat-tab-nav-bar occurrence;this does not prove absence of dynamic/generated/external nav consumers.",
    ],
    "modified": False, "consumer_build_executed": False, "native_or_geometry_qualified": False,
}
assert report["substantive_whole_SHA_review_complete"] is False
assert report["current_owned_family_or_minimum_contract_qualified"] is False
assert report["proposed_final_disposition"] is None
assert report["canonical_dispositions_changed"] == report["source_admissions_changed"] == report["product_changes"] == 0
output = root / (prefix + "review-progress-tabs-tooltip.json")
with output.open("x") as stream:
    stream.write(json.dumps(report, indent=2) + "\n")
print(json.dumps({
    "members_read": 72, "hunks_read": 329, "remaining_original_files": 0, "remaining_original_hunks": 0,
    "new_original_files": 12, "new_original_hunks": 66, "original_hunk_reading_complete": True,
    "whole_source_review_complete": False, "canonical_changes": 0, "product_changes": 0,
}))
