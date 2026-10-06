import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyNativeSelectHarness} from '@ngx-compat/material-legacy/legacy-input/testing';
import {runNativeSelectHarnessTests} from '@angular/material/input/testing/shared-native-select.spec';

describe('Non-MDC-based MatNativeSelectHarness', () => {
  runNativeSelectHarnessTests(MatLegacyInputModule, MatLegacyNativeSelectHarness);
});
