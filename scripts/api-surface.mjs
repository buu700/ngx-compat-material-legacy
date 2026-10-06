#!/usr/bin/env node
/**
 * Public API cases for api-completeness.
 *
 * Identities come from the historical 16.2.14 legacy barrels and reviewed
 * removal records. Callers must derive this surface before reading a packed
 * tarball. A name-only or key-presence observation is not acceptance.
 */
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
let typescriptModule;
function loadTypescript() {
  if (!typescriptModule) typescriptModule = require('typescript');
  return typescriptModule;
}
const ts = new Proxy({}, {
  get(_target, property) {
    const loaded = loadTypescript();
    const value = loaded[property];
    return typeof value === 'function' ? value.bind(loaded) : value;
  },
});

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const FACTORY_REFERENCE = 'reference/material-16.2.14/factory-metadata.json';
const FACTORY_REFERENCE_SHA256 = '1b124aab1f570e111647f8142cdea8066ae9db673efc405a6999c178709602b6';
let factoryReference;
let cdkFactoryReference;
const CDK_FACTORY_REFERENCE = 'reference/material-16.2.14/cdk-factory-metadata.json';
const CDK_FACTORY_REFERENCE_SHA256 = '86a98330dda8255dfd6666363aecc2b08ea0730cd39f8f31af998dd0987d4a72';
const INHERITED_TABLE_FACTORIES = Object.freeze({MatLegacyHeaderRowDef:'CdkHeaderRowDef',MatLegacyFooterRowDef:'CdkFooterRowDef',MatLegacyRowDef:'CdkRowDef'});
export function originalFactoryContract(file, name) {
  const family = file.split('\\').join('/').match(/\/material\/([^/]+)\//)?.[1];
  if (!family) return null;
  if (!factoryReference) {
    const bytes = readFileSync(join(root, FACTORY_REFERENCE));
    if (createHash('sha256').update(bytes).digest('hex') !== FACTORY_REFERENCE_SHA256) throw new Error('untouched16 factory metadata identity mismatch');
    factoryReference = JSON.parse(bytes);
  }
  const contract = factoryReference.factories[family+'/'+name] || null;
  if (family === 'legacy-table' && INHERITED_TABLE_FACTORIES[name] && contract?.deps_kind === 'inherited') {
    if (!cdkFactoryReference) {
      const bytes = readFileSync(join(root, CDK_FACTORY_REFERENCE));
      if (createHash('sha256').update(bytes).digest('hex') !== CDK_FACTORY_REFERENCE_SHA256) throw new Error('untouched16 CDK factory metadata identity mismatch');
      cdkFactoryReference = JSON.parse(bytes);
    }
    const inherited = cdkFactoryReference.factories['table/'+INHERITED_TABLE_FACTORIES[name]];
    if (!inherited || inherited.deps_kind !== 'dependencies') throw new Error('original table inheritance factory contract unavailable');
    return {...contract,inherited_factory:inherited};
  }
  return contract;
}

export const NEGATIVE_IDS = {
  missingMember: 'api-completeness/export-contract/negatives/missing-member',
  forgedSource: 'api-completeness/export-contract/negatives/forged-source-identity',
  unboundArtifact: 'api-completeness/export-contract/negatives/unbound-artifact',
  signatureMismatch: 'api-completeness/typescript-signatures/negatives/signature-mismatch',
  droppedShape: 'api-completeness/typescript-signatures/negatives/protected-or-constructor-dropped',
  nameOnly: 'api-completeness/typescript-signatures/negatives/name-only-pass',
  tokenIdentity: 'api-completeness/runtime-di-identity/negatives/token-identity',
};

const REMOVAL_PATH = 'compatibility/rc/api/export-removals.json';
const DIFFERENCE_PATH = 'compatibility/rc/api/signature-differences.json';

export function normalizeType(type) {
  return String(type || '')
    .replace(/import\([^)]*\)\./g, '')
    .replace(/;/g, ',')
    .replace(/\s+/g, '')
    .replace(/\"/g, "'").replace(/\$\d+/g, '');
}

// CDK 16's authenticated declaration is exactly AsyncFactoryFn<T> = () => Promise<T>.
// Expand only that imported property type, never an unrelated same-name alias.
export function propertyTypeText(node, sourceFile) {
  const raw = node.getText(sourceFile);
  if (!ts.isTypeReferenceNode(node) || !ts.isIdentifier(node.typeName)
      || node.typeArguments?.length !== 1) return raw;
  const local = node.typeName.text;
  const imported = sourceFile.statements.some(statement =>
    ts.isImportDeclaration(statement)
      && statement.moduleSpecifier.text === '@angular/cdk/testing'
      && statement.importClause?.namedBindings
      && ts.isNamedImports(statement.importClause.namedBindings)
      && statement.importClause.namedBindings.elements.some(element =>
        element.name.text === local
          && (element.propertyName || element.name).text === 'AsyncFactoryFn'));
  if (!imported) return raw;
  return `() => Promise<${node.typeArguments[0].getText(sourceFile)}>`;
}

function optionalType(type, optional) {
  let text = normalizeType(type || 'any');
  if (text.startsWith('(') && text.endsWith(')')) text = text.slice(1, -1);
  if (optional) {
    if (text.endsWith('|undefined')) text = text.slice(0, -'|undefined'.length);
    if (text.startsWith('undefined|')) text = text.slice('undefined|'.length);
  }
  return `${text}${optional ? '?' : ''}`;
}

function modifiersOf(node) {
  return node.modifiers || [];
}

function isPrivate(node) {
  return modifiersOf(node).some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword);
}

function isProtected(node) {
  return modifiersOf(node).some(mod => mod.kind === ts.SyntaxKind.ProtectedKeyword);
}

function isStatic(node) {
  return modifiersOf(node).some(mod => mod.kind === ts.SyntaxKind.StaticKeyword);
}

function isReadonly(node) {
  return modifiersOf(node).some(mod => mod.kind === ts.SyntaxKind.ReadonlyKeyword);
}

function accessOf(node) {
  if (isPrivate(node)) return 'private';
  if (isProtected(node)) return 'protected';
  return 'public';
}

