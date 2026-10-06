import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';

// verify-lite imports the checker before node_modules exists. Load Angular
// only when a packed factory is actually executed.

const modules = new Map();

function labelOf(token) {
  if (token == null) return 'null';
  if (typeof token === 'function') return token.name || 'anonymous';
  const text = String(token);
  return text.replace(/^InjectionToken /, '');
}

async function loadModule(packageRoot, family, kind) {
  const key = `${family}/${kind}`;
  if (modules.has(key)) return modules.get(key);
  const name = kind === 'primary'
    ? `ngx-compat-material-legacy-${family}.mjs`
    : `ngx-compat-material-legacy-${family}-testing.mjs`;
  const file = join(packageRoot, 'fesm2022', name);
  if (!existsSync(file)) {
    modules.set(key, null);
    return null;
  }
  const loaded = await import(pathToFileURL(file).href);
  modules.set(key, loaded);
  return loaded;
}

function runFactory(factory, Injector, runInInjectionContext) {
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
  try {
    runInInjectionContext(injector, () => factory());
  } catch {
    // Constructor bodies run after every parameter inject.
  } finally {
    proto.get = original;
  }
  return requests;
}

export async function observeRuntimeDi(packageRoot, symbols, differences = []) {
  const {Injector, runInInjectionContext} = await import('@angular/core');
  await import('@angular/compiler');
  const results = [];
  for (const symbol of symbols) {
    if (!symbol.di_id) continue;
    const loaded = await loadModule(packageRoot, symbol.family, symbol.kind);
    const problems = [];
    if (!loaded || !loaded[symbol.name]) {
      problems.push(`missing runtime export ${symbol.symbol_id}`);
      results.push({symbol, problems, observed: []});
      continue;
    }
    const value = loaded[symbol.name];
    if (symbol.shape.token) {
      const text = String(value);
      if (!text.startsWith('InjectionToken')) problems.push(`not an InjectionToken ${symbol.symbol_id}`);
      const description = symbol.shape.tokenDescription || '';
      const expected = description.replace(/^['"]|['"]$/g, '');
      if (expected && !text.includes(expected)) problems.push(`token description ${text} != ${expected}`);
      results.push({symbol, problems, observed: [text]});
      continue;
    }
    if (typeof value.ɵfac !== 'function') {
      problems.push(`missing factory ${symbol.symbol_id}`);
      results.push({symbol, problems, observed: []});
      continue;
    }
    const observed = runFactory(value.ɵfac, Injector, runInInjectionContext);
    const expected = symbol.shape.diParams || [];
    if (observed.length !== expected.length) {
      problems.push(`token count ${symbol.symbol_id} expected ${expected.length} observed ${observed.length} [${observed.map(item => item.label).join(', ')}]`);
    } else {
      for (let index = 0; index < expected.length; index += 1) {
        const param = expected[index];
        const got = observed[index];
        let same = got.label === param.imported || got.label === param.ident || (got.token && got.token.name === param.imported);
        if (!same && param.spec && !param.spec.startsWith('.')) {
          try {
            const imported = await import(param.spec);
            same = imported[param.imported] === got.token;
          } catch {
            same = false;
          }
        }
        if (!same && param.ident) same = loaded[param.ident] === got.token;
        if (!same) problems.push(`token ${symbol.symbol_id}[${index}] expected ${param.ident} observed ${got.label}`);
        if (Boolean(param.optional) !== Boolean(got.optional)) {
          problems.push(`optional ${symbol.symbol_id}[${index}] expected ${Boolean(param.optional)} observed ${Boolean(got.optional)}`);
        }
      }
    }
    results.push({symbol, problems, observed: observed.map(item => `${item.label}${item.optional ? '?' : ''}`)});
  }
  return results;
}

export function formatDi(paramsOrLabels) {
  return paramsOrLabels.join('|');
}
