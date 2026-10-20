# Public Platform caller reviews

Four additional dependency reviews are prepared for later integration: the
common module, native date adapter, owned viewport helper and owned dialog base.
They bind four complete source files, eleven complete context members and all
seven `isBrowser` reads. No source invokes the current Platform constructor.

The independent public proof checks genuine CDK 16.2.14, 22.1.7 and 21.2.14
namespaces with matching Core/Common peers. Three strict declaration models
pass without skipping library checks. The public class and boolean field have
no private, deprecated or removal annotations. The probe uses ordinary public
injector providers, never the 21.x compatibility constructor overload. All 39
public factory/token/field cases agree with the untouched original, including
browser/server IDs, DOM presence, falsey IDs and a null provider override.

The untouched original date-adapter constructor retains the ignored `_platform`
parameter. The current adapter keeps that legacy slot; its type can still be used
by Angular as a DI token. This review does not claim the parameter is erased from
factory metadata or qualify the adapter's complete DI/date behavior.

The viewport's window lookup ordering also matches the untouched tagged helper.
The existing no-window synthetic observation remains unchanged: size and rectangle
access have the same inherited error while scroll position returns zero. This is
not a new regression to remove in a public dependency review, and it grants no
Angular SSR guarantee.

Each line passes 28 source/evidence corruption controls, canonical-row and later
source mutations, and 16 selected owned dialog-predicate protocol cases. Two
incorrect predicates are rejected, including replacing the nullish fallback with
one that loses an explicit false flag. These receiver protocols do not qualify
whole dialog focus or component behavior. The focused Python test passes on both
lines. A candidate worker filename collision was corrected before commit: the
existing worker is restored byte-for-byte, the new worker has a distinct name,
and both uncommitted namespace proofs were regenerated.

All three canonical ledgers retain their exact bytes. Four source closures are
prepared and zero are integrated; together with three table coercion reviews,
seven prepared reviews await a shared batch. Current source totals remain
1,510 frozen plus 199 additional closed, with 342 routes open. Product TypeScript,
HTML, CSS, SCSS and consumer code remain unchanged. No install, build, push,
Actions, full historical cohort, native/packed/floor or independent audit ran.