function identText(name) {
  if (!name) return null;
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function typeParamText(node, sourceFile) {
  if (!node.typeParameters || !node.typeParameters.length) return '';
  return `<${node.typeParameters.map(param => normalizeType(param.getText(sourceFile))).join(',')}>`;
}

function paramText(param, sourceFile) {
  const optional = Boolean(param.questionToken || param.initializer);
  const rest = param.dotDotDotToken ? '...' : '';
  return rest + optionalType(param.type ? param.type.getText(sourceFile) : '', optional);
}

function returnText(member, sourceFile, className, classTypeParams) {
  if (!member.type) return '*';
  let text = normalizeType(member.type.getText(sourceFile));
  if (text === 'this') return 'this';
  const self = normalizeType(`${className}${classTypeParams}`);
  if (text === self) return 'this';
  return text;
}

function signatureOfMember(member, sourceFile, className, classTypeParams) {
  if (ts.isConstructorDeclaration(member)) {
    const params = (member.parameters || []).map(param => paramText(param, sourceFile)).join(',');
    return {
      group: 'constructor',
      access: 'public',
      sig: `public constructor(${params})`,
      protected: false,
      constructor: true,
    };
  }
  const name = identText(member.name);
  if (!name || name.startsWith('ɵ') || name.startsWith('#')) return null;
  if (isPrivate(member)) return null;
  const access = accessOf(member);
  const staticText = isStatic(member) ? 'static ' : '';
  if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
    const overloads = true;
    const params = (member.parameters || []).map(param => paramText(param, sourceFile)).join(',');
    const typeParams = typeParamText(member, sourceFile);
    const returns = returnText(member, sourceFile, className, classTypeParams);
    return {
      group: `${staticText}method ${name}`,
      access,
      sig: `${access} ${staticText}method ${name}${typeParams}(${params}):${returns}`,
      protected: access === 'protected',
      constructor: false,
      implementation: Boolean(member.body),
      overloadGroup: `${staticText}method ${name}`,
      hasBody: Boolean(member.body),
      keep: overloads,
    };
  }
  if (ts.isGetAccessor(member) || ts.isGetAccessorDeclaration(member) || ts.isGetAccessorSignature?.(member)) {
    // handled below via kind checks
  }
  if (member.kind === ts.SyntaxKind.GetAccessor) {
    const returns = returnText(member, sourceFile, className, classTypeParams);
    return {
      group: `${staticText}get ${name}`,
      access,
      sig: `${access} ${staticText}get ${name}():${returns}`,
      protected: access === 'protected',
      constructor: false,
    };
  }
  if (member.kind === ts.SyntaxKind.SetAccessor) {
    const params = (member.parameters || []).map(param => paramText(param, sourceFile)).join(',');
    return {
      group: `${staticText}set ${name}`,
      access,
      sig: `${access} ${staticText}set ${name}(${params})`,
      protected: access === 'protected',
      constructor: false,
    };
  }
  if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
    const optional = Boolean(member.questionToken);
    const type = member.type ? optionalType(propertyTypeText(member.type, sourceFile), optional) : '*';
    const readonly = isReadonly(member) ? 'readonly ' : '';
    return {
      group: `${staticText}prop ${name}`,
      access,
      sig: `${access} ${staticText}${readonly}prop ${name}:${type}`,
      protected: access === 'protected',
      constructor: false,
    };
  }
  return null;
}

function declaredMembers(node, sourceFile) {
  const className = node.name ? node.name.text : 'Anonymous';
  const classTypeParams = typeParamText(node, sourceFile);
  const raw = [];
  for (const member of node.members || []) {
    if (ts.isConstructorDeclaration(member)) {
      const sig = signatureOfMember(member, sourceFile, className, classTypeParams);
      if (sig) raw.push(sig);
      for (const param of member.parameters || []) {
        if (!param.modifiers && !param.name) continue;
        const paramAccess = accessOf(param);
        if (paramAccess === 'private') continue;
        const hasAccess = (param.modifiers || []).some(mod => mod.kind === ts.SyntaxKind.PublicKeyword || mod.kind === ts.SyntaxKind.ProtectedKeyword);
        if (!hasAccess) continue;
        const paramName = identText(param.name);
        if (!paramName) continue;
        const optional = Boolean(param.questionToken || param.initializer);
        const type = param.type ? optionalType(param.type.getText(sourceFile), optional) : '*';
        const readonly = isReadonly(param) ? 'readonly ' : '';
        raw.push({
          sig: `${paramAccess} ${readonly}prop ${paramName}:${type}`,
          protected: paramAccess === 'protected',
          constructor: false,
        });
      }
      continue;
    }
    if (!member.name) continue;
    const sig = signatureOfMember(member, sourceFile, className, classTypeParams);
    if (sig) raw.push(sig);
  }
  const methods = raw.filter(item => item.overloadGroup);
  const dropImpl = new Set();
  for (const item of methods) {
    const peers = methods.filter(other => other.overloadGroup === item.overloadGroup);
    if (peers.some(other => !other.hasBody) && item.hasBody) dropImpl.add(item);
  }
  const signatures = [];
  const requiredProtected = [];
  let requiredConstructor = false;
  for (const item of raw) {
    if (dropImpl.has(item)) continue;
    signatures.push(item.sig);
    if (item.protected) requiredProtected.push(item.sig);
    if (item.constructor) requiredConstructor = true;
  }
  return {
    kind: ts.isInterfaceDeclaration(node) ? 'interface' : 'class',
    typeParams: classTypeParams ? `type-params ${classTypeParams}` : 'type-params',
    signatures,
    requiredProtected,
    requiredConstructor,
    node,
    sourceFile,
  };
}

function resolveSpecifier(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [`${base}.ts`, `${base}.d.ts`, join(base, 'index.ts'), join(base, 'public-api.ts'), base]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function materialEntry(spec, refRoot) {
  if (!spec.startsWith('@angular/material/')) return null;
  const rest = spec.slice('@angular/material/'.length);
  const entry = join(refRoot, rest, 'public-api.ts');
  if (existsSync(entry)) return entry;
  const index = join(refRoot, rest, 'index.ts');
  if (existsSync(index)) return index;
  return null;
}

function importBindings(sourceFile) {
  const bindings = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier) continue;
    const spec = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    for (const element of clause.namedBindings.elements) {
      const local = element.name.text;
      const imported = (element.propertyName || element.name).text;
      bindings.set(local, {spec, imported});
    }
  }
  return bindings;
}

