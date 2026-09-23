#!/usr/bin/env python3
"""Copy a historical legacy-* entry into projects/ngx-material-legacy and apply common Angular-22 adaptations."""
from __future__ import annotations

import argparse
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC_ROOT = ROOT / "src" / "material"
DEST_ROOT = ROOT / "projects" / "ngx-material-legacy"
COMMON_BEHAVIORS = DEST_ROOT / "internal" / "common-behaviors"
COMMON_MODULE = DEST_ROOT / "internal" / "common-module.ts"

SKIP_NAMES = {"BUILD.bazel", "BUILD", ".bazelignore"}
SKIP_SUFFIXES = {".spec.ts"}
SKIP_DIRS = {"testing"}  # copy testing separately if requested


def copy_entry(name: str, include_testing: bool = False) -> pathlib.Path:
    src = SRC_ROOT / name
    dest = DEST_ROOT / name
    if not src.is_dir():
        raise SystemExit(f"missing source {src}")
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    for path in src.rglob("*"):
        rel = path.relative_to(src)
        if any(p in SKIP_DIRS for p in rel.parts) and not include_testing:
            continue
        if path.name in SKIP_NAMES:
            continue
        if path.is_file() and path.suffix == ".ts" and path.name.endswith(".spec.ts"):
            continue
        if path.is_dir():
            (dest / rel).mkdir(parents=True, exist_ok=True)
            continue
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)

    (dest / "ng-package.json").write_text('{"lib":{"entryFile":"public-api.ts"}}\n')

    # Shared internals
    internal = dest / "internal"
    internal.mkdir(exist_ok=True)
    shutil.copy2(COMMON_MODULE, internal / "common-module.ts")
    behaviors_dest = internal / "common-behaviors"
    if behaviors_dest.exists():
        shutil.rmtree(behaviors_dest)
    shutil.copytree(COMMON_BEHAVIORS, behaviors_dest)

    adapt_tree(dest)
    return dest


def adapt_tree(dest: pathlib.Path) -> None:
    for path in dest.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix in {".ts", ".scss", ".css", ".html"}:
            text = path.read_text()
            new = adapt_text(text, path.suffix)
            if new != text:
                path.write_text(new)


def adapt_text(text: str, suffix: str) -> str:
    if suffix in {".scss", ".css"}:
        # Historical ../core and sibling material paths → styles facade
        text = re.sub(r"@use\s+'\.\./core/", "@use '../styles/core/", text)
        text = re.sub(r"@import\s+'\.\./core/", "@import '../styles/core/", text)
        text = re.sub(r"@use\s+'\.\./datepicker/", "@use '../styles/datepicker/", text)
        text = re.sub(r"@import\s+'\.\./datepicker/", "@import '../styles/datepicker/", text)
        text = re.sub(r"@use\s+'\.\./divider/", "@use '../styles/divider/", text)
        text = re.sub(r"@import\s+'\.\./divider/", "@import '../styles/divider/", text)
        return text

    if suffix != ".ts":
        return text

    # ANIMATION_MODULE_TYPE moved to @angular/core
    if "from '@angular/platform-browser/animations'" in text and "ANIMATION_MODULE_TYPE" in text:
        text = text.replace(
            "import {ANIMATION_MODULE_TYPE} from '@angular/platform-browser/animations';\n",
            "",
        )
        text = re.sub(
            r"import \{([^}]*)\} from '@angular/platform-browser/animations';\n",
            lambda m: (
                ""
                if m.group(1).strip() == "ANIMATION_MODULE_TYPE"
                else "import {"
                + ",".join(
                    n.strip()
                    for n in m.group(1).split(",")
                    if n.strip() and n.strip() != "ANIMATION_MODULE_TYPE"
                )
                + "} from '@angular/platform-browser/animations';\n"
            ),
            text,
        )
        m = re.search(r"import \{([^}]+)\} from '@angular/core';", text, re.S)
        if m:
            names = [n.strip() for n in m.group(1).replace("\n", " ").split(",") if n.strip()]
            if "ANIMATION_MODULE_TYPE" not in names:
                names.insert(0, "ANIMATION_MODULE_TYPE")
                replacement = "import {\n  " + ",\n  ".join(names) + ",\n} from '@angular/core';"
                text = text[: m.start()] + replacement + text[m.end() :]
        else:
            text = "import {ANIMATION_MODULE_TYPE} from '@angular/core';\n" + text

    # MatCommonModule / mixins from material/core → local
    text = re.sub(
        r"import \{([^}]+)\} from '@angular/material/core';",
        lambda m: rewrite_material_core_import(m.group(1)),
        text,
    )

    # styleUrls .css → .scss
    text = re.sub(r"styleUrls:\s*\[([^\]]+)\]", rewrite_style_urls, text)

    # Add standalone:false to @Component/@Directive that lack it
    text = add_standalone_false(text)

    # Package-local legacy-* imports
    text = text.replace(
        "from '@angular/material/legacy-core'",
        "from '@ngx-compat/material-legacy/legacy-core'",
    )
    text = text.replace(
        "from '@angular/material/legacy-form-field'",
        "from '@ngx-compat/material-legacy/legacy-form-field'",
    )
    text = text.replace(
        "from '@angular/material/legacy-button'",
        "from '@ngx-compat/material-legacy/legacy-button'",
    )
    text = text.replace(
        "from '@angular/material/legacy-input'",
        "from '@ngx-compat/material-legacy/legacy-input'",
    )
    text = text.replace(
        "from '@angular/material/legacy-select'",
        "from '@ngx-compat/material-legacy/legacy-select'",
    )
    text = text.replace(
        "from '@angular/material/legacy-tooltip'",
        "from '@ngx-compat/material-legacy/legacy-tooltip'",
    )
    text = text.replace(
        "from '@angular/material/legacy-paginator'",
        "from '@ngx-compat/material-legacy/legacy-paginator'",
    )

    # Ensure public-api exports MatCommonModule when module uses it
    return text


