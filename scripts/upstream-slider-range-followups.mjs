/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four individual modern range-input patches; no inherited runtime claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {analyzeSliderInputSubjects} from './upstream-slider-input-scope.mjs';
const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const gitHash = (kind, value) => createHash('sha1').update(`${kind} ${Buffer.byteLength(value)}\0`).update(value).digest('hex');
const prefix = 'compatibility/rc/slider-range-followup-';
export const SLIDER_RANGE_ROLE = 'C04 four individual modern range-input applicability reviews';
export const SLIDER_RANGE_KIND = 'retained-legacy-slider-range-followup';
export const SLIDER_RANGE_PATCHES = Object.freeze({
  '6bfbe9b19f9d277401f0ac7041e6a658db6a2e8e': 'f5be0e728c17308589f5340edc196c5567ccf8bc12b0110366617e7fc4190945',
  '4bae8854d6394f5d33be0ceadd365a1818e99c63': 'bb4ac6958ec3c9943cd33ff428eb95394de8cdc2cc08977fcefcb639800d0053',
  '27cb9033b48fed40d4956e0178f0d80c17d25f9d': 'f24a601d5eb99deecc0f28ace31c6dd3f482ec4d22568ab3635eed18ff17ecec',
  '00714669ed1ce223e00400230fd8e69d99684dad': '6c86e14872d59e2f0ae198931b6ce75f3fe2944552df2b9a2b83578546297c98',
});
export const SLIDER_RANGE_SHAS = Object.freeze(Object.keys(SLIDER_RANGE_PATCHES));
export const SLIDER_RANGE_DECISIONS = Object.freeze([
  'The complete patch introduces an overridable modern native-input value setter, range-thumb inactive-width/sibling updates, two rendered range-width regressions and the corresponding modern thumb API declarations. The owned component remains the tagged16 single-host legacy slider: its local parent, host/template, value setter, geometry and pointer/focus/lifecycle methods are preserved and no modern thumb/input import or current companion route reaches these classes. Both exact peer package prototypes contain the modern range-width behavior, but it is not delegated to by this add-on. The public modern thumb API is not mirrored or transplanted. This source applicability conclusion does not qualify rendered widths, consumer builds or native platform behavior.',
  'The complete patch clears modern input focus on Safari pointerup, adds public Platform injection to the separate visual thumb, restores its hover ripple after dragging and changes the Safari-specific ripple expectation. Source-method observations distinguish Safari/non-Safari, active/inactive and iOS timer branches. The owned tagged16 slider has one focusable host, an unchanged FocusMonitor subscription and a template focus ring; it has no modern input/visual-thumb instance or MatRipple hover/focus pairing to receive these edits. Both minimum peer source implementations contain the modern change. No upstream behavior is claimed as inherited, and actual Safari/FocusMonitor event behavior remains part of the broader native/floor work.',
  'The complete patch disables modern track transition and updates track geometry on MatSliderThumb focus, then declares that callback on the modern private parent interface. Both minimum peer source methods perform those calls in the reviewed order. The owned legacy focus handler only refreshes single-host dimensions and tick spacing, with tagged16 value/track/thumb geometry and host/template/parent preserved. It has no current native-input thumb or shared range-track parent to which this transition fix applies. No owned motion, structure, stylesheet or public API is changed; existing native lifecycle/geometry obligations remain separate.',
  'The complete patch makes modern native-input UI animation depend on active dragging; its second hunk only reformats a sibling-thumb type assertion. The active/step source cases reproduce the before/after difference. The authenticated22.1.7 peer already has post-fix source behavior, while21.2.14 has pre-fix source behavior, so the former ancestry-based installed-fix rationale was insufficient. Neither peer implementation is reached by the owned tagged16 single-host slider: its programmatic value, pointer and focus/track paths and template/parent remain historical, with no native range input or modern thumb import/bridge. No peer upgrade or inherited-fix claim is made. Actual browser/platform behavior is unexecuted.',
]);
const hunkNotes = [
  [
    'The complete single-thumb value setter retains its initialization and active-drag guards, then dispatches through the new protected setter. Source observations preserve the shared UI/model/detector ordering and show that only the range override gains inactive-width and sibling work.',
    'The new range override first invokes the single-thumb setter and then updates inactive width and the sibling. Those two calls are observed for initialized, non-active programmatic range changes; initialization and active dragging remain guarded.',
    'Both new upstream tests measure the separate start/end native input widths after changing either bound range value. These are modern two-input geometry assertions. The source diagnostic verifies call routing, not browser rectangles, and the unchanged legacy template has no such input pair.',
    'The range API golden gains the overriding string setter used by the modern thumb hierarchy. The add-on exposes the historical single-host legacy component and does not mirror this modern range-thumb API.',
    'The single-thumb API golden gains the protected overridable string setter. Its implementation remains inside the modern native-input class; no corresponding API addition or consumer migration is required for the owned legacy slider.',
  ],
  [
    'Modern active pointerup clears the input focus flag only on Safari before emitting dragEnd. Explicit source receivers verify active/inactive and Safari/non-Safari branches while retaining the iOS/non-iOS deferred-width callback.',
    'The modern visual-thumb file adds the public inject import solely for its new Platform field. This is read as original source context, not adopted as an owned dependency or constructor change.',
    'The public Platform import belongs to the separate modern visual-thumb implementation. The legacy single-host component has no visual-thumb class and retains its existing public FocusMonitor boundary.',
    'The modern visual thumb stores its Platform instance through public injection. No root/DI/component construction is executed by the source method diagnostics or introduced into the owned class.',
    'The full modern drag-end callback still hides active and unfocused focus ripples, then explicitly restores hover on Safari. The source observations pair it with the changed input pointerup method so the focus/hover transition cannot be inferred from a filename or marker.',
    'The upstream platform-specific test expects hover after Safari pointerup and focus on other platforms. This is a deliberate modern native-input/visual-ripple behavior change, not a weakening adopted into legacy tests; native Safari rendering is not claimed by source observations.',
  ],
  [
    'The full modern focus method now orders transition(false), active track update and focus(true). The source observations retain that order; the legacy focus handler remains byte-equivalent after comment removal to the tagged single-host dimensions/tick-spacing handler.',
    'The modern private parent interface gains the source-thumb track callback required by the focus implementation. The owned local legacy parent is unchanged and neither imports nor implements this range-input interface.',
  ],
  [
    'The full modern input handler still publishes the model and parent value change. UI updates occur when a step exists or dragging is inactive; only active updates now disable animation. The four active/step combinations are observed against original before/after and both exact floor sources.',
    'The complete sibling getter prints identically before and after TypeScript normalization; only line wrapping and the optional leading union separator change. This type-only hunk does not authorize any owned runtime or public API change.',
  ],
];
const sourcePins = {main: '5b58a84c8203caec9f9c711cf390d21e675c460bf957ad895f191a4482a5f984',
  '21.x': '6f9ffd4c40ca08fbdab60bf31ed74d5456ba66132d717d720ed8a7b89a3dcd0b'};
