# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Append dialog original-hunk reading without claiming final applicability."""

import gzip
import hashlib
import json
from pathlib import Path


root = Path.cwd()
prefix = "compatibility/rc/21x-base-class-removal-source-"
original = json.loads(gzip.decompress((root / (prefix + "originals.json.gz")).read_bytes()))
prior = root / (prefix + "review-progress-checkbox.json")
report = json.loads(prior.read_bytes())
assert (report["original_members_read"], report["original_hunks_read"]) == (13, 64)

notes = {
    "src/material/dialog/dialog-container.ts": [
        "Deletes the shared abstract container, its eight-argument constructor, animation event stream, delayed-focus hooks and abstract exit method; also relocates the CSS-time parser. The untouched legacy leaf extends this shared boundary and supplies a ChangeDetectorRef in a different concrete constructor. The actual owned base composes public portal/focus primitives and preserves the historical constructor rather than inheriting current CdkDialogContainer construction.",
        "Makes the ordinary MDC container extend CdkDialogContainer directly and moves the animation emitter into it. This is not a substitute for the legacy host/template, owned base or its public-peer protocol bridge. Shared naming alone does not establish constructor, provider or lifecycle identity.",
        "Renames the concrete document and interactivity-checker parameters. Parameter forwarding is still explicit; the retained legacy leaf requires its own constructor/type/DI assessment rather than copying the modern concrete parameter list.",
        "Forwards those renamed concrete parameters directly into CdkDialogContainer. Current minimum CdkDialogContainer construction differs from the original historical base; existing owned public-portal composition must not be replaced by an unproved current-parent subtype.",
        "Moves ordinary current ngOnDestroy away from this location. The actual owned leaf cancels its timer and animation frame before base focus cleanup; its already repaired reentrancy/lifetime behavior must not be regressed by copying this relocation.",
        "Moves delayed initial-focus/opened-event hooks, current destruction and parseCssTime into their new concrete/file locations. No new legacy motion repair follows from this reorganization. Historical delayed-focus and owned engine-free state/lifetime tests remain separate acceptance obligations.",
    ],
    "src/material/dialog/dialog-ref.ts": [
        "Replaces the shared-base import with current MatDialogContainer. The actual owned ref uses the historical local base and registers its public CDK peer; changing that type would narrow the accepted legacy container boundary.",
        "Narrows the public ref constructor/container property from the shared base to the current concrete container. The retained legacy constructor and animation event protocol remain distinct. Existing lifetime proof is a source lead, not a fresh whole-family or packed pass.",
    ],
    "src/material/dialog/dialog.ts": [
        "Removes the generic container-base import from the ordinary service. The retained legacy service still supplies its own local container type and ref constructor.",
        "Deletes a publicly exported scroll-strategy helper and replaces the extensible generic base with concrete MatDialog, removing the protected ID prefix and configurable constructor slots. The untouched legacy barrel aliases that helper/base; the actual owned barrel preserves local historical aliases.",
        "Moves modern DI metadata into the concrete service constructor and hardcodes MatDialogRef, MatDialogContainer and MAT_DIALOG_DATA. Tagged and actual owned legacy construction supplies MatLegacyDialogRef, MatLegacyDialogContainer and the distinct MAT_LEGACY_DIALOG_DATA token. These provider identities cannot be collapsed.",
        "Hardcodes mat-mdc-dialog IDs instead of the overridable prefix. The actual retained service keeps the historical mat-dialog- prefix and Cyph's source uses a concrete legacy ref identity plus legacy container selectors. No modern ID/DOM replacement is justified.",
        "Deletes the former modern wrapper after moving its metadata and hardcoded dependencies into the flattened class. It does not remove the tagged legacy service constructor or its parent-dialog/default-options/scroll-strategy token contract.",
    ],
    "src/material/dialog/public-api.ts": [
        "Removes the shared container base from the ordinary public barrel. The untouched legacy barrel exposes it as _MatLegacyDialogContainerBase; the actual legacy barrel resolves that historical alias to the locally owned base. Preserve that API boundary pending full source/minimum qualification.",
    ],
    "src/material/dialog/testing/dialog-harness.ts": [
        "Merges the base into current MatDialogHarness with the MDC host selector and concrete predicate. The untouched and actual legacy harness use .mat-dialog-container and historical title/content/actions selectors. The legacy locator overrides cannot inherit MDC-only lookup behavior.",
        "Deletes the old modern wrapper after relocating its host selector/predicate. It is not evidence that the legacy wrapper or historical section selectors can be deleted.",
    ],
    "src/material/dialog/testing/dialog-opener.ts": [
        "Replaces the generic directive base with the concrete ordinary test opener and its component metadata. The legacy test opener retains its collision binding, concrete legacy service and independently owned base. It currently disables motion through MATERIAL_ANIMATIONS rather than the old NoopAnimationsModule.",
        "Moves withComponent and static state onto current MatTestDialogOpener and narrows the injected service to MatDialog. The actual owned legacy base retains its own component/config static storage, opens a legacy ref and records the result. Cross-class static-state identity and generic signatures still need the final contract assessment.",
        "Deletes the current wrapper and resets only its newly moved static state during destruction. Preserve the legacy base's subscription cleanup and state reset; this original hunk is not a reason to share current test-opener state or reintroduce animation-engine tooling.",
    ],
    "src/material/dialog/testing/index.ts": [
        "Changes the ordinary testing index from exporting the shared base to exporting current MatDialogHarness. The retained legacy testing entry exposes its own harness/opener and public filter alias; this current index change does not authorize a new modern API mirror.",
    ],
    "tools/public_api_guard/material/dialog-testing.md": [
        "Records removal of shared-base/container imports from the ordinary generated testing API. These are current API references, not replacement legacy goldens.",
        "Records current harness inheritance collapsing into ContentContainerComponentHarness with the same current section generic. The legacy section enum/host/locator/predicate contract remains independently owned.",
        "Records relocated hostSelector and static with on the flattened current harness. Preserve the historical legacy concrete predicate return and selectors rather than copying this current declaration.",
        "Records the test opener's generic-base removal and concrete MatDialog property/constructor. Tagged legacy and actual owned opener signatures/static behavior need independent assessment; no candidate golden is regenerated.",
    ],
    "tools/public_api_guard/material/dialog.md": [
        "Removes Type from current generated imports once configurable class-constructor slots disappear. The actual owned service still needs configurable legacy ref/container constructors.",
        "Records removal of the exported scroll-strategy factory. Its historical legacy alias remains explicitly exported from the local owned base implementation.",
        "Records current service constructor parameter properties, moved inherited methods and concrete OnDestroy implementation. It does not establish legacy constructor/provider/API equivalence.",
        "Deletes the generic service base declaration, including its configurable ref/container/data token arguments and protected ID prefix. These are relevant retained legacy extension contracts, not automatically obsolete tooling.",
        "Records current container extending CdkDialogContainer directly and acquiring the old shared members. The retained legacy leaf has a different constructor and host/motion implementation; public-peer composition and tagged inherited signatures remain required.",
        "Deletes the abstract shared container declaration and its constructor/abstract exit contract. The actual legacy public alias still points to the local historical base; current deletion is not a legacy API removal authorization.",
        "Narrows the public ref constructor's container argument to current MatDialogContainer. The retained historical base argument must be assessed independently with its actual owned ref and public minimum peers.",
        "Narrows the ref's public container property to the current concrete class. Preserve the legacy property type and event/lifetime behavior; source reading does not qualify native focus or geometry.",
    ],
}

