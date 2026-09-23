#!/usr/bin/env python3
"""Port remaining legacy-*/testing secondary entries; own removed M16 harness bases."""
from __future__ import annotations

import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "src" / "material"
DEST = ROOT / "projects" / "ngx-material-legacy"

ENTRIES = [
    "legacy-radio",
    "legacy-slide-toggle",
    "legacy-card",
    "legacy-chips",
    "legacy-list",
    "legacy-slider",
    "legacy-progress-bar",
    "legacy-progress-spinner",
    "legacy-snack-bar",
    "legacy-table",
    "legacy-tabs",
    "legacy-tooltip",
    "legacy-autocomplete",
    "legacy-paginator",
]

OWNED = {
    # dest_name: (source_rel, start_markers, end_before_markers, extra_tail_markers, imports)
    "legacy-radio": {
        "file": "radio-harness-base.ts",
        "source": "radio/testing/radio-harness.ts",
        "slices": [
            # (start_inclusive_regex, end_exclusive_regex or None for EOF-of-class via brace)
            (r"^export abstract class _MatRadioGroupHarnessBase\b", r"^/\*\* Harness for interacting with an MDC-based mat-radio-group"),
            (r"^export abstract class _MatRadioButtonHarnessBase\b", r"^/\*\* Harness for interacting with an MDC-based mat-radio-button"),
        ],
        "imports": """import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {
  AsyncFactoryFn,
  BaseHarnessFilters,
  ComponentHarness,
  ComponentHarnessConstructor,
  HarnessPredicate,
  TestElement,
} from '@angular/cdk/testing';
""",
    },
    "legacy-slide-toggle": {
        "file": "slide-toggle-harness-base.ts",
        "source": "slide-toggle/testing/slide-toggle-harness.ts",
        "slices": [
            (r"^export abstract class _MatSlideToggleHarnessBase\b", r"^/\*\* Harness for interacting with a MDC-based mat-slide-toggle"),
        ],
        "imports": """import {
  AsyncFactoryFn,
  ComponentHarness,
  TestElement,
} from '@angular/cdk/testing';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
""",
    },
    "legacy-snack-bar": {
        "file": "snack-bar-harness-base.ts",
        "source": "snack-bar/testing/snack-bar-harness.ts",
        "slices": [
            (r"^export abstract class _MatSnackBarHarnessBase\b", r"^/\*\* Harness for interacting with an MDC-based mat-snack-bar"),
        ],
        "imports": """import {ContentContainerComponentHarness, parallel} from '@angular/cdk/testing';
import {AriaLivePoliteness} from '@angular/cdk/a11y';
""",
    },
    "legacy-tooltip": {
        "file": "tooltip-harness-base.ts",
        "source": "tooltip/testing/tooltip-harness.ts",
        "slices": [
            (r"^export abstract class _MatTooltipHarnessBase\b", r"^/\*\* Harness for interacting with a standard mat-tooltip"),
        ],
        "imports": """import {AsyncFactoryFn, ComponentHarness, TestElement} from '@angular/cdk/testing';
""",
    },
    "legacy-autocomplete": {
        "file": "autocomplete-harness-base.ts",
        "source": "autocomplete/testing/autocomplete-harness.ts",
        "slices": [
            (r"^export abstract class _MatAutocompleteHarnessBase\b", r"^/\*\* Harness for interacting with an MDC-based mat-autocomplete"),
        ],
        "imports": """import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {
  BaseHarnessFilters,
  ComponentHarness,
  ComponentHarnessConstructor,
  HarnessPredicate,
  TestElement,
} from '@angular/cdk/testing';
""",
    },
    "legacy-paginator": {
        "file": "paginator-harness-base.ts",
        "source": "paginator/testing/paginator-harness.ts",
        "slices": [
            (r"^export abstract class _MatPaginatorHarnessBase\b", r"^/\*\* Harness for interacting with an MDC-based mat-paginator"),
        ],
        "imports": """import {
  AsyncFactoryFn,
  ComponentHarness,
  TestElement,
} from '@angular/cdk/testing';
import {coerceNumberProperty} from '@angular/cdk/coercion';
""",
    },
    "legacy-table": {
        "file": "table-harness-base.ts",
        "source": "table/testing/table-harness.ts",
        "slices": [
            # include MatTableHarnessColumnsText + RowBase + class + helper after concrete class
            (r"^/\*\* Text extracted from a table organized by columns\.", r"^/\*\* Harness for interacting with an MDC-based mat-table"),
        ],
        "tail_from": (r"^/\*\* Extracts the text of cells only under a particular column\.", None),
        "imports": """import {
  ComponentHarness,
  ComponentHarnessConstructor,
  ContentContainerComponentHarness,
  HarnessPredicate,
  parallel,
} from '@angular/cdk/testing';
import {
  MatRowHarnessColumnsText,
  RowHarnessFilters,
} from '@angular/material/table/testing';
""",
    },
}

