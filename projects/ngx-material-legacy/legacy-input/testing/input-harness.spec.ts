import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyInputHarness} from '@ngx-compat/material-legacy/legacy-input/testing';
import {runInputHarnessTests} from '../../../../testing/legacy-runner/shims/harness/input/shared-input.spec.ts';

describe('Non-MDC-based MatInputHarness', () => {
  runInputHarnessTests(MatLegacyInputModule, MatLegacyInputHarness);
});
