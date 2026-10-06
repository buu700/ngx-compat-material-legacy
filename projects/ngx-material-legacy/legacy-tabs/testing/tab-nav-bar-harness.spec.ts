import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';
import {runTabNavBarHarnessTests} from '@angular/material/tabs/testing/tab-nav-bar-shared.spec';
import {MatLegacyTabNavBarHarness} from './tab-nav-bar-harness';

describe('Non-MDC-based MatTabNavBarHarness', () => {
  runTabNavBarHarnessTests(MatLegacyTabsModule, MatLegacyTabNavBarHarness as any);
});
