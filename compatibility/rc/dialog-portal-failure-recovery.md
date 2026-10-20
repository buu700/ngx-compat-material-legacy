# Dialog portal failure recovery

The actual owned dialog callbacks used generic child-outlet dispatch for all
three portal kinds. A genuine CdkPortalOutlet records a portal before entering
its concrete attachment hook. Failed component/template creation or DOM
validation therefore left the child attached and prevented direct retry. The
actual tagged dialog callbacks allow that retry.

The component and template callbacks now use their stable, nondeprecated public
concrete methods, as in the historical caller. DOM keeps supported public generic
dispatch and recovers its failure flags and host at the tagged ownership boundary.
The content/focus hook still runs after successful attachment and remains outside
DOM failure cleanup. Hook failure therefore retains the attached content.

Only three attachment callbacks change. Constructors, imports, the other 30 class
members and all 1,141 other product/resource files remain exact. Cyph was checked
read-only for direct custom container/attachment uses; none matched. No required
HTML, CSS, SCSS, selector, constructor or callback-signature change was found.
Cyph was not built.

Three complete authenticated public type models compile strictly with
skipLibCheck:false, preserve all three callback signatures and reject current
use of deprecated or planned-removal signatures. Ten genuine Core/CDK runtime
combinations exercise 160 caller cases and reject 65 applicable behavioral faults.
The actual prior delegates remain negative controls. Results, errors, public
base/child/portal states, hook timing, return identity and view/borrowed lifetimes
match the untouched tagged source executing with the actual reference peers.

The existing owned hasAttached aggregate and explicit detach/dispose behavior
are byte-identical. The raw wrapper values are retained and separately asserted
against those unchanged contracts; both the common base state and child state
are compared to the tag. This bounded callback repair grants no new whole
inherited-API equivalence pass and does not hide the separately pending API
review. Real constructor/focus/component/native/packed/consumer/floor and final
independent-audit qualification remain separate.

The 15 existing closed dialog source bindings and all five pending dialog portal
routes must be rebound/reviewed after this separately qualified product change.
The uncommitted source-context candidate will be regenerated once against final
portal product bytes. Existing capsules, original reviews and tagged goldens
remain immutable. No source closure, G01–G13 credit, push, Actions run or publication
is granted by this repair.
