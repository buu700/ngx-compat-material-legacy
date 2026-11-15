# Progress-bar resolved-mode regression

Run with pinned workspace dependencies and a Chromium binary:

    CHROME_BIN=/path/to/chromium node tests/progress-resolved-mode/run.mjs /path/to/extracted/package /path/to/worktree /path/to/new-output

The default runner inventories every regular file in the supplied package, tests an identical temporary copy and verifies both inventories remain unchanged. It AOT-compiles an Angular fixture against that package, links it, and requires nine policy cases across four progress modes, manual outside-DI controls, computed styles, event targeting and destruction to pass. The existing authenticated Chromium helper verifies endpoint and fixture-server shutdown; the existing owned-process supervisor bounds the subprocess group and cleans descendants. The runner exits nonzero on test or cleanup failure. Its report is `result.json` in the new output directory.

This is a focused Chromium regression. It does not rebuild the package or qualify an entire release matrix. Use the independently packed library as input for artifact-bound checks.
