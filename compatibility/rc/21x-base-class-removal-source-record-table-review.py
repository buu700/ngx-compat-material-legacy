# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Append table original-hunk reading, preserving the full pending assessment."""

import gzip
import hashlib
import json
from pathlib import Path


root = Path.cwd()
prefix = "compatibility/rc/21x-base-class-removal-source-"
original = json.loads(gzip.decompress((root / (prefix + "originals.json.gz")).read_bytes()))
prior = root / (prefix + "review-progress-select-slide-snack.json")
report = json.loads(prior.read_bytes())
assert (report["original_members_read"], report["original_hunks_read"]) == (54, 246)

notes = {
    "src/material/table/table-data-source.ts": [
        "Adds concrete current MatPaginator/PageEvent imports. Tagged/actual legacy table data source instead specializes the locally owned historical generic base with MatLegacyPaginator; preserve that consumer type path.",
        "Deletes the shared page-event/paginator interfaces and generic base, replacing them with MatTableDataSource<P extends MatPaginator>. Actual owned base retains both finite historical interfaces and its generic constraint. Actual minimum21 current data source is also coupled to MatPaginator; this is a substantive public type/extension change, not just class renaming.",
        "Changes pagination stream annotations/casts from shared page-event protocol to current PageEvent. The event payload is only used as a pipeline signal here; the actual owned base retains its historical event interface. Final behavior/floor qualification is separate from observing the unchanged operator body.",
        "Deletes the thin current data-source wrapper after moving its implementation into the narrowed concrete class. Tagged/actual legacy wrapper still needs the locally owned generic base for MatLegacyPaginator. Cyph directly constructs the legacy data source and assigns its legacy paginator; modern type coupling would alter this consumer path.",
    ],
    "src/material/table/testing/cell-harness.ts": [
        "Comment-only change removes MDC-based wording for the current cell harness. Its current .mat-mdc-cell selector and implementation are unchanged;actual/tagged legacy cell remains .mat-cell.",
        "Comment-only change removes MDC-based wording for the current header-cell harness. It does not change .mat-mdc-header-cell or authorize replacing the historical .mat-header-cell locator.",
        "Comment-only change removes MDC-based wording for the current footer-cell harness. The retained legacy .mat-footer-cell selector and owned shared helper remain distinct;no runtime/type change is introduced by this hunk.",
    ],
    "src/material/table/testing/row-harness.ts": [
        "Comment-only change removes MDC-based wording for the current row harness. Actual/tagged legacy still uses .mat-row and its legacy cell harness type;current implementation is unchanged here.",
        "Comment-only change removes MDC-based wording for the current header-row harness. It does not alter the current locator or retained .mat-header-row/legacy header-cell protocol.",
        "Comment-only change removes MDC-based wording for the current footer-row harness. No runtime behavior/type change follows;the retained legacy footer row still uses its historical locator/cell harness.",
    ],
    "src/material/table/testing/table-harness.ts": [
        "Removes ComponentHarness import when the current structural RowBase/generic table base disappears. The actual owned generic legacy base still needs that structural row contract.",
        "Replaces RowBase and six generic row/class parameters/protected hooks with concrete current row harnesses, .mat-mdc-table and public header/data row class fields. Actual/tagged legacy uses .mat-table,legacy row classes and protected generic hooks;copying would narrow return types and change lookup behavior.",
        "Deletes the old current wrapper after moving its selector,static predicate and concrete row classes into the flattened harness. Actual legacy wrapper must retain its own header/data/footer row types and historical selector;no current API mirror is added.",
    ],
    "tools/public_api_guard/material/table-testing.md": [
        "Records current table harness/generic-base collapse,concrete modern row returns,loss of protected footer hook and header/data hooks becoming public. Preserve the tagged/actual legacy generic/protected hooks and historical locator types;this current generated API is reference data only.",
    ],
    "tools/public_api_guard/material/table.md": [
        "Adds current MatPaginator and drops shared Observable/Subject imports from generated API after the historical paginator interfaces are deleted. Actual owned legacy finite interface exports remain required for its generic boundary.",
        "Records current data-source wrapper/base collapse and generic constraint narrowing to MatPaginator. Tagged/actual legacy specializes a shared structural paginator protocol with MatLegacyPaginator,which Cyph uses directly;current concrete constraint is not interchangeable.",
        "Deletes public MatTableDataSourcePageEvent/MatTableDataSourcePaginator declarations. Actual owned legacy barrel still exports their historical aliases from its local base;do not drop them or widen an exception to resemble current API.",
    ],
}

