import {MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/tooltip/shared.spec.ts';
import {MatLegacyTooltipHarness} from './tooltip-harness';

describe('Non-MDC-based MatTooltipHarness', () => {
  runHarnessTests(MatLegacyTooltipModule, MatLegacyTooltipHarness as any);
});
