import {MatLegacyTableModule} from '@ngx-compat/material-legacy/legacy-table';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/table/shared.spec.ts';
import {MatLegacyTableHarness} from './table-harness';

describe('Non-MDC-based MatTableHarness', () => {
  runHarnessTests(MatLegacyTableModule, MatLegacyTableHarness as any);
});
