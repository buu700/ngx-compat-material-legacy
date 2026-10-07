import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';

// verify-lite imports the checker before node_modules exists. Load Angular
// only when a packed factory is actually executed.

const modules = new Map();

function labelOf(token) {
  if (token == null) return 'null';
  if (typeof token === 'function') return token.name || 'anonymous';
  const text = String(token);
  return text.replace(/^InjectionToken /, '');
}

export async function loadRuntimeModule(packageRoot, family, kind) {
  const name = kind === 'primary'
    ? `ngx-compat-material-legacy-${family}.mjs`
    : `ngx-compat-material-legacy-${family}-testing.mjs`;
  const file = resolve(packageRoot, 'fesm2022', name);
  const key = pathToFileURL(file).href;
  if (modules.has(key)) return modules.get(key);
  if (!existsSync(file)) return null;
  const loaded = await import(key);
  modules.set(key, loaded);
  return loaded;
}

export function runFactory(factory, Injector, runInInjectionContext) {
  const requests = [];
  const injector = Injector.create({providers: []});
  const proto = Object.getPrototypeOf(injector);
  const original = proto.get;
  proto.get = function patched(token, notFound, flags) {
    const optional = typeof flags === 'number' ? (flags & 8) === 8 : Boolean(flags && flags.optional);
    requests.push({token, label: labelOf(token), optional});
    try {
      return original.call(this, token, notFound, flags);
    } catch {
      return {stub: labelOf(token)};
    }
  };
  let outcome = 'returned';
  let error = null;
  try {
    runInInjectionContext(injector, () => factory());
  } catch (caught) {
    outcome = 'threw';
    error = String(caught?.message || caught);
  } finally {
    proto.get = original;
  }
  return {requests, outcome, error};
}

export function expectedFactoryDi(shape, context = {}) {
  const original = shape.originalFactory;
  if (original?.family === 'core' && original.name === 'MatCommonModule') {
    // Untouched core.mjs also injects Platform inside the dev-mode constructor
    // body. Factory declaration deps describe its three parameters, not that
    // fourth contextual request. This adds an authentic requirement, no waiver.
    if (original.source_sha256 !== '38b761eb8e9b43297942f6e1412469437bc3ee0291342a766b001f715061d175'
        || original.deps_kind !== 'dependencies') throw new Error('unrecognized authentic common-module body');
    if (typeof context.devMode !== 'boolean') throw new Error('missing common-module dev-mode context');
    const direct = (shape.diParams || []).filter(param => !param.attribute);
    return context.devMode ? [...direct, {ident:'Platform',imported:'Platform',spec:'@angular/cdk/platform',optional:true}] : direct;
  }
  const inherited = shape.originalFactory?.inherited_factory;
  if (!inherited) return (shape.diParams || []).filter(param => !param.attribute);
  // These are the three authenticated original CDK table constructors, not
  // guessed zero-dependency Material factories whose deps:null delegates upward.
  const expected = 'deps: [{ token: i0.TemplateRef }, { token: i0.IterableDiffers }, { token: CDK_TABLE, optional: true }]';
  if (inherited.family !== 'table' || !['CdkHeaderRowDef','CdkFooterRowDef','CdkRowDef'].includes(inherited.name) || !inherited.declaration.includes(expected)) throw new Error('unrecognized authentic table DI declaration');
  return [
    {ident:'TemplateRef',imported:'TemplateRef',spec:'@angular/core',optional:false},
    {ident:'IterableDiffers',imported:'IterableDiffers',spec:'@angular/core',optional:false},
    {ident:'CDK_TABLE',imported:'CDK_TABLE',spec:'@angular/cdk/table',optional:true},
  ];
}

// Historical constructors name the original token; the finite public export map
// exposes its independently owned legacy identity. Never match these by description.
const ownedTokenExports = {
  'legacy-core': {MATERIAL_SANITY_CHECKS: 'MATERIAL_LEGACY_SANITY_CHECKS'},
  'legacy-form-field': {
    MAT_FORM_FIELD: 'MAT_LEGACY_FORM_FIELD', MAT_ERROR: 'MAT_LEGACY_ERROR',
    MAT_PREFIX: 'MAT_LEGACY_PREFIX', MAT_SUFFIX: 'MAT_LEGACY_SUFFIX',
  },
  'legacy-progress-bar': {
    MAT_PROGRESS_BAR_LOCATION: 'MAT_LEGACY_PROGRESS_BAR_LOCATION',
    MAT_PROGRESS_BAR_DEFAULT_OPTIONS: 'MAT_LEGACY_PROGRESS_BAR_DEFAULT_OPTIONS',
  },
};

export function ownedTokenIdentity(family, param, loaded, observedToken) {
  const exported = ownedTokenExports[family]?.[param.ident];
  if (!exported) return null;
  return Object.hasOwn(loaded, exported) && loaded[exported] === observedToken;
}

// Alias identities come from the original barrels/source before loading the
// candidate. Do not infer an owned alias from a candidate's spelling or label.
export function originalRuntimeAliases(symbols, family) {
  const aliases = Object.create(null);
  for (const symbol of symbols) {
    if (symbol.family !== family) continue;
    const original = symbol.shape?.tokenName || symbol.shape?.runtimeName;
    if (!original) continue;
    (aliases[original] ||= []).push(symbol.name);
  }
  return Object.fromEntries(Object.entries(aliases).map(([name,exports])=>[name,[...new Set(exports)]]));
}

