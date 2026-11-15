/**
 * Conservative TypeScript module-specifier rewrite for historical legacy-* paths.
 * Only rewrites string module literals that exactly target
 * `@angular/material/legacy-...` (including /testing). Leaves ordinary Material,
 * private paths, computed imports, and non-module strings alone.
 *
 * Ordinary (non-legacy) `@angular/material/...` imports are reported as
 * current-component drift requiring `--acknowledge-current-components` for
 * readiness; acknowledgement does not rewrite those imports.
 */

'use strict';

const FROM_PREFIX = '@angular/material/legacy-';
const TO_PREFIX = '@ngx-compat/material-legacy/legacy-';

/** @typedef {{ok: boolean, content?: string, diagnostics: string[], changed: boolean, acknowledgements?: string[]}} RewriteResult */
/** @typedef {{acknowledgeCompanionBridges?: boolean, acknowledgeAggregates?: boolean, acknowledgeCurrentComponents?: boolean}} RewriteOptions */

/**
 * @param {RewriteOptions|undefined} options
 * @returns {Required<RewriteOptions>}
 */
function normalizeOptions(options) {
  const o = options || {};
  return {
    acknowledgeCompanionBridges: Boolean(o.acknowledgeCompanionBridges),
    acknowledgeAggregates: Boolean(o.acknowledgeAggregates),
    acknowledgeCurrentComponents: Boolean(o.acknowledgeCurrentComponents),
  };
}

/** Historical legacy entry points. `/testing` is the only allowed extra segment. */
const LEGACY_ENTRIES = new Set([
  'legacy-autocomplete',
  'legacy-button',
  'legacy-card',
  'legacy-checkbox',
  'legacy-chips',
  'legacy-dialog',
  'legacy-form-field',
  'legacy-input',
  'legacy-list',
  'legacy-menu',
  'legacy-paginator',
  'legacy-progress-bar',
  'legacy-progress-spinner',
  'legacy-radio',
  'legacy-select',
  'legacy-slide-toggle',
  'legacy-slider',
  'legacy-snack-bar',
  'legacy-table',
  'legacy-tabs',
  'legacy-tooltip',
  'legacy-core',
]);

const RECIPE_NAME = /\bmatLegacy[A-Za-z0-9]*Animations\b/;

/**
 * Blank comments, strings, and template literals so later matches see code only.
 * Newlines stay in place, so indexes still refer to the original source.
 * Template `${...}` interpolations are scanned as code.
 * @param {string} source
 * @returns {string}
 */
function maskNonCode(source, flags = null) {
  const chars = source.split('');
  const n = chars.length;
  let i = 0;

  const blank = (from, to) => {
    for (let k = from; k < to; k++) {
      if (chars[k] !== '\n') {
        chars[k] = ' ';
        if (flags) flags[k] = true;
      }
    }
  };

  while (i < n) {
    const c = chars[i];
    const next = chars[i + 1];
    if (c === '/' && next === '/') {
      const start = i;
      i += 2;
      while (i < n && chars[i] !== '\n') i++;
      blank(start, i);
      continue;
    }
    if (c === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i + 1 < n && !(chars[i] === '*' && chars[i + 1] === '/')) i++;
      i = Math.min(n, i + 2);
      blank(start, i);
      continue;
    }
    if (c === '\'' || c === '"') {
      const quote = c;
      const start = i;
      i++;
      while (i < n) {
        if (chars[i] === '\\') {
          i += 2;
          continue;
        }
        if (chars[i] === quote || chars[i] === '\n') {
          if (chars[i] === quote) i++;
          break;
        }
        i++;
      }
      blank(start, i);
      continue;
    }
    if (c === '`') {
      const start = i;
      i++;
      while (i < n) {
        if (chars[i] === '\\') {
          i += 2;
          continue;
        }
        if (chars[i] === '`') {
          i++;
          break;
        }
        if (chars[i] === '$' && chars[i + 1] === '{') {
          blank(start, i);
          i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            if (chars[i] === '{') depth++;
            else if (chars[i] === '}') depth--;
            if (depth > 0) i++;
            else i++;
          }
          continue;
        }
        i++;
      }
      blank(start, i);
      continue;
    }
    i++;
  }
  return chars.join('');
}

function nonCodeFlags(source) {
  const flags = new Array(source.length).fill(false);
  maskNonCode(source, flags);
  return flags;
}

/**
 * @param {string} spec
 * @returns {'rewrite'|'private'|'unknown'|'deep'|'ignore'}
 */
function classifyLegacySpecifier(spec) {
  if (!spec.startsWith(FROM_PREFIX)) return 'ignore';
  const rest = spec.slice(FROM_PREFIX.length);
  const parts = rest.split('/');
  const entry = `legacy-${parts[0]}`;
  if (!LEGACY_ENTRIES.has(entry)) return 'unknown';
  if (parts.length === 1) return 'rewrite';
  if (parts.length === 2 && parts[1] === 'testing') return 'rewrite';
  if (parts.indexOf('private') !== -1) return 'private';
  return 'deep';
}

/**
 * @param {string} masked
 * @returns {{spec: string, specStart: number, specEnd: number, clause: string}[]}
 */
function keywordInCode(match, flags) {
  const kw = match[0].search(/[A-Za-z]/);
  const idx = match.index + (kw < 0 ? 0 : kw);
  return !flags[idx];
}