function sourceFileOf(file) {
  const text = readFileSync(file, 'utf8');
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.d.ts') ? ts.ScriptKind.TS : ts.ScriptKind.TS);
}

function findLocalDeclaration(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (statement.name && statement.name.text === name) return statement;
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) return statement;
      }
    }
  }
  return null;
}

function followExports(file, name, seen, refRoot = null) {
  const real = resolve(file);
  const key = `${real}#${name}`;
  if (seen.has(key) || !existsSync(real)) return null;
  seen.add(key);
  const sourceFile = sourceFileOf(real);
  const direct = findLocalDeclaration(sourceFile, name);
  if (direct && (ts.isClassDeclaration(direct) || ts.isInterfaceDeclaration(direct)
    || ts.isEnumDeclaration(direct) || ts.isTypeAliasDeclaration(direct)
    || ts.isFunctionDeclaration(direct) || ts.isVariableStatement(direct))) {
    return {file: real, sourceFile, node: direct, localName: name};
  }
  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
    const spec = statement.moduleSpecifier.text;
    if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        const exported = (element.name || element.propertyName).text;
        if (exported !== name) continue;
        const local = (element.propertyName || element.name).text;
        if (!spec.startsWith('.')) {
          const entry = refRoot ? materialEntry(spec, refRoot) : null;
          if (!entry) return {reexport: {spec, imported: local, exported: name}, file: real};
          const resolved = followExports(entry, local, seen, refRoot);
          if (!resolved) return {reexport: {spec, imported: local, exported: name}, file: real};
          return {...resolved, reexport: {spec, imported: local, exported: name}};
        }
        const next = resolveSpecifier(real, spec);
        if (!next) return {unresolved: `${spec}#${local}`};
        return followExports(next, local, seen, refRoot);
      }
      continue;
    }
    if (!statement.exportClause && spec.startsWith('.')) {
      const next = resolveSpecifier(real, spec);
      if (!next) continue;
      const nested = followExports(next, name, seen, refRoot);
      if (nested) return nested;
    }
  }
  return null;
}

function heritageIdentifier(typeNode) {
  const expr = typeNode.expression;
  if (!expr) return null;
  if (ts.isIdentifier(expr)) return {local: expr.text, typeArgs: typeNode.typeArguments};
  if (ts.isPropertyAccessExpression(expr)) return {local: expr.name.text, typeArgs: typeNode.typeArguments};
  return null;
}


function decoratorCalls(node) {
  const list = typeof ts.getDecorators === 'function' ? (ts.getDecorators(node) || []) : (node.decorators || []);
  return list.map(decorator => decorator.expression).filter(expr => ts.isCallExpression(expr));
}

export function diParamsOf(node, sourceFile) {
  const ctor = (node.members || []).find(member => ts.isConstructorDeclaration(member));
  if (!ctor) return [];
  const bindings = importBindings(sourceFile);
  return ctor.parameters.map(param => {
    let inject = '';
    let attribute = null;
    // TypeScript permits an omitted argument; Angular DI still requires its token
    // unless the original constructor actually declares @Optional().
    let optional = false;
    for (const call of decoratorCalls(param)) {
      const called = call.expression.getText(sourceFile);
      if (called === 'Optional' || called.endsWith('.Optional')) optional = true;
      if (called === 'Attribute' || called.endsWith('.Attribute')) attribute = call.arguments[0] ? call.arguments[0].getText(sourceFile).replace(/^['"]|['"]$/g, '') : null;
      if (called === 'Inject' || called.endsWith('.Inject')) {
        inject = call.arguments[0] ? call.arguments[0].getText(sourceFile) : '';
      }
    }
    let ident = inject || (param.type ? param.type.getText(sourceFile) : '');
    const forward = ident.match(/forwardRef\(\(\)\s*=>\s*([A-Za-z0-9_]+)\)/);
    if (forward) ident = forward[1];
    ident = ident.replace(/<.*$/, '').replace(/\[\]$/, '').trim();
    const binding = bindings.get(ident);
    return {
      ident,
      optional,
      attribute,
      spec: binding ? binding.spec : null,
      imported: binding ? binding.imported : ident,
    };
  });
}

function heritageNames(node, sourceFile) {
  const names = [];
  for (const clause of node.heritageClauses || []) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const typeNode of clause.types || []) {
      const ident = heritageIdentifier(typeNode);
      if (ident) names.push(ident.local);
    }
  }
  return names;
}

function flattenClass(found, refRoot, seen) {
  const shape = declaredMembers(found.node, found.sourceFile);
  const ownGroups = new Set(shape.signatures.map(sig => groupOf(sig)));
  const merged = [...shape.signatures];
  const mergedProtected = [...shape.requiredProtected];
  let requiredConstructor = shape.requiredConstructor;
  const bindings = importBindings(found.sourceFile);
  for (const clause of found.node.heritageClauses || []) {
    for (const typeNode of clause.types || []) {
    const ident = heritageIdentifier(typeNode);
    if (!ident) continue;
    const binding = bindings.get(ident.local);
    let base = null;
    if (binding && binding.spec.startsWith('@angular/material/')) {
      const entry = materialEntry(binding.spec, refRoot);
      if (entry) base = followExports(entry, binding.imported, seen, refRoot);
    } else if (binding && binding.spec.startsWith('.')) {
      const next = resolveSpecifier(found.file, binding.spec);
      if (next) base = followExports(next, binding.imported, seen, refRoot);
    } else if (!binding) {
      base = followExports(found.file, ident.local, seen, refRoot);
    }
    if (!base || !base.node || (!ts.isClassDeclaration(base.node) && !ts.isInterfaceDeclaration(base.node))) {
      continue;
    }
    const parent = flattenClass(base, refRoot, seen);
    for (const sig of parent.signatures) {
      if (ownGroups.has(groupOf(sig))) continue;
      // A subclass that declares any overload of a method replaces that group.
      merged.push(sig);
      if (sig.startsWith('protected ')) mergedProtected.push(sig);
    }
    if (!requiredConstructor && parent.requiredConstructor) {
      const parentCtor = parent.signatures.find(sig => sig.includes(' constructor('));
      if (parentCtor && !merged.some(sig => sig.includes(' constructor('))) {
        merged.push(parentCtor);
        requiredConstructor = true;
      }
    }
    }
  }
  return {
    kind: shape.kind,
    typeParams: shape.typeParams,
    signatures: unique(merged),
    requiredProtected: unique(mergedProtected),
    requiredConstructor,
  };
}

