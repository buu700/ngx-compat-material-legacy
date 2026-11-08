/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Packed menu harness consumer reflecting tagged 16 historical filter fields.
 */
import {MatLegacyMenuHarness,type LegacyMenuHarnessFilters} from '@ngx-compat/material-legacy/legacy-menu/testing';
import {type BaseHarnessFilters,type HarnessPredicate} from '@angular/cdk/testing';
interface HistoricalMenuFilters extends BaseHarnessFilters { triggerText?: string | RegExp; }
const historical: HistoricalMenuFilters={selector:'button',ancestor:'.page',triggerText:/menu/};
const legacy: LegacyMenuHarnessFilters=historical;
const back: HistoricalMenuFilters=legacy;
const result: HarnessPredicate<MatLegacyMenuHarness>=MatLegacyMenuHarness.with(historical);
legacy.triggerText='new';legacy.ancestor='.root';
// @ts-expect-error historical triggerText accepts only string or regex
MatLegacyMenuHarness.with({triggerText:false});
// @ts-expect-error historical filter has no unrelated field
MatLegacyMenuHarness.with({missing:'x'});
// @ts-expect-error selector remains string-valued
const wrong: LegacyMenuHarnessFilters={selector:42};
void [historical,legacy,back,result,wrong];
