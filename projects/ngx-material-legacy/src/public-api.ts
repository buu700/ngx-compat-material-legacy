/**
 * Package root TypeScript facade.
 * Component entry points are secondary packages (e.g. legacy-button).
 * Sass consumers use `@use '@ngx-compat/material-legacy' as mat` via `_index.scss`.
 */
export const NGX_MATERIAL_LEGACY_PACKAGE = '@ngx-compat/material-legacy' as const;

/** Shared legacy NgModule. */
export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