const peerIdentityPin = '174175653daeafee377a3a2789d43b9a2d80c1002ca12da62b414bd7c4bfdb95';
const parse = (text, kind = ts.ScriptKind.TS) => {
  const file = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true, kind);
  assert.equal(file.parseDiagnostics.length, 0); return file;
};
function owner(text, name, kind) {
  const file = parse(text, kind), node = file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name);
  assert.ok(node, 'missing complete class ' + name); return {file, node};
}
const printer = ts.createPrinter({removeComments: true});
const printed = (node, file) => printer.printNode(ts.EmitHint.Unspecified, node, file);
function member(text, className, name, kind, select = () => true) {
  const {file, node} = owner(text, className, kind), matches = node.members.filter(n => n.name?.getText(file) === name && select(n));
  assert.equal(matches.length, 1, className + '.' + name); return {node: matches[0], text: printed(matches[0], file)};
}
function classes(text, definitions, parameters = {}, kind) {
  const parts = definitions.map(([originalName, name, base, select]) => {
    const {file, node} = owner(text, originalName, kind);
    return `class ${name}${base ? ' extends ' + base : ''} {\n` + node.members.filter(select).map(n => printed(n, file)).join('\n') + '\n}';
  });
  const js = ts.transpileModule(parts.join('\n'), {compilerOptions: {target: ts.ScriptTarget.ES2022, removeComments: true}}).outputText;
  return new Function(...Object.keys(parameters), js + '\nreturn {' + definitions.map(row => row[1]).join(',') + '};')(...Object.values(parameters));
}
const named = name => n => n.name?.getText() === name;
function valueObservations(text, kind) {
  const {Thumb, Range} = classes(text, [
    ['MatSliderThumb', 'Thumb', null, n => n.name?.getText() === '_setValue' || (n.name?.getText() === 'value' && ts.isSetAccessorDeclaration(n))],
    ['MatSliderRangeThumb', 'Range', 'Thumb', named('_setValue')],
  ], {}, kind);
  const rows = [];
  for (const Type of [Thumb, Range]) for (const active of [false, true]) for (const initialized of [false, true]) {
    const calls = [], instance = new Type();
    Object.assign(instance, {_hasSetInitialValue: initialized, _isActive: active, _hostElement: {value: '5'},
      _updateThumbUIByValue() {calls.push('thumb');}, _updateWidthInactive() {calls.push('inactive-width');},
      _updateSibling() {calls.push('sibling');}, _cdr: {detectChanges() {calls.push('detect');}},
      _slider: {_onValueChange(source) {assert.equal(source, instance); calls.push('value-change');}, _cdr: {markForCheck() {calls.push('mark');}}},
    });
    instance.value = 10;
    rows.push({type: Type === Thumb ? 'single' : 'range', active, initialized, input: instance._hostElement.value, initial: instance._initialValue ?? null, calls});
  }
  return rows;
}
function safariObservations(inputText, visualText, kind) {
  const scheduled = [], timer = (fn, delay) => {scheduled.push({fn, delay});};
  const {Thumb} = classes(inputText, [['MatSliderThumb', 'Thumb', null, named('_onPointerUp')]], {setTimeout: timer}, kind);
  const {Visual} = classes(visualText, [['MatSliderVisualThumb', 'Visual', null, named('_onDragEnd')]], {}, kind);
  const rows = [];
  for (const safari of [false, true]) for (const ios of [false, true]) for (const active of [false, true]) {
    scheduled.length = 0; const calls = [], thumb = new Thumb(), visual = new Visual();
    Object.assign(thumb, {_isActive: active, _isFocused: true, value: 5, _platform: {SAFARI: safari, IOS: ios},
      _slider: {}, _setIsFocused(value) {this._isFocused = value; calls.push('focus:' + value);},
      _updateWidthInactive() {calls.push('width');},
      dragEnd: {emit(event) {assert.equal(event.source, thumb); assert.equal(event.parent, thumb._slider); assert.equal(event.value, 5); calls.push('drag-end'); visual._onDragEnd();}},
    });
    Object.assign(visual, {_isActive: active, _platform: thumb._platform, _sliderInput: thumb,
      _activeRippleRef: 'active', _focusRippleRef: 'focus', _hideRipple(ref) {calls.push('hide:' + ref);},
      _showHoverRipple() {calls.push('hover');},
    });
    thumb._onPointerUp(); const delays = scheduled.map(row => row.delay); for (const row of scheduled) row.fn();
    rows.push({safari, ios, active, focused: thumb._isFocused, delays, calls});
  }
  return rows;
}
function focusObservations(text, kind) {
  const {Thumb} = classes(text, [['MatSliderThumb', 'Thumb', null, named('_onFocus')]], {}, kind);
  const calls = [], thumb = new Thumb();
  Object.assign(thumb, {_slider: {_setTransition(value) {calls.push(['transition', value]);}, _updateTrackUI(source) {assert.equal(source, thumb); calls.push(['track']);}},
    _setIsFocused(value) {calls.push(['focus', value]);}});
  thumb._onFocus(); return calls;
}
function inputObservations(text, kind) {
  const {Thumb} = classes(text, [['MatSliderThumb', 'Thumb', null, named('_onInput')]], {}, kind), rows = [];
  for (const active of [false, true]) for (const step of [0, 1]) {
    const calls = [], thumb = new Thumb();
    Object.assign(thumb, {_isActive: active, value: 5, _onChangeFn(value) {calls.push(['model', value]);},
      _updateThumbUIByValue(options) {calls.push(['ui', options.withAnimation]);},
      _slider: {step, _onValueChange(source) {assert.equal(source, thumb); calls.push(['value-change']);}},
    });
    thumb._onInput(); rows.push({active, step, calls});
  }
  return rows;
}
/** Whole authenticated methods with explicit receivers; never Angular/browser credit. */
export function replaySliderRangeSubject(subject) {
  const source = (suffix, side) => subject.members.find(row => row.path.endsWith(suffix))[side].text;
  if (subject.sha === SLIDER_RANGE_SHAS[0]) {
    const before = valueObservations(source('slider-input.ts', 'before')), after = valueObservations(source('slider-input.ts', 'after'));
    for (const [index, row] of after.entries()) {
      const expected = !row.initialized || row.active ? [] : ['thumb', 'value-change', 'detect', 'mark', ...(row.type === 'range' ? ['inactive-width', 'sibling'] : [])];
      assert.deepEqual(row.calls, expected); assert.equal(row.input, row.initialized && !row.active ? '10' : '5');
      assert.equal(row.initial, row.initialized ? null : '10');
      assert.deepEqual(before[index].calls, row.type === 'range' ? expected.filter(value => !['inactive-width', 'sibling'].includes(value)) : expected);
    }
    return {kind: 'programmatic-range-width', before, after};
  }
  if (subject.sha === SLIDER_RANGE_SHAS[1]) {
    const measure = side => safariObservations(source('slider-input.ts', side), source('slider-thumb.ts', side));
    const before = measure('before'), after = measure('after');
    for (const [index, row] of after.entries()) {
      assert.equal(row.focused, !(row.active && row.safari));
      assert.deepEqual(row.delays, row.active ? [row.ios ? 10 : 0] : []);
      assert.deepEqual(row.calls, row.active ? [...(row.safari ? ['focus:false'] : []), 'drag-end', 'hide:active', ...(row.safari ? ['hide:focus', 'hover'] : []), 'width'] : []);
      assert.equal(before[index].focused, true); assert.ok(!before[index].calls.includes('hover'));
    }
    return {kind: 'safari-separate-input-and-visual-thumb-focus', before, after};
  }
  if (subject.sha === SLIDER_RANGE_SHAS[2]) {
    const before = focusObservations(source('slider-input.ts', 'before')), after = focusObservations(source('slider-input.ts', 'after'));
    assert.deepEqual(before, [['focus', true]]); assert.deepEqual(after, [['transition', false], ['track'], ['focus', true]]);
    return {kind: 'range-track-focus-transition', before, after};
  }
  assert.equal(subject.sha, SLIDER_RANGE_SHAS[3]);
  const before = inputObservations(source('slider-input.ts', 'before')), after = inputObservations(source('slider-input.ts', 'after'));
  for (const [index, row] of after.entries()) {
    assert.deepEqual(row.calls, [['model', 5], ...(row.step || !row.active ? [['ui', !row.active]] : []), ['value-change']]);
    assert.deepEqual(before[index].calls, [['model', 5], ...(row.step || !row.active ? [['ui', true]] : []), ['value-change']]);
  }
  assert.equal(member(source('slider-input.ts', 'before'), 'MatSliderRangeThumb', 'getSibling').text,
    member(source('slider-input.ts', 'after'), 'MatSliderRangeThumb', 'getSibling').text, 'union-layout hunk changed runtime method');
  return {kind: 'active-native-input-animation', before, after};
}

