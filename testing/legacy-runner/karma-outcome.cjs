/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
const fs = require('node:fs');
function writeKarmaOutcome(file, result, nonce) {
  const error = result.error;
  const receipt = {
    schema_version: 1,
    nonce,
    child_pid: result.pid ?? null,
    status: result.status ?? null,
    signal: result.signal ?? null,
    spawn_error: error ? {name: error.name, code: error.code ?? null,
      syscall: error.syscall ?? null, message: error.message} : null,
  };
  fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  return receipt;
}
module.exports = {writeKarmaOutcome};
