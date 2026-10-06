import {MatLegacyPaginatorModule} from '@ngx-compat/material-legacy/legacy-paginator';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/paginator/shared.spec.ts';
import {MatLegacyPaginatorHarness} from './paginator-harness';

describe('Non-MDC-based MatPaginatorHarness', () => {
  runHarnessTests(MatLegacyPaginatorModule, MatLegacyPaginatorHarness as any);
});
