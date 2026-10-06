import {MatLegacyOptionModule, MatLegacyOption} from '@ngx-compat/material-legacy/legacy-core';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/core/option-shared.spec.ts';
import {MatLegacyOptionHarness} from './option-harness';

describe('Non-MDC-based MatOptionHarness', () => {
  runHarnessTests(MatLegacyOptionModule, MatLegacyOptionHarness as any, MatLegacyOption);
});
