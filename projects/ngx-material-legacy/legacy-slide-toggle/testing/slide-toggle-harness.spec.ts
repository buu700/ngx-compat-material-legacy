import {MatLegacySlideToggleModule} from '@ngx-compat/material-legacy/legacy-slide-toggle';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/slide-toggle/shared.spec.ts';
import {MatLegacySlideToggleHarness} from './slide-toggle-harness';

describe('Non-MDC-based MatSlideToggleHarness', () => {
  runHarnessTests(MatLegacySlideToggleModule, MatLegacySlideToggleHarness as any);
});
