import {MatLegacyErrorHarness} from './error-harness';
import {MatLegacyAutocompleteModule} from '@ngx-compat/material-legacy/legacy-autocomplete';
import {MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {
  MatDatepickerInputHarness,
  MatDateRangeInputHarness,
} from '@angular/material/datepicker/testing';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyInputHarness} from '@ngx-compat/material-legacy/legacy-input/testing';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySelectHarness} from '@ngx-compat/material-legacy/legacy-select/testing';

import {MatLegacyFormFieldHarness} from './form-field-harness';
import {runHarnessTests} from '@angular/material/form-field/testing/shared.spec';

describe('Non-MDC-based MatFormFieldHarness', () => {
  runHarnessTests(
    [
      MatLegacyFormFieldModule,
      MatLegacyAutocompleteModule,
      MatLegacyInputModule,
      MatLegacySelectModule,
      MatNativeDateModule,
      MatDatepickerModule,
    ],
    {
      formFieldHarness: MatLegacyFormFieldHarness as any,
      inputHarness: MatLegacyInputHarness,
      selectHarness: MatLegacySelectHarness,
      datepickerInputHarness: MatDatepickerInputHarness,
      dateRangeInputHarness: MatDateRangeInputHarness,
      isMdcImplementation: false,
      errorHarness: MatLegacyErrorHarness,
    },
  );
});
