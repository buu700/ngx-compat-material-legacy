# Motion / animation decisions — overlay trio (2026-09-23)

Handoff policy: remove the deprecated animation engine from published runtime
where required; preserve meaningful APIs with tested migrations; no fake
metadata; use public `MATERIAL_ANIMATIONS` when present; never call private
`_getAnimationsState`.

## Decision for this port wave

Full motion removal would block shipping `legacy-dialog` / `legacy-menu` /
`legacy-select` / `legacy-form-field` panel contracts that historically bind
Angular animation triggers (`[@dialogContainer]`, `transformMenu`,
`fadeInItems`, select panel transforms, form-field message transitions).

Therefore this wave **owns historical animation metadata locally** rather than
depending on removed upstream Material 22 exports:

| Entry | Owned metadata | Notes |
| --- | --- | --- |
| `legacy-dialog` | `matDialogAnimations`, `_defaultParams` / `defaultParams` | Container keeps `@angular/animations` triggers; peer remains optional. |
| `legacy-menu` | `matMenuAnimations`, `fadeInItems`, `transformMenu` | Same approach as dialog. |
| `legacy-autocomplete` | `_animationDone = null` on legacy panel (historical) | Legacy autocomplete intentionally skips panel exit animation stream. |
| `legacy-select` / `legacy-form-field` | already owned earlier | Unchanged this wave. |

Inspector flags for `@angular/animations` references are **expected** until a
follow-up migration removes engine-bound recipes with tested CSS/`animate`
alternatives. Do not delete trigger APIs without a consumer migration path.