export function analyzeSliderRangeSubjects(read, line) {
  const raw = read(prefix + 'subjects.json.gz'); assert.equal(hash(raw), sourcePins[line]);
  const packet = JSON.parse(gunzipSync(raw)); assert.equal(packet.line, line); assert.deepEqual(packet.subjects.map(row => row.sha), SLIDER_RANGE_SHAS);
  assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
  assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);
  assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects, SLIDER_RANGE_SHAS);
  const censusRaw = read(packet.source_inventory.path); assert.equal(hash(censusRaw), packet.source_inventory.sha256);
  const census = JSON.parse(gunzipSync(censusRaw)); assert.equal(census.commits.length, 1697);
  const results = [];
  for (const subject of packet.subjects) {
    const original = census.commits.find(row => row.sha === subject.sha); assert.ok(original);
    assert.equal(subject.raw_commit, original.raw_commit); assert.equal(gitHash('commit', subject.raw_commit), subject.sha);
    assert.deepEqual(subject.complete_changed_files, original.complete_changed_files);
    assert.equal(hash(subject.diff), SLIDER_RANGE_PATCHES[subject.sha]); assert.equal(subject.diff_sha256, SLIDER_RANGE_PATCHES[subject.sha]);
    const sections = subject.diff.split(/(?=^diff --git )/m).filter(Boolean);
    assert.deepEqual(sections.map(part => part.split('\n')[0].split(' b/')[1]), original.complete_changed_files.map(row => row.path));
    for (const [index, value] of subject.members.entries()) {
      assert.equal(value.path, original.complete_changed_files[index].path);
      for (const side of ['before', 'after']) {
        const data = value[side]; assert.equal(gitHash('blob', data.text), original.complete_changed_files[index][side + '_blob']);
        assert.equal(hash(data.text), data.sha256); assert.equal(Buffer.byteLength(data.text), data.bytes);
      }
    }
    results.push({sha: subject.sha, diff_sha256: subject.diff_sha256, files: sections.length,
      hunks: (subject.diff.match(/^@@ /gm) || []).length, behavior: replaySliderRangeSubject(subject)});
  }
  return {packet, results};
}

