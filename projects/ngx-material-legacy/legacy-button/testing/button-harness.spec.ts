import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/button-shared.spec.ts';
import {MatLegacyButtonHarness} from './button-harness';

describe('Non-MDC-based MatLegacyButtonHarness', () => {
  runHarnessTests(MatLegacyButtonModule, MatLegacyButtonHarness as any);
});
