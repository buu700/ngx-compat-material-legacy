import {MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {runHarnessTests} from '@angular/material/progress-bar/testing/shared.spec';
import {MatLegacyProgressBarHarness} from './progress-bar-harness';

describe('MatProgressBarHarness', () => {
  runHarnessTests(MatLegacyProgressBarModule, MatLegacyProgressBarHarness as any);
});
