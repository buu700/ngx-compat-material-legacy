import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyNativeSelectHarness} from '@ngx-compat/material-legacy/legacy-input/testing';
import {runNativeSelectHarnessTests} from '../../../../testing/legacy-runner/shims/harness/input/shared-native-select.spec.ts';

describe('Non-MDC-based MatNativeSelectHarness', () => {
  runNativeSelectHarnessTests(MatLegacyInputModule, MatLegacyNativeSelectHarness);
});
