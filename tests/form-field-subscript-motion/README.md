# Form-field motion packed-artifact regression

Run with the pinned workspace Node and dependencies, a fully installed peer `node_modules` directory compatible with the workspace toolchain, and Chromium configured as for the workspace browser helper:

```sh
node tests/form-field-subscript-motion/run.mjs --tarball /path/to/package.tgz --sha256 <sha256> --peer-root /path/to/node_modules --workspace /path/to/repository --out /path/to/new-output-directory
```

The output directory must not exist. The command checks the specified tarball digest before and during testing, extracts it once, then AOT-compiles strict fixtures, applies the Angular linker and bundles them, and runs actual CSS motion, boundary lifecycle, and nested-field ownership checks. It fails on the first failure. Dependencies are supplied explicitly; it does not install or publish anything. Browser reports and the final success record are written under the output directory. The checks set CSS transition currentTime to inspect interpolation and do not prove wall-clock timing, SSR, hydration, or other browsers.

The nested probe asserts ownership of the animated message; the boundary probe checks transition count for the same-kind batch. Original attempts, including failed timing probes and the broad-query mutation control, are retained separately in the qualification archive.

The server regression requires a peer directory that also includes the matching `@angular/platform-server`:

```sh
node tests/form-field-subscript-motion/run-ssr.mjs --tarball /path/to/package.tgz --sha256 <sha256> --peer-root /path/to/node_modules --out /path/to/new-server-output-directory
```

It runs a strict AOT application on Angular platform-server, checks hint/error changes, removal/recreation, accessibility relationships and teardown, and traps geometry reads. Partially compiled dependencies use Angular JIT. Neither command qualifies hydration or a complete release gate.
