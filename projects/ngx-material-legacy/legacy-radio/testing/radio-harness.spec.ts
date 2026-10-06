import {MatLegacyRadioModule} from '@ngx-compat/material-legacy/legacy-radio';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/radio/shared.spec.ts';
import {MatLegacyRadioButtonHarness, MatLegacyRadioGroupHarness} from './radio-harness';

describe('Non-MDC-based', () => {
  runHarnessTests(
    MatLegacyRadioModule,
    MatLegacyRadioGroupHarness as any,
    MatLegacyRadioButtonHarness as any,
  );
});