def rewrite_material_core_import(inner: str) -> str:
    names = [n.strip() for n in inner.split(",") if n.strip()]
    keep_on_material = []
    local_behaviors = []
    local_common = []
    ripple = []
    behavior_names = {
        "CanColor",
        "CanDisable",
        "CanDisableRipple",
        "CanUpdateErrorState",
        "mixinColor",
        "mixinDisabled",
        "mixinDisableRipple",
        "mixinErrorState",
        "mixinInitialized",
        "mixinTabIndex",
        "HasInitialized",
        "HasTabIndex",
    }
    for n in names:
        base = n.split(" as ")[0].strip()
        if base == "MatCommonModule":
            local_common.append(n)
        elif base in behavior_names:
            local_behaviors.append(n)
        elif base in {"MatRipple", "MatRippleModule"}:
            ripple.append(n)
        else:
            keep_on_material.append(n)

    parts = []
    if ripple or keep_on_material:
        parts.append(
            "import {"
            + ", ".join(ripple + keep_on_material)
            + "} from '@angular/material/core';"
        )
    if local_behaviors:
        parts.append(
            "import {"
            + ", ".join(local_behaviors)
            + "} from './internal/common-behaviors';"
        )
    if local_common:
        parts.append(
            "import {MatCommonModule} from './internal/common-module';"
        )
    return "\n".join(parts) if parts else ""


def rewrite_style_urls(m: re.Match) -> str:
    inner = m.group(1)
    inner = re.sub(r"\.css(['\"])", r".scss\1", inner)
    return f"styleUrls: [{inner}]"


def add_standalone_false(text: str) -> str:
    def repl(m: re.Match) -> str:
        body = m.group(0)
        if "standalone:" in body:
            return body
        # insert after opening brace of decorator config
        return re.sub(r"@ (Component|Directive)\(\{", lambda mm: mm.group(0), body)

    # More reliable: for each @Component({ or @Directive({ block until }), add standalone
    out = []
    i = 0
    while i < len(text):
        m = re.search(r"@(Component|Directive)\(\{", text[i:])
        if not m:
            out.append(text[i:])
            break
        start = i + m.start()
        out.append(text[i:start])
        # find matching close for the config object
        j = i + m.end() - 1  # at '{'
        depth = 0
        k = j
        while k < len(text):
            ch = text[k]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        block = text[start : k + 1]
        if "standalone:" not in block:
            # insert after first {
            brace = block.find("{")
            block = block[: brace + 1] + "\n  standalone: false," + block[brace + 1 :]
        out.append(block)
        i = k + 1
    return "".join(out)


def ensure_public_api_common(dest: pathlib.Path) -> None:
    pub = dest / "public-api.ts"
    if not pub.exists():
        return
    text = pub.read_text()
    if "MatCommonModule" in text and "internal/common-module" not in text:
        if not text.endswith("\n"):
            text += "\n"
        text += "export {MatCommonModule} from './internal/common-module';\n"
        pub.write_text(text)
    elif "MatCommonModule" not in text:
        # modules typically need it
        if not text.endswith("\n"):
            text += "\n"
        text += "export {MatCommonModule} from './internal/common-module';\n"
        pub.write_text(text)


def update_tsconfig(names: list[str]) -> None:
    tsconfig = DEST_ROOT / "tsconfig.lib.json"
    import json

    data = json.loads(tsconfig.read_text())
    include = data.setdefault("include", [])
    for name in names:
        entry = f"{name}/**/*.ts"
        if entry not in include:
            include.append(entry)
    tsconfig.write_text(json.dumps(data, indent=2) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("entries", nargs="+")
    ap.add_argument("--testing", action="store_true")
    args = ap.parse_args()
    for name in args.entries:
        if not name.startswith("legacy-"):
            raise SystemExit(f"expected legacy-* name, got {name}")
        dest = copy_entry(name, include_testing=args.testing)
        ensure_public_api_common(dest)
        print(f"ported {name} -> {dest}")
    update_tsconfig(args.entries)


if __name__ == "__main__":
    main()
