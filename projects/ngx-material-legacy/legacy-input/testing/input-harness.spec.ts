import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyInputHarness} from '@ngx-compat/material-legacy/legacy-input/testing';
import {runInputHarnessTests} from '@angular/material/input/testing/shared-input.spec';

describe('Non-MDC-based MatInputHarness', () => {
  runInputHarnessTests(MatLegacyInputModule, MatLegacyInputHarness);
});