HEADER = """/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 harness base(s) removed from Angular Material 22.
 */

"""

SKIP_NAMES = {"BUILD.bazel", "BUILD"}


def slice_by_markers(text: str, start_re: str, end_re: str | None) -> str:
    lines = text.splitlines(keepends=True)
    start = None
    end = len(lines)
    for i, line in enumerate(lines):
        if start is None and re.search(start_re, line):
            start = i
            continue
        if start is not None and end_re and re.search(end_re, line):
            end = i
            break
    if start is None:
        raise SystemExit(f"start not found: {start_re}")
    return "".join(lines[start:end]).rstrip() + "\n"


def copy_testing(entry: str) -> pathlib.Path:
    src = SRC / entry / "testing"
    dest = DEST / entry / "testing"
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for path in src.rglob("*"):
        if not path.is_file():
            continue
        if path.name in SKIP_NAMES or path.name.endswith(".spec.ts"):
            continue
        rel = path.relative_to(src)
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    (dest / "ng-package.json").write_text('{"lib":{"entryFile":"public-api.ts"}}\n')
    return dest


def write_owned_base(entry: str, dest: pathlib.Path) -> None:
    cfg = OWNED.get(entry)
    if not cfg:
        return
    src_text = (SRC / cfg["source"]).read_text()
    parts = []
    for start_re, end_re in cfg["slices"]:
        parts.append(slice_by_markers(src_text, start_re, end_re))
    if cfg.get("tail_from"):
        start_re, end_re = cfg["tail_from"]
        parts.append(slice_by_markers(src_text, start_re, end_re))
    body = cfg["imports"] + "\n" + "\n".join(parts)
    (dest / cfg["file"]).write_text(HEADER + body)
    print(f"  owned {cfg['file']}")