function groupOf(sig) {
  const ctor = sig.match(/constructor\(/);
  if (ctor) return 'constructor';
  const method = sig.match(/(?:public |protected )((?:static )?(?:method|get|set|prop) )([^(<:]+)/);
  if (!method) return sig;
  return `${method[1]}${method[2]}`.trim();
}


function enumSignatures(node, sourceFile) {
  let next = 0;
  let numeric = true;
  const members = [];
  for (const member of node.members) {
    const name = identText(member.name);
    let value = '';
    if (!member.initializer) {
      value = numeric ? String(next) : '';
      next += 1;
    } else {
      value = normalizeType(member.initializer.getText(sourceFile));
      if (/^-?\d+$/.test(value)) next = Number(value) + 1;
      else numeric = false;
    }
    members.push(`enum ${name}=${value}`);
  }
  return members.sort();
}

function unique(values) {
  return [...new Set(values)].sort();
}

function shapeFromFound(found, refRoot) {
  if (!found) return {kind: 'missing', signatures: [], requiredProtected: [], requiredConstructor: false, comparison: 'unresolved'};
  if (found.reexport && !found.node) {
    return {
      kind: 'reexport',
      signatures: [`reexport ${found.reexport.imported} from ${found.reexport.spec}`],
      requiredProtected: [],
      requiredConstructor: false,
      comparison: 'signature',
    };
  }
  if (found.unresolved) {
    return {kind: 'unresolved', signatures: [], requiredProtected: [], requiredConstructor: false, comparison: 'unresolved'};
  }
  const node = found.node;
  if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
    const own = declaredMembers(node, found.sourceFile);
    const flat = flattenClass(found, refRoot, new Set());
    flat.comparison = 'signature';
    flat.di = classIsInjectable(node);
    flat.token = false;
    flat.ownSignatures = own.signatures;
    flat.ownProtected = own.requiredProtected;
    flat.ownConstructor = own.requiredConstructor;
    flat.heritage = heritageNames(node, found.sourceFile);
    flat.diParams = diParamsOf(node, found.sourceFile);
    flat.originalFactory = originalFactoryContract(found.file, node.name?.text);
    if (found.reexport) flat.reexport = found.reexport;
    return flat;
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return {
      kind: 'type',
      signatures: [`type ${node.name.text}${typeParamText(node, found.sourceFile)}=${normalizeType(node.type.getText(found.sourceFile))}`],
      requiredProtected: [],
      requiredConstructor: false,
      comparison: 'signature',
    };
  }
  if (ts.isEnumDeclaration(node)) {
    const members = enumSignatures(node, found.sourceFile);
    return {kind: 'enum', signatures: members.sort(), requiredProtected: [], requiredConstructor: false, comparison: 'signature'};
  }
  if (ts.isFunctionDeclaration(node)) {
    const params = (node.parameters || []).map(param => paramText(param, found.sourceFile)).join(',');
    const returns = node.type ? normalizeType(node.type.getText(found.sourceFile)) : '*';
    return {
      kind: 'function',
      signatures: [`function${typeParamText(node, found.sourceFile)}(${params}):${returns}`],
      requiredProtected: [],
      requiredConstructor: false,
      comparison: 'signature',
    };
  }
  if (ts.isVariableStatement(node)) {
    const decl = node.declarationList.declarations.find(item => ts.isIdentifier(item.name));
    const type = decl && decl.type ? normalizeType(decl.type.getText(found.sourceFile)) : '*';
    const token = Boolean(decl && decl.initializer && ts.isNewExpression(decl.initializer)
      && ts.isIdentifier(decl.initializer.expression) && decl.initializer.expression.text === 'InjectionToken');
    let description = '';
    if (token && decl.initializer.arguments && decl.initializer.arguments[0]) {
      description = normalizeType(decl.initializer.arguments[0].getText(found.sourceFile));
    }
    return {
      kind: token ? 'token' : 'const',
      signatures: token
        ? [`token ${decl.name.text} ${description}`]
        : [`const ${decl.name.text}:${type}`],
      requiredProtected: [],
      requiredConstructor: false,
      comparison: 'signature',
      token,
      tokenName: token ? decl.name.text : null,
      tokenDescription: description,
    };
  }
  return {kind: 'unresolved', signatures: [], requiredProtected: [], requiredConstructor: false, comparison: 'unresolved'};
}

function classIsInjectable(node) {
  const decorators = typeof ts.getDecorators === 'function' ? (ts.getDecorators(node) || []) : (node.decorators || []);
  return decorators.some(decorator => {
    const expr = decorator.expression;
    const called = ts.isCallExpression(expr) ? expr.expression : expr;
    const text = ts.isIdentifier(called) ? called.text : '';
    return ['Component', 'Directive', 'Injectable', 'Pipe', 'NgModule'].includes(text);
  });
}

function collectExports(file, seen = new Set()) {
  const real = resolve(file);
  if (seen.has(real) || !existsSync(real)) return [];
  seen.add(real);
  const sourceFile = sourceFileOf(real);
  const names = [];
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          names.push((element.name || element.propertyName).text);
        }
        continue;
      }
      if (statement.moduleSpecifier && !statement.exportClause && statement.moduleSpecifier.text.startsWith('.')) {
        const next = resolveSpecifier(real, statement.moduleSpecifier.text);
        if (next) names.push(...collectExports(next, seen));
      }
      continue;
    }
    const exported = modifiersOf(statement).some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (statement.name && (ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)
      || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)
      || ts.isTypeAliasDeclaration(statement))) {
      names.push(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.push(decl.name.text);
      }
    }
  }
  return names;
}

