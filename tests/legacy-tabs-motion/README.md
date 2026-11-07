# Packed legacy tabs motion regression

This fixture exercises the public MatLegacyTabGroup with the packaged library and its compiled theme CSS. It observes real Chromium transforms, widths, transition events, selection outputs, and lazy tab content lifecycle.

Prepare the workspace with the pinned toolchain, then use a fresh output directory for each baseline or mutation run:

    just chainman exec -- node tests/legacy-tabs-motion/prepare.mjs --run artifacts/main/<run>/run.json --out /path/to/tabs-motion-baseline
    LEGACY_RUN_JSON=artifacts/main/<run>/run.json LEGACY_PACKAGE_IDENTITY=/path/to/tabs-motion-baseline/package-identity.json just chainman exec -- node tests/legacy-tabs-motion/build.mjs
    just chainman exec -- node tests/legacy-tabs-motion/identity-negative-controls.mjs --run artifacts/main/<run>/run.json --package-identity /path/to/tabs-motion-baseline/package-identity.json --build-identity tests/legacy-tabs-motion/dist/build-identity.json --out /path/to/tabs-motion-identity-controls
    LEGACY_RUN_JSON=artifacts/main/<run>/run.json LEGACY_PACKAGE_IDENTITY=/path/to/tabs-motion-baseline/package-identity.json LEGACY_BUILD_IDENTITY=tests/legacy-tabs-motion/dist/build-identity.json EVIDENCE_DIR=/path/to/tabs-motion-baseline/browser CHROME_BIN=/path/to/pinned/chromium just chainman exec -- node tests/legacy-tabs-motion/run.mjs

The prepare step checks the run manifest's library byte count and SHA-256 before extraction. Build and run verify the run bytes, extracted package tree, FESM, package symlink, package-identity hash, app bundle, theme CSS, and generated HTML identity. The identity-controls script checks swapped-run, changed-package, stale-app, stale-theme, stale-HTML, and stale-build rejects. The capture mutant disables computed-transform capture in the extracted FESM; the stale-end mutant disables the reversed-transition deadline guard. These changes are limited to the extracted package under the output directory.

The runner has bounded waits and writes report.json under EVIDENCE_DIR. It uses the actual package's styles and public group inputs and outputs. The fixture does not qualify tagged visual parity, nested tab groups, the full browser matrix, or peer/runtime floors.
