# Packed table owner association probe

Run with pinned Node, installed peer dependencies, and `CHROME_BIN` set to a usable Chromium executable:

```sh
node tests/table-owner-association/run.mjs --tarball PATH --sha256 LOWERCASE_SHA256 --peer-root NODE_MODULES --out NEW_DIRECTORY
```

The runner extracts the artifact twice, checks strict AOT and linked browser rendering with nested legacy and CDK tables, then changes the owner assignment to null in the second extraction. It verifies six owner nodes, typed definition counts, rendered text, one self-provided CDK definition at each actual owner node, and the nearest table association. Both variants must render, and the mutation must be detected in both nested cases. Results and logs are written under the new output directory. It does not install or publish packages. It requires the repository's esbuild and browser helper. `TABLE_OWNER_WORKSPACE` may point to the repository root when running a copy outside it.

During initial development, `@ViewChildren(_LegacyTableDefinitionOwner, {read: Injector})` returned zero values despite six owner instances. The final fixture queries each owner's `ElementRef` and uses Angular's public `getDebugNode` to access that actual node's injector; no structural anchor traversal is used. The initial diagnostic is recorded in the accompanying audit receipt, not treated as a passing association check.
