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
import {gunzipSync} from 'node:zlib';
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitHash = (kind, text) => createHash('sha1').update(`${kind} ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
export const COMMENT_SCOPE_ROLE = 'C04 ten individual production TypeScript documentation reviews';
export const COMMENT_SUBJECTS = 'compatibility/rc/upstream-comment-subjects.json.gz';
export const COMMENT_SUBJECTS_HASH = '20655d9c0cc92fc222e6d167682a795e788bf3da836f0bafc2302def995bc853';
export const COMMENT_CONTEXT_PATHS = ['projects/ngx-material-legacy/package.json',
  'projects/ngx-material-legacy/legacy-dialog/dialog-config.ts'];
export const COMMENT_SHAS = [
  '0782913bbfd5055d3534bfec70fd7171109297ae', '27503ed285f3ba964cc861443a7bc1ab7b2cf19a',
  '39b15dcc527f054733eaaa5916d51a77bb53fb61', 'a0fc66f6d2a379d42ea05d0673fa77488b2b0fe3',
  '25cbbd1f8a0f09dc1338c964fdaf51ce0eb4ea6c', 'e85c8656bfd787d85bf2600f6da890eab36f9608',
  'ede6331377b053edd3ecd53da5e4cce79bb3ba63', '963a299e9d8c0a783314c81eeaa6b2396aa7044f',
  '0c0b033fb256e26c409899ce7b4325f162a6ed2d', 'b83c6c1effc53f97a981cc95c7b4e53174290d45',
];

function program(path, text) {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, 'invalid source');
  const tokens = [], tags = [];
  const lexical = node => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const children = node.getChildren(file);
    if (children.length) children.forEach(lexical);
    else if (node.kind <= ts.SyntaxKind.LastToken) tokens.push([ts.SyntaxKind[node.kind], node.getText(file)]);
  };
  lexical(file);
  const metadata = node => {
    for (const tag of ts.getJSDocTags(node)) tags.push([ts.SyntaxKind[node.kind], node.name?.getText(file) || '', tag.getText(file)]);
    ts.forEachChild(node, metadata);
  };
  metadata(file);
  // Compiler/bundler/test annotations can change behavior despite unchanged syntax.
  const pragmas = text.match(/(?:@ts-(?:ignore|expect-error|nocheck|check)|__PURE__|__NO_SIDE_EFFECTS__|(?:istanbul|c8|v8) ignore|prettier-ignore|sourceMappingURL|sourceURL)[^\n]*/g) || [];
  return {tokens, tags, pragmas};
}

/** Exact complete syntax, type signatures, JSDoc tags and behavior-affecting annotations. */
export function commentProgramIdentity(path, before, after) {
  assert.notEqual(before, after, 'empty documentation change');
  const left = program(path, before), right = program(path, after);
  assert.deepEqual(right, left, 'not a prose-only source change');
  return {program_tokens_sha256: hash(JSON.stringify(left.tokens)), tokens: left.tokens.length,
    jsdoc_tags_sha256: hash(JSON.stringify(left.tags)), jsdoc_tags: left.tags.length,
    annotation_sha256: hash(JSON.stringify(left.pragmas)), annotations: left.pragmas.length};
}

let verifiedSubjects;
export function analyzeCommentSubjects(readMember) {
  const stored = readMember(COMMENT_SUBJECTS);
  assert.equal(hash(stored), COMMENT_SUBJECTS_HASH, 'changed original subjects');
  if (verifiedSubjects) return structuredClone(verifiedSubjects);
  const raw = gunzipSync(stored);
  assert.equal(hash(raw), '125076990aba0cb7872cc760812394de4a2228474b59a62bf8e848270ef2cdaf');
  const body = JSON.parse(raw);
  assert.equal(body.schema_version, 1);
  assert.deepEqual(body.reviews.map(r => r.sha), COMMENT_SHAS);
  const reviews = body.reviews.map(review => {
    assert.equal(gitHash('commit', review.raw_commit), review.sha);
    assert.deepEqual(review.raw_commit.split('\n').filter(line => line.startsWith('parent ')), ['parent ' + review.parent]);
    assert.equal(hash(review.diff), review.diff_sha256);
    const paths = review.diff.split('\n').filter(line => line.startsWith('diff --git ')).map(line => line.split(' b/')[1]);
    assert.deepEqual([...paths].sort(), review.members.map(m => m.path).sort());
    assert.equal(new Set(paths).size, paths.length);
    const members = review.members.map(member => {
      assert.ok(member.path.startsWith('src/') && member.path.endsWith('.ts'));
      for (const side of ['before', 'after']) {
        assert.equal(gitHash('blob', member[side].text), member[side].git_blob);
        assert.equal(hash(member[side].text), member[side].sha256);
      }
      return {path: member.path, before_sha256: member.before.sha256, after_sha256: member.after.sha256,
        ...commentProgramIdentity(member.path, member.before.text, member.after.text)};
    });
    return {sha: review.sha, subject: review.subject, diff: review.diff, diff_sha256: review.diff_sha256, members};
  });
  assert.equal(reviews.reduce((n, r) => n + r.members.length, 0), 32);
  verifiedSubjects = {compiler: ts.version, subjects_sha256: COMMENT_SUBJECTS_HASH, reviews};
  return structuredClone(verifiedSubjects);
}

const verified = new WeakMap();
/** Finite admission binding; documentation prose cannot certify installed runtime behavior. */
export function commentScopeEvidenceOk(body, entry, readMember, line) {
  try {
    if (!body || body.role !== COMMENT_SCOPE_ROLE || body.line !== line || body.g11_claim !== 'not-passed') return false;
    assert.equal(hash(readMember(COMMENT_SUBJECTS)), COMMENT_SUBJECTS_HASH);
    assert.deepEqual(body.context_members.map(m => m.path), COMMENT_CONTEXT_PATHS);
    for (const source of body.context_members) assert.equal(hash(readMember(source.path)), source.sha256);
    const manifest = JSON.parse(readMember(COMMENT_CONTEXT_PATHS[0]));
    assert.equal(line, manifest.version.startsWith('21.') ? '21.x' : 'main');
    const config = readMember(COMMENT_CONTEXT_PATHS[1]).toString();
    assert.match(config, /override maxWidth\?: number \| string = '80vw';/);
    const fingerprint = hash(JSON.stringify(body));
    if (verified.get(body) !== fingerprint) {
      const actual = analyzeCommentSubjects(readMember);
      assert.equal(body.subjects_sha256, actual.subjects_sha256);
      assert.deepEqual(body.scope_sha_ids, COMMENT_SHAS);
      assert.equal(body.reviews.length, 10);
      for (const expected of actual.reviews) {
        const rows = body.reviews.filter(r => r.sha === expected.sha); assert.equal(rows.length, 1);
        const row = rows[0];
        for (const key of ['subject', 'diff', 'diff_sha256', 'members']) assert.deepEqual(row[key], expected[key]);
        assert.equal(row.final_disposition, 'not-applicable');
        assert.equal(row.review_depth, 'individual-compatibility');
        assert.deepEqual(row.affected_branches, [line]);
        assert.ok(typeof row.decision === 'string' && row.decision.length >= 80);
      }
      verified.set(body, fingerprint);
    }
    const matches = body.reviews.filter(r => r.sha === entry.sha); assert.equal(matches.length, 1);
    const row = matches[0];
    assert.equal(entry.final_disposition, row.final_disposition);
    assert.deepEqual(entry.files, row.members.map(m => m.path));
    assert.equal(entry.review_depth, row.review_depth);
    assert.equal(entry.individual_proof?.review_depth, row.review_depth);
    assert.deepEqual(entry.affected_branches, [line]);
    assert.equal(entry.individual_proof?.diff_sha256, row.diff_sha256);
    assert.equal(entry.individual_proof?.decision, row.decision);
    assert.equal(entry.individual_proof?.proof_kind, 'complete-syntax-and-documentation-review');
    assert.deepEqual(entry.individual_proof?.affected_branches, [line]);
    return true;
  } catch { return false; }
}
