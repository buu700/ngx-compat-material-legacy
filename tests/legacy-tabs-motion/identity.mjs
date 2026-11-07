/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {
  lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync,
} from 'node:fs';
import {join, relative, resolve} from 'node:path';

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function hashPackageTree(packageRoot) {
  const root = realpathSync(packageRoot);
  const entries = [];
  function visit(current) {
    for (const name of readdirSync(current).sort()) {
      if (name === 'node_modules') continue;
      const full = join(current, name);
      const rel = relative(root, full).split('\\').join('/');
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) {
        entries.push({path: rel, kind: 'symlink', target: readlinkSync(full)});
      } else if (stat.isDirectory()) {
        visit(full);
      } else if (stat.isFile()) {
        const bytes = readFileSync(full);
        entries.push({path: rel, kind: 'file', bytes: bytes.length, sha256: sha256(bytes)});
      } else {
        throw Error('unsupported package entry: ' + rel);
      }
    }
  }
  visit(root);
  return sha256(Buffer.from(JSON.stringify(entries), 'utf8'));
}

export function makeBuildIdentity({packageIdentityPath, packageIdentity, appPath, themePath, htmlPath, packageRoot}) {
  const app = readFileSync(appPath);
  const theme = readFileSync(themePath);
  const html = readFileSync(htmlPath);
  const fesmPath = join(packageRoot, 'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs');
  return {
    schema: 'legacy-tabs-motion-build-v1',
    package_identity_path: resolve(packageIdentityPath),
    package_identity_sha256: sha256(readFileSync(packageIdentityPath)),
    run_json: packageIdentity.run_json,
    run_json_sha256: packageIdentity.run_json_sha256,
    artifact_sha256: packageIdentity.artifact_sha256,
    artifact_bytes: packageIdentity.artifact_bytes,
    package_root: realpathSync(packageRoot),
    package_tree_sha256: hashPackageTree(packageRoot),
    fesm_sha256: sha256(readFileSync(fesmPath)),
    mutation: packageIdentity.mutation,
    app_sha256: sha256(app),
    app_bytes: app.length,
    theme_sha256: sha256(theme),
    theme_bytes: theme.length,
    html_sha256: sha256(html),
    html_bytes: html.length,
  };
}

export function verifyPackageIdentity({runBytes, expectedRunPath, packageIdentityBytes, actualPackageRoot, actualPackageTreeSha256, actualFesmSha256}) {
  const run = JSON.parse(runBytes.toString('utf8'));
  const identity = JSON.parse(packageIdentityBytes.toString('utf8'));
  const library = run.artifacts?.find(item => item.id === 'library');
  if (!library) throw Error('run manifest has no library artifact');
  if (identity.schema !== 'legacy-tabs-motion-package-v2') throw Error('unsupported package identity');
  if (resolve(identity.run_json) !== resolve(expectedRunPath)) throw Error('run.json path does not match prepared package');
  if (sha256(runBytes) !== identity.run_json_sha256) throw Error('run.json bytes changed after package preparation');
  if (run.run_id !== identity.run_id) throw Error('run_id does not match prepared package');
  if (library.sha256 !== identity.artifact_sha256 || library.bytes !== identity.artifact_bytes) {
    throw Error('run library identity does not match prepared package');
  }
  if (realpathSync(actualPackageRoot) !== realpathSync(identity.extracted_package)) {
    throw Error('package symlink points to a different extracted package');
  }
  if (sha256(readFileSync(identity.tarball_path)) !== identity.tarball_sha256 || identity.tarball_sha256 !== identity.artifact_sha256) throw Error('library tarball changed after package preparation');
  if (actualPackageTreeSha256 !== identity.package_tree_sha256) throw Error('extracted package tree changed after preparation');
  if (actualFesmSha256 !== identity.fesm_sha256) throw Error('tabs FESM changed after preparation');
  return {run, identity};
}

export function verifyArtifactBinding({
  runBytes, expectedRunPath, packageIdentityBytes, buildIdentityBytes, actualPackageRoot,
  actualPackageTreeSha256, actualFesmSha256, actualAppSha256, actualAppBytes,
  actualThemeSha256, actualThemeBytes, actualHtmlSha256, actualHtmlBytes,
}) {
  const {run, identity} = verifyPackageIdentity({
    runBytes, expectedRunPath, packageIdentityBytes, actualPackageRoot,
    actualPackageTreeSha256, actualFesmSha256,
  });
  const build = JSON.parse(buildIdentityBytes.toString('utf8'));
  const library = run.artifacts?.find(item => item.id === 'library');
  if (build.schema !== 'legacy-tabs-motion-build-v1') throw Error('unsupported build identity');
  if (build.package_identity_sha256 !== sha256(packageIdentityBytes)) throw Error('build used a different package identity');
  if (resolve(build.package_identity_path) !== resolve(JSON.parse(packageIdentityBytes.toString('utf8')).package_identity_path)) throw Error('build package identity path changed');
  if (build.run_json !== identity.run_json || build.run_json_sha256 !== identity.run_json_sha256) {
    throw Error('build is bound to a different run.json');
  }
  if (build.artifact_sha256 !== library.sha256 || build.artifact_bytes !== library.bytes) {
    throw Error('built app is bound to a different library artifact');
  }
  if (build.package_root !== realpathSync(actualPackageRoot) ||
      build.package_tree_sha256 !== actualPackageTreeSha256 ||
      build.fesm_sha256 !== actualFesmSha256) throw Error('build package identity is stale');
  if (JSON.stringify(build.mutation) !== JSON.stringify(identity.mutation)) throw Error('build mutation identity is stale');
  if (build.app_sha256 !== actualAppSha256 || build.app_bytes !== actualAppBytes) throw Error('built app bytes changed after build');
  if (build.theme_sha256 !== actualThemeSha256 || build.theme_bytes !== actualThemeBytes) throw Error('built theme bytes changed after build');
  if (build.html_sha256 !== actualHtmlSha256 || build.html_bytes !== actualHtmlBytes) throw Error('built HTML bytes changed after build');
  return {run, packageIdentity: identity, buildIdentity: build};
}

export function readInstalledBundle({runPath, packageIdentityPath, buildIdentityPath, packageLink, distRoot}) {
  const packageRoot = realpathSync(packageLink);
  const packageIdentityBytes = readFileSync(packageIdentityPath);
  const fesm = readFileSync(join(packageRoot, 'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs'));
  const app = readFileSync(join(distRoot, 'app.js'));
  const theme = readFileSync(join(distRoot, 'theme.css'));
  const html = readFileSync(join(distRoot, 'index.html'));
  const buildIdentityBytes = readFileSync(buildIdentityPath);
  return {
    runBytes: readFileSync(runPath),
    expectedRunPath: resolve(runPath),
    packageIdentityBytes,
    buildIdentityBytes,
    actualPackageRoot: packageRoot,
    actualPackageTreeSha256: hashPackageTree(packageRoot),
    actualFesmSha256: sha256(fesm),
    actualAppSha256: sha256(app),
    actualAppBytes: app.length,
    actualThemeSha256: sha256(theme),
    actualThemeBytes: theme.length,
    actualHtmlSha256: sha256(html),
    actualHtmlBytes: html.length,
  };
}
