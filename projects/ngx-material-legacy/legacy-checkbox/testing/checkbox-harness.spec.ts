import {MatLegacyCheckboxModule} from '@ngx-compat/material-legacy/legacy-checkbox';
import {MatLegacyCheckboxHarness} from './checkbox-harness';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/checkbox/shared.spec.ts';

describe('Non-MDC-based MatLegacyCheckboxHarness', () => {
  runHarnessTests(MatLegacyCheckboxModule, MatLegacyCheckboxHarness as any);
});
