# Checkbox exhaustive-check regression

The ordinary coercion and click expectations come from the untouched Material
16.2.14 `src/material/checkbox/checkbox.ts` setter and click handler. The
destruction assertion checks the add-on's owned cancellation behavior. This
fixture does not execute the original Material 16 implementation on Angular 22.

The caller supplies an extracted package, the pinned workspace and a fresh output directory:

```sh
CHROME_BIN=/path/to/chromium node tests/checkbox-exhaustive/run.mjs PACKAGE_ROOT WORKSPACE NEW_OUT
```

Use `nix develop --command` for the workspace toolchain. The caller is responsible for verifying the extracted package against its packed artifact; this runner does not accept a tarball or claim an artifact association. It inventories the supplied package, tests identical temporary copies, records all file hashes, and checks the source and tested copies for changes. The two independently supervised Chromium runs and their results are in `NEW_OUT/zoneless` and `NEW_OUT/zoneful`. An error, missing positive control, changed inventory, failed assertion or failed child exits nonzero. `summary.json` is only written after both pass.

Angular AOT and the linker compile a real application with OnPush case hosts and OnPush legacy checkbox children. The fixture uses `provideCheckNoChangesConfig({exhaustive:true, interval:20})` (an Angular developer-preview test setting), with a deliberately unnotified OnPush positive control that must produce NG0100. Each checkbox state gets an 80 ms interval window. Bound input cases cover true, false, empty string, string false, null, 1, and 0, including historical event counts from pre-coercion comparison. Native clicks cover default, `check`, and `noop` actions. Assertions include event order, deferred reset, and destruction during the synchronous change callback. The event assertions follow the untouched Material 16 reference setter and click handler, including comparison before coercion and the queued default reset. The `check` case deliberately retains the historical native-indeterminate/component-state divergence. This fixture is focused browser evidence; it is not a full product, accessibility, cross-browser or release gate.
