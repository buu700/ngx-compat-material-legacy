# Product requirements retained by this closeout

These are requirements, not claims that the baseline has passed them. The supplied G01–G13 gate
record is preserved verbatim in RELEASE-GATES.md and release-gates.json. The current execution
plan determines remaining work; old presence/status fields are not used as current evidence.

## Product and ownership

Preserve Material **16.2.14** legacy component public primary/testing APIs, supported templates,
selectors/DOM classes, meaningful behavioral contracts and historical M2 Sass surface. The feature
set is frozen: do not add modern unrelated features or turn the fork into a redesign. Package
consumers use conventional Angular/npm entry points and have no Chainman runtime/build obligation.

The legacy component families and core/harness paths must preserve genuine signatures, aliases,
public/protected/inherited members, types, providers and shared runtime identities. Existence of
entry points or name-only declarations is insufficient. `LEGACY_VERSION` retains the intended
Material-peer alias; expose any compatibility-package version separately. Historical palette class/
default behavior, including arbitrary runtime `none`, must not acquire new validation. Remove obsolete
upstream deprecation notices only where they falsely describe the maintained API, not provenance.

Use **stable public** current Angular/Material/CDK dependencies. Authored private, docs-private or
disallowed deprecated symbols/members/deep paths are not acceptable just because a barrel exports
them. Own finite historical replacements where necessary, including pseudo-checkbox, ripple support,
line helpers, event/root/numeric helpers and relevant harness/ink-bar bases. Actual runtime users and
public aliases must resolve consistently. A public upstream service using its own private internals
is not itself an authored private dependency; directly importing/accessing those internals is.

## Animation independence

No required consumer dependency on Angular Animations in runtime, peer, declaration, testing or
recipe closure. Native motion must retain observable layout/state/lifecycle responsibilities and
meaningful engine-independent constants. Obsolete recipe metadata is removed deliberately with
exact diagnostics and tested migration/replacement, not replaced by trigger-shaped fake objects.
Historical engine tooling can exist only in isolated reference tests. Disabled screenshots cannot
substitute for real native-motion/interruption/focus/event tests.

## Styles and mixed-generation behavior

Preserve historical exported/configurable Sass API, values/maps, meaningful selectors/declaration
order, aggregate membership and owned CSS/DOM contracts against authentic immutable references.
Ordinary current components and current CDK infrastructure are not promised pixel-identical v16
internals, but any such limitation cannot excuse absent bridges, wrong palette meaning, M3 pollution
or broken provider identity. Keep current/legacy duplicate selectors out of the same Angular
compilation scope where implementations conflict.

All thirteen ordinary companions need public current-peer override bridges for applicable base,
color, typography and density inputs, actual computed-style proof and independent branch-specific
peer M2 oracles. Provide the separate owned-only aggregate and prove M3 noninterference, order,
nested/lazy/body-overlay and shared ripple/focus/pseudo-checkbox behavior.

No external archived `@material/*` dependency/import obligation in shipped Sass. Remove unneeded
closure, replace small safe utilities or retain irreducible historical source with complete exact
provenance/hash/license/security evidence. Vendoring is permitted, not an intrinsic requirement;
complete reachable exported/configurable closure and current-peer isolated compilation are what
matter. Normal declared current Material/CDK public Sass imports remain permitted.

## Migration, historical tests and browsers

Migration must work through the packaged library schematic and independently runnable peer-light
CLI, including the old-workspace-before-framework-upgrade route. Preserve supported TS/Sass aliases,
reexports/testing/dynamic import and mixed-generation syntax, comments/data and unrelated provider
configuration. Global blocked-workspace writes, dry-run, idempotence, concurrency/error recovery,
frontend parity and actionable unsupported/private/recipe diagnostics need executed proof.

Reconcile the **57 original historical spec paths**, their authentic hashes and transitive shared
cases with equivalent executions or narrowly justified obsolete internals. Imported harness suites,
keyboard/forms/focus/lifecycle behavior and async semantics cannot be discarded to reduce cost.
Candidate artifact tests must instantiate the candidate bytes; source-internal supplements and
runner probes have distinct identities. Replacing an engine-internal assertion requires preserving
its user-visible guarantee with a native assertion.

Required real-browser scope covers all families and applicable default/disabled/invalid/focused/
keyboard, light/dark/density/RTL states, high-risk overlays and native motion. Chromium supports
broad fast coverage; actual Firefox/WebKit executions are required according to the release matrix.
Parameterize finite scenarios without copying success across configurations. Compare meaningful
historical DOM/style/geometry/interaction using isolated genuine baseline and candidate apps.

Use strict AOT consumer compilation and genuine zoneful/zoneless configurations. Prove notification-
driven updates, exact completion, focus restoration, interrupted/destroyed/missing-event behavior,
CSP nonce/negative dynamic styles and DOM-free server rendering without leaked timers/state.
Hydration and Safari-specific certification are not implied by generic SSR or WebKitGTK results.
Unsupported advertised claims must be removed or specifically proven, not silently inferred.

## Security, supported lines and release

Complete the inventoried implementation SHAs, authored upstream symbols/members and exact dependency/
advisory closure separately. Use risk-weighted semantic review, authentic upstream cutoffs,
installed-peer-at-floor fix evidence and current primary advisory data. Structural equality, path
classification and an empty adaptation queue are not security clearance. Retained local/vendor code,
CLI and build tools remain in scope. No unresolved release-relevant security issue is a pass.

Main/22 and **actual 21.x** must each have branch-native source/locks/peers and independently tested
artifacts. Test appropriate advertised Node/RxJS/compiler/peer floors, not just the maintainer's newer
toolchain. Do not silently reduce the two-line promise or raise floors to bypass failures. Normal
dependency changes retain the seven-day policy; narrowly justified security exceptions need genuine
authority and requalification.

Source/lock/policy/tool/oracle/command/report identities bind final evidence; package tests consume
one fresh identified artifact per line, not a stale committed tarball. Sealing, code review and
publication authority are separate. Preserve deliberate failure mechanisms, correct current docs,
license/provenance/attribution and maintainable reproducible commands. Unpublished RC engineering
readiness is distinct from publishing and private Cyph production qualification.

Chainman remains the canonical execution route. The requested tranche includes only infrastructure
that directly enables reliable RC execution or saves iteration cost. Future generalized updates,
self-update qualification, monitoring/canaries, exhaustive secondary-mode adoption and maintenance
polish remain a follow-up tranche; none silently excuses an immediate product/security prerequisite.
