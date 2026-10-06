import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/dialog/shared.spec.ts';
import {MatLegacyDialogHarness} from './dialog-harness';

describe('Non-MDC-based MatDialogHarness', () => {
  runHarnessTests(MatLegacyDialogModule, MatLegacyDialogHarness as any, MatLegacyDialog as any);
});
