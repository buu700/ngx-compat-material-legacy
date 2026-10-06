/**
 * Intentionally fails when __LEGACY_TESTS_EXPECT_FAIL__ is true so the runner
 * can prove assertion failures are detected. Skipped otherwise.
 */
declare const __LEGACY_TESTS_EXPECT_FAIL__: boolean;

describe('legacy-runner deliberate fail probe', () => {
  const expectFail =
    typeof __LEGACY_TESTS_EXPECT_FAIL__ !== 'undefined' && __LEGACY_TESTS_EXPECT_FAIL__ === true;

  if (!expectFail) {
    it('is skipped unless deliberate-fail mode is enabled', () => {
      expect(true).toBe(true);
    });
    return;
  }

  it('fails on purpose to prove assertion failure detection', () => {
    expect(true)
      .withContext('deliberate failing assertion for F08 runner proof')
      .toBe(false);
  });
});