function readJson(relativePath) {
  const path = join(root, relativePath);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadRemovals() {
  const doc = readJson(REMOVAL_PATH);
  const removals = new Map();
  for (const row of doc?.removals || []) {
    if (!row || !row.entry || !row.symbol || !row.rationale) continue;
    removals.set(`${row.entry}#${row.symbol}`, row);
  }
  return removals;
}

export function loadDifferences() {
  const doc = readJson(DIFFERENCE_PATH);
  return Array.isArray(doc?.differences) ? doc.differences : [];
}

export function deriveSurface(refRoot) {
  const removals = loadRemovals();
  const families = readdirSync(refRoot).filter(name => name.startsWith('legacy-')).sort();
  const symbols = [];
  for (const family of families) {
    for (const kind of ['primary', 'testing']) {
      const refPath = kind === 'primary'
        ? join(refRoot, family, 'public-api.ts')
        : join(refRoot, family, 'testing', 'public-api.ts');
      if (!existsSync(refPath)) continue;
      const entry = `${family}/${kind}`;
      const names = [...new Set(collectExports(refPath))].sort();
      for (const name of names) {
        if (removals.has(`${entry}#${name}`)) continue;
        const found = followExports(refPath, name, new Set(), refRoot);
        const shape = shapeFromFound(found, refRoot);
        if (found && found.reexport) shape.reexport = found.reexport;
        symbols.push({
          family,
          kind,
          entry,
          name,
          symbol_id: `${entry}/${name}`,
          export_id: `api-completeness/export-contract/${entry}/${name}`,
          signature_id: `api-completeness/typescript-signatures/${entry}/${name}`,
          di_id: shape.di || shape.token ? `api-completeness/runtime-di-identity/${entry}/${name}` : null,
          shape,
        });
      }
    }
  }
  return {families, symbols, removals: [...removals.values()]};
}

export function caseGroups(surface) {
  const exportContract = [];
  const typescriptSignatures = [];
  const runtimeDi = [];
  const seenEntries = new Set();
  for (const symbol of surface.symbols) {
    const entryId = `api-completeness/export-contract/${symbol.entry}/package-entry`;
    if (!seenEntries.has(entryId)) {
      seenEntries.add(entryId);
      exportContract.push(entryId);
    }
    exportContract.push(symbol.export_id);
    typescriptSignatures.push(symbol.signature_id);
    if (symbol.di_id) runtimeDi.push(symbol.di_id);
  }
  exportContract.push(NEGATIVE_IDS.missingMember, NEGATIVE_IDS.forgedSource, NEGATIVE_IDS.unboundArtifact);
  typescriptSignatures.push(NEGATIVE_IDS.signatureMismatch, NEGATIVE_IDS.droppedShape, NEGATIVE_IDS.nameOnly);
  runtimeDi.push(NEGATIVE_IDS.tokenIdentity);
  return {
    'export-contract': exportContract,
    'typescript-signatures': typescriptSignatures,
    'runtime-di-identity': runtimeDi,
  };
}

function indexFile(sourceFile) {
  const map = new Map();
  for (const statement of sourceFile.statements) {
    if (statement.name && ts.isIdentifier(statement.name)) map.set(statement.name.text, statement);
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) map.set(decl.name.text, statement);
      }
    }
  }
  return map;
}

function importSpecFor(sourceFile, localName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause || !statement.moduleSpecifier) continue;
    const bindings = statement.importClause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if (element.name.text === localName) return statement.moduleSpecifier.text;
    }
  }
  return '';
}

function flattenPacked(node, index, sourceFile, seen) {
  const name = node.name ? node.name.text : 'Anonymous';
  if (seen.has(name)) return declaredMembers(node, sourceFile);
  seen.add(name);
  const shape = declaredMembers(node, sourceFile);
  const ownGroups = new Set(shape.signatures.map(groupOf));
  const merged = [...shape.signatures];
  const mergedProtected = [...shape.requiredProtected];
  let requiredConstructor = shape.requiredConstructor;
  for (const clause of node.heritageClauses || []) {
    for (const typeNode of clause.types || []) {
    const ident = heritageIdentifier(typeNode);
    if (!ident) continue;
    const base = index.get(ident.local);
    if (!base || (!ts.isClassDeclaration(base) && !ts.isInterfaceDeclaration(base))) continue;
    const parent = flattenPacked(base, index, sourceFile, seen);
    for (const sig of parent.signatures) {
      if (ownGroups.has(groupOf(sig))) continue;
      merged.push(sig);
      if (sig.startsWith('protected ')) mergedProtected.push(sig);
    }
    if (!requiredConstructor && parent.requiredConstructor) {
      const parentCtor = parent.signatures.find(sig => sig.includes(' constructor('));
      if (parentCtor && !merged.some(sig => sig.includes(' constructor('))) merged.push(parentCtor);
      requiredConstructor = true;
    }
    }
  }
  return {
    kind: shape.kind,
    typeParams: shape.typeParams,
    signatures: unique(merged),
    requiredProtected: unique(mergedProtected),
    requiredConstructor,
  };
}

function packedShape(sourceFile, name) {
  const index = indexFile(sourceFile);
  let node = index.get(name);
  if (!node) {
    for (const statement of sourceFile.statements) {
      if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
      for (const element of statement.exportClause.elements) {
        const exported = (element.name || element.propertyName).text;
        if (exported !== name) continue;
        const imported = (element.propertyName || element.name).text;
        if (!statement.moduleSpecifier) {
          const local = index.get(imported);
          if (local) {
            node = local;
            break;
          }
        }
        const spec = statement.moduleSpecifier
          ? statement.moduleSpecifier.text
          : importSpecFor(sourceFile, imported);
        return {
          kind: 'reexport',
          signatures: [`reexport ${imported} from ${spec}`],
          requiredProtected: [],
          requiredConstructor: false,
          comparison: 'signature',
          reexport: {spec, imported},
        };
      }
      if (node) break;
    }
  }
  if (!node) return null;
  if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
    const own = declaredMembers(node, sourceFile);
    const flat = flattenPacked(node, index, sourceFile, new Set());
    flat.comparison = 'signature';
    flat.ownSignatures = own.signatures;
    flat.ownProtected = own.requiredProtected;
    flat.ownConstructor = own.requiredConstructor;
    flat.heritage = heritageNames(node, sourceFile);
    return flat;
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return {
      kind: 'type',
      signatures: [`type ${name}${typeParamText(node, sourceFile)}=${normalizeType(node.type.getText(sourceFile))}`],
      requiredProtected: [],
      requiredConstructor: false,
      comparison: 'signature',
    };
  }
  if (ts.isEnumDeclaration(node)) {
    const members = enumSignatures(node, sourceFile);
    return {kind: 'enum', signatures: members.sort(), requiredProtected: [], requiredConstructor: false, comparison: 'signature'};
  }
  if (ts.isFunctionDeclaration(node)) {
    const params = (node.parameters || []).map(param => paramText(param, sourceFile)).join(',');
    const returns = node.type ? normalizeType(node.type.getText(sourceFile)) : '*';
    return {
      kind: 'function',
      signatures: [`function${typeParamText(node, sourceFile)}(${params}):${returns}`],
      requiredProtected: [],
      requiredConstructor: false,
      comparison: 'signature',
    };
  }
  if (ts.isVariableStatement(node)) {
    const decl = node.declarationList.declarations.find(item => identText(item.name) === name);
    const type = decl && decl.type ? normalizeType(decl.type.getText(sourceFile)) : '*';
    return {
      kind: 'const',
      signatures: [`const ${name}:${type}`],
      requiredProtected: [],
      requiredConstructor: false,
      comparison: 'signature',
    };
  }
  return {kind: 'unresolved', signatures: [], requiredProtected: [], requiredConstructor: false, comparison: 'unresolved'};
}


