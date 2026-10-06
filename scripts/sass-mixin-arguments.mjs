/** Compare every configurable historical mixin with custom theme/config arguments. */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SILENCE,THEME_PARAMS} from './sass-api-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const MIXIN_ARGUMENT_CATALOG='fixtures/sass/mixin-argument-contracts.json';
export function mixinArgumentCatalog() {
  const raw=readFileSync(join(root,MIXIN_ARGUMENT_CATALOG));const catalog=JSON.parse(raw);
  const oracle=JSON.parse(readFileSync(join(root,'compatibility/rc/oracles/material-16.2.14-sass-api.json')));
  const names=Object.entries(oracle.members.mixins).filter(([,entry])=>{
    const required=entry.params.filter(p=>p.default===null);
    return required.length>0 ? required.every(p=>THEME_PARAMS.includes(p.name))
      : entry.params.length===1 && THEME_PARAMS.includes(entry.params[0].name);
  }).map(([name])=>name).sort();
  const expected=[];
  for(const name of names) {
    const model=name.includes('legacy')?'legacy':'modern';const suffix=name.split('-').at(-1);
    let argument,variant;
    if(['color','colors'].includes(suffix)) {argument='m.get-color-config($'+model+'-light)';variant='raw-color-config';}
    else if(['typography','typographies','hierarchy'].includes(suffix)) {argument='$'+model;variant='raw-typography-config';}
    else if(['density','densities'].includes(suffix)) {argument='-2';variant='raw-density-config';}
    else if(['theme','themes'].includes(suffix)) {argument='$'+model+'-dark';variant='custom-dark-theme';}
    else throw new Error('unclassified configurable mixin '+name);
    for(const [mode,value] of [['custom-full-theme','$'+model+'-light'],[variant,argument]])
      expected.push({case_id:'mixin-argument/'+name+'/'+mode,mixin:name,variant:mode,argument:value,call:'.sass-argument-probe { @include m.'+name+'('+value+'); }'});
  }
  if(catalog.schema_version!==1 || names.length!==249 || typeof catalog.setup!=='string'
    || JSON.stringify(catalog.cases)!==JSON.stringify(expected)) throw new Error('configurable mixin argument roster is incomplete or changed');
  return {...catalog,sha256:sha(raw)};
}
export const mixinArgumentCaseIds=()=>mixinArgumentCatalog().cases.map(p=>p.case_id);
export function mixinArgumentProgram(catalog,probe) {return "@use '__entry__' as m;\n"+catalog.setup+'\n'+probe.call+'\n';}
export function measureMixinArgument(sass,entry,loadPaths,catalog,probe,allowedRoots,importers=[]) {
  const program=mixinArgumentProgram(catalog,probe);
  const measured=sass.compileString(program.replace("'__entry__'", "'"+pathToFileURL(entry).href+"'"),{
    loadPaths,importers,style:'expanded',silenceDeprecations:SILENCE,logger:{warn(){},debug(){}}});
  if(typeof measured.css!=='string')throw new Error('mixin probe returned no CSS');
  const sources=measured.loadedUrls.filter(url=>url.protocol==='file:').map(url=>{
    const path=realpathSync(fileURLToPath(url));
    const base=allowedRoots.find(base=>{const rel=relative(base,path);return rel==='' || (rel!=='..' && !rel.startsWith('../') && !isAbsolute(rel));});
    if(!base)throw new Error('mixin argument source outside authenticated roots: '+path);
    const bytes=readFileSync(path);return {root:allowedRoots.indexOf(base),path:relative(base,path).replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length};
  }).sort((a,b)=>a.root-b.root || a.path.localeCompare(b.path));
  return {css:measured.css,css_sha256:sha(measured.css),css_bytes:Buffer.byteLength(measured.css),program_sha256:sha(program),sources};
}
export function mixinArgumentResultsMatch(expected,actual) {
  return typeof expected?.css==='string' && typeof actual?.css==='string'
    && expected.css===actual.css && expected.css_sha256===sha(expected.css) && actual.css_sha256===sha(actual.css)
    && expected.css_bytes===Buffer.byteLength(expected.css) && actual.css_bytes===Buffer.byteLength(actual.css);
}
export function runMixinArgumentContracts({sass,entry,loadPaths,allowedRoots,importers=[],line,referenceEntry,referenceRoot,identity}) {
  const catalog=mixinArgumentCatalog();
  const provenance={...identity,catalog:MIXIN_ARGUMENT_CATALOG,catalog_sha256:catalog.sha256};
  const results=catalog.cases.map(probe=>{
    let expected,actual,error;
    try {
      expected=measureMixinArgument(sass,referenceEntry,[referenceRoot],catalog,probe,[referenceRoot]);
      actual=measureMixinArgument(sass,entry,loadPaths,catalog,probe,allowedRoots,importers);
    }catch(caught){error=String(caught.message || caught);}
    const wrongCss=(actual?.css || '')+'\n.wrong-nonempty-mixin { color: red; }\n';
    const mutation={css:wrongCss,css_sha256:sha(wrongCss),css_bytes:Buffer.byteLength(wrongCss)};
    const mutation_rejected=Boolean(expected && actual && !mixinArgumentResultsMatch(expected,mutation));
    return {...probe,line,expected,actual,error:error??null,identity:provenance,mutation,mutation_rejected,
      result:!error && mixinArgumentResultsMatch(expected,actual) && mutation_rejected?'pass':'fail'};
  });
  return {results,identity:provenance,ok:results.length===498 && results.every(r=>r.result==='pass')};
}