seen = {member["path"] for member in report["initial_member_reviews"]}
for section in original["sections"]:
    path = section["path"]
    if path not in notes:
        continue
    assert path not in seen
    assert len(notes[path]) == len(section["hunks"])
    report["initial_member_reviews"].append({
        "path": path,
        "patch_sha256": section["patch_sha256"],
        "status": "original-hunks-read;owned/minimum/family validation incomplete",
        "hunks": [
            {
                "index": hunk["index"],
                "header": hunk["header"],
                "sha256": hunk["sha256"],
                "initial_technical_review": note,
                "final_applicability_qualified": False,
            }
            for hunk, note in zip(section["hunks"], notes[path])
        ],
    })

seen = {member["path"] for member in report["initial_member_reviews"]}
hunks_read = sum(len(member["hunks"]) for member in report["initial_member_reviews"])
assert (len(seen), hunks_read) == (22, 96)
report.update(
    status="in-progress:complete original data authenticated;first22members96hunks read;substantive whole-SHA review incomplete",
    original_members_read=22,
    original_hunks_read=96,
    original_members_remaining=50,
    original_hunks_remaining=233,
    remaining_original_members=[
        {"path": section["path"], "hunks": len(section["hunks"]), "patch_sha256": section["patch_sha256"]}
        for section in original["sections"] if section["path"] not in seen
    ],
    prior_review_progress={
        "path": str(prior.relative_to(root)),
        "sha256": hashlib.sha256(prior.read_bytes()).hexdigest(),
    },
)

