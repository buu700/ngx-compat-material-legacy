/**
 * Historical case identities derived from the 57 inventory paths and the
 * shared/parameterized suites they call. This module does not read Karma
 * results. A later confirming run binds these ids to executed specs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {resolveSpecModule} from '../testing/legacy-runner/adapt-spec.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DISCOVERY_NEGATIVE_IDS = [
  'historical-legacy-artifact/discovery-negatives/missing-path',
  'historical-legacy-artifact/discovery-negatives/forged-id',
  'historical-legacy-artifact/discovery-negatives/aggregate-only-success',
  'historical-legacy-artifact/discovery-negatives/dirty-source',
  'historical-legacy-artifact/discovery-negatives/unbound-artifact',
];

const CONTROL_PREFIXES = ['legacy-runner discovery', 'legacy-runner deliberate fail probe'];

export function isRunnerControl(fullName) {
  return CONTROL_PREFIXES.some(prefix => fullName === prefix || fullName.startsWith(`${prefix} > `) || fullName.startsWith(`${prefix} `));
}

const UNKNOWN = Symbol('unresolved registration value');

function staticValue(node, values = new Map()) {
  if (!node) return UNKNOWN;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  // Only immutable scalar bindings are reused. Literal array expressions are
  // finite, but an array identifier may have been mutated or escaped.
  if (ts.isIdentifier(node)) {
    const value = values.has(node.text) ? values.get(node.text) : UNKNOWN;
    return Array.isArray(value) ? UNKNOWN : value;
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return staticValue(node.expression, values);
  if (ts.isArrayLiteralExpression(node)) {
    if (node.elements.some(ts.isSpreadElement)) return UNKNOWN;
    // Literal array length/order remain known when a test-body-only value
    // (such as a host factory) is opaque. Using that value in a title still fails.
    const items = node.elements.map(item => staticValue(item, values));
    if (items.some((value, index) => value === UNKNOWN &&
        !ts.isArrowFunction(node.elements[index]) && !ts.isFunctionExpression(node.elements[index]) &&
        !ts.isIdentifier(node.elements[index]))) return UNKNOWN;
    return items;
  }
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) {
      const value = staticValue(span.expression, values);
      if (value === UNKNOWN || Array.isArray(value)) return UNKNOWN;
      text += String(value) + span.literal.text;
    }
    return text;
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
    const value = staticValue(node.operand, values);
    return value === UNKNOWN ? UNKNOWN : !value;
  }
  if (ts.isBinaryExpression(node)) {
    const left = staticValue(node.left, values);
    if (left !== UNKNOWN && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && !left) return left;
    if (left !== UNKNOWN && node.operatorToken.kind === ts.SyntaxKind.BarBarToken && left) return left;
    const right = staticValue(node.right, values);
    if (left === UNKNOWN || right === UNKNOWN || Array.isArray(left) || Array.isArray(right)) return UNKNOWN;
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) return left + right;
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) return left === right;
    if (node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) return left !== right;
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return left && right;
    if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) return left || right;
  }
  if (ts.isConditionalExpression(node)) {
    const condition = staticValue(node.condition, values);
    return condition === UNKNOWN ? UNKNOWN : staticValue(condition ? node.whenTrue : node.whenFalse, values);
  }
  return UNKNOWN;
}

function bindPattern(pattern, value, values) {
  if (ts.isIdentifier(pattern)) {values.set(pattern.text, value); return true;}
  if (!ts.isArrayBindingPattern(pattern) || !Array.isArray(value)) return false;
  return pattern.elements.every((element, index) => {
    if (ts.isOmittedExpression(element)) return true;
    if (element.dotDotDotToken) return false;
    let item = index < value.length ? value[index] : undefined;
    if (item === undefined && element.initializer) item = staticValue(element.initializer, values);
    return bindPattern(element.name, item, values);
  });
}

function staticString(node, scope) {
  const value = staticValue(node, scope.values);
  return typeof value === 'string' ? value : null;
}

function containsRegistration(node, scope, cache, seen = new Set()) {
  let found = false;
  const visit = item => {
    if (ts.isCallExpression(item) && ['describe', 'fdescribe', 'xdescribe', 'it', 'fit', 'xit', 'test'].includes(jasmineKind(item.expression))) found = true;
    if (!found && ts.isCallExpression(item) && scope) {
      const target = resolveCall(item.expression, scope, cache);
      if (target && !seen.has(target.fn)) {
        seen.add(target.fn);
        found = containsRegistration(target.fn.body, target.scope, cache, seen);
      }
    }
    if (!found) ts.forEachChild(item, visit);
  };
  visit(node);
  return found;
}

function jasmineKind(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) return expr.expression.text;
  return null;
}

function loadScope(abs, cache) {
  if (cache.has(abs)) return cache.get(abs);
  const text = fs.readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const functions = new Map();
  const imports = new Map();
  for (const statement of sf.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      functions.set(statement.name.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
          functions.set(declaration.name.text, declaration.initializer);
        }
      }
    } else if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const resolved = resolveSpecModule(abs, statement.moduleSpecifier.text);
      if (!resolved) continue;
      for (const element of statement.importClause.namedBindings.elements) {
        imports.set(element.name.text, {
          file: resolved,
          exportName: (element.propertyName ?? element.name).text,
        });
      }
    }
  }
  const scope = {abs, sf, functions, imports};
  cache.set(abs, scope);
  return scope;
}

function walkFunctionBody(fn, suite, scope, cases, cache, stack, sharedPath) {
  if (!fn) return;
  if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) {
    walkNode(fn.body, suite, scope, cases, cache, stack, sharedPath);
    return;
  }
  const body = fn.body;
  if (body) walkNode(body, suite, scope, cases, cache, stack, sharedPath);
}

function resolveCall(expr, scope, cache) {
  if (!ts.isIdentifier(expr)) return null;
  if (scope.functions.has(expr.text)) {
    return {fn: scope.functions.get(expr.text), scope, shared: null};
  }
  const imported = scope.imports.get(expr.text);
  if (!imported) return null;
  const other = loadScope(imported.file, cache);
  const fn = other.functions.get(imported.exportName);
  if (!fn) return null;
  return {fn, scope: other, shared: path.relative(root, imported.file).split(path.sep).join('/')};
}

function walkBlock(node, suite, scope, cases, cache, stack, sharedPath) {
  const functions = new Map(scope.functions);
  for (const statement of node.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      functions.set(statement.name.text, statement);
    }
  }
  const localScope = {...scope, functions, values: new Map(scope.values)};
  for (const statement of node.statements) {
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) localScope.values.set(declaration.name.text,
        statement.declarationList.flags & ts.NodeFlags.Const ? staticValue(declaration.initializer, localScope.values) : UNKNOWN);
    }
    walkNode(statement, suite, localScope, cases, cache, stack, sharedPath);
  }
}

function walkNode(node, suite, scope, cases, cache, stack, sharedPath) {
  if (ts.isBlock(node) || ts.isSourceFile(node)) {
    walkBlock(node, suite, scope, cases, cache, stack, sharedPath);
    return;
  }
  if (ts.isForOfStatement(node)) {
    const items = staticValue(node.expression, scope.values);
    const declarations = ts.isVariableDeclarationList(node.initializer) ? node.initializer.declarations : [];
    if (!Array.isArray(items) || node.awaitModifier || declarations.length !== 1 || !(node.initializer.flags & ts.NodeFlags.Const)) {
      if (containsRegistration(node.statement, scope, cache)) throw new Error(`non-static registration loop in ${path.relative(root, scope.abs)}`);
      return;
    }
    if (items.length > 256) throw new Error('registration loop exceeds the finite discovery bound');
    for (const item of items) {
      const values = new Map(scope.values);
      if (!bindPattern(declarations[0].name, item, values)) throw new Error(`non-static registration binding in ${path.relative(root, scope.abs)}`);
      walkNode(node.statement, suite, {...scope, values}, cases, cache, stack, sharedPath);
    }
    return;
  }
  if (ts.isIfStatement(node)) {
    const condition = staticValue(node.expression, scope.values);
    if (condition === UNKNOWN) {
      if (containsRegistration(node.thenStatement, scope, cache) || node.elseStatement && containsRegistration(node.elseStatement, scope, cache)) {
        throw new Error(`non-static registration condition in ${path.relative(root, scope.abs)}`);
      }
      return;
    }
    const branch = condition ? node.thenStatement : node.elseStatement;
    if (branch) walkNode(branch, suite, scope, cases, cache, stack, sharedPath);
    return;
  }
  if ((ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) && containsRegistration(node.statement, scope, cache)) {
    throw new Error(`unsupported registration loop in ${path.relative(root, scope.abs)}`);
  }
  if (ts.isCallExpression(node)) {
    const kind = jasmineKind(node.expression);
    if (kind === 'describe' || kind === 'fdescribe' || kind === 'xdescribe') {
      const title = staticString(node.arguments[0], scope);
      const callback = node.arguments[1];
      if (title == null || !callback) {
        throw new Error(`non-static describe in ${path.relative(root, scope.abs)}`);
      }
      walkFunctionBody(callback, [...suite, title], scope, cases, cache, stack, sharedPath);
      return;
    }
    if (kind === 'it' || kind === 'fit' || kind === 'xit' || kind === 'test') {
      const title = staticString(node.arguments[0], scope);
      if (title == null) throw new Error(`non-static it in ${path.relative(root, scope.abs)}`);
      if (cases.length >= 50000) throw new Error('registration case discovery exceeds its finite bound');
      cases.push({
        suite: [...suite],
        description: title,
        shared: sharedPath,
      });
      return;
    }
    const target = resolveCall(node.expression, scope, cache);
    if (target) {
      const key = `${target.scope.abs}::${ts.isIdentifier(node.expression) ? node.expression.text : kind || ''}`;
      if (!stack.includes(key)) {
        walkFunctionBody(target.fn, suite, target.scope, cases, cache, [...stack, key], target.shared || sharedPath);
      }
      return;
    }
    if (node.arguments.some(argument => (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) && containsRegistration(argument.body, scope, cache))) {
      throw new Error(`unsupported registration callback in ${path.relative(root, scope.abs)}`);
    }
  }
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node)
  ) {
    return;
  }
  ts.forEachChild(node, child => walkNode(child, suite, scope, cases, cache, stack, sharedPath));
}

export function fullNameOf(testCase) {
  return testCase.suite.length ? `${testCase.suite.join(' > ')} > ${testCase.description}` : testCase.description;
}

export function deriveHistoricalRoster(repoRoot = root) {
  const inventory = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'testing/legacy-runner/historical-inventory.json'), 'utf8'),
  );
  const specs = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'testing/legacy-runner/historical-specs.json'), 'utf8'),
  );
  if (!Array.isArray(inventory.rows) || inventory.rows.length !== 57) {
    throw new Error(`historical inventory denominator is ${inventory.rows?.length}, expected 57`);
  }
  if (specs.length !== 57) throw new Error(`historical-specs.json has ${specs.length} rows, expected 57`);
  const byCandidate = new Map(inventory.rows.map(row => [row.candidate, row]));
  const cache = new Map();
  const cases = [];
  for (const spec of specs) {
    const row = byCandidate.get(spec.candidate);
    if (!row) throw new Error(`spec ${spec.candidate} is not in the inventory`);
    const abs = path.join(repoRoot, spec.candidate);
    const scope = loadScope(abs, cache);
    const found = [];
    walkNode(scope.sf, [], scope, found, cache, [], null);
    found.forEach((testCase, index) => {
      const fullName = fullNameOf(testCase);
      cases.push({
        case_id: `historical-legacy-artifact/original-and-shared-cases/${row.historical_path}#${index}`,
        historical_path: row.historical_path,
        candidate: row.candidate,
        adaptation: row.adaptation,
        shared: testCase.shared,
        full_name: fullName,
        index,
        kind: testCase.shared ? 'shared' : 'direct',
      });
    });
  }
  for (const row of inventory.rows) {
    if (cases.some(testCase => testCase.historical_path === row.historical_path && testCase.kind !== 'shared-export')) continue;
    const caller = cases.find(testCase => testCase.shared === row.candidate);
    if (!caller) throw new Error(`historical path has no direct or shared cases: ${row.historical_path}`);
    cases.push({
      case_id: `historical-legacy-artifact/original-and-shared-cases/${row.historical_path}#shared-export`,
      historical_path: row.historical_path,
      candidate: row.candidate,
      adaptation: row.adaptation,
      shared: null,
      full_name: null,
      index: null,
      kind: 'shared-export',
      called_from: caller.historical_path,
    });
  }
  const ids = cases.map(testCase => testCase.case_id);
  if (new Set(ids).size !== ids.length) throw new Error('derived historical case ids are not unique');
  const paths = inventory.rows.map(row => row.historical_path);
  return {
    cases,
    ids,
    paths,
    discovery_negative_ids: [...DISCOVERY_NEGATIVE_IDS],
    shared_cases: cases.filter(testCase => testCase.shared).length,
    direct_cases: cases.filter(testCase => !testCase.shared).length,
  };
}

function componentSpecs(executed) {
  return (executed || []).filter(spec => spec && typeof spec.full_name === 'string' && !isRunnerControl(spec.full_name));
}

/**
 * Returns a list of rejection reasons. Empty means the observation matches the
 * derived roster on a clean artifact-bound run. Aggregate totals are ignored
 * except to recognize an aggregate-only payload.
 */
