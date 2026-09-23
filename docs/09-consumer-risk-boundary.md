# 9. Conservative consumer boundary

The library must absorb compatibility work that would otherwise require changing an application's legacy styling. No consuming application's source or deployment is part of this implementation project.

## Synthetic historical patterns to cover

Use the supplied fixtures for old palette lookups (`map.get` at numeric hues), custom foreground/background maps, legacy typography, nested alternative themes, repeated aggregates, individual legacy mixins, and core setup. Add application-style selectors against legacy wrappers, option panels, checkbox frames, dialog containers and tab bodies to the public test lab. They represent common historical customization, not an endorsement of current upstream private CSS.

## What the facade prevents

It prevents accidentally rebinding an old M2 name to an M3 palette, losing formerly emitted core styles, changing theme-map semantics by an automatic rewrite, dropping aggregate members, depending on upstream M2 compatibility that is scheduled to disappear, or forcing selector surgery solely to preserve the owned legacy layer. It does not remove the need to test emitted component styles and runtime states.

## What remains current

Ordinary official components, including expansion/datepicker/icon/sidenav and other historical companions, are not frozen. Their own DOM, spacing, tokens and CSS can evolve. Shared upstream ripple, focus or overlay infrastructure may also affect legacy output. The migration must enumerate these as explicit review areas. A current `.mat-icon` class still existing does not establish every old icon styling assumption.

The facade therefore offers **historical source continuity plus strong owned-layer preservation**, not a whole-Material-16 visual freeze. If a downstream project requires that larger guarantee, it needs an explicit separate decision to preserve ordinary implementations. Do not quietly expand this library or promise that a handful of screenshots proves every consumer edge case.

A readiness report should say which roots/entry points were redirected, whether any semantic Sass edits were necessary (default: none), every unsupported case, every current-component bridge, and what actual CSS/DOM/browser evidence passed. Consumers should never discover an omitted known compatibility limitation only after deployment.


## Theme-role compatibility detail

The TypeScript `LegacyThemePalette` contract and Sass palette objects are separate concerns. Own the historical TypeScript union locally, but preserve runtime class behavior even for arbitrary strings forced through the type (`none` → `.mat-none` historically). Historical M2 Sass determines the actual primary/accent/warn values in compatibility mode. Required M3 coexistence leaves legacy controls on their M2 theme while current controls use M3. A native system-token mode is optional future scope; only that separate mode would map roles to `primary`, `tertiary`, and `error`, without changing inputs or host classes.
