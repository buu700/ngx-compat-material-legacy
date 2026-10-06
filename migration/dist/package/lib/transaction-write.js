/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
'use strict';
const fs = require('node:fs');
const {randomUUID, createHash} = require('node:crypto');
const {dirname, join} = require('node:path');

/** Stage all changes, then replace files; failed replacements restore prior bytes.
 * Concurrent edits during recovery remain untouched, with a reported backup.
 * This is recoverable multi-file application, not crash-atomic filesystem storage.
 */
function applyFileTransaction(records) {
  const prepared = [];
  const committed = [];
  let phase = 'prepare';
  let current = null;
  const result = {status: 'refused', applied: 0, committed_before_failure: 0,
    rolled_back: false, recovery_files: [], error: null, failed_path: null};
  function writeExclusive(path, bytes, info) {
    const fd = fs.openSync(path, 'wx', info.mode & 0o777);
    try {
      fs.writeFileSync(fd, bytes);
      fs.fchmodSync(fd, info.mode & 0o777);
      const created = fs.fstatSync(fd);
      if (created.uid !== info.uid || created.gid !== info.gid) fs.fchownSync(fd, info.uid, info.gid);
    } catch (error) {
      try {fs.unlinkSync(path);} catch (cleanupError) {result.recovery_files.push({path: current && current.path, retained_file: path, error: String(cleanupError.message || cleanupError)});}
      throw error;
    } finally {fs.closeSync(fd);}
  }
  function matches(entry, bytes) {
    const info = fs.lstatSync(entry.record.path);
    return info.isFile() && !info.isSymbolicLink() && info.dev === entry.info.dev &&
      info.ino === entry.info.ino && info.mode === entry.info.mode && info.uid === entry.info.uid && info.gid === entry.info.gid && info.nlink === 1 &&
      fs.readFileSync(entry.record.path).equals(bytes);
  }
  function cleanup(entry) {
    for (const key of ['stage', 'backup']) {
      if (!entry[key]) continue;
      try {fs.unlinkSync(entry[key]);entry[key] = null;} catch (error) {
        if (error.code !== 'ENOENT') result.recovery_files.push({path: entry.record.path, retained_file: entry[key], error: String(error.message || error)});
      }
    }
  }
  try {
    for (const record of records.filter(record => record.content != null)) {
      current = record;
      const info = fs.lstatSync(record.path);
      if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || !(info.mode & 0o222)) {
        throw new Error('migration refuses symbolic links, nonregular/multiply-linked or read-only source files');
      }
      const original = fs.readFileSync(record.path);
      if (!original.equals(Buffer.from(record.original, 'utf8'))) throw new Error('concurrent-edit: source bytes changed or are not valid UTF-8');
      const entry = {record, info, original, next: Buffer.from(record.content, 'utf8'), stage: null, backup: null};
      prepared.push(entry);
      const prefix = join(dirname(record.path), '.migrate-legacy-' + randomUUID());
      writeExclusive(prefix + '-backup', original, info);entry.backup = prefix + '-backup';
      writeExclusive(prefix + '-stage', entry.next, info);entry.stage = prefix + '-stage';
    }
    // Check the whole plan before replacing its first source file.
    for (const entry of prepared) {current = entry.record;if (!matches(entry, entry.original)) throw new Error('concurrent-edit: source changed while edits were staged');}
    phase = 'replace';
    for (const entry of prepared) {
      current = entry.record;
      if (!matches(entry, entry.original)) throw new Error('concurrent-edit: source changed before replacement');
      entry.replacement = fs.lstatSync(entry.stage);
      fs.renameSync(entry.stage, entry.record.path);entry.stage = null;
      committed.push(entry);entry.record.applied = true;
    }
    result.status = 'committed';result.applied = committed.length;
  } catch (error) {
    result.error = String(error.message || error);result.failed_path = current && current.path;
    result.committed_before_failure = committed.length;
    for (const entry of committed.reverse()) {
      try {
        const info = fs.lstatSync(entry.record.path);
        if (!info.isFile() || info.isSymbolicLink() || info.dev !== entry.replacement.dev ||
            info.ino !== entry.replacement.ino || info.mode !== entry.replacement.mode || info.uid !== entry.replacement.uid || info.gid !== entry.replacement.gid || info.nlink !== 1 || !fs.readFileSync(entry.record.path).equals(entry.next)) {
          throw new Error('concurrent-edit: recovery preserves the newer source; restore the reported backup manually');
        }
        const backupInfo = fs.lstatSync(entry.backup);
        if (!backupInfo.isFile() || backupInfo.isSymbolicLink() || backupInfo.nlink !== 1 || !fs.readFileSync(entry.backup).equals(entry.original)) throw new Error('recovery backup identity changed; do not overwrite the source');
        fs.renameSync(entry.backup, entry.record.path);entry.backup = null;entry.record.applied = false;
      } catch (recoveryError) {
        result.recovery_files.push({path: entry.record.path, backup: entry.backup, original_sha256: createHash('sha256').update(entry.original).digest('hex'), error: String(recoveryError.message || recoveryError)});
        entry.keepBackup = true;
      }
    }
    result.applied = committed.filter(entry => entry.record.applied).length;
    result.rolled_back = committed.length > 0 && result.applied === 0;
    result.status = result.recovery_files.length ? 'recovery-required' : committed.length === 0 ? 'refused' : 'rolled-back';
    result.phase = phase;
  } finally {
    for (const entry of prepared) {
      if (entry.keepBackup) entry.backup = null;
      cleanup(entry);
    }
    if (result.recovery_files.length) result.status = 'recovery-required';
  }
  return result;
}
module.exports = {applyFileTransaction};
