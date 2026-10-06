import {MatLegacyMenuModule} from '@ngx-compat/material-legacy/legacy-menu';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/menu/shared.spec.ts';
import {MatLegacyMenuHarness} from './menu-harness';

describe('Non-MDC-based MatMenuHarness', () => {
  runHarnessTests(MatLegacyMenuModule, MatLegacyMenuHarness as any);
});