function collectLegacyImports(source, flags) {
  /** @type {{spec: string, specStart: number, specEnd: number, clause: string}[]} */
  const found = [];
  const seen = new Set();
  const record = (match, spec, clause) => {
    if (!keywordInCode(match, flags)) return;
    const specStart = match.index + match[0].lastIndexOf(spec);
    const key = `${specStart}:${spec}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({spec, specStart, specEnd: specStart + spec.length, clause: clause || ''});
  };

  const fromRe =
    /(?:^|[^.\w$])(?:import|export)\s+(?:type\s+)?([\s\S]*?)\s+from\s+(['"])(@angular\/material\/legacy-[^'"]+)\2/g;
  const sideRe =
    /(?:^|[^.\w$])import\s+(['"])(@angular\/material\/legacy-[^'"]+)\1/g;
  const dynamicRe =
    /import\s*\(\s*(['"])(@angular\/material\/legacy-[^'"]+)\1\s*\)/g;
  const requireRe =
    /require\s*\(\s*(['"])(@angular\/material\/legacy-[^'"]+)\1\s*\)/g;

  const requireIsShadowed =
    /(?:function\s+[A-Za-z_$][\w$]*\s*\([^)]*\brequire\b|\(\s*require\s*[:,)]|\b(?:const|let|var|function|class)\s+require\b|\brequire\s*=>)/.test(
      source,
    );
  for (const match of source.matchAll(fromRe)) record(match, match[3], match[1]);
  for (const match of source.matchAll(sideRe)) record(match, match[2], '');
  for (const match of source.matchAll(dynamicRe)) record(match, match[2], '');
  if (!requireIsShadowed) {
    for (const match of source.matchAll(requireRe)) record(match, match[2], '');
  }
  return found;
}

/**
 * Detect ordinary (non-legacy) Material module specifiers in import/export/from forms.
 * @param {string} content
 * @returns {boolean}
 */
function hasOrdinaryMaterialModuleSpecifiers(content) {
  const flags = nonCodeFlags(content);
  const fromRe =
    /(?:from\s+|import\s*\(\s*)(['"])(@angular\/material\/(?!legacy-)[^'"]+)\1/g;
  for (const match of content.matchAll(fromRe)) {
    if (keywordInCode(match, flags)) return true;
  }
  return false;
}

/** Whether a scanned TypeScript source imports a historical or compat legacy entry. */
function hasLegacyMigrationTarget(source) {
  const flags=nonCodeFlags(source);
  if(collectLegacyImports(source,flags).some(i=>classifyLegacySpecifier(i.spec)==='rewrite'))return true;
  const re=/\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?(['"])(@ngx-compat\/material-legacy\/legacy-[^'"]+)\1/g;
  for(const m of source.matchAll(re))if(!flags[m.index])return true;
  return false;
}

/**
 * Narrow same-NgModule guard. It does not infer injector relationships across
 * files or arbitrary expressions. Only top-level decorator literals with a
 * directly imported legacy module are in scope.
 */
function scopedLegacyNoopPlan(source, masked, flags, workspace) {
  const edits=[];const covered=[];let insertImport=false;
  const imports = [];const importRanges=[];
  const re = /\bimport\s+(?:type\s+)?(\{[^}]*\}|\*\s+as\s+[\w$]+)\s+from\s+(['"])([^'"]+)\2/g;
  for (const m of source.matchAll(re)) {
    if (flags[m.index]) continue;
    importRanges.push({start:m.index,end:m.index+m[0].length});
    const clause = m[1], module = m[3], typeOnly=/^import\s+type\b/.test(m[0]);
    if (clause.startsWith('{')) {
      for (const part of clause.slice(1, -1).split(',')) {
        const item = part.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        if (item) imports.push({module, exported:item[1], local:item[2] || item[1], typeOnly});
      }
    } else {
      const item = clause.match(/^\*\s+as\s+([\w$]+)$/);
      if (item) imports.push({module, exported:'*', local:item[1], typeOnly});
    }
  }
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const refs = (predicate, name, types=false) => imports.filter(i => (types || !i.typeOnly) && predicate(i.module) &&
    (i.exported === name || i.exported === '*')).map(i => i.exported === '*'
      ? escape(i.local) + '\\s*\\.\\s*' + escape(name) : escape(i.local));
  const legacy = imports.filter(i => !i.typeOnly && /^(?:@angular\/material\/legacy-|@ngx-compat\/material-legacy\/legacy-)/.test(i.module));
  if (!legacy.length && !workspace) return {edits};
  const word = expression => new RegExp('(?:^|[^\\w$.])(?:' + expression + ')(?![\\w$])');
  const findEnd = (start, open, close) => {
    let depth=0;
    for (let i=start;i<masked.length;i++) {
      if(masked[i]===open)depth++;
      else if(masked[i]===close && --depth===0)return i;
    }
    return -1;
  };
  const decorators=refs(m=>m==='@angular/core','NgModule');
  const bootstraps=refs(m=>m==='@angular/platform-browser','bootstrapApplication');
  const importProviders=refs(m=>m==='@angular/core','importProvidersFrom');
  const appConfigTypes=refs(m=>m==='@angular/core','ApplicationConfig',true);
  const testbeds=refs(m=>m==='@angular/core/testing','TestBed');
  // A known producer outside a recognized configuration literal must not
  // silently pass: it may be an identifier-held/opaque injector config.
  // Exclude function-local shadows and never treat a read of the old token as
  // a provider. This is deliberately not a general lexical scope analyzer.
  const shadowRanges=[];const bindingRanges=[];const supportedScopes=[];
  const relevantBindings=imports.filter(item=>!item.typeOnly &&
    (item.module==='@angular/platform-browser/animations' ||
      (item.module==='@angular/core' && (item.exported==='ANIMATION_MODULE_TYPE'||item.exported==='*')) ||
      (item.module==='@ngx-compat/material-legacy/legacy-core' && (item.exported==='LEGACY_ANIMATION_MODE'||item.exported==='*'))));
  // Only classify destructuring when the imported identifier is a binding
  // target, not merely an object property renamed to a different local.
  const destructuredBinding=(pattern,name)=>new RegExp('(?:^|[\\{\\[,])\\s*(?:\\.\\.\\.\\s*)?(?:[\\w$]+\\s*:\\s*)?'+escape(name)+'(?=\\s*[,}\\]=])').test(pattern);
  const configUses=(start,end,name)=>{
    const fragment=masked.slice(start,end),matcher=new RegExp('(?:^|[^\\w$.])(?:'+testbeds.join('|')+')\\s*\\.\\s*configureTestingModule\\s*\\(\\s*\\{','g');
    if(!testbeds.length)return false;
    for(const match of fragment.matchAll(matcher)){
      const open=start+match.index+match[0].lastIndexOf('{'),close=findEnd(open,'{','}');
      if(close<0 || close>end)continue;
      if(word(escape(name)).test(masked.slice(open,close+1)))return true;
    }
    return false;
  };
  const relevantLocalDestructure=(start,end,name)=>{
    const re=/\b(?:const|let|var)\s*[\{\[]/g,fragment=masked.slice(start,end);
    for(const match of fragment.matchAll(re)){
      const open=start+match.index+match[0].length-1,close=findEnd(open,masked[open],masked[open]==='{'?'}':']');
      if(close>=0 && close<end && destructuredBinding(masked.slice(open,close+1),name))return true;
    }
    return false;
  };
  // One conservative scope rule for functions, arrows, methods and catch:
  // if a recognized TestBed configuration uses a name that can be locally
  // bound in its enclosing scope, refuse instead of guessing lexical reach.
  const scopeAmbiguity=(paramStart,paramEnd,start,end)=>{
    const params=masked.slice(paramStart+1,paramEnd),body=masked.slice(start,end);
    for(const binding of relevantBindings){
      const name=escape(binding.local);
      if(!configUses(start,end,binding.local))continue;
      const parameter=new RegExp('(?:^|[,\\s])'+name+'(?:\\s*[:=,?]|\\s*$)').test(params) || destructuredBinding(params,binding.local);
      const local=new RegExp('\\b(?:const|let|var|function|class)\\s+'+name+'\\b').test(body) || relevantLocalDestructure(start,end,binding.local);
      if(parameter||local)return 'legacy-noop-policy: ambiguous scoped animation binding in a testing configuration; review the injector manually.';
    }
    return null;
  };
  const functions=/\bfunction(?:\s+[\w$]+)?\s*\(/g;
  for(const m of masked.matchAll(functions)){
    const paramStart=m.index+m[0].lastIndexOf('('),paramEnd=findEnd(paramStart,'(',')');if(paramEnd<0)continue;
    bindingRanges.push({start:paramStart+1,end:paramEnd});
    const tail=/^\s*(?::[^;{]+)?\s*\{/.exec(masked.slice(paramEnd+1));if(!tail)continue;
    const open=paramEnd+1+tail[0].lastIndexOf('{'),end=findEnd(open,'{','}');if(end<0)continue;
    supportedScopes.push({open,end});
    const ambiguous=scopeAmbiguity(paramStart,paramEnd,open,end);if(ambiguous)return {edits:[],diagnostic:ambiguous};
    for(const binding of imports){
      if(binding.typeOnly)continue;
      const name=escape(binding.local),params=masked.slice(paramStart+1,paramEnd);
      if(new RegExp('(?:^|[,\\s])'+name+'(?:\\s*[:=,?]|\\s*$)').test(params)){
        shadowRanges.push({start:paramStart,end,name:binding.local});continue;
      }
      const locals=new RegExp('\\b(const|let|var|function|class)\\s+'+name+'\\b','g');
      const fragment=masked.slice(open+1,end);
      for(const local of fragment.matchAll(locals)){
        const pos=open+1+local.index,stack=[open];
        for(let k=open+1;k<pos;k++){if(masked[k]==='{')stack.push(k);else if(masked[k]==='}')stack.pop();}
        const scopeStart=local[1]==='var' ? open : stack.at(-1),scopeEnd=findEnd(scopeStart,'{','}');
        if(scopeEnd<0)return {edits:[],diagnostic:'legacy-noop-policy: ambiguous local animation binding; review the injector manually.'};
        shadowRanges.push({start:scopeStart,end:scopeEnd,name:binding.local});
      }
    }
  }
  const arrowParams=/\(/g;
  for(const m of masked.matchAll(arrowParams)){
    const paramStart=m.index,paramEnd=findEnd(paramStart,'(',')');if(paramEnd<0)continue;
    const tail=/^\s*(?::[^=;{}]+)?\s*=>\s*/.exec(masked.slice(paramEnd+1));if(!tail)continue;
    bindingRanges.push({start:paramStart+1,end:paramEnd});
    const start=paramEnd+1+tail[0].length;
    const end=masked[start]==='{' ? findEnd(start,'{','}') : (()=>{const m=/[;\n]/.exec(masked.slice(start));return m?start+m.index:masked.length;})();
    if(end<0)continue;
    if(masked[start]==='{')supportedScopes.push({open:start,end});
    const ambiguous=scopeAmbiguity(paramStart,paramEnd,start,end);if(ambiguous)return {edits:[],diagnostic:ambiguous};
    const params=masked.slice(paramStart+1,paramEnd);
    for(const binding of imports){if(binding.typeOnly)continue;
      const name=escape(binding.local);
      if(new RegExp('(?:^|[,\\s])'+name+'(?:\\s*[:=,?]|\\s*$)').test(params)){
        shadowRanges.push({start:paramStart,end,name:binding.local});continue;
      }
      if(masked[start]!=='{')continue;
      const locals=new RegExp('\\b(const|let|var|function|class)\\s+'+name+'\\b','g');
      const fragment=masked.slice(start+1,end);
      for(const local of fragment.matchAll(locals)){
        const pos=start+1+local.index,stack=[start];
        for(let k=start+1;k<pos;k++){if(masked[k]==='{')stack.push(k);else if(masked[k]==='}')stack.pop();}
        const scopeStart=local[1]==='var' ? start : stack.at(-1),scopeEnd=findEnd(scopeStart,'{','}');
        if(scopeEnd<0)return {edits:[],diagnostic:'legacy-noop-policy: ambiguous local animation binding; review the injector manually.'};
        shadowRanges.push({start:scopeStart,end:scopeEnd,name:binding.local});
      }
    }
  }
  for(const binding of imports){if(binding.typeOnly)continue;
    const re=new RegExp('\\b'+escape(binding.local)+'\\s*=>\\s*','g');
    for(const m of masked.matchAll(re)){const start=m.index+m[0].length;
      const end=masked[start]==='{' ? findEnd(start,'{','}') : (()=>{const e=/[;\n]/.exec(masked.slice(start));return e?start+e.index:masked.length;})();
      if(end>=0){const ambiguous=scopeAmbiguity(m.index-1,m.index+binding.local.length,start,end);if(ambiguous)return {edits:[],diagnostic:ambiguous};shadowRanges.push({start:m.index,end,name:binding.local});}
    }
  }
  // Method and catch parameters are distinct scopes, not function or arrow
  // declarations. When a recognized TestBed config uses a matching local,
  // refuse rather than guessing the binding or changing the test behavior.
  const methodLike=/\b(?:[A-Za-z_$][\w$]*|catch)\s*\(/g;
  for(const match of masked.matchAll(methodLike)){
    const name=match[0].slice(0,match[0].lastIndexOf('(')).trim();
    if(['if','for','while','switch','with'].includes(name) || /\bfunction\s*$/.test(masked.slice(Math.max(0,match.index-30),match.index)))continue;
    const paramStart=match.index+match[0].lastIndexOf('('),paramEnd=findEnd(paramStart,'(',')');if(paramEnd<0)continue;
    const tail=/^\s*(?::[^;{]+)?\s*\{/.exec(masked.slice(paramEnd+1));if(!tail)continue;
    bindingRanges.push({start:paramStart+1,end:paramEnd});
    const open=paramEnd+1+tail[0].lastIndexOf('{'),end=findEnd(open,'{','}');if(end<0)continue;
    supportedScopes.push({open,end});
    const ambiguous=scopeAmbiguity(paramStart,paramEnd,open,end);if(ambiguous)return {edits:[],diagnostic:ambiguous};
  }
  // A destructured property name renamed to another local is not itself a
  // binding. Exclude that key from producer-reference accounting.
  for(const match of masked.matchAll(/\b(?:const|let|var)\s*[\{\[]/g)){
    const start=match.index+match[0].length-1,end=findEnd(start,masked[start],masked[start]==='{'?'}':']');
    if(end>=0)bindingRanges.push({start,end:end+1});
  }
  // Imported names shadowed by function parameters or locals are not the
  // imported tokens. Blank only those identifiers, preserving all offsets.
  const semantic=masked.split('');
  for(const span of shadowRanges){
    const isProducer=imports.some(item=>item.local===span.name &&
      (item.module==='@angular/platform-browser/animations' ||
       (item.module==='@angular/core' && (item.exported==='ANIMATION_MODULE_TYPE' || item.exported==='*')) ||
       (item.module==='@ngx-compat/material-legacy/legacy-core' && (item.exported==='LEGACY_ANIMATION_MODE' || item.exported==='*'))));
    if(!isProducer)continue;
    const re=new RegExp('\\b'+escape(span.name)+'\\b','g');
    const fragment=masked.slice(span.start,span.end+1);
    for(const m of fragment.matchAll(re))for(let j=0;j<span.name.length;j++)semantic[span.start+m.index+j]=' ';
  }
  for(const range of bindingRanges){
    const fragment=masked.slice(range.start,range.end);
    for(const binding of relevantBindings){
      const name=escape(binding.local);
      const target=new RegExp('(?:^|[\\{\\[,])\\s*(?:\\.\\.\\.\\s*)?(?:[\\w$]+\\s*:\\s*)?('+name+')(?=\\s*[,}\\]=])','g');
      for(const match of fragment.matchAll(target)){
        const index=range.start+match.index+match[0].lastIndexOf(match[1]);
        for(let j=0;j<binding.local.length;j++)semantic[index+j]=' ';
      }
      const re=new RegExp('(?:^|[\\{,])\\s*('+name+')\\s*:\\s*([\\w$]+)','g');
      for(const match of fragment.matchAll(re)){
        if(match[2]===binding.local)continue;
        const index=range.start+match.index+match[0].indexOf(match[1]);
        for(let j=0;j<binding.local.length;j++)semantic[index+j]=' ';
      }
    }
  }
  masked=semantic.join('');
  let depth=0;const enclosingBraces=[];
  for (let i=0;i<masked.length;i++) {
    if (masked[i]==='{'){depth++;enclosingBraces.push(i);}
    else if(masked[i]==='}'){depth--;enclosingBraces.pop();}
    const testbed=testbeds.length && (i===0 || !/[\w$.]/.test(masked[i-1])) && new RegExp('^(?:'+testbeds.join('|')+')\\s*\\.\\s*configureTestingModule\\s*\\(\\s*\\{').exec(masked.slice(i));
    if(depth!==0 && !testbed)continue;
    const decorator=masked[i]==='@' && decorators.length && new RegExp('^@(?:'+decorators.join('|')+')\\s*\\(\\s*\\{').exec(masked.slice(i));
    const bootstrap=bootstraps.length && (i===0 || !/[\w$.]/.test(masked[i-1])) && new RegExp('^(?:'+bootstraps.join('|')+')\\s*\\(\\s*[\\w$]+\\s*,\\s*\\{').exec(masked.slice(i));
    const appConfig=appConfigTypes.length && (i===0 || !/[\w$.]/.test(masked[i-1])) && new RegExp('^const\\s+[\\w$]+\\s*:\\s*(?:'+appConfigTypes.join('|')+')\\s*=\\s*\\{').exec(masked.slice(i));
    if(!decorator && !bootstrap && !appConfig && !testbed)continue;
    const start=i+(decorator || bootstrap || appConfig || testbed)[0].lastIndexOf('{');
    const end=findEnd(start,'{','}');if(end<0)continue;
    if(testbed && shadowRanges.some(span=>i>=span.start&&i<=span.end && testbeds.some(ref=>ref===escape(span.name) || ref.startsWith(escape(span.name)+'\\s*\\.\\s*')))){covered.push({start,end});i=end;continue;}
    const body=masked.slice(start,end+1);
    const array = key => {
      const re=new RegExp('\\b'+key+'\\s*:\\s*\\[','g');let m,level=0,cursor=1;
      while((m=re.exec(body))){for(;cursor<m.index;cursor++){if(body[cursor]==='{'||body[cursor]==='['||body[cursor]==='(')level++;else if(body[cursor]==='}'||body[cursor]===']'||body[cursor]===')')level--;}if(level===0)break;}
      if(!m)return null;
      const begin=start+m.index+m[0].lastIndexOf('['),finish=findEnd(begin,'[',']');
      return finish>=0 && finish<=end ? {begin,finish,code:masked.slice(begin,finish+1)} : null;
    };
    const moduleImports=array('imports'),providers=array('providers');
    const items = arr => {
      if(!arr)return [];
      const result=[];let start=arr.begin+1,level=0;
      for(let j=start;j<arr.finish;j++){
        const c=masked[j];if(c==='{'||c==='['||c==='(')level++;
        else if(c==='}'||c===']'||c===')')level--;
        else if(c===','&&level===0){result.push({start,end:j,code:masked.slice(start,j).trim(),raw:source.slice(start,j).trim()});start=j+1;}
      }
      result.push({start,end:arr.finish,code:masked.slice(start,arr.finish).trim(),raw:source.slice(start,arr.finish).trim()});return result.filter(item=>item.code);
    };
    const codeItems=arr=>items(arr).map(item=>item.code);
    const opaqueLocalProducer=!moduleImports && imports.some(binding=>!binding.typeOnly &&
      binding.module==='@angular/platform-browser/animations' && word(escape(binding.local)).test(body));
    if(!bootstrap && !appConfig && !testbed && !workspace && !opaqueLocalProducer && (!moduleImports || !legacy.some(binding => binding.exported === '*'
      ? word(escape(binding.local)+'\\s*\\.\\s*[A-Za-z_$][\\w$]*').test(moduleImports.code)
      : word(escape(binding.local)).test(moduleImports.code)))){covered.push({start,end});i=end;continue;}
    const anim = m => m==='@angular/platform-browser/animations';
    const noopRefs=refs(anim,'NoopAnimationsModule');
    const browserRefs=refs(anim,'BrowserAnimationsModule');
    const noopFunctions=refs(anim,'provideNoopAnimations');
    const browserFunctions=refs(anim,'provideAnimations');
    const tokenRefs=refs(m=>m==='@angular/core','ANIMATION_MODULE_TYPE');
    const opaqueField=(!moduleImports && /\bimports\s*:/.test(body)) || (!providers && /\bproviders\s*:/.test(body));
    const knownInBody=noopRefs.some(ref=>word(ref).test(body)) || noopFunctions.some(ref=>word(ref).test(body)) ||
      browserRefs.some(ref=>new RegExp('(?:^|[^\\w$.])(?:'+ref+')\\s*\\.\\s*withConfig\\s*\\(').test(body)) ||
      tokenRefs.some(ref=>new RegExp('\\bprovide\\s*:\\s*(?:'+ref+')(?![\\w$])').test(body));
    if(testbed && knownInBody && enclosingBraces.some(open=>!supportedScopes.some(scope=>scope.open===open && i<=scope.end)))
      return {edits:[],diagnostic:'legacy-noop-policy: TestBed animation configuration is enclosed by an unsupported lexical scope; review the injector manually.'};
    if(opaqueField && knownInBody)return {edits:[],diagnostic:'legacy-noop-policy: known animation provider inside or beside a non-array imports/providers expression requires manual injector review.'};
    // Repeated top-level metadata fields can silently override an earlier
    // array. Reject rather than attributing effective order to the first one.
    const fields={imports:0,providers:0};let fieldLevel=0;
    for(let k=1;k<body.length-1;k++){
      const c=body[k];if(c==='{'||c==='['||c==='(')fieldLevel++;
      else if(c==='}'||c===']'||c===')')fieldLevel--;
      else if(fieldLevel===0 && (k===0||!/[^\W]/.test(body[k-1]))){
        const match=/^(imports|providers)\s*:/.exec(body.slice(k));
        if(match)fields[match[1]]++;
      }
    }
    if(knownInBody && (fields.imports>1 || fields.providers>1))return {edits:[],diagnostic:'legacy-noop-policy: duplicate metadata fields may override animation providers; review the injector manually.'};

    let objectLevel=0,objectSpread=false;
    for(let k=1;k<body.length-1;k++){
      const c=body[k];if(c==='{'||c==='['||c==='(')objectLevel++;
      else if(c==='}'||c===']'||c===')')objectLevel--;
      else if(objectLevel===0 && body.startsWith('...',k))objectSpread=true;
    }
    if(objectSpread && knownInBody)return {edits:[],diagnostic:'legacy-noop-policy: top-level metadata spread may override animation configuration; review the injector manually.'};
    const perOccurrence=(ref,allow) => {
      const expression=new RegExp('(?:^|[^\\w$.])(?:'+ref+')(?![\\w$])','g');
      for(const match of body.matchAll(expression)){
        const at=start+match.index+(match[0].length-match[0].trimStart().length);
        if(!allow.some(item=>at>=item.start-1 && at<=item.end))return false;
      }
      return true;
    };
    const metadataItems=items(moduleImports),providerItems=items(providers);
    for(const ref of noopRefs){
      const exact=metadataItems.filter(item=>new RegExp('^(?:'+ref+')$').test(item.code)).concat(
        providerItems.filter(item=>importProviders.some(p=>new RegExp('^(?:'+p+')\\s*\\(\\s*(?:'+ref+')\\s*\\)$').test(item.code))));
      if(!perOccurrence(ref,exact))return {edits:[],diagnostic:'legacy-noop-policy: a noop module producer is wrapped or otherwise ambiguous; review the injector manually.'};
    }
    for(const ref of noopFunctions){
      const exact=providerItems.filter(item=>new RegExp('^(?:'+ref+')\\s*\\(\\s*\\)$').test(item.code));
      if(!perOccurrence(ref,exact))return {edits:[],diagnostic:'legacy-noop-policy: a noop provider producer is wrapped or otherwise ambiguous; review the injector manually.'};
    }
    for(const ref of browserRefs){
      const exact=metadataItems.filter(item=>new RegExp('^(?:'+ref+')(?:\\s*\\.\\s*withConfig\\s*\\().*').test(item.code) || new RegExp('^(?:'+ref+')$').test(item.code)).concat(
        providerItems.filter(item=>importProviders.some(p=>new RegExp('^(?:'+p+')\\s*\\(\\s*(?:'+ref+')\\s*\\)$').test(item.code)) || new RegExp('^(?:'+ref+')\\s*\\.\\s*withConfig\\s*\\(').test(item.code)));
      if(!perOccurrence(ref,exact))return {edits:[],diagnostic:'legacy-noop-policy: a BrowserAnimationsModule producer is wrapped or otherwise ambiguous; review the injector manually.'};
    }
    for(const ref of browserFunctions){
      const exact=providerItems.filter(item=>new RegExp('^(?:'+ref+')\\s*\\(\\s*\\)$').test(item.code));
      if(!perOccurrence(ref,exact))return {edits:[],diagnostic:'legacy-noop-policy: a browser animation provider is wrapped or otherwise ambiguous; review the injector manually.'};
    }

    const importCode=moduleImports ? moduleImports.code : '';
    const fromProviders=providers && importProviders.some(ref=>new RegExp('(?:^|[^\\w$.])(?:'+ref+')\\s*\\(').test(providers.code));
    const scopeCode=importCode+(fromProviders ? providers.code : '');
    const directNoop=noopRefs.some(ref=>codeItems(moduleImports).some(entry=>new RegExp('^(?:'+ref+')$').test(entry)));
    const wrappedNoop=fromProviders && importProviders.some(provider=>noopRefs.some(ref=>codeItems(providers).some(entry=>new RegExp('^(?:'+provider+')\\s*\\(\\s*(?:'+ref+')\\s*\\)$').test(entry))));
    const hasNoopModule=directNoop || wrappedNoop;
    // Associate each config only with its own bound BrowserAnimationsModule
    // call. Support exactly one direct literal object and reject every other
    // shape: partial literal matches and values from other modules are unsafe.
    const configEntries=[];
    for(const item of [...items(moduleImports),...items(providers)]){
      for(const ref of browserRefs){
        const probe=new RegExp('(?:^|[^\\w$.])(?:'+ref+')\\s*\\.\\s*withConfig\\s*\\(','g');
        for(const match of item.code.matchAll(probe))configEntries.push({item,ref});
      }
    }
    if(configEntries.length>1)return {edits:[],diagnostic:'legacy-noop-policy: multiple BrowserAnimationsModule.withConfig calls may override each other; review effective provider order and configure LEGACY_ANIMATION_MODE manually.'};
    let browserConfigDisabled=null;
    if(configEntries.length){
      const {item,ref}=configEntries[0];
      const exact=new RegExp('^(?:'+ref+')\\s*\\.\\s*withConfig\\s*\\(\\s*\\{\\s*disableAnimations\\s*:\\s*(true|false)\\s*,?\\s*\\}\\s*\\)$').exec(item.raw);
      if(!exact)return {edits:[],diagnostic:'legacy-noop-policy: nonliteral or ambiguous BrowserAnimationsModule.withConfig requires manual provider review.'};
      browserConfigDisabled=exact[1]==='true';
    }
    const hasBrowserConfig=configEntries.length===1;
    const dynamicBrowser=browserConfigDisabled===true;
    const hasNoopProvider=providers && noopFunctions.some(ref=>codeItems(providers).some(entry=>new RegExp('^(?:'+ref+')\\s*\\(\\s*\\)$').test(entry)));
    const hasOldToken=providers && tokenRefs.some(ref=>{
      const patterns=[
        new RegExp('\\{[^{}]*\\bprovide\\s*:\\s*(?:'+ref+')(?![\\w$])[^{}]*\\buseValue\\s*:\\s*([\'"])NoopAnimations\\1[^{}]*\\}','g'),
        new RegExp('\\{[^{}]*\\buseValue\\s*:\\s*([\'"])NoopAnimations\\1[^{}]*\\bprovide\\s*:\\s*(?:'+ref+')(?![\\w$])[^{}]*\\}','g'),
      ];
      const original=source.slice(providers.begin,providers.finish+1);
      for(const pattern of patterns)for(const match of original.matchAll(pattern)) if(!flags[providers.begin+match.index])return true;
      return false;
    });
    const mentionsOldToken=providers && tokenRefs.some(ref=>new RegExp('\\bprovide\\s*:\\s*(?:'+ref+')(?![\\w$])').test(providers.code));
    const staticBrowserToken=providers && tokenRefs.some(ref=>{
      const original=source.slice(providers.begin,providers.finish+1);
      const object=new RegExp('\\{[^{}]*\\bprovide\\s*:\\s*(?:'+ref+')(?![\\w$])[^{}]*\\}','g');
      for(const match of original.matchAll(object))if(!flags[providers.begin+match.index] && /\buseValue\s*:\s*(['"])BrowserAnimations\1/.test(match[0]))return true;
      return false;
    });
    // Never infer the winner of conflicting providers or an opaque provider
    // object. In particular, a later BrowserAnimations value can override an
    // earlier NoopAnimations value (and direct NgModule providers override
    // imported module providers). Decline rather than changing that outcome.
    const oldEntries=items(providers).filter(item=>tokenRefs.some(ref=>new RegExp('\\bprovide\\s*:\\s*(?:'+ref+')(?![\\w$])').test(item.code)));
    const reasonOrder='legacy-noop-policy: conflicting or opaque animation module providers; review the effective provider order and configure LEGACY_ANIMATION_MODE in the same injector without removing Angular providers.';
    const wrappedBrowser=fromProviders && importProviders.some(provider=>browserRefs.some(ref=>codeItems(providers).some(entry=>new RegExp('^(?:'+provider+')\\s*\\(\\s*(?:'+ref+')\\s*\\)$').test(entry))));
    const browserModule=browserRefs.some(ref=>codeItems(moduleImports).some(entry=>new RegExp('^(?:'+ref+')$').test(entry))) || wrappedBrowser ||
      (hasBrowserConfig && browserConfigDisabled===false);
    const browserProvider=providers && browserFunctions.some(ref=>codeItems(providers).some(entry=>new RegExp('^(?:'+ref+')\\s*\\(\\s*\\)$').test(entry)));
    if((browserModule || browserProvider) && (hasNoopModule || hasNoopProvider || hasOldToken || dynamicBrowser))return {edits:[],diagnostic:reasonOrder};
    if(oldEntries.length>1 || (oldEntries.length && (hasNoopModule || hasNoopProvider || dynamicBrowser)))return {edits:[],diagnostic:reasonOrder};
    if(oldEntries.length){
      const exact=tokenRefs.some(ref=>{
        const p='(?:'+ref+')', value='(?:\'NoopAnimations\'|\"NoopAnimations\"|\'BrowserAnimations\'|\"BrowserAnimations\")';
        return new RegExp('^\\{\\s*(?:provide\\s*:\\s*'+p+'\\s*,\\s*useValue\\s*:\\s*'+value+'|useValue\\s*:\\s*'+value+'\\s*,\\s*provide\\s*:\\s*'+p+')\\s*,?\\s*\\}$').test(oldEntries[0].raw);
      });
      if(!exact)return {edits:[],diagnostic:reasonOrder};
    }
    if(((providers && /\.\.\./.test(providers.code)) || (moduleImports && /\.\.\./.test(moduleImports.code))) &&
      (mentionsOldToken || hasNoopModule || hasNoopProvider || dynamicBrowser))return {edits:[],diagnostic:reasonOrder};
    if(mentionsOldToken && !hasOldToken && !staticBrowserToken)return {edits:[],diagnostic:'legacy-noop-policy: the animation module token has a dynamic value; configure the owned legacy policy in the effective injector after manual review.'};
    const opaqueNoop=(providers && noopFunctions.some(ref=>word(ref).test(providers.code)) && !hasNoopProvider) ||
      (noopRefs.some(ref=>word(ref).test(scopeCode)) && !hasNoopModule);
    if(opaqueNoop)return {edits:[],diagnostic:'legacy-noop-policy: a bound noop reference is nested in an unsupported provider expression; configure LEGACY_ANIMATION_MODE in the effective injector after manual review, without removing Angular providers.'};
    if(!hasNoopModule && !dynamicBrowser && !hasNoopProvider && !hasOldToken){
      // Only the exact handled Browser-withConfig(false) call is accounted.
      // An opaque non-array imports/providers expression may still contain a
      // known producer, which the outside-scope scan must diagnose.
      if(hasBrowserConfig)covered.push({start:configEntries[0].item.start,end:configEntries[0].item.end});
      i=end;continue;
    }
    const ownedRefs=refs(m=>m==='@ngx-compat/material-legacy/legacy-core','LEGACY_ANIMATION_MODE');
    // Only a final direct literal can establish the effective value: later
    // array entries (including spreads) may override earlier providers.
    let finalStart=providers ? providers.begin+1 : 0;
    if(providers){
      let level=0;
      for(let j=providers.begin+1;j<providers.finish;j++){
        const c=masked[j];
        if(c==='{'||c==='['||c==='(')level++;
        else if(c==='}'||c===']'||c===')')level--;
        else if(c===','&&level===0 && masked.slice(j+1,providers.finish).trim())finalStart=j+1;
      }
    }
    const last=providers && source.slice(finalStart,providers.finish).trim().replace(/,\s*$/, '');
    const owned=providers && ownedRefs.some(ref=>{
      const pattern=new RegExp('^\\{\\s*provide\\s*:\\s*(?:'+ref+')\\s*,\\s*useValue\\s*:\\s*([\'"])NoopAnimations\\1\\s*,?\\s*\\}$');
      return pattern.test(last);
    });
    if(!owned){
      const reason='legacy-noop-policy: ambiguous animation configuration; add {provide: LEGACY_ANIMATION_MODE, useValue: \'NoopAnimations\'} in the same injector after reviewing its scope; retain Angular animation providers needed by the application.';
      if(!providers && /\bproviders\s*:/.test(body))return {edits:[],diagnostic:reason};
      if(providers && ownedRefs.some(ref=>word(ref).test(providers.code)))return {edits:[],diagnostic:reason};
      if(providers && /\.\.\./.test(providers.code))return {edits:[],diagnostic:reason};
      const found=imports.find(i=>i.module==='@ngx-compat/material-legacy/legacy-core' && i.exported==='LEGACY_ANIMATION_MODE');
      const namespace=imports.find(i=>i.module==='@ngx-compat/material-legacy/legacy-core' && i.exported==='*');
      let name=found ? found.local : namespace ? namespace.local+'.LEGACY_ANIMATION_MODE' : 'LEGACY_ANIMATION_MODE';
      if(!found && !namespace){
        if(/\bLEGACY_ANIMATION_MODE\b/.test(masked))return {edits:[],diagnostic:reason};
        insertImport=true;
      }
      const provider='{provide: '+name+", useValue: 'NoopAnimations'}";
      if(providers){
        const prior=masked.slice(providers.begin+1,providers.finish).trim();
        const separator=prior && !prior.endsWith(',') ? ', ' : prior ? ' ' : '';
        edits.push({start:providers.finish,end:providers.finish,value:separator+provider});
      }else edits.push({start:start+1,end:start+1,value:'providers: ['+provider+'], '});
    }
    covered.push({start,end});
    i=end;
  }
  const accounted=(pos,ref) => importRanges.some(span=>pos>=span.start&&pos<=span.end) || covered.some(span=>pos>=span.start&&pos<=span.end) ||
    shadowRanges.some(span=>pos+1>=span.start&&pos<=span.end &&
      (ref===escape(span.name) || ref.startsWith(escape(span.name)+'\\s*\\.\\s*')));
  const propertyKey=match=>['{',','].includes(masked.slice(0,match.index+1).trimEnd().at(-1)) && /^\s*:/.test(masked.slice(match.index+match[0].length));
  const moduleRefs=refs(m=>m==='@angular/platform-browser/animations','NoopAnimationsModule');
  const noopCalls=refs(m=>m==='@angular/platform-browser/animations','provideNoopAnimations');
  for(const ref of moduleRefs){
    const expression=new RegExp('(?:^|[^\\w$.])(?:'+ref+')(?![\\w$])','g');
    for(const m of masked.matchAll(expression))if(!propertyKey(m) && !accounted(m.index,ref))return {edits:[],diagnostic:'legacy-noop-policy: a bound NoopAnimationsModule reference occurs in an unrecognized configuration; configure LEGACY_ANIMATION_MODE in the effective injector after manual review.'};
  }
  for(const ref of noopCalls){
    const expression=new RegExp('(?:^|[^\\w$.])(?:'+ref+')(?![\\w$])','g');
    for(const m of masked.matchAll(expression))if(!propertyKey(m) && !accounted(m.index,ref))return {edits:[],diagnostic:'legacy-noop-policy: a bound provideNoopAnimations reference occurs in an unrecognized configuration; configure LEGACY_ANIMATION_MODE in the effective injector after manual review.'};
  }
  for(const testbed of testbeds){
    for(const old of refs(m=>m==='@angular/core','ANIMATION_MODULE_TYPE')){
      const expression=new RegExp('(?:^|[^\\w$.])(?:'+testbed+')\\s*\\.\\s*overrideProvider\\s*\\(\\s*(?:'+old+')(?![\\w$])','g');
      for(const m of masked.matchAll(expression))if(!accounted(m.index,testbed))return {edits:[],diagnostic:'legacy-noop-policy: TestBed.overrideProvider changes the animation module hint; review override timing and configure LEGACY_ANIMATION_MODE explicitly.'};
    }
  }
  for(const ref of refs(m=>m==='@angular/platform-browser/animations','BrowserAnimationsModule')){
    const expression=new RegExp('(?:^|[^\\w$.])(?:'+ref+')\\s*\\.\\s*withConfig\\s*\\(','g');
    for(const m of masked.matchAll(expression))if(!accounted(m.index,ref))return {edits:[],diagnostic:'legacy-noop-policy: an unrecognized BrowserAnimationsModule.withConfig call requires manual provider review.'};
  }
  const oldRefs=refs(m=>m==='@angular/core','ANIMATION_MODULE_TYPE');
  for(const ref of oldRefs){
    const override=new RegExp('\\.\\s*overrideProvider\\s*\\(\\s*(?:'+ref+')(?![\\w$])','g');
    for(const m of masked.matchAll(override))if(!accounted(m.index,ref))return {edits:[],diagnostic:'legacy-noop-policy: an overrideProvider call changes the animation module hint; review override timing and configure LEGACY_ANIMATION_MODE explicitly.'};
  }
  for(const ref of oldRefs){
    const aliases=new RegExp('\\b(?:const|let|var)\\s+([\\w$]+)\\s*=\\s*(?:'+ref+')(?![\\w$])','g');
    for(const m of masked.matchAll(aliases)){
      const usage=new RegExp('\\bprovide\\s*:\\s*'+escape(m[1])+'(?![\\w$])');
      if(usage.test(masked))return {edits:[],diagnostic:'legacy-noop-policy: an aliased animation-mode provider requires manual injector review.'};
    }
    const expression=new RegExp('\\{[^{}]*\\bprovide\\s*:\\s*(?:'+ref+')(?![\\w$])[^{}]*\\}','g');
    for(const m of masked.matchAll(expression)){
      if(accounted(m.index,ref))continue;
      const raw=source.slice(m.index,m.index+m[0].length);
      const browser=/\buseValue\s*:\s*(['"])BrowserAnimations\1/.test(raw) && !/\b(?:multi|useFactory|useExisting)\s*:/.test(m[0]);
      if(!browser)return {edits:[],diagnostic:'legacy-noop-policy: an old animation-mode provider occurs in an unrecognized configuration; review the effective injector and configure LEGACY_ANIMATION_MODE.'};
    }
  }
  if(insertImport){const start=source.startsWith('#!') ? source.indexOf('\n')+1 : source.startsWith('\ufeff') ? 1 : 0;edits.push({start,end:start,value:"import {LEGACY_ANIMATION_MODE} from '@ngx-compat/material-legacy/legacy-core';\n"});}
  return {edits};
}

/**
 * @param {string} content
 * @param {RewriteOptions} [options]
 * @returns {RewriteResult}
 */
function rewriteLegacyTypescriptImports(content, options) {
  const opts = normalizeOptions(options);
  const diagnostics = [];
  /** @type {string[]} */
  const acknowledgements = [];
  const flags = nonCodeFlags(content);
  const masked = maskNonCode(content);
  const found = collectLegacyImports(content, flags);
  const noopPlan = scopedLegacyNoopPlan(content, masked, flags, Boolean(options && options.legacyAnimationWorkspace));
  if (noopPlan.diagnostic) diagnostics.push(noopPlan.diagnostic);

  if (/import\s*\(\s*(['"])@angular\/material\/\1\s*\+/.test(masked)) {
    diagnostics.push('computed-import: dynamic import uses concatenation; refusing rewrite.');
  }

  for (const item of found) {
    const kind = classifyLegacySpecifier(item.spec);
    if (kind === 'private') {
      diagnostics.push(
        'private-typescript: import of `@angular/material/legacy-*/private` is unsupported; refusing rewrite.',
      );
    } else if (kind === 'unknown') {
      diagnostics.push(
        `unknown-entry: \`${item.spec}\` is not a historical legacy entry point; refusing rewrite.`,
      );
    } else if (kind === 'deep') {
      diagnostics.push(
        `unsupported-path: \`${item.spec}\` is not a supported legacy or /testing path; refusing rewrite.`,
      );
    } else if (item.clause && RECIPE_NAME.test(item.clause)) {
      diagnostics.push(
        `engine-recipe: \`${item.spec}\` imports a removed animation recipe; refusing rewrite. ` +
          'Use the native motion API instead of /animations metadata.',
      );
    } else if (
      item.clause &&
      /^\s*\*\s+as\s+[A-Za-z_$][\w$]*\s*$/.test(item.clause) &&
      RECIPE_NAME.test(masked)
    ) {
      diagnostics.push(
        'namespace-recipe: namespace import references removed animation recipes; provide a binding-aware migration example instead of guessing.',
      );
    }
  }

  if (diagnostics.length) {
    return {ok: false, content, diagnostics, changed: false, acknowledgements};
  }

  if (hasOrdinaryMaterialModuleSpecifiers(content)) {
    if (!opts.acknowledgeCurrentComponents) {
      diagnostics.push(
        'current-component: ordinary `@angular/material/...` (non-legacy) imports present; ' +
          'require --acknowledge-current-components (schematic: acknowledgeCurrentComponents) ' +
          'before readiness. No rewrite of ordinary imports.',
      );
      return {ok: false, content, diagnostics, changed: false, acknowledgements};
    }
    acknowledgements.push('current-components');
    diagnostics.push(
      'current-component-acknowledged: ordinary Material imports left unchanged; ' +
        'recorded acknowledgement that current-component drift is accepted for readiness (not visual approval).',
    );
  }

  let next = content;
  let changed = false;
  const rewrites = found.filter(item => classifyLegacySpecifier(item.spec) === 'rewrite')
    .map(item => ({start:item.specStart,end:item.specEnd,value:TO_PREFIX+item.spec.slice(FROM_PREFIX.length)}))
    .concat(noopPlan.edits).sort((a,b)=>b.start-a.start);
  for (const item of rewrites) {
    next = next.slice(0,item.start) + item.value + next.slice(item.end);
    changed = true;
  }

  return {ok: true, content: next, diagnostics, changed, acknowledgements};
}

