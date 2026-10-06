import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {runHarnessTests} from '@angular/material/select/testing/shared.spec';
import {MatLegacySelectHarness} from './select-harness';

describe('Non-MDC-based MatSelectHarness', () => {
  runHarnessTests(MatLegacyFormFieldModule, MatLegacySelectModule, MatLegacySelectHarness as any);
});