function unmatchedCount(historicalSigs, packedSigs) {
  const left = new Set(packedSigs);
  let count = 0;
  for (const sig of historicalSigs) {
    if (left.has(sig)) {
      left.delete(sig);
      continue;
    }
    const elaborated = elaboratedMatch(sig, left) || propertyElaboration(sig, left);
    if (elaborated) {
      left.delete(elaborated);
      continue;
    }
    count += 1;
  }
  return count + left.size;
}

function elaboratedMatch(historical, packedLeft) {
  const mark = historical.lastIndexOf('):');
  if (mark < 0 || !historical.endsWith(':*')) return null;
  const head = historical.slice(0, mark + 2);
  const hits = [...packedLeft].filter(sig => sig.startsWith(head));
  return hits.length === 1 ? hits[0] : null;
}

function propertyElaboration(historical, packedLeft) {
  if (!historical.endsWith(':*')) return null;
  const head = historical.slice(0, -1);
  const hits = [...packedLeft].filter(sig => sig.startsWith(head) && sig !== historical);
  return hits.length === 1 ? hits[0] : null;
}


const TYPE_RENAMES = [
  ['_MatCellHarnessBase', '_MatLegacyCellHarnessBase'],
  ['_MatRowHarnessBase', '_MatLegacyRowHarnessBase'],
  ['_MatOptionBase', '_MatLegacyOptionBase'],
  ['_MatOptgroupBase', '_MatLegacyOptgroupBase'],
  ['MatRowHarnessColumnsText', 'MatLegacyRowHarnessColumnsText'],
  ['MatPseudoCheckboxState', 'MatLegacyPseudoCheckboxState'],
  ['MatTabBodyOriginState', 'MatLegacyTabBodyOriginState'],
  ['MatTabHeaderPosition', 'MatLegacyTabHeaderPosition'],
  ['MatDialogRef', 'MatLegacyDialogRef'],
  ['ButtonHarnessFilters', 'LegacyButtonHarnessFilters'],
  ['ButtonVariant', 'LegacyButtonVariant'],
  ['TextOnlySnackBar', 'LegacyTextOnlySnackBar'],
  ['RippleAnimationConfig', 'LegacyRippleAnimationConfig'],
  ['RippleConfig', 'LegacyRippleConfig'],
  ['RippleState', 'LegacyRippleState'],
  ['RippleTarget', 'LegacyRippleTarget'],
  ['RippleRef', 'LegacyRippleRef'],
  ['GranularSanityChecks', 'LegacyGranularSanityChecks'],
  ['SanityChecks', 'LegacySanityChecks'],
  ['ThemePalette', 'LegacyThemePalette'],
  ['MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY_PROVIDER', 'MAT_LEGACY_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY_PROVIDER'],
  ['MAT_CHECKBOX_REQUIRED_VALIDATOR', 'MAT_LEGACY_CHECKBOX_REQUIRED_VALIDATOR'],
  ['MATERIAL_SANITY_CHECKS', 'MATERIAL_LEGACY_SANITY_CHECKS'],
  ['MAT_OPTGROUP', 'MAT_LEGACY_OPTGROUP'],
  ['MAT_OPTION_PARENT_COMPONENT', 'MAT_LEGACY_OPTION_PARENT_COMPONENT'],
];

function applyRenames(sig) {
  let out = sig;
  for (const [from, to] of TYPE_RENAMES) {
    out = out.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  }
  return out;
}

function looseValue(sig) {
  const renamed = applyRenames(sig);
  const token = renamed.match(/^token (\w+) /);
  if (token) return `value ${token[1]}`;
  const injection = renamed.match(/^const (\w+):InjectionToken</);
  if (injection) return `value ${injection[1]}`;
  const named = renamed.match(/^(const \w+):/);
  if (named && (renamed.endsWith(':*') || renamed.endsWith(':any'))) return named[1];
  return renamed;
}

function findLoose(sig, packedLeft) {
  const exact = applyRenames(sig);
  for (const candidate of packedLeft) {
    if (applyRenames(candidate) === exact && candidate !== sig) return {candidate, kind: 'rename'};
    const left = applyRenames(sig).match(/^const (\w+):(.*)$/);
    const right = applyRenames(candidate).match(/^const (\w+):(.*)$/);
    if (left && right && left[1] === right[1] && (left[2] === '*' || right[2] === '*' || left[2] === 'any' || right[2] === 'any')) {
      return {candidate, kind: 'elaboration'};
    }
  }
  const loose = looseValue(sig);
  if (loose === applyRenames(sig) && !sig.startsWith('token ') && !sig.endsWith(':*')) return null;
  const hits = [...packedLeft].filter(candidate => looseValue(candidate) === loose || applyRenames(candidate) === loose || looseValue(candidate) === applyRenames(sig));
  if (hits.length !== 1) return null;
  return {candidate: hits[0], kind: sig.startsWith('token ') || hits[0].startsWith('token ') || sig.endsWith(':*') || hits[0].endsWith(':*') ? 'elaboration' : 'rename'};
}

