import {MatLegacyOptionModule} from '@ngx-compat/material-legacy/legacy-core';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/core/optgroup-shared.spec.ts';
import {MatLegacyOptgroupHarness} from './optgroup-harness';

describe('Non-MDC-based MatOptgroupHarness', () => {
  runHarnessTests(MatLegacyOptionModule, MatLegacyOptgroupHarness as any);
});