export function rejectionReasons(roster, executed, context) {
  const reasons = [];
  if (!context || context.source_clean !== true) reasons.push('dirty-source');
  const artifactBound = context &&
    context.subject_mode === 'artifact' &&
    typeof context.artifact_sha256 === 'string' &&
    context.artifact_sha256.length === 64 &&
    context.artifact_sha256 === context.library_sha256;
  if (!artifactBound) reasons.push('unbound-artifact');
  const specs = componentSpecs(executed);
  const specCases = roster.cases.filter(testCase => testCase.kind !== 'shared-export');
  const exportCases = roster.cases.filter(testCase => testCase.kind === 'shared-export');
  const aggregate = Number(context?.aggregate_executed || 0);
  if (specs.length === 0 && aggregate > 0) reasons.push('aggregate-only-success');
  const known = new Set(specCases.map(testCase => testCase.full_name));
  if (specs.some(spec => !known.has(spec.full_name))) reasons.push('forged-id');
  const mapped = new Set(context?.mapped_paths || []);
  const orderMismatch = specs.length !== specCases.length || specs.some((spec, index) =>
    spec.full_name !== specCases[index]?.full_name || spec.success !== true || spec.skipped === true);
  const exportMismatch = exportCases.some(testCase => !specCases.some(specCase =>
    specCase.shared === testCase.candidate && specs.some(spec => spec.full_name === specCase.full_name && spec.success === true)));
  const missingPath = roster.paths.some(historicalPath => !mapped.has(historicalPath)) || orderMismatch || exportMismatch;
  if (missingPath) reasons.push('missing-path');
  return [...new Set(reasons)];
}

