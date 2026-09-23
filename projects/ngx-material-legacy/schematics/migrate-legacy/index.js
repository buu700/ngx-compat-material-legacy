/**
 * Stub migrate-legacy schematic. Ships so the packed package has a schematics
 * collection field; real transforms land in a follow-up.
 * @returns {import('@angular-devkit/schematics').Rule}
 */
function migrateLegacy(_options) {
  return (tree) => tree;
}
exports.migrateLegacy = migrateLegacy;
