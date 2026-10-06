import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';
import {runTabGroupHarnessTests} from '../../../../testing/legacy-runner/shims/harness/tabs/tab-group-shared.spec.ts';
import {MatLegacyTabGroupHarness} from './tab-group-harness';
import {MatLegacyTabHarness} from './tab-harness';

describe('Non-MDC-based MatTabGroupHarness', () => {
  runTabGroupHarnessTests(
    MatLegacyTabsModule,
    MatLegacyTabGroupHarness as any,
    MatLegacyTabHarness as any,
  );
});
