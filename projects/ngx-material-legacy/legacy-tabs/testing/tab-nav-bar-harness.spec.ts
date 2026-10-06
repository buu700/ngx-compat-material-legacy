import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';
import {runTabNavBarHarnessTests} from '../../../../testing/legacy-runner/shims/harness/tabs/tab-nav-bar-shared.spec.ts';
import {MatLegacyTabNavBarHarness} from './tab-nav-bar-harness';

describe('Non-MDC-based MatTabNavBarHarness', () => {
  runTabNavBarHarnessTests(MatLegacyTabsModule, MatLegacyTabNavBarHarness as any);
});
