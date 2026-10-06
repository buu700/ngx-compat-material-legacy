import {MatLegacyAutocompleteModule} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {runHarnessTests} from '../../../../testing/legacy-runner/shims/harness/autocomplete/shared.spec.ts';
import {MatLegacyAutocompleteHarness} from './autocomplete-harness';

describe('Non-MDC-based MatAutocompleteHarness', () => {
  runHarnessTests(MatLegacyAutocompleteModule, MatLegacyAutocompleteHarness as any);
});