def adapt_files(entry: str, dest: pathlib.Path) -> None:
    simple = [
        (
            "from '@angular/material/legacy-core/testing'",
            "from '@ngx-compat/material-legacy/legacy-core/testing'",
        ),
        (
            "from '@angular/material/legacy-select/testing'",
            "from '@ngx-compat/material-legacy/legacy-select/testing'",
        ),
        (
            "from '@angular/material/legacy-list'",
            "from '@ngx-compat/material-legacy/legacy-list'",
        ),
        (
            "from '@angular/material/legacy-progress-spinner'",
            "from '@ngx-compat/material-legacy/legacy-progress-spinner'",
        ),
    ]

    for path in sorted(dest.rglob("*.ts")):
        text = path.read_text()
        orig = text
        for a, b in simple:
            text = text.replace(a, b)

        if entry == "legacy-radio" and path.name == "radio-harness.ts":
            text = text.replace(
                """import {
  RadioButtonHarnessFilters,
  RadioGroupHarnessFilters,
  _MatRadioGroupHarnessBase,
  _MatRadioButtonHarnessBase,
} from '@angular/material/radio/testing';""",
                """import {
  RadioButtonHarnessFilters,
  RadioGroupHarnessFilters,
} from '@angular/material/radio/testing';
import {
  _MatRadioGroupHarnessBase,
  _MatRadioButtonHarnessBase,
} from './radio-harness-base';""",
            )

        if entry == "legacy-slide-toggle":
            if path.name == "slide-toggle-harness.ts":
                text = text.replace(
                    """import {
  _MatSlideToggleHarnessBase,
  SlideToggleHarnessFilters,
} from '@angular/material/slide-toggle/testing';""",
                    """import {SlideToggleHarnessFilters} from '@angular/material/slide-toggle/testing';
import {_MatSlideToggleHarnessBase} from './slide-toggle-harness-base';""",
                )
            if path.name == "public-api.ts":
                text = """/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacySlideToggleHarness} from './slide-toggle-harness';
export {
  /**
   * @deprecated Use `_MatSlideToggleHarnessBase` from `@angular/material/slide-toggle/testing` instead.
   * @breaking-change 17.0.0
   */
  _MatSlideToggleHarnessBase as _MatLegacySlideToggleHarnessBase,
} from './slide-toggle-harness-base';
export {
  /**
   * @deprecated Use `SlideToggleHarnessFilters` from `@angular/material/slide-toggle/testing` instead.
   * @breaking-change 17.0.0
   */
  SlideToggleHarnessFilters as LegacySlideToggleHarnessFilters,
} from '@angular/material/slide-toggle/testing';
"""

        if entry == "legacy-snack-bar" and path.name == "snack-bar-harness.ts":
            text = text.replace(
                "import {_MatSnackBarHarnessBase, SnackBarHarnessFilters} from '@angular/material/snack-bar/testing';",
                "import {SnackBarHarnessFilters} from '@angular/material/snack-bar/testing';\n"
                "import {_MatSnackBarHarnessBase} from './snack-bar-harness-base';",
            )

        if entry == "legacy-tooltip" and path.name == "tooltip-harness.ts":
            text = text.replace(
                "import {_MatTooltipHarnessBase, TooltipHarnessFilters} from '@angular/material/tooltip/testing';",
                "import {TooltipHarnessFilters} from '@angular/material/tooltip/testing';\n"
                "import {_MatTooltipHarnessBase} from './tooltip-harness-base';",
            )

        if entry == "legacy-autocomplete" and path.name == "autocomplete-harness.ts":
            text = text.replace(
                "import {_MatAutocompleteHarnessBase} from '@angular/material/autocomplete/testing';",
                "import {_MatAutocompleteHarnessBase} from './autocomplete-harness-base';",
            )

        if entry == "legacy-paginator":
            if path.name == "paginator-harness.ts":
                text = text.replace(
                    """import {
  _MatPaginatorHarnessBase,
  PaginatorHarnessFilters,
} from '@angular/material/paginator/testing';""",
                    """import {PaginatorHarnessFilters} from '@angular/material/paginator/testing';
import {_MatPaginatorHarnessBase} from './paginator-harness-base';""",
                )
            if path.name == "public-api.ts":
                text = """/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyPaginatorHarness} from './paginator-harness';
export {
  /**
   * @deprecated Use `_MatPaginatorHarnessBase` from `@angular/material/paginator/testing` instead.
   * @breaking-change 17.0.0
   */
  _MatPaginatorHarnessBase as _MatLegacyPaginatorHarnessBase,
} from './paginator-harness-base';
export {
  /**
   * @deprecated Use `PaginatorHarnessFilters` from `@angular/material/paginator/testing` instead.
   * @breaking-change 17.0.0
   */
  PaginatorHarnessFilters as LegacyPaginatorHarnessFilters,
} from '@angular/material/paginator/testing';
"""

        if entry == "legacy-table":
            if path.name == "table-harness.ts":
                text = text.replace(
                    "import {_MatTableHarnessBase, TableHarnessFilters} from '@angular/material/table/testing';",
                    "import {TableHarnessFilters} from '@angular/material/table/testing';\n"
                    "import {_MatTableHarnessBase} from './table-harness-base';",
                )
            if path.name == "public-api.ts":
                # Split re-export: keep cell/row bases + filters/types from material;
                # export table base from local owned file.
                text = """/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyTableHarness} from './table-harness';
export {
  MatLegacyRowHarness,
  MatLegacyHeaderRowHarness,
  MatLegacyFooterRowHarness,
} from './row-harness';
export {
  MatLegacyCellHarness,
  MatLegacyHeaderCellHarness,
  MatLegacyFooterCellHarness,
} from './cell-harness';
export {
  /**
   * @deprecated Use `_MatTableHarnessBase` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  _MatTableHarnessBase as _MatLegacyTableHarnessBase,
} from './table-harness-base';
export {
  /**
   * @deprecated Use `CellHarnessFilters` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  CellHarnessFilters as LegacyCellHarnessFilters,

  /**
   * @deprecated Use `RowHarnessFilters` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  RowHarnessFilters as LegacyRowHarnessFilters,

  /**
   * @deprecated Use `TableHarnessFilters` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  TableHarnessFilters as LegacyTableHarnessFilters,

  /**
   * @deprecated Use `MatRowHarnessColumnsText` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  MatRowHarnessColumnsText as MatLegacyRowHarnessColumnsText,

  /**
   * @deprecated Use `MatTableHarnessColumnsText` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  MatTableHarnessColumnsText as MatLegacyTableHarnessColumnsText,

  /**
   * @deprecated Use `_MatCellHarnessBase` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  _MatCellHarnessBase as _MatLegacyCellHarnessBase,

  /**
   * @deprecated Use `_MatRowHarnessBase` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  _MatRowHarnessBase as _MatLegacyRowHarnessBase,
} from '@angular/material/table/testing';
"""

        if text != orig:
            path.write_text(text)
            print(f"  adapted {path.relative_to(DEST)}")


def main() -> None:
    for entry in ENTRIES:
        print(f"porting {entry}/testing")
        dest = copy_testing(entry)
        write_owned_base(entry, dest)
        adapt_files(entry, dest)
    print("done")


if __name__ == "__main__":
    main()
