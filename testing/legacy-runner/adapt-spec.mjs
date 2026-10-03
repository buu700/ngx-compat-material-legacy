/**
 * Build-time adapter for historical Material 16 legacy specs.
 *
 * Rewrites legacy package imports onto the packed @ngx-compat entry points,
 * points private CDK test helpers and unpublished harness shared specs at the
 * local shims, and marks spec hosts standalone:false with Default change
 * detection. Angular 22 treats a missing strategy as OnPush and a missing
 * standalone flag as standalone, which skips later detectChanges() and rejects
 * TestBed declarations.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';

const runnerDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runnerDir, '../..');
const libRoot = path.join(repoRoot, 'projects/ngx-material-legacy');
const defaultTypes = path.join(repoRoot, 'dist/ngx-material-legacy/types');
const cdkShim = path.join(runnerDir, 'shims/cdk-testing-private.ts');
const harnessRoot = path.join(runnerDir, 'shims/harness');

const exportCache = new Map();

function activeTypesRoot(typesRoot) {
  return typesRoot || process.env.LEGACY_TYPES_ROOT || defaultTypes;
}

function dtsPath(entry, typesRoot) {
  const slug = entry.replaceAll('/', '-');
  return path.join(activeTypesRoot(typesRoot), `ngx-compat-material-legacy-${slug}.d.ts`);
}

export function exportsOf(entry, typesRoot) {
  const cacheKey = `${activeTypesRoot(typesRoot)}::${entry}`;
  if (exportCache.has(cacheKey)) return exportCache.get(cacheKey);
  const file = dtsPath(entry, typesRoot);
  const names = new Set();
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    const decl = /export declare (?:abstract )?class ([A-Za-z0-9_]+)|export declare (?:function|const|let|enum|type|interface) ([A-Za-z0-9_]+)/g;
    for (const match of text.matchAll(decl)) names.add(match[1] || match[2]);
    let cursor = 0;
    while (cursor < text.length) {
      const at = text.indexOf('export ', cursor);
      if (at < 0) break;
      const slice = text.slice(at);
      const typeBrace = slice.startsWith('export type {') ? 12 : slice.startsWith('export {') ? 7 : -1;
      if (typeBrace < 0) {
        cursor = at + 7;
        continue;
      }
      const open = at + typeBrace;
      const close = text.indexOf('}', open);
      if (close < 0) break;
      const body = text.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
      for (const part of body.split(',')) {
        const cleaned = part.replace(/\/\/.*$/gm, '').trim();
        if (!cleaned) continue;
        const named = cleaned.match(/^(?:type\s+)?([A-Za-z0-9_]+)(?:\s+as\s+([A-Za-z0-9_]+))?/);
        if (named) names.add(named[2] || named[1]);
      }
      cursor = close + 1;
    }
  }
  exportCache.set(cacheKey, names);
  return names;
}

function entryFor(abs) {
  const rel = path.relative(libRoot, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  if (!parts[0]?.startsWith('legacy-')) return null;
  return parts.includes('testing') ? `${parts[0]}/testing` : parts[0];
}

function resolveTs(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

function isSafeLocal(abs) {
  const text = fs.readFileSync(abs, 'utf8');
  if (/@Component\s*\(|@Directive\s*\(|@NgModule\s*\(|templateUrl\s*:|template\s*:/.test(text)) {
    return false;
  }
  if (/from\s+['"]\./.test(text)) return false;
  return true;
}

function importedNames(node) {
  const names = [];
  if (ts.isImportDeclaration(node) && node.importClause) {
    if (node.importClause.name) names.push('default');
    const bindings = node.importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) names.push('*');
    else if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        names.push((element.propertyName ?? element.name).text);
      }
    }
  } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
    for (const element of node.exportClause.elements) {
      names.push((element.propertyName ?? element.name).text);
    }
  }
  return names;
}

function vendoredShared(spec) {
  const match = spec.match(/^@angular\/material\/([a-z0-9-]+)\/testing\/(.+\.spec)$/);
  if (!match) return null;
  if (match[1] === 'button' && match[2] === 'shared.spec') {
    return path.join(runnerDir, 'shims/button-shared.spec.ts');
  }
  const file = path.join(harnessRoot, match[1], match[2]);
  return [file, `${file}.ts`].find(candidate => fs.existsSync(candidate)) ?? null;
}

function mapSpecifier(filename, spec, names, problems, options = {}) {
  const typesRoot = options.typesRoot;
  const subjectMode = options.subjectMode || process.env.LEGACY_SUBJECT_MODE || 'workspace-dist';

  if (spec === '@angular/cdk/testing/private' || spec.endsWith('cdk/testing/private')) {
    return cdkShim;
  }
  const legacy = spec.match(/^@angular\/material\/(legacy-[a-z0-9-]+(?:\/testing)?)$/);
  if (legacy) return `@ngx-compat/material-legacy/${legacy[1]}`;
  const legacyShared = spec.match(/^@angular\/material\/(legacy-[a-z0-9-]+)\/testing\/(.+\.spec)$/);
  if (legacyShared) {
    const projectSpec = path.join(libRoot, legacyShared[1], 'testing', legacyShared[2]);
    const existing = [projectSpec, `${projectSpec}.ts`].find(candidate => fs.existsSync(candidate));
    if (existing) return existing;
    problems.push(`missing legacy shared spec ${spec}`);
    return spec;
  }

  const shared = vendoredShared(spec);
  if (shared) return shared;
  if (/^@angular\/material\/[a-z0-9-]+\/testing\/.+\.spec$/.test(spec)) {
    problems.push(`missing vendored shared spec ${spec}`);
    return spec;
  }
  const deep = spec.match(/^@angular\/material\/([a-z0-9-]+)\/testing\/[^'"]+/);
  if (deep) return `@angular/material/${deep[1]}/testing`;

  if (!spec.startsWith('.')) return null;

  if (filename.includes(`${path.sep}shims${path.sep}harness${path.sep}`)) {
    const family = path.basename(path.dirname(filename));
    if (spec === '../module' || spec.endsWith('/module')) return `@angular/material/${family}`;
    if (spec.startsWith('./')) return `@angular/material/${family}/testing`;
  }

  const resolved = resolveTs(filename, spec);
  if (resolved && (resolved === cdkShim || resolved.includes(`${path.sep}testing${path.sep}legacy-runner${path.sep}shims${path.sep}`))) {
    return null;
  }
  if (!resolved) {
    if (spec.includes('/sort')) return '@angular/material/sort';
    problems.push(`unresolved ${spec} from ${path.relative(repoRoot, filename)}`);
    return spec;
  }
  if (resolved.endsWith('.spec.ts')) return null;

  const entry = entryFor(resolved);
  const allExported = target =>
    !!target && names.length > 0 && !names.includes('*') && !names.includes('default') &&
    names.every(name => exportsOf(target, typesRoot).has(name));
  if (allExported(entry)) return `@ngx-compat/material-legacy/${entry}`;
  const alt = entry?.endsWith('/testing') ? entry.replace(/\/testing$/, '') : entry ? `${entry}/testing` : null;
  if (allExported(alt)) return `@ngx-compat/material-legacy/${alt}`;
  if (isSafeLocal(resolved)) return null;
  if (resolved.includes(`${path.sep}testing${path.sep}`) && !/@Component\s*\(|templateUrl\s*:|template\s*:/.test(fs.readFileSync(resolved, 'utf8'))) {
    return null;
  }
  const label =
    subjectMode === 'artifact'
      ? `unmapped (artifact mode forbids workspace implementation) ${spec}`
      : `unmapped ${spec}`;
  problems.push(
    `${label} [${names.join(', ')}] in ${path.relative(repoRoot, filename)} -> ${path.relative(repoRoot, resolved)}`,
  );
  return spec;
}

function decoratorInjection(node, sourceFile) {
  if (!ts.isDecorator(node) || !ts.isCallExpression(node.expression)) return null;
  const callee = node.expression.expression;
  if (!ts.isIdentifier(callee)) return null;
  const kind = callee.text;
  if (kind !== 'Component' && kind !== 'Directive' && kind !== 'Pipe') return null;
  const arg = node.expression.arguments[0];
  if (!arg || !ts.isObjectLiteralExpression(arg)) return null;
  const has = property =>
    arg.properties.some(
      item =>
        ts.isPropertyAssignment(item) &&
        ts.isIdentifier(item.name) &&
        item.name.text === property,
    );
  let text = '';
  if (!has('standalone')) text += 'standalone: false,';
  if (kind === 'Component' && !has('changeDetection')) {
    text += 'changeDetection: ChangeDetectionStrategy.Default,';
  }
  if (!text) return null;
  const start = arg.getStart(sourceFile) + 1;
  return {start, end: start, text};
}

export function adaptSpec(source, filename, options = {}) {
  const problems = [];
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const replacements = [];
  let needsChangeDetection = false;

  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const spec = statement.moduleSpecifier.text;
      const next = mapSpecifier(filename, spec, importedNames(statement), problems, options);
      if (next && next !== spec) {
        const literal = statement.moduleSpecifier;
        replacements.push({start: literal.getStart(sourceFile) + 1, end: literal.end - 1, text: next});
      }
    }
  }

  function visit(node) {
    const injection = decoratorInjection(node, sourceFile);
    if (injection) {
      replacements.push(injection);
      if (injection.text.includes('ChangeDetectionStrategy')) needsChangeDetection = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (needsChangeDetection && !source.includes('ChangeDetectionStrategy')) {
    const coreImport = sourceFile.statements.find(
      statement =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === '@angular/core' &&
        statement.importClause?.namedBindings &&
        ts.isNamedImports(statement.importClause.namedBindings),
    );
    if (coreImport && ts.isNamedImports(coreImport.importClause.namedBindings)) {
      const named = coreImport.importClause.namedBindings;
      const start = named.getStart(sourceFile) + 1;
      replacements.push({start, end: start, text: 'ChangeDetectionStrategy, '});
    } else {
      replacements.push({
        start: 0,
        end: 0,
        text: "import {ChangeDetectionStrategy} from '@angular/core';\n",
      });
    }
  }

  const renamesCreateNgModuleRef = sourceFile.statements.some(
    statement =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === '@angular/core' &&
      importedNames(statement).includes('createNgModuleRef'),
  );
  replacements.sort((a, b) => b.start - a.start || b.end - a.end);
  let code = source;
  for (const replacement of replacements) {
    code = code.slice(0, replacement.start) + replacement.text + code.slice(replacement.end);
  }
  if (renamesCreateNgModuleRef) {
    code = code.replaceAll('createNgModuleRef', 'createNgModule');
  }
  return {code, problems};
}

export function resolveSpecModule(filename, spec) {
  if (spec.startsWith('.')) return resolveTs(filename, spec);
  const shared = vendoredShared(spec);
  if (shared) return shared;
  const legacyShared = spec.match(/^@angular\/material\/(legacy-[a-z0-9-]+)\/testing\/(.+\.spec)$/);
  if (legacyShared) {
    const projectSpec = path.join(libRoot, legacyShared[1], 'testing', legacyShared[2]);
    return [projectSpec, `${projectSpec}.ts`].find(candidate => fs.existsSync(candidate)) ?? null;
  }
  return null;
}

export function historicalPathFor(filename, rows) {
  const rel = path.relative(repoRoot, filename).split(path.sep).join('/');
  return rows.find(row => row.candidate === rel)?.historical_path ?? null;
}
