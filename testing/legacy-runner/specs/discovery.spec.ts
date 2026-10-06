/**
 * Asserts that every historical spec module selected for this run was evaluated.
 * The bundle prefix records the historical path when the module body runs.
 */
describe('legacy-runner discovery', () => {
  it('evaluated every mapped historical spec module', () => {
    const expected: string[] = (globalThis as any).__LEGACY_EXPECTED_SPECS__ || [];
    const hit = new Set<string>((globalThis as any).__LEGACY_SPEC_HIT__ || []);
    const missing = expected.filter(path => !hit.has(path));
    expect(expected.length).withContext('no historical specs were selected').toBeGreaterThan(0);
    expect(missing).withContext(`missing ${missing.length} of ${expected.length}`).toEqual([]);
  });
});
