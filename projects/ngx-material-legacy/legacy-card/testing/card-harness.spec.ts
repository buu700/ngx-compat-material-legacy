import {MatLegacyCardModule} from '@ngx-compat/material-legacy/legacy-card';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/card/shared.spec.ts';
import {MatLegacyCardHarness, MatLegacyCardSection} from './card-harness';

describe('Non-MDC-based MatCardHarness', () => {
  runHarnessTests(MatLegacyCardModule, MatLegacyCardHarness as any, {
    header: MatLegacyCardSection.HEADER,
    content: MatLegacyCardSection.CONTENT,
    actions: MatLegacyCardSection.ACTIONS,
    footer: MatLegacyCardSection.FOOTER,
  });
});