export function sliderRangeHunkReviews(subject) {
  const index = SLIDER_RANGE_SHAS.indexOf(subject.sha); assert.ok(index >= 0);
  const rows = [];
  for (const section of subject.diff.split(/(?=^diff --git )/m).filter(Boolean)) {
    const path = section.split('\n')[0].split(' b/')[1], starts = [...section.matchAll(/^@@[^\n]*\n/gm)].map(match => match.index);
    for (const [i, start] of starts.entries()) {
      const text = section.slice(start, starts[i + 1] ?? section.length);
      rows.push({path, header: text.split('\n')[0], hunk_sha256: hash(text), judgment: hunkNotes[index][rows.length]});
    }
  }
  assert.equal(rows.length, hunkNotes[index].length); assert.ok(rows.every(row => typeof row.judgment === 'string' && row.judgment.length > 100));
  return rows;
}

export function reviewSliderRangeScope(read, productPaths, line) {
  const {packet, results} = analyzeSliderRangeSubjects(read, line);
  const original = analyzeSliderInputSubjects(read).original;
  const tagged = original.find(row => row.path.endsWith('slider.ts')).text;
  const candidate = 'projects/ngx-material-legacy/legacy-slider/slider.ts', text = read(candidate).toString();
  const oldClass = owner(tagged, 'MatLegacySlider'), current = owner(text, 'MatLegacySlider');
  const selected = ['value', '_onFocus', '_onBlur', '_onMouseenter', '_pointerDown', '_pointerMove', '_pointerUp', '_windowBlur',
    '_updateValueFromPosition', '_getTrackBackgroundStyles', '_getTrackFillStyles', '_getThumbContainerStyles', 'ngAfterViewInit', 'ngOnDestroy', 'writeValue'];
  const owned = [];
  for (const name of selected) {
    const old = oldClass.node.members.filter(n => n.name?.getText(oldClass.file) === name), next = current.node.members.filter(n => n.name?.getText(current.file) === name);
    assert.ok(old.length); assert.equal(next.length, old.length);
    for (const [index, before] of old.entries()) {
      const a = printed(before, oldClass.file), b = printed(next[index], current.file);
      assert.equal(b, a, 'owned historical member changed: ' + name);
      owned.push({name, kind: ts.SyntaxKind[before.kind], original_sha256: hash(a), candidate_sha256: hash(b)});
    }
  }
  const metadata = (file, node) => {
    const decorators = ts.getDecorators(node) ?? [], call = decorators.find(n => ts.isCallExpression(n.expression) && n.expression.expression.getText(file) === 'Component')?.expression;
    assert.ok(call); const object = call.arguments[0]; assert.ok(ts.isObjectLiteralExpression(object));
    return ['selector', 'exportAs', 'host', 'providers', 'templateUrl', 'styleUrls', 'inputs'].map(name => {
      const property = object.properties.find(n => n.name?.getText(file) === name); assert.ok(property, name);
      return {name, text: printed(property, file)};
    });
  };
  const oldMetadata = metadata(oldClass.file, oldClass.node), currentMetadata = metadata(current.file, current.node);
  assert.deepEqual(currentMetadata.filter(row => row.name !== 'styleUrls'), oldMetadata.filter(row => row.name !== 'styleUrls'));
  assert.equal(oldMetadata.find(row => row.name === 'styleUrls').text, "styleUrls: ['slider.css']");
  assert.equal(currentMetadata.find(row => row.name === 'styleUrls').text, "styleUrls: ['slider.scss']");
  const styleSource = {original_metadata: "styleUrls: ['slider.css']", current_metadata: "styleUrls: ['slider.scss']",
    path: 'projects/ngx-material-legacy/legacy-slider/slider.scss', sha256: hash(read('projects/ngx-material-legacy/legacy-slider/slider.scss')),
    scope: 'Existing generated-CSS to maintained-SCSS source route; this is not a compiled or rendered stylesheet equality proof.'};
  assert.equal(printed(current.node.heritageClauses[0], current.file), printed(oldClass.node.heritageClauses[0], oldClass.file));
  const baseInitializer = file => {
    const variable = file.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(file) === '_MatSliderBase');
    assert.ok(variable?.initializer); return printed(variable.initializer, file);
  };
  assert.equal(baseInitializer(current.file), baseInitializer(oldClass.file));
  const template = 'projects/ngx-material-legacy/legacy-slider/slider.html';
  assert.equal(read(template).toString(), original.find(row => row.path.endsWith('slider.html')).text);
  const paths = [...productPaths()].sort(); assert.equal(paths.length, 1028); assert.equal(new Set(paths).size, paths.length);
  const excluded = ['MatSliderThumb', 'MatSliderRangeThumb', 'MatSliderVisualThumb', '@angular/material/slider', 'matSliderStartThumb', 'matSliderEndThumb'];
  const sources = paths.map(path => {
    const bytes = read(path); assert.ok(bytes.length);
    for (const needle of excluded) assert.ok(!bytes.toString().includes(needle), 'modern range-input route in product: ' + path + ' / ' + needle);
    return {path, sha256: hash(bytes)};
  });
  const companionFile = parse(read('scripts/companion-bridge-peer-oracle.mjs').toString());
  const roster = companionFile.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(companionFile) === 'COMPANIONS')?.initializer;
  assert.ok(roster && ts.isArrayLiteralExpression(roster) && roster.elements.every(ts.isStringLiteral));
  const companions = roster.elements.map(n => n.text);
  assert.deepEqual(companions, ['badge', 'bottom-sheet', 'button-toggle', 'datepicker', 'divider', 'expansion', 'grid-list', 'icon', 'sidenav', 'stepper', 'sort', 'toolbar', 'tree']);
  const peerRaw = read(prefix + 'peer-sources/identities.json'); assert.equal(hash(peerRaw), peerIdentityPin);
  const identities = JSON.parse(peerRaw); assert.deepEqual(identities.map(row => [row.line, row.version]), [['main', '22.1.7'], ['21.x', '21.2.14']]);
  const peers = identities.map(identity => {
    const manifestBytes = read(identity.retained_manifest.path); assert.equal(hash(manifestBytes), identity.retained_manifest.sha256);
    const manifest = JSON.parse(manifestBytes); assert.equal(manifest.version, identity.version);
    assert.equal(manifest.exports['./slider'].default, './fesm2022/slider.mjs');
    const captures = identity.retained_sources.map(record => {
      const compressed = read(record.path); assert.equal(hash(compressed), record.sha256); assert.equal(compressed.length, record.bytes);
      const bytes = gunzipSync(compressed); assert.equal(hash(bytes), record.uncompressed_sha256); assert.equal(bytes.length, record.uncompressed_bytes);
      return bytes.toString();
    });
    const js = captures[0], declaration = parse(captures[1]);
    for (const name of ['MatSlider', 'MatSliderThumb', 'MatSliderRangeThumb']) assert.ok(declaration.statements.some(n => ts.isClassDeclaration(n) && n.name?.text === name), 'missing floor declaration ' + name);
    const input = inputObservations(js, ts.ScriptKind.JS), oldInput = results[3].behavior.before, newInput = results[3].behavior.after;
    const mode = JSON.stringify(input) === JSON.stringify(oldInput) ? 'pre-fix' : JSON.stringify(input) === JSON.stringify(newInput) ? 'post-fix' : 'different';
    assert.notEqual(mode, 'different', 'unreviewed minimum input behavior');
    const focus = focusObservations(js, ts.ScriptKind.JS); assert.deepEqual(focus, results[2].behavior.after);
    const safari = safariObservations(js, js, ts.ScriptKind.JS); assert.deepEqual(safari, results[1].behavior.after);
    const values = valueObservations(js, ts.ScriptKind.JS); assert.deepEqual(values, results[0].behavior.after);
    return {line: identity.line, version: identity.version, archive_sha256: identity.archive_sha256,
      implementation_sha256: identity.retained_sources[0].uncompressed_sha256,
      programmatic_range_values: values, safari_pointerup: safari, focus_track_transition: focus,
      active_input_animation: {source_observation: mode, cases: input}, actual_framework_or_browser_execution: false};
  });
  return {schema_version: 1, line, subject_capsule_sha256: hash(read(prefix + 'subjects.json.gz')),
    producer_sha256: hash(read('scripts/upstream-slider-range-followups.mjs')),
    results, owned_methods: owned, tagged_template_sha256: original.find(row => row.path.endsWith('slider.html')).sha256,
    owned_metadata: currentMetadata, style_source_route: styleSource, owned_parent_initializer_sha256: hash(baseInitializer(current.file)),
    excluded_modern_routes: excluded, source_members: sources.length, product_source_population_sha256: hash(JSON.stringify(sources)),
    current_companions: companions, peers,
    scope: 'Owned legacy single-host architecture and exact historical methods; source-method diagnostics with explicit receivers/timers only. Modern peer component behavior is context, not inherited by the package. No Angular construction, platform events, rendered geometry, Safari browser, artifact or floor-runtime qualification.',
    source_only: true, actual_native_packed_or_floor_qualified: false};
}

