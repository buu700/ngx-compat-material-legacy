/**
 * migrate-legacy schematic: default Sass `@use '@angular/material'` rewrite
 * plus safe TypeScript `legacy-*` module specifier updates.
 * Conservative: unknown/ambiguous syntax yields diagnostics and no edit.
 */

'use strict';

const {rewriteSassModuleSource} = require('./sass-rewrite');
const {rewriteLegacyTypescriptImports} = require('./ts-rewrite');

const SCSS_RE = /\.(scss|sass)$/;
const TS_RE = /\.tsx?$/;

/**
 * @param {Record<string, unknown>} _options
 * @returns {import('@angular-devkit/schematics').Rule}
 */
function migrateLegacy(_options) {
  return (tree, context) => {
    const logger = context && context.logger ? context.logger : console;
    const visit = (dirPath) => {
      const dir = tree.getDir(dirPath);
      for (const file of dir.subfiles) {
        const path = dirPath === '/' ? `/${file}` : `${dirPath}/${file}`;
        if (path.includes('node_modules') || path.includes('/dist/')) {
          continue;
        }
        if (SCSS_RE.test(file)) {
          const buf = tree.read(path);
          if (!buf) continue;
          const content = buf.toString('utf8');
          const result = rewriteSassModuleSource(content);
          for (const d of result.diagnostics) {
            logger.warn?.(`[migrate-legacy] ${path}: ${d}`) || logger.warn(`[migrate-legacy] ${path}: ${d}`);
          }
          if (result.ok && result.changed && result.content != null) {
            tree.overwrite(path, result.content);
            logger.info?.(`[migrate-legacy] updated Sass @use in ${path}`);
          }
        } else if (TS_RE.test(file)) {
          const buf = tree.read(path);
          if (!buf) continue;
          const content = buf.toString('utf8');
          const result = rewriteLegacyTypescriptImports(content);
          for (const d of result.diagnostics) {
            logger.warn?.(`[migrate-legacy] ${path}: ${d}`) || logger.warn(`[migrate-legacy] ${path}: ${d}`);
          }
          if (result.ok && result.changed && result.content != null) {
            tree.overwrite(path, result.content);
            logger.info?.(`[migrate-legacy] updated TypeScript legacy import in ${path}`);
          }
        }
      }
      for (const sub of dir.subdirs) {
        if (sub === 'node_modules' || sub === 'dist' || sub === '.git') continue;
        const child = dirPath === '/' ? `/${sub}` : `${dirPath}/${sub}`;
        visit(child);
      }
    };
    visit('/');
    return tree;
  };
}

exports.migrateLegacy = migrateLegacy;