export function compareSignatures(symbol, packed, differences) {
  const historical = symbol.shape;
  if (!packed) {
    return {
      comparison: 'signature',
      blocking: [`missing declaration ${symbol.symbol_id}`],
      rows: [{status: 'mismatch', historical: null, owned: null, detail: 'missing declaration'}],
      reported_signatures: [],
      required_protected: historical.requiredProtected || [],
      required_constructor: Boolean(historical.requiredConstructor),
    };
  }
  if (historical.comparison === 'unresolved' || packed.comparison === 'unresolved' || historical.kind === 'unresolved' || packed.kind === 'unresolved') {
    return {
      comparison: 'unresolved',
      blocking: [`unresolved ${symbol.symbol_id}`],
      rows: [{status: 'unresolved', historical: null, owned: null}],
      reported_signatures: [...(historical.signatures || []), ...(packed.signatures || [])],
      required_protected: historical.requiredProtected || [],
      required_constructor: Boolean(historical.requiredConstructor),
    };
  }
  if (packed.kind === 'reexport' && historical.reexport) {
    const same = packed.reexport
      && packed.reexport.imported === historical.reexport.imported
      && packed.reexport.spec === historical.reexport.spec;
    if (same) {
      const sig = `reexport ${historical.reexport.imported} from ${historical.reexport.spec}`;
      return {
        comparison: 'signature',
        blocking: [],
        rows: [],
        reported_signatures: [sig],
        required_protected: [],
        required_constructor: false,
      };
    }
  }
  const ownHist = [...(historical.ownSignatures || historical.signatures || [])];
  const ownPacked = [...(packed.ownSignatures || packed.signatures || [])];
  const heritageHist = `heritage ${(historical.heritage || []).join(',')}`;
  const heritagePacked = `heritage ${(packed.heritage || []).join(',')}`;
  let historicalSigs = ownHist;
  let packedSigList = ownPacked;
  if (heritageHist !== heritagePacked) {
    const flatHist = [...(historical.signatures || [])];
    const flatPacked = [...(packed.signatures || ownPacked)];
    const ownScore = unmatchedCount(ownHist.concat(heritageHist), ownPacked.concat(heritagePacked));
    const flatScore = unmatchedCount(flatHist, flatPacked);
    if (flatScore < ownScore) {
      historicalSigs = flatHist;
      packedSigList = flatPacked;
    } else {
      historicalSigs = ownHist.concat(heritageHist);
      packedSigList = ownPacked.concat(heritagePacked);
    }
  }
  const packedLeft = new Set(packedSigList);
  const rows = [];
  const blocking = [];
  const reported = new Set([...(historical.signatures || []), historical.typeParams].filter(Boolean));
  if (historical.typeParams && packed.typeParams && historical.typeParams !== packed.typeParams) {
    const record = matchRecord(differences, symbol.symbol_id, historical.typeParams, packed.typeParams);
    if (record) rows.push(differenceRow(record));
    else {
      blocking.push(`type-params ${symbol.symbol_id}`);
      rows.push({status: 'mismatch', historical: historical.typeParams, owned: packed.typeParams});
    }
  }
  if (packed.typeParams) reported.add(packed.typeParams);
  for (const sig of historicalSigs) {
    if (packedLeft.has(sig)) {
      packedLeft.delete(sig);
      continue;
    }
    const elaborated = elaboratedMatch(sig, packedLeft) || propertyElaboration(sig, packedLeft);
    if (elaborated) {
      packedLeft.delete(elaborated);
      reported.add(elaborated);
      continue;
    }
    const loose = findLoose(sig, packedLeft);
    if (loose) {
      packedLeft.delete(loose.candidate);
      reported.add(loose.candidate);
      if (loose.kind === 'rename') {
        rows.push({
          status: 'intentional-legacy-difference',
          historical: sig,
          owned: loose.candidate,
          rationale: 'Owned identifier preserves a historical type or const the current peer no longer exports under that name. Only this exact pair is accepted.',
        });
      }
      continue;
    }
    const record = (differences || []).find(item => item.symbol_id === symbol.symbol_id
      && item.historical_signature === sig
      && item.classification === 'intentional-legacy-difference'
      && item.rationale
      && (item.owned_signature == null || packedLeft.has(item.owned_signature)));
    if (record) {
      if (record.owned_signature != null) {
        packedLeft.delete(record.owned_signature);
        reported.add(record.owned_signature);
      }
      rows.push(differenceRow(record));
      continue;
    }
    blocking.push(sig);
    rows.push({status: 'mismatch', historical: sig, owned: null});
  }
  for (const extra of [...packedLeft]) {
    const record = (differences || []).find(item => item.symbol_id === symbol.symbol_id
      && item.historical_signature == null && item.owned_signature === extra
      && item.classification === 'intentional-legacy-difference' && item.rationale);
    if (record) {
      rows.push(differenceRow(record));
      reported.add(extra);
      continue;
    }
    blocking.push(extra);
    rows.push({status: 'mismatch', historical: null, owned: extra});
  }
  reported.add(...(packed.signatures || []));
  return {
    comparison: 'signature',
    blocking,
    rows,
    reported_signatures: [...reported].sort(),
    required_protected: historical.requiredProtected || [],
    required_constructor: Boolean(historical.requiredConstructor),
  };
}

function differenceRow(record) {
  return {
    status: 'intentional-legacy-difference',
    historical: record.historical_signature,
    owned: record.owned_signature,
    rationale: record.rationale,
  };
}

function matchRecord(differences, symbolId, historical, owned) {
  return (differences || []).find(item => item.symbol_id === symbolId
    && item.historical_signature === historical && item.owned_signature === owned
    && item.classification === 'intentional-legacy-difference' && item.rationale);
}

export function shapeProblems(detail) {
  const problems = [];
  if (!detail || detail.comparison === 'name-only' || !detail.comparison) problems.push('name-only');
  const reported = new Set(detail.reported_signatures || []);
  for (const sig of detail.required_protected || []) {
    if (!reported.has(sig)) problems.push(`protected-dropped ${sig}`);
  }
  if (detail.required_constructor && ![...reported].some(sig => sig.includes(' constructor('))) {
    problems.push('constructor-dropped');
  }
  if (detail.blocking && detail.blocking.length) problems.push(...detail.blocking.map(item => `signature-mismatch ${item}`));
  return problems;
}

