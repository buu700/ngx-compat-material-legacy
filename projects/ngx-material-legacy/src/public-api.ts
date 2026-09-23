/**
 * Package root TypeScript facade.
 * Component entry points are secondary packages (e.g. legacy-button).
 * Sass consumers use `@use '@ngx-compat/material-legacy' as mat` via `_index.scss`.
 */
export const NGX_MATERIAL_LEGACY_PACKAGE = '@ngx-compat/material-legacy' as const;

/** Shared NgModule stand-in used by legacy entry NgModules. */
export {MatCommonModule} from './internal/common-module';
