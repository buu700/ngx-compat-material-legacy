import {MatLegacyTableModule} from '@ngx-compat/material-legacy/legacy-table';
import {runHarnessTests} from '@angular/material/table/testing/shared.spec';
import {MatLegacyTableHarness} from './table-harness';

describe('Non-MDC-based MatTableHarness', () => {
  runHarnessTests(MatLegacyTableModule, MatLegacyTableHarness as any);
});
