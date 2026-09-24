/**
 * Asserts that the mapped button historical specs were loaded into Jasmine.
 */
describe('legacy-runner discovery', () => {
  function topDescriptions(): string[] {
    const env: any = jasmine.getEnv();
    const top = env.topSuite ? env.topSuite() : env._topSuite;
    return (top?.children || []).map((s: any) => String(s.description));
  }

  it('loaded MatLegacyButton historical suite', () => {
    expect(topDescriptions()).toContain('MatLegacyButton');
  });

  it('loaded harness suite', () => {
    const names = topDescriptions();
    const found = names.some((n: string) => n.includes('MatLegacyButtonHarness'));
    expect(found).withContext(`suites: ${names.join(' | ')}`).toBe(true);
  });
});
