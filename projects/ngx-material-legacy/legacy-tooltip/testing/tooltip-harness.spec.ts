import {MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';
import {runHarnessTests} from '@angular/material/tooltip/testing/shared.spec';
import {MatLegacyTooltipHarness} from './tooltip-harness';

describe('Non-MDC-based MatTooltipHarness', () => {
  runHarnessTests(MatLegacyTooltipModule, MatLegacyTooltipHarness as any);
});