/** An exact current applicability proof, not a kind/status-string clearance. */
export function sliderRangeEvidenceOk(body, entry, read, productPaths, line) {
  try {
    const index = SLIDER_RANGE_SHAS.indexOf(entry.sha); assert.ok(index >= 0);
    assert.equal(body.role, SLIDER_RANGE_ROLE); assert.equal(body.status, 'reviewed'); assert.equal(body.line, line);
    assert.equal(body.g11_claim, 'not-passed'); assert.equal(body.actual_native_packed_or_floor_qualified, false);
    assert.deepEqual(body.scope_sha_ids, SLIDER_RANGE_SHAS);
    assert.deepEqual(body.reviews.map(row => row.sha), SLIDER_RANGE_SHAS);
    const {packet} = analyzeSliderRangeSubjects(read, line);
    assert.deepEqual(body.source_scope, reviewSliderRangeScope(read, productPaths, line));
    for (const [i, review] of body.reviews.entries()) {
      const original = packet.subjects[i];
      assert.equal(review.status, 'reviewed'); assert.equal(review.final_disposition, 'not-applicable');
      assert.equal(review.review_depth, 'individual-compatibility'); assert.deepEqual(review.affected_branches, [line]);
      assert.equal(review.decision, SLIDER_RANGE_DECISIONS[i]);
      assert.equal(review.diff_sha256, SLIDER_RANGE_PATCHES[original.sha]);
      assert.equal(review.patch_file, prefix + original.sha + '.original.patch');
      assert.equal(read(review.patch_file).toString(), original.diff);
      assert.deepEqual(review.paths, original.complete_changed_files.map(row => row.path));
      assert.deepEqual(review.hunk_reviews, sliderRangeHunkReviews(original));
    }
    const review = body.reviews[index];
    assert.equal(entry.final_disposition, 'not-applicable'); assert.equal(entry.reason, review.decision);
    assert.equal(entry.diff_sha256, review.diff_sha256);
    assert.deepEqual(entry.files, review.paths); assert.deepEqual(entry.affected_branches, [line]);
    assert.deepEqual(entry.individual_proof, {proof_kind: SLIDER_RANGE_KIND, diff_sha256: review.diff_sha256,
      review_depth: 'individual-compatibility', affected_branches: [line], decision: review.decision});
    assert.equal(hash(read(entry.evidence_report)), entry.source_check.evidence_report_sha256);
    return true;
  } catch { return false; }
}

