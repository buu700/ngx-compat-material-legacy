import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {
  MatLegacyInputHarness,
  MatLegacyNativeSelectHarness,
} from '@ngx-compat/material-legacy/legacy-input/testing';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {runInputHarnessTests} from '../../../../testing/legacy-runner/shims/harness/input/shared-input.spec.ts';

describe('Non-MDC-based MatInputHarness', () => {
  runInputHarnessTests(MatLegacyInputModule, MatLegacyInputHarness);
});

describe('Native legacy input harness contract', () => {
  let fixture: ComponentFixture<NativeInputStateFixture>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatLegacyInputModule, MatLegacyFormFieldModule],
      declarations: [NativeInputStateFixture],
    }).compileComponents();
    fixture = TestBed.createComponent(NativeInputStateFixture);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('reads native disabled state through both constructor and filtered factory routes', async () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#native-legacy-state',
    )!;
    const direct = await loader.getHarness(MatLegacyInputHarness);
    const filtered = await loader.getHarness(
      MatLegacyInputHarness.with({selector: '#native-legacy-state', value: /shi$/}),
    );
    expect(filtered instanceof MatLegacyInputHarness).toBe(true);

    input.setAttribute('disabled', 'false');
    expect(input.disabled).toBe(true);
    expect(await direct.isDisabled()).toBe(true);
    expect(await filtered.isDisabled()).toBe(true);
    expect(input.disabled).toBe(true);

    input.removeAttribute('disabled');
    input.setAttribute('aria-disabled', 'true');
    expect(input.disabled).toBe(false);
    expect(await filtered.isDisabled()).toBe(false);
  });

  it('applies optional public label filters to the legacy input and native select markup', async () => {
    const input = await loader.getHarness(MatLegacyInputHarness.with({label: /Legacy input/}));
    const select = await loader.getHarness(
      MatLegacyNativeSelectHarness.with({label: 'Legacy account'}),
    );
    expect(await input.getValue()).toBe('Sushi');
    expect(await select.getOptions()).toHaveSize(2);
    expect(await loader.hasHarness(MatLegacyInputHarness.with({label: 'Missing label'}))).toBe(false);
    expect(
      await loader.hasHarness(MatLegacyNativeSelectHarness.with({label: 'Missing label'})),
    ).toBe(false);
  });
});

@Component({
  standalone: false,
  template: `
    <mat-form-field><mat-label>Legacy input</mat-label>
      <input id="native-legacy-state" matInput value="Sushi" placeholder="Favorite food">
    </mat-form-field>
    <mat-form-field><mat-label>Legacy account</mat-label>
      <select id="native-legacy-select" matNativeControl>
        <option value="one">One</option><option value="two">Two</option>
      </select>
    </mat-form-field>
  `,
})
class NativeInputStateFixture {}
