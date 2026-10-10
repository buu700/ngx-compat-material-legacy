/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const ts = createRequire(import.meta.url)('typescript');
const hash = text => createHash('sha256').update(text).digest('hex');
const parse = (name, text, kind = ts.ScriptKind.TS) => {
  const file = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, kind);
  assert.equal(file.parseDiagnostics.length, 0, name + ' syntax'); return file;
};
const unwrap = node => ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isParenthesizedExpression(node)
  ? unwrap(node.expression) : node;
const withoutExport = text => text.replace(/^export\s+/, '');

function runtimeTree(source) {
  const emitted = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS, experimentalDecorators: true, removeComments: true}, reportDiagnostics: true});
  assert.equal(emitted.diagnostics.length, 0);
  const file = parse('runtime.js', emitted.outputText, ts.ScriptKind.JS);
  const tree = node => {
    if (ts.isParenthesizedExpression(node)) return tree(node.expression);
    const children = []; ts.forEachChild(node, child => {children.push(tree(child));});
    // SourceFile.text is source formatting, rather than a semantic leaf.
    return [node.kind, !ts.isSourceFile(node) && typeof node.text === 'string' ? node.text : null, children];
  };
  return {source: emitted.outputText, hash: hash(JSON.stringify(tree(file)))};
}

/** Exact relocation after binding actual call arguments and erasing TS-only syntax. */
export function analyzeSharedTestMove({sharedPath, beforeShared, consumerPath, beforeConsumer, afterConsumer}) {
  const shared = parse(sharedPath, beforeShared), consumer = parse(consumerPath, beforeConsumer), after = parse(consumerPath, afterConsumer);
  const imported = consumer.statements.filter(ts.isImportDeclaration).flatMap(node => {
    if (!node.importClause?.namedBindings || !ts.isNamedImports(node.importClause.namedBindings)) return [];
    const name = node.moduleSpecifier.text.split('/').at(-1).replace(/\.ts$/, '');
    if (name !== sharedPath.split('/').at(-1).replace(/\.ts$/, '')) return [];
    return node.importClause.namedBindings.elements.map(e => ({local: e.name.text, original: (e.propertyName || e.name).text}));
  });
  assert.equal(imported.length, 1, 'one shared runner import');
  const runner = shared.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === imported[0].original);
  assert.equal(runner.length, 1); assert.ok(runner[0].body);
  const describes = file => file.statements.filter(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression)
    && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'describe');
  const oldSuites = describes(consumer), newSuites = describes(after);
  assert.equal(oldSuites.length, 1); assert.equal(newSuites.length, 1);
  const callback = statement => {
    const call = statement.expression; assert.equal(call.arguments.length, 2); assert.ok(ts.isStringLiteral(call.arguments[0]));
    const fn = call.arguments[1]; assert.ok((ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && ts.isBlock(fn.body));
    assert.equal(fn.parameters.length, 0); return fn.body;
  };
  const oldBody = callback(oldSuites[0]), newBody = callback(newSuites[0]);
  assert.equal(oldBody.statements.length, 1); const statement = oldBody.statements[0];
  assert.ok(ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression));
  const call = statement.expression; assert.equal(call.expression.text, imported[0].local);
  assert.equal(call.arguments.length, runner[0].parameters.length);
  const options = {noResolve: true, noLib: true}, host = ts.createCompilerHost(options);
  host.getSourceFile = path => path === sharedPath ? shared : undefined;
  const checker = ts.createProgram([sharedPath], options, host).getTypeChecker();
  const bindings = new Map(runner[0].parameters.map((p, index) => {
    assert.ok(ts.isIdentifier(p.name)); return [checker.getSymbolAtLocation(p.name), unwrap(call.arguments[index])];
  }));
  const edits = [], references = [];
  const visit = node => {
    if (ts.isIdentifier(node)) {
      const argument = bindings.get(checker.getSymbolAtLocation(node));
      if (argument) {
        let target = node, replacement = argument;
        if (ts.isObjectLiteralExpression(argument) && ts.isPropertyAccessExpression(node.parent) && node.parent.expression === node) {
          const properties = argument.properties.filter(n => ts.isPropertyAssignment(n) && n.name.getText(consumer) === node.parent.name.text);
          assert.equal(properties.length, 1); target = node.parent; replacement = unwrap(properties[0].initializer);
        } else assert.ok(!ts.isObjectLiteralExpression(argument), 'unreviewed parameter-object use');
        const text = replacement.getText(consumer);
        edits.push({start: target.getStart(shared), end: target.end, text: '(' + text + ')'});
        references.push({parameter: node.text, replacement: text}); return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(runner[0].body);
  const begin = runner[0].body.getStart(shared) + 1, end = runner[0].body.end - 1;
  let body = shared.text.slice(begin, end);
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    assert.ok(edit.start >= begin && edit.end <= end);
    body = body.slice(0, edit.start - begin) + edit.text + body.slice(edit.end - begin);
  }
  const sharedOthers = shared.statements.filter(n => !ts.isImportDeclaration(n) && n !== runner[0]);
  const consumerOthers = consumer.statements.filter(n => !ts.isImportDeclaration(n) && n !== oldSuites[0]);
  assert.equal(consumerOthers.length, 0, 'unexpected old consumer context');
  const afterOthers = after.statements.filter(n => !ts.isImportDeclaration(n) && n !== newSuites[0]);
  const expected = runtimeTree(body + '\n' + sharedOthers.map(n => withoutExport(n.getText(shared))).join('\n'));
  const observed = runtimeTree(newBody.statements.map(n => n.getText(after)).join('\n') + '\n'
    + afterOthers.map(n => withoutExport(n.getText(after))).join('\n'));
  return {equivalent: expected.hash === observed.hash, expected_runtime_sha256: expected.hash,
    observed_runtime_sha256: observed.hash, parameter_references: references,
    expected_source: expected.source, observed_source: observed.source,
    old_describe_title: oldSuites[0].expression.arguments[0].text,
    new_describe_title: newSuites[0].expression.arguments[0].text};
}

/** Tokenize Starlark data/calls; inspect unchanged production targets without evaluation. */
export function bazelProductionCalls(text) {
  const tokens = []; let at = 0;
  while (at < text.length) {
    if (/\s/.test(text[at])) {at++; continue;}
    if (text[at] === '#') {while (at < text.length && text[at] !== '\n') at++; continue;}
    if (text[at] === '"' || text[at] === "'") {
      const quote = text[at], start = at++; let ended = false;
      while (at < text.length) {if (text[at] === '\\') at += 2; else if (text[at++] === quote) {ended = true; break;}}
      assert.ok(ended); tokens.push(text.slice(start, at)); continue;
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(at));
    if (identifier) {tokens.push(identifier[0]); at += identifier[0].length; continue;}
    tokens.push(text[at++]);
  }
  const calls = []; let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (depth === 0 && tokens[i + 1] === '(' && ['ts_library', 'ng_module', 'ng_package'].includes(tokens[i])) {
      let end = i + 1, nested = 0;
      do {if (tokens[end] === '(') nested++; if (tokens[end] === ')') nested--; end++;} while (end < tokens.length && nested);
      assert.equal(nested, 0); calls.push(tokens.slice(i, end));
    }
    if (tokens[i] === '(' || tokens[i] === '[' || tokens[i] === '{') depth++;
    if (tokens[i] === ')' || tokens[i] === ']' || tokens[i] === '}') depth--;
    assert.ok(depth >= 0);
  }
  assert.equal(depth, 0); return calls;
}