export async function runtimeTokenIdentity(family, param, loaded, aliases, observedToken, importModule = spec => import(spec)) {
  const finite = ownedTokenIdentity(family, param, loaded, observedToken);
  if (finite !== null) return finite;
  const originalAliases = name => Object.hasOwn(aliases, name) && Array.isArray(aliases[name]) ? aliases[name] : [];
  const exported = [...new Set([...originalAliases(param.ident),...originalAliases(param.imported)])];
  if (exported.length) {
    // Original aliases of one class/token must still resolve to one object.
    if (exported.some(name=>!Object.hasOwn(loaded,name) || loaded[name] == null)) return false;
    const originals = new Set(exported.map(name=>loaded[name]));
    return originals.size === 1 && originals.has(observedToken);
  }
  if (param.spec && !param.spec.startsWith('.')) {
    try {
      const module = await importModule(param.spec);
      return Boolean(param.imported && Object.hasOwn(module,param.imported)
        && module[param.imported] != null && module[param.imported] === observedToken);
    } catch { return false; }
  }
  const keys=[...new Set([param.ident,param.imported].filter(Boolean))];
  const objects=keys.filter(name=>Object.hasOwn(loaded,name)&&loaded[name]!=null).map(name=>loaded[name]);
  return objects.length > 0 && objects.every(value=>value === observedToken);
}

export function injectionTokenMatches(value, InjectionToken, expectedDescription) {
  return value instanceof InjectionToken && String(value) === `InjectionToken ${expectedDescription}`;
}

export async function observeRuntimeDi(packageRoot, symbols, differences = []) {
  const {Injector, InjectionToken, runInInjectionContext, isDevMode} = await import('@angular/core');
  await import('@angular/compiler');
  const results = [];
  for (const symbol of symbols) {
    if (!symbol.di_id) continue;
    const loaded = await loadRuntimeModule(packageRoot, symbol.family, symbol.kind);
    const problems = [];
    if (!loaded || !loaded[symbol.name]) {
      problems.push(`missing runtime export ${symbol.symbol_id}`);
      results.push({symbol, problems, observed: []});
      continue;
    }
    const value = loaded[symbol.name];
    if (symbol.shape.token) {
      const text = String(value);
      if (!(value instanceof InjectionToken)) problems.push(`not an InjectionToken ${symbol.symbol_id}`);
      const description = symbol.shape.tokenDescription || '';
      const expected = description.replace(/^['"]|['"]$/g, '');
      if (expected && !injectionTokenMatches(value, InjectionToken, expected)) problems.push(`token identity/description ${text} != InjectionToken ${expected}`);
      results.push({symbol, problems, observed: [text]});
      continue;
    }
    if (typeof value.ɵfac !== 'function') {
      problems.push(`missing factory ${symbol.symbol_id}`);
      results.push({symbol, problems, observed: []});
      continue;
    }
    const factory = runFactory(value.ɵfac, Injector, runInInjectionContext);
    const observed = factory.requests;
    const invalidReference = symbol.shape.originalFactory?.deps_kind === 'invalid';
    const runtime_context = {devMode: isDevMode()};
    const expected = invalidReference ? [] : expectedFactoryDi(symbol.shape, runtime_context);
    if (invalidReference && !(factory.outcome === 'threw' && /constructor was not compatible with Dependency Injection/.test(factory.error || ''))) {
      problems.push(`factory ${symbol.symbol_id} did not preserve the original non-injectable factory contract`);
    }
    if (observed.length !== expected.length) {
      problems.push(`token count ${symbol.symbol_id} expected ${expected.length} observed ${observed.length} [${observed.map(item => item.label).join(', ')}]`);
    } else {
      for (let index = 0; index < expected.length; index += 1) {
        const param = expected[index];
        const got = observed[index];
        const primary = symbol.kind === 'primary' ? loaded : await loadRuntimeModule(packageRoot, symbol.family, 'primary');
        const exports = {...(primary || {}),...loaded};
        const same = await runtimeTokenIdentity(symbol.family, param, exports,
          originalRuntimeAliases(symbols, symbol.family), got.token);
        if (!same) problems.push(`token ${symbol.symbol_id}[${index}] expected ${param.ident} observed ${got.label}`);
        if (Boolean(param.optional) !== Boolean(got.optional)) {
          problems.push(`optional ${symbol.symbol_id}[${index}] expected ${Boolean(param.optional)} observed ${Boolean(got.optional)}`);
        }
      }
    }
    results.push({symbol, problems, runtime_context, factory_outcome:factory.outcome, factory_error:factory.error, original_factory_kind:symbol.shape.originalFactory?.deps_kind ?? null, original_inherited_factory:symbol.shape.originalFactory?.inherited_factory?.name ?? null, constructor_attributes:(symbol.shape.diParams || []).filter(param=>param.attribute).map(param=>param.attribute), observed: observed.map(item => `${item.label}${item.optional ? '?' : ''}`)});
  }
  return results;
}

export function formatDi(paramsOrLabels) {
  return paramsOrLabels.join('|');
}