/** Exact root-dispatch-only requalification; preserve every original native
 * verdict and requirement. Returned documents are written by the task recorder.
 */
export async function qualifySliderRangeNativeContext({root, read}) {
  const priorPath = prefix + 'native-prior.json.gz', raw = read(priorPath), prior = JSON.parse(gunzipSync(raw));
  assert.equal(hash(raw), {main: 'a710dc77d8db2836c347e99034e3886f648b72c6153481a506f0fa8b8c1516ac',
    '21.x': '97cbe5ec72193f2e88794121b5eaf591c9660abc53f19a12d527f04fd0252dab'}[prior.line]);
  assert.equal(prior.rows.length, 21); assert.equal(hash(prior.checker.text), prior.checker.sha256);
  const addition = "import {SLIDER_RANGE_SHAS,SLIDER_RANGE_ROLE,sliderRangeEvidenceOk} from './upstream-slider-range-followups.mjs';\n";
  const guard = "    if(SLIDER_RANGE_SHAS.includes(entry.sha)||body.role===SLIDER_RANGE_ROLE){\n"
    + "      const readMember=rel=>{const member=regularRepoMember(rel);return member?readFileSync(member):null;};\n"
    + "      if(!sliderRangeEvidenceOk(body,entry,readMember,()=>candidateProductSourcePaths(root),line||body.line))return 'invalid-slider-range-followup-scope';\n    }\n";
  const checker = read(prior.checker.path).toString();
  assert.equal(checker.split(addition).length, 2); assert.equal(checker.split(guard).length, 2);
  assert.equal(checker.replace(addition, '').replace(guard, ''), prior.checker.text);
  const entries = [], reviews = [], transitions = [];
  for (const row of prior.rows) {
    const old = row.entry, next = structuredClone(old), scope = next.individual_proof[row.field];
    const modules = new Set(['upstream-artifact-behavior-evidence.mjs', 'upstream-historical-behavior-evidence.mjs',
      'upstream-progress-csp-evidence.mjs', 'upstream-generated-identity-evidence.mjs', 'upstream-bidi-evidence.mjs',
      'upstream-selection-evidence.mjs', 'upstream-form-field-hover-evidence.mjs', 'upstream-tab-completion-evidence.mjs', 'upstream-ripple-replay-evidence.mjs']);
    assert.ok(modules.has(row.module)); const validate = (await import('./' + row.module))[row.fn]; assert.equal(typeof validate, 'function');
    const stale = validate({root, entry: old, proof: old.individual_proof, request: null});
    assert.equal(stale.ok, false);
    assert.ok(stale.detail === 'missing coordinator run' || /stale/.test(stale.detail), stale.detail);
    let changed = 0;
    scope.source_members = scope.source_members.map(record => {
      if (record.path === prior.checker.path) {
        assert.equal(record.sha256, prior.checker.sha256); changed++;
        return {...record, sha256: hash(checker)};
      }
      assert.equal(hash(read(record.path)), record.sha256); return record;
    });
    assert.ok(changed === 0 || changed === 1);
    const after = validate({root, entry: next, proof: next.individual_proof, request: null});
    assert.deepEqual(after, {ok: false, detail: 'missing coordinator run'});
    if (changed === 0) {
      assert.deepEqual(next, old);
      assert.deepEqual(stale, after);
      transitions.push({sha: old.sha, field: row.field, source_binding_changed: false,
        prior_source_hashes_match_current: true, after});
      continue;
    }
    assert.equal(hash(row.review.text), row.review.sha256); assert.equal(read(row.review.path).toString(), row.review.text);
    const review = JSON.parse(row.review.text); assert.deepEqual(review.individual_proof, old.individual_proof);
    review.individual_proof = structuredClone(next.individual_proof);
    for (const field of ['reviewed_source_members', 'independent_source_evidence', 'independent_evidence']) if (Array.isArray(review[field])) {
      review[field] = review[field].map(record => {
        if (record.path !== prior.checker.path) return record;
        assert.equal(record.sha256, prior.checker.sha256); return {...record, sha256: hash(checker)};
      });
    }
    review.slider_range_followup_source_context = {path: priorPath, sha256: hash(raw), prior_review: {path: row.review.path, sha256: row.review.sha256},
      only_current_root_source_dispatch_added: true, original_verdict_and_native_requirements_unchanged: true, actual_native_packed_or_floor_qualified: false};
    next.evidence_report = 'compatibility/f10/disposition-ledger/evidence/closeout-slider-range-followup-native-context.json';
    entries.push(next); reviews.push(review); transitions.push({sha: old.sha, field: row.field,
      source_binding_changed: true,
      prior_source_hashes_match_current: false, prior_validator_without_run: stale,
      prior_validator_reached_source_check: stale.detail !== 'missing coordinator run', after});
  }
  assert.equal(entries.length, 15); assert.equal(transitions.length, 21);
  return {entries, transitions, path: entries[0].evidence_report, body: {schema_version: 1, line: prior.line,
    role: 'Individual native decisions retained after exact current slider applicability dispatch addition', status: 'reviewed',
    prior: {path: priorPath, sha256: hash(raw)}, reviews, actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'}};
}
