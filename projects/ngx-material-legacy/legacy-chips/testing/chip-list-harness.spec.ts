import {MatLegacyChipsModule} from '@ngx-compat/material-legacy/legacy-chips';
import {runHarnessTests} from './shared.spec.ts';
import {MatIconModule} from '@angular/material/icon';
import {MatIconHarness} from '@angular/material/icon/testing';
import {MatLegacyChipListHarness} from './chip-list-harness';
import {MatLegacyChipHarness} from './chip-harness';
import {MatLegacyChipInputHarness} from './chip-input-harness';
import {MatLegacyChipRemoveHarness} from './chip-remove-harness';
import {MatLegacyChipListboxHarness} from './chip-listbox-harness';
import {MatLegacyChipOptionHarness} from './chip-option-harness';

describe('Non-MDC-based MatChipListHarness', () => {
  runHarnessTests(
    MatLegacyChipsModule,
    MatLegacyChipListHarness,
    MatLegacyChipListboxHarness,
    MatLegacyChipHarness,
    MatLegacyChipOptionHarness,
    MatLegacyChipInputHarness,
    MatLegacyChipRemoveHarness,
    MatIconModule,
    MatIconHarness,
  );
});