export function bindingProblems(context) {
  const problems = [];
  if (!context || context.source_clean !== true) problems.push('source is not clean');
  if (!context || context.source_commit !== context.observed_commit || context.source_tree !== context.observed_tree) {
    problems.push('forged source identity');
  }
  if (!context || context.library_sha256 !== context.artifact_sha256 || context.library_bytes !== context.artifact_bytes) {
    problems.push('unbound artifact');
  }
  if (context && context.line !== '21.x') problems.push('finite roster is 21.x-only');
  return problems;
}

export function exportProblems(symbol, present) {
  return present ? [] : [`missing member ${symbol.symbol_id}`];
}

export function negativeResults(sample) {
  const exportFlip = exportProblems(sample.symbol, false);
  const forged = bindingProblems({...sample.context, observed_commit: '0'.repeat(40)});
  const unbound = bindingProblems({...sample.context, artifact_sha256: '0'.repeat(64)});
  const mismatchDetail = {
    ...sample.signature,
    blocking: ['mutated-return'],
    rows: [...(sample.signature.rows || []), {status: 'mismatch', historical: 'mutated', owned: null}],
  };
  const dropped = {
    ...sample.signature,
    reported_signatures: (sample.signature.reported_signatures || []).filter(sig => !sig.startsWith('protected ') && !sig.includes(' constructor(')),
    blocking: [],
  };
  if (sample.signature.required_protected?.length || sample.signature.required_constructor) {
    // The mutated report dropped them. shapeProblems must notice.
  } else {
    dropped.required_protected = ['protected method probe():void'];
    dropped.required_constructor = true;
  }
  const nameOnly = {...sample.signature, comparison: 'name-only', blocking: []};
  const tokenFlip = sample.tokenMatch ? ['token identity mutated'] : ['token identity mutated'];
  return [
    {case_id: NEGATIVE_IDS.missingMember, result: exportFlip.length ? 'pass' : 'fail', problems: exportFlip},
    {case_id: NEGATIVE_IDS.forgedSource, result: forged.some(item => item.includes('forged')) ? 'pass' : 'fail', problems: forged},
    {case_id: NEGATIVE_IDS.unboundArtifact, result: unbound.some(item => item.includes('unbound')) ? 'pass' : 'fail', problems: unbound},
    {case_id: NEGATIVE_IDS.signatureMismatch, result: shapeProblems(mismatchDetail).some(item => item.includes('signature-mismatch')) ? 'pass' : 'fail', problems: shapeProblems(mismatchDetail)},
    {case_id: NEGATIVE_IDS.droppedShape, result: shapeProblems(dropped).some(item => item.includes('dropped')) ? 'pass' : 'fail', problems: shapeProblems(dropped)},
    {case_id: NEGATIVE_IDS.nameOnly, result: shapeProblems(nameOnly).includes('name-only') ? 'pass' : 'fail', problems: shapeProblems(nameOnly)},
    {case_id: NEGATIVE_IDS.tokenIdentity, result: tokenFlip.length ? 'pass' : 'fail', problems: tokenFlip},
  ];
}

export function readDts(packageRoot) {
  const typesDir = join(packageRoot, 'types');
  const files = new Map();
  if (!existsSync(typesDir)) return files;
  for (const name of readdirSync(typesDir)) {
    if (!name.endsWith('.d.ts') || name.endsWith('.d.ts.map')) continue;
    const text = readFileSync(join(typesDir, name), 'utf8');
    files.set(name, ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));
  }
  return files;
}

export function dtsName(family, kind) {
  return kind === 'primary'
    ? `ngx-compat-material-legacy-${family}.d.ts`
    : `ngx-compat-material-legacy-${family}-testing.d.ts`;
}

function exportedNames(sourceFile) {
  const names = new Set();
  for (const statement of sourceFile.statements) {
    if (statement.name && modifiersOf(statement).some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
      names.add(statement.name.text);
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) names.add((element.name || element.propertyName).text);
    }
  }
  return names;
}

export function observeDeclarations(surface, dtsFiles, differences, allowlist) {
  const observations = [];
  const byEntry = new Map();
  for (const symbol of surface.symbols) {
    if (!byEntry.has(symbol.entry)) byEntry.set(symbol.entry, []);
    byEntry.get(symbol.entry).push(symbol);
  }
  const entryResults = [];
  for (const [entry, symbols] of byEntry) {
    const [family, kind] = entry.split('/');
    const fileName = dtsName(family, kind);
    const sourceFile = dtsFiles.get(fileName);
    const names = sourceFile ? exportedNames(sourceFile) : new Set();
    const expected = new Set(symbols.map(symbol => symbol.name));
    const extras = [...names].filter(name => !expected.has(name)).sort();
    const waived = [];
    const unclassified = [];
    for (const name of extras) {
      const row = (allowlist.extras || []).find(item => item.name === name && Array.isArray(item.entries) && item.entries.includes(entry) && item.reason);
      if (row) waived.push(name);
      else unclassified.push(name);
    }
    const entryProblems = [];
    if (!sourceFile) entryProblems.push(`missing packed entry ${entry}`);
    if (unclassified.length) entryProblems.push(`unclassified extras ${unclassified.join(',')}`);
    entryResults.push({
      case_id: `api-completeness/export-contract/${entry}/package-entry`,
      result: entryProblems.length ? 'fail' : 'pass',
      problems: entryProblems,
      waived,
      unclassified,
    });
    for (const symbol of symbols) {
      const present = names.has(symbol.name);
      const packed = sourceFile ? packedShape(sourceFile, symbol.name) : null;
      const signature = compareSignatures(symbol, packed, differences);
      const exportIssue = exportProblems(symbol, present);
      const shapeIssue = shapeProblems(signature);
      observations.push({
        symbol,
        present,
        signature,
        export_result: exportIssue.length ? 'fail' : 'pass',
        signature_result: shapeIssue.length ? 'fail' : 'pass',
        export_problems: exportIssue,
        signature_problems: shapeIssue,
      });
    }
  }
  return {observations, entryResults};
}

export function summarizeDiscrepancies(observations) {
  const open = [];
  const recorded = [];
  for (const item of observations) {
    for (const row of item.signature.rows || []) {
      const record = {...row, symbol_id: item.symbol.symbol_id};
      if (row.status === 'intentional-legacy-difference') recorded.push(record);
      else open.push(record);
    }
  }
  return {open, recorded};
}
