import {MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/progress-bar/shared.spec.ts';
import {MatLegacyProgressBarHarness} from './progress-bar-harness';

describe('MatProgressBarHarness', () => {
  runHarnessTests(MatLegacyProgressBarModule, MatLegacyProgressBarHarness as any);
});