owned_paths = [
    "dialog.ts", "dialog-container.ts", "dialog-ref.ts", "public-api.ts", "dialog-container.html",
    "internal/dialog-base.ts", "internal/dialog-container-base.ts", "internal/dialog-container-state.ts",
    "testing/dialog-harness.ts", "testing/dialog-harness-base.ts", "testing/dialog-opener.ts",
    "testing/dialog-opener-base.ts", "testing/public-api.ts",
]
for relative in owned_paths:
    path = "projects/ngx-material-legacy/legacy-dialog/" + relative
    raw = (root / path).read_bytes()
    report["current_source_leads"].append({
        "path": path,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "read_scope": "Complete file read for dialog source leads;not a fresh full-family/API/native qualification.",
    })

tagged_paths = [
    "src/material/legacy-dialog/dialog-container.ts", "src/material/legacy-dialog/dialog.ts",
    "src/material/legacy-dialog/testing/dialog-harness.ts", "src/material/legacy-dialog/testing/dialog-opener.ts",
    "src/material/legacy-dialog/public-api.ts",
]
report["dialog_tagged_members_read"] = [
    {key: member[key] for key in ["path", "blob", "sha256", "bytes"]}
    for member in original["tagged_reference"]["members"] if member["path"] in tagged_paths
]
assert len(report["dialog_tagged_members_read"]) == 5
report["dialog_minimum_source_leads"] = []
for path in [
    "node_modules/@angular/cdk/types/dialog.d.ts",
    "compatibility/rc/dialog-public-container-source-proof.json",
    "compatibility/rc/dialog-motion-source-proof.json",
    "compatibility/rc/dialog-ref-lifetime-source-proof.json",
    "compatibility/rc/dialog-api-focus-source-proof.json",
]:
    raw = (root / path).read_bytes()
    report["dialog_minimum_source_leads"].append({
        "path": path,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "read_scope": "Selected public DialogContainer/Config/Ref declarations and prior proof summaries;not complete current-minimum validation or a rerun of prior tests.",
    })
report["dialog_minimum_source_version"] = "21.2.14"

for relative in ["testing/dialog-harness-base.ts", "testing/dialog-opener-base.ts"]:
    report["maintenance_leads"].append({
        "path": "projects/ngx-material-legacy/legacy-dialog/" + relative,
        "observation": "Existing header lacks the Ryan2026notice and describes removal at22although the original removal is17-era. Later bounded license/comment maintenance lead;no product file changed in this source-only step.",
    })

cyph_root = Path("/home/parallels/cyph")
cyph_paths = [
    "shared/css/cyph.base.scss",
    "shared/js/cyph/components/dialog-media/dialog-media.component.scss",
    "shared/js/cyph/services/material-dialog.service.ts",
]
report["dialog_cyph_read_only_source_sanity"] = {
    "root": str(cyph_root),
    "observed_head": "fea86b9717fa3f7943a7fd8eb6bb03ef09592f6b",
    "files": [
        {"path": path, "sha256": hashlib.sha256((cyph_root / path).read_bytes()).hexdigest(),
         "bytes": len((cyph_root / path).read_bytes())}
        for path in cyph_paths
    ],
    "read_scope": "Selected dialog selectors, sizing/section overrides and service imports/ref usage;source sanity only,not consumer build or rendered geometry.",
    "observations": [
        "cyph.base.scss targets mat-dialog-container directly and as the direct child of cyph-large-dialog,including nested element sizing.",
        "Dialog media styles override .mat-dialog-content/.mat-dialog-actions and the mat-dialog-actions attribute selector.",
        "Material dialog service imports MatLegacyDialog/MatLegacyDialogRef,tests instanceof MatDialogRef and uses addPanelClass for cyph-large-dialog.",
    ],
    "modified": False,
    "consumer_build_executed": False,
    "native_or_geometry_qualified": False,
}

assert report["substantive_whole_SHA_review_complete"] is False
assert report["current_owned_family_or_minimum_contract_qualified"] is False
assert report["canonical_dispositions_changed"] == report["source_admissions_changed"] == report["product_changes"] == 0
output = root / (prefix + "review-progress-dialog.json")
with output.open("x") as stream:
    stream.write(json.dumps(report, indent=2) + "\n")
print(json.dumps({
    "members_read": 22, "hunks_read": 96, "remaining_files": 50, "remaining_hunks": 233,
    "whole_source_review_complete": False, "canonical_changes": 0, "product_changes": 0,
}))
