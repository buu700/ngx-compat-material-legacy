import {MatLegacyProgressSpinnerModule} from '@ngx-compat/material-legacy/legacy-progress-spinner';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/progress-spinner/shared.spec.ts';
import {MatLegacyProgressSpinnerHarness} from './progress-spinner-harness';

describe('Non-MDC-based MatProgressSpinnerHarness', () => {
  runHarnessTests(MatLegacyProgressSpinnerModule, MatLegacyProgressSpinnerHarness as any);
});
