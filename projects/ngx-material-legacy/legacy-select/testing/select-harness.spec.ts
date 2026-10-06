import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/select/shared.spec.ts';
import {MatLegacySelectHarness} from './select-harness';

describe('Non-MDC-based MatSelectHarness', () => {
  runHarnessTests(MatLegacyFormFieldModule, MatLegacySelectModule, MatLegacySelectHarness as any);
});