export function positiveMatches(roster, executed, context) {
  return rejectionReasons(roster, executed, context).length === 0;
}

const NEGATIVE_CODE = {
  'historical-legacy-artifact/discovery-negatives/missing-path': 'missing-path',
  'historical-legacy-artifact/discovery-negatives/forged-id': 'forged-id',
  'historical-legacy-artifact/discovery-negatives/aggregate-only-success': 'aggregate-only-success',
  'historical-legacy-artifact/discovery-negatives/dirty-source': 'dirty-source',
  'historical-legacy-artifact/discovery-negatives/unbound-artifact': 'unbound-artifact',
};

function goodContext(roster, executed, context) {
  return {
    source_clean: true,
    subject_mode: 'artifact',
    artifact_sha256: context.library_sha256,
    library_sha256: context.library_sha256,
    aggregate_executed: executed.length,
    mapped_paths: roster.paths,
  };
}

/**
 * Run the real binder against one mutated observation per negative. A pass
 * means that mutation was rejected. A binder that accepts everything fails.
 */
export function discoveryNegativeResults(roster, executed, context) {
  const specs = componentSpecs(executed);
  const base = goodContext(roster, specs, context);
  const probes = {
    'missing-path': [roster, specs.slice(1), base],
    'forged-id': [roster, [...specs, {full_name: 'forged historical case that is not in the roster', success: true, skipped: false}], base],
    'aggregate-only-success': [roster, [], {...base, aggregate_executed: Number(context.aggregate_executed || specs.length)}],
    'dirty-source': [roster, specs, {...base, source_clean: false}],
    'unbound-artifact': [roster, specs, {...base, subject_mode: 'workspace-dist', artifact_sha256: null}],
  };
  return DISCOVERY_NEGATIVE_IDS.map(caseId => {
    const code = NEGATIVE_CODE[caseId];
    const reasons = rejectionReasons(...probes[code]);
    const rejected = reasons.includes(code);
    return {
      case_id: caseId,
      result: rejected ? 'pass' : 'fail',
      rejection: code,
      observed_reasons: reasons,
    };
  });
}