seen = {member["path"] for member in report["initial_member_reviews"]}
assert len(notes) == 6
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
assert (len(seen), hunks_read) == (60, 263)
report.update(
    status="in-progress:complete original data authenticated;first60members263hunks read;substantive whole-SHA review incomplete",
    original_members_read=60, original_hunks_read=263,
    original_members_remaining=12, original_hunks_remaining=66,
    remaining_original_members=[
        {"path": section["path"], "hunks": len(section["hunks"]), "patch_sha256": section["patch_sha256"]}
        for section in original["sections"] if section["path"] not in seen
    ],
    prior_review_progress={"path": str(prior.relative_to(root)), "sha256": hashlib.sha256(prior.read_bytes()).hexdigest()},
)

paths = {
    "table-data-source.ts": "Complete legacy data-source wrapper,own generic base import and MatLegacyPaginator specialization;not final strict type/runtime qualification.",
    "internal/table-data-source-base.ts": "Imports,finite historical paginator/page-event interfaces,generic base/data fields,paginator property and pagination subscription;not complete file/family qualification.",
    **{path: "Complete file,legacy table/cell/row harness selectors,generic class hooks or finite historical public aliases;not final API/native qualification."
       for path in ["public-api.ts", "testing/cell-harness.ts", "testing/row-harness.ts", "testing/table-harness.ts", "testing/table-harness-base.ts"]},
}
for relative, scope in paths.items():
    path = "projects/ngx-material-legacy/legacy-table/" + relative
    raw = (root / path).read_bytes()
    report["current_source_leads"].append({"path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "read_scope": scope})
tagged_paths = [
    "src/material/legacy-table/table-data-source.ts", "src/material/legacy-table/testing/cell-harness.ts",
    "src/material/legacy-table/testing/row-harness.ts", "src/material/legacy-table/testing/table-harness.ts",
]
report["table_tagged_members_read"] = [
    {**{key: member[key] for key in ["path", "blob", "sha256", "bytes"]}, "read_scope": "Complete tagged file read."}
    for member in original["tagged_reference"]["members"] if member["path"] in tagged_paths
]
assert len(report["table_tagged_members_read"]) == 4
path = "node_modules/@angular/material/types/table.d.ts"
raw = (root / path).read_bytes()
report["table_minimum_source_leads"] = [{
    "path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
    "read_scope": "Current21.2.14 public MatTableDataSource generic constraint declaration;not complete minimum type/runtime qualification.",
}]
report["table_contract_followups"] = [
    "Final source/minimum proof must retain historical paginator/page-event exports and MatLegacyTableDataSource to MatLegacyPaginator specialization;no current concrete-class constraint substitution.",
    "The six cell/row hunks are comments only;the same whole SHA still has substantive data-source and table-harness type changes requiring individual final assessment.",
    "Preserve legacy harness header/data/footer row return and protected hook types;source reading is not native rendering/API/packed qualification.",
]
for path in ["internal/table-data-source-base.ts", "testing/table-harness-base.ts"]:
    report["maintenance_leads"].append({
        "path": "projects/ngx-material-legacy/legacy-table/" + path,
        "observation": "Existing header lacks Ryan2026notice and describes removal at22although the original is17-era. Later bounded maintenance lead;no product file changed here.",
    })
cyph_root = Path("/home/parallels/cyph")
cyph_files = []
for path in [
    "shared/js/cyph/components/account-base-file-list/account-base-file-list.component.ts",
    "shared/js/cyph/components/account-base-file-list/account-base-file-list.component.html",
    "shared/js/cyph/components/account-wallets/account-wallets.component.html",
]:
    raw = (cyph_root / path).read_bytes()
    cyph_files.append({"path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
report["table_cyph_read_only_sanity"] = {
    "root": str(cyph_root), "files": cyph_files,
    "read_scope": "Selected actual legacy imports,data-source/paginator assignment and table/row/cell/paginator markup;not complete consumer source coverage,build or rendered geometry.",
    "observations": [
        "Account base file list imports MatLegacyTableDataSource and MatLegacyPaginator,constructs the data source and assigns dataSource.paginator to the queried legacy paginator.",
        "Account base file list and wallets use mat-table with matColumnDef,matCellDef and historical row definitions;file list also renders mat-paginator.",
    ],
    "modified": False, "consumer_build_executed": False, "native_or_geometry_qualified": False,
}
assert report["substantive_whole_SHA_review_complete"] is False
assert report["current_owned_family_or_minimum_contract_qualified"] is False
assert report["canonical_dispositions_changed"] == report["source_admissions_changed"] == report["product_changes"] == 0
output = root / (prefix + "review-progress-table.json")
with output.open("x") as stream:
    stream.write(json.dumps(report, indent=2) + "\n")
print(json.dumps({
    "members_read": 60, "hunks_read": 263, "remaining_files": 12, "remaining_hunks": 66,
    "new_original_files": 6, "new_original_hunks": 17,
    "whole_source_review_complete": False, "canonical_changes": 0, "product_changes": 0,
}))
