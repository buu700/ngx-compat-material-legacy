import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/button-shared.spec';
import {MatLegacyButtonHarness} from '@ngx-compat/material-legacy/legacy-button/testing';

describe('Non-MDC-based MatLegacyButtonHarness', () => {
  runHarnessTests(MatLegacyButtonModule, MatLegacyButtonHarness as any);
});
