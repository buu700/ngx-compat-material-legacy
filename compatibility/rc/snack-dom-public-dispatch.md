# Supported snack-bar DOM dispatch

The owned snack-bar container directly called CdkPortalOutlet.attachDomPortal.
Both advertised minimum declarations mark that upstream callback deprecated and
planned for a signature change. The repair retains the historical owned callback
and delegates through the supported public attach protocol, as the owned dialog
container already does. The callback stays an arrow property with one DomPortal
argument and void return type. Imports, constructor, 31 other class members and
all 1141 other product/resource members remain unchanged.

A generic-only replacement is insufficient. Base dispatch records an attachment
before the DOM hook runs. A missing parent or throwing insertion then leaves a
provisional attached flag which the original direct hook did not leave, preventing
the original retry path. The repair catches only the dispatch failure, clears that
provisional state through public detach and restores the hook's public portal-host
state before rethrowing. Post-attachment hook errors retain their original state;
they are outside that recovery block. No peer private field is used.

The reference source is byte-identical to the untouched16.2.14 Git tag. Complete
selected caller/guard/panel/modal methods execute over genuine public Core/CDK
outlets and views. The receiver, DOM and renderer are explicit protocols, so this
is not a complete snack-bar instance or native rendering test. Both diagnostic
compiler runs check complete authenticated declarations with skipLibCheck:false
for the reference and both minima. All three type models retain the callback
signature and find zero unsupported upstream calls in the repair.

Ten public runtime combinations cover the reference and both minima, zoneful and
zoneless modes where supported, and development/production modes. Each source
line passes 105 caller cases and 35 behavior-fault controls. Cases include direct
and detached callbacks, portal dispatch, ElementRef input, panel/modal effects,
detach/reattach, disposal, missing-parent and append failures/retries, hook
failures, guard ordering and borrowed-owner lifetime. Owned return/error, DOM,
attachment, hook, panel/modal, application and owner observations match the actual
tagged-peer execution. The unused CDK attachedRef getter empty default differs
between the old and current peers and is recorded separately; this add-on does
not mirror old peer object defaults.

The read-only Cyph scan found its legacy module alias and toast service callers.
It found no direct DOM-portal call, required consumer TypeScript adjustment or
required HTML/CSS/SCSS change. No consumer build was run.

The canonical ledgers are deliberately unchanged at this product checkpoint.
The raw current reports expose the resulting 75 source-scope failures, 11 stale
frozen source bindings, six stale native source profiles and the changed digest
of the same complete315-use additional roster. The previous source-frame and
Core-role guards fail current source as expected. Those prior receipts describe
their original source epoch and are not current passes after this edit.

The exact follow-up is recorded in
`snack-dom-public-dispatch-followup.json`: qualify this finite independently tested
product delta in current validators, retain all original judgments and runtime
case requirements, requalify the affected bindings/scopes/snapshot, and preserve
complete original task subjects through authenticated history. The25 portal role
reviews and all remaining C00–C05,1697SHA/1736 frozen+315 additional/cutoff,
G01–G13 and fresh independent A01–A10/R01–R03 work remain mandatory. No native,
packed, browser, floor, release or full-plan completion is claimed. Pushes,
Actions, installs and full builds remain deferred.
