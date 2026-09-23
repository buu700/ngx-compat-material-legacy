# 4. Motion, public API reuse and interoperation

## Remove the engine as ordinary adaptation work

No required separate animation phase. Use upstream native-motion work as component-specific precedents [ANIM-01–ANIM-09]. The released package, its declarations and testing entry points must function with `@angular/animations` and `@angular/platform-browser/animations` absent. The isolated historical oracle can use old dependencies; they are not shipped.

Current inspected Material exports public `MATERIAL_ANIMATIONS` and `AnimationsConfig` with `animationsDisabled`; its internal algorithm also examines public Angular-core `ANIMATION_MODULE_TYPE` and reduced-motion media state [MOTION-01]. Consume the token identity and implement owned state detection using public APIs. Do not call `_getAnimationsState` or `_animationsDisabled`. Do not create a competing global motion token unless a documented missing capability requires it. Verify the selected published peer versions expose the required public surface.

Preserve component-specific durations and disable options. Define tested precedence for component settings, global disabled configuration, legacy no-op provider token (read-only interoperability) and reduced-motion preference. Do not import the old provider to inspect that preference. Scope media listeners/SSR state correctly: do not blindly copy a process-global browser preference cache into server rendering. Record reduced-motion differences as accessibility behavior, not an invisible baseline change. `@.disabled` metadata is not guaranteed to affect new motion; diagnostics must explain the alternative.

## Native lifecycle recipe

Prefer CSS transitions/keyframes for simple motion; use WAAPI or narrow imperative measurement where legacy DOM prevents a CSS-only solution. New wrappers, MDC classes or current component template transplants are not acceptable shortcuts. New Angular enter/leave primitives are optional, not an architectural dependency goal.

Each owned controller has explicit opening/open/closing/closed state, an operation generation/cancellation handle, exactly-once completion, filtered element/property events, cleanup, zero-duration behavior and a bounded fallback when browser events do not arrive. Preserve public event ordering and appropriate overlay/focus lifetime; test interrupted/reversed transitions, hidden content, detached nodes, reduced motion, invalid durations and zoneless scheduling. A fallback timer is not permission to guess all real timing.

Old engine-generated trigger attributes/classes and inline end-state styles can be observed by application CSS. Inventory them in actual baseline renders. Preserve meaningful hooks or declare exact exceptions; checking only static HTML and `.mat-*` classes is not sufficient.

## Animation API exceptions

Maintain useful curve/duration/configuration APIs without the engine. Recipe objects typed as `AnimationTriggerMetadata` are not truthful replacements for browser keyframes: consumer compiler/runtime semantics give them meaning. Preserve an equivalent API only when it has usable independent semantics; give it an honest type and working example. No empty objects, faux legacy metadata, or implicit old-engine peer.

Every exception requires exact symbol/member, old usage, why preservation is impractical, before/after executable example, limits and diagnostic ID. A component-only consumer should not have to author new animations. Direct recipe consumers need more than “use CSS.” The schematic does not delete their application providers/triggers.

## Public infrastructure and identity

Use `research/legacy-core-delegation.json` as a preclassified seed. Alias shared date services/tokens to the actual upstream object; removed mixins become owned minimal helpers; option/optgroup renderers remain owned. Behavior-sensitive ripple/line/pseudo-checkbox candidates require proof before delegation. Plain package export presence is not proof of supported API, and a method beginning `_` is not acceptable just because a class is public.

`LEGACY_VERSION` is a historical true alias of Material core `VERSION`; preserve that alias and runtime identity when the selected peer still exposes the stable public symbol. It therefore reports the **peer Angular Material version**, just as it did historically. If package self-identification is useful, expose a separately named `NGX_MATERIAL_LEGACY_VERSION` owned by this project rather than changing historical semantics.

Own `LegacyThemePalette` locally as the historical structural type (`'primary' | 'accent' | 'warn' | undefined`) rather than depending on an upstream M2-oriented type. There is no runtime type identity to preserve. Preserve the historical runtime color mixin permissiveness: arbitrary string values that old consumers forced through the type still produced `mat-${value}` classes. Add tests for `primary`, `accent`, `warn`, `undefined`, and at least one arbitrary value such as `none`; do not “improve” compatibility by runtime-validating the union.

Keep other historical aliases that preserve runtime/DI identity; do not merge historically distinct legacy defaults/configuration tokens. Record native date formatting changes inherited upstream rather than claiming byte-identical date rendering.

## Mandatory mixed-stack fixtures

Use `research/interop-matrix.json`. Especially important:

- Current datepicker + legacy input/form-field + legacy date-module aliases: value accessor, label/floating state, error descriptions, popup origin, date filter/range and focus restoration.
- Current sort + legacy table/paginator: token/provider identity, data-source contracts, sticky rows, changed definitions and lazy updates.
- Current icons inside legacy controls: inherited typography/dimensions, external selectors, font and SVG mode.
- Current components inside legacy dialog/menu overlay scopes: theme inheritance, portals, injection hierarchy, disposal and z-index.
- Separate modern and legacy component scopes sharing public infrastructure: no duplicate implementation matches. Detect duplicate selector families; actual Angular error mode differs by component/directive.

If a current protocol needs absent legacy behavior, implement a narrow owned public-interface adapter and test it. Never patch a current private method, add `any` to hide the contract, or copy the ordinary component. Any unresolved case is a blocker or explicit unsupported scenario, not assumed compatible.
