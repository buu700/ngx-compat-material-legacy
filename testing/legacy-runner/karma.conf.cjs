const path = require('path');

module.exports = function (config) {
  const expectFail = process.env.LEGACY_TESTS_EXPECT_FAIL === '1';
  config.set({
    basePath: path.resolve(__dirname, '../..'),
    frameworks: ['jasmine'],
    files: [
      {pattern: 'testing/legacy-runner/out/legacy-tests.iife.js', watched: false},
    ],
    reporters: ['progress', 'legacy-json'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('./karma-legacy-json-reporter.cjs'),
    ],
    legacyJsonReporter: {
      outputFile: path.resolve(__dirname, '../../compatibility/f08/legacy-test-results.json'),
      expectFail,
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    singleRun: true,
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    client: {
      jasmine: {random: false},
      captureConsole: true,
    },
    browserConsoleLogOptions: {level: 'log', terminal: true},
  });
};