/**
 * @param {{before: string, expected_after: string|null, outcome: string, id: string, options?: RewriteOptions, expect_ok?: boolean, expect_acknowledgements?: string[]}} testCase
 */
function applyFixtureCase(testCase) {
  const result = rewriteLegacyTypescriptImports(testCase.before, testCase.options);
  if (testCase.expected_after == null) {
    const pass = result.changed === false;
    let detail = pass
      ? `unchanged as required (${testCase.outcome})`
      : 'expected no edit but content changed';
    if (pass && testCase.expect_ok === false && result.ok !== false) {
      return {
        pass: false,
        detail: `expected ok:false (blocking/ack-required) but ok=${result.ok}`,
        result,
      };
    }
    if (
      pass &&
      Array.isArray(testCase.expect_acknowledgements) &&
      JSON.stringify(result.acknowledgements || []) !==
        JSON.stringify(testCase.expect_acknowledgements)
    ) {
      return {
        pass: false,
        detail: `acknowledgements mismatch: ${JSON.stringify(result.acknowledgements)}`,
        result,
      };
    }
    return {pass, detail, result};
  }
  const pass = result.ok && result.changed && result.content === testCase.expected_after;
  let detail = pass
    ? 'safe edit matched expected_after'
    : `mismatch: ok=${result.ok} changed=${result.changed} diagnostics=${JSON.stringify(result.diagnostics)}`;
  if (
    pass &&
    Array.isArray(testCase.expect_acknowledgements) &&
    JSON.stringify(result.acknowledgements || []) !==
      JSON.stringify(testCase.expect_acknowledgements)
  ) {
    return {
      pass: false,
      detail: `acknowledgements mismatch: ${JSON.stringify(result.acknowledgements)}`,
      result,
    };
  }
  return {pass, detail, result};
}

module.exports = {
  hasLegacyMigrationTarget,
  FROM_PREFIX,
  TO_PREFIX,
  normalizeOptions,
  hasOrdinaryMaterialModuleSpecifiers,
  rewriteLegacyTypescriptImports,
  applyFixtureCase,
};
