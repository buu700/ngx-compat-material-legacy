/** Compare every configurable historical mixin with custom theme/config arguments. */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SILENCE,THEME_PARAMS} from './sass-api-inventory.mjs';
import {measureSortPeer,sortCompanionResultsMatch,SORT_COMPANION_CASES} from './sass-sort-companion-contract.mjs';
import {measureTreePeer,treeCompanionResultsMatch,TREE_COMPANION_CASES} from './sass-tree-companion-contract.mjs';
import {measureCompanionAdditionPeer,companionAdditionResultsMatch,COMPANION_ADDITION_CASES} from './sass-companion-addition-contract.mjs';
import {measureProgressColorPeer,progressColorAliasResultsMatch,PROGRESS_COLOR_ALIAS_CASES} from './sass-progress-color-alias-contract.mjs';
import {measureBadgeShapePeer,badgeShapeResultsMatch,BADGE_SHAPE_CASES} from './sass-badge-shape-contract.mjs';
import {measureDatepickerControlsPeer,datepickerControlsResultsMatch,DATEPICKER_CONTROLS_CASES} from './sass-datepicker-controls-contract.mjs';
import {measureAggregateDensityPeers,aggregateDensityResultsMatch,AGGREGATE_DENSITY_CASES} from './sass-aggregate-density-contract.mjs';
import {measureAggregateTypographyPeer,aggregateTypographyResultsMatch,AGGREGATE_TYPOGRAPHY_CASES} from './sass-aggregate-typography-contract.mjs';
import {measureAggregateColorThemePeer,aggregateColorThemeResultsMatch,AGGREGATE_COLOR_THEME_CASES} from './sass-aggregate-color-theme-contract.mjs';
import {FORM_FIELD_STATE_ARGUMENT_CASES,FORM_FIELD_STATE_CONTRACT,measureFormFieldStatePeer,formFieldStateArgumentResultsMatch} from './sass-form-field-state-contract.mjs';
import {RIPPLE_COLOR_ARGUMENT_CASES,RIPPLE_COLOR_BINDING_CASES,RIPPLE_COLOR_CONTRACT,measureRippleColorPeer,rippleColorArgumentResultsMatch} from './sass-ripple-color-contract.mjs';
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
// Diagnostic only: preserve complete CSS comparisons and report a bounded first mismatch.
export function firstMixinCssDifference(expected,actual) {
  if(typeof expected?.css!=='string' || typeof actual?.css!=='string' || expected.css===actual.css)return null;
  const a=expected.css,b=actual.css;let offset=0;
  while(offset<Math.min(a.length,b.length) && a[offset]===b[offset])offset++;
  const start=Math.max(0,offset-80),end=offset+240;
  return {utf16_offset:offset,reference_line:a.slice(0,offset).split('\n').length,
    expected_excerpt:a.slice(start,end),actual_excerpt:b.slice(start,end),
    expected_utf16_length:a.length,actual_utf16_length:b.length};
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
    let expected,actual,error,current_companion,current_peer_alias;
    try {
      expected=measureMixinArgument(sass,referenceEntry,[referenceRoot],catalog,probe,[referenceRoot]);
      actual=measureMixinArgument(sass,entry,loadPaths,catalog,probe,allowedRoots,importers);
      if(Object.hasOwn(RIPPLE_COLOR_BINDING_CASES,probe.case_id))actual={...actual,line,sass_version:sass.info};
      if (Object.hasOwn(RIPPLE_COLOR_ARGUMENT_CASES,probe.case_id)) {
        const peer=measureRippleColorPeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:RIPPLE_COLOR_CONTRACT,peer};
      } else if (Object.hasOwn(FORM_FIELD_STATE_ARGUMENT_CASES,probe.case_id)) {
        const peer=measureFormFieldStatePeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:FORM_FIELD_STATE_CONTRACT,peer};
      } else if (Object.hasOwn(SORT_COMPANION_CASES,probe.case_id)) {
        const peer=measureSortPeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:'current-sort-color-with-original-fallback',peer};
      } else if (Object.hasOwn(TREE_COMPANION_CASES,probe.case_id)) {
        const peer=measureTreePeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:'current-tree-dimensions-with-original-fallbacks',peer};
      } else if (Object.hasOwn(COMPANION_ADDITION_CASES,probe.case_id)) {
        const peer=measureCompanionAdditionPeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:'original-css-with-current-companion-addition',peer};
      } else if (Object.hasOwn(PROGRESS_COLOR_ALIAS_CASES,probe.case_id)) {
        const peer=measureProgressColorPeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_peer_alias={classification:'conforming-current-infrastructure',contract:'historical-progress-css-with-public-color-aliases',peer};
      } else if (Object.hasOwn(BADGE_SHAPE_CASES,probe.case_id)) {
        const peer=measureBadgeShapePeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:'historical-badge-shape-with-current-tokens',peer};
      } else if (Object.hasOwn(AGGREGATE_COLOR_THEME_CASES,probe.case_id)) {
        const peer=measureAggregateColorThemePeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:'historical-color-theme-aggregate-with-qualified-members',peer};
      } else if (Object.hasOwn(AGGREGATE_TYPOGRAPHY_CASES,probe.case_id)) {
        const peer=measureAggregateTypographyPeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:'historical-typography-aggregate-with-qualified-members',peer};
      } else if (Object.hasOwn(AGGREGATE_DENSITY_CASES,probe.case_id)) {
        const peers=measureAggregateDensityPeers({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:'historical-density-aggregate-with-qualified-tail',peers};
      } else if (Object.hasOwn(DATEPICKER_CONTROLS_CASES,probe.case_id)) {
        const peer=measureDatepickerControlsPeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
        current_companion={classification:'conforming-current-companion',contract:'historical-calendar-density-with-public-current-slots',peer};
      }
    }catch(caught){error=String(caught.message || caught);}
    const wrongCss=(actual?.css || '')+'\n.wrong-nonempty-mixin { color: red; }\n';
    const mutation={css:wrongCss,css_sha256:sha(wrongCss),css_bytes:Buffer.byteLength(wrongCss)};
    const conforms=value=>Object.hasOwn(RIPPLE_COLOR_ARGUMENT_CASES,probe.case_id)
      ? rippleColorArgumentResultsMatch(probe.case_id,expected,{...actual,...value},current_companion)
      : Object.hasOwn(FORM_FIELD_STATE_ARGUMENT_CASES,probe.case_id)
      ? formFieldStateArgumentResultsMatch(probe.case_id,expected,value,current_companion?.peer)
      : Object.hasOwn(SORT_COMPANION_CASES,probe.case_id)
      ? sortCompanionResultsMatch(probe.case_id,expected,value,current_companion?.peer)
      : Object.hasOwn(TREE_COMPANION_CASES,probe.case_id)
      ? treeCompanionResultsMatch(probe.case_id,expected,value,current_companion?.peer)
      : Object.hasOwn(COMPANION_ADDITION_CASES,probe.case_id)
      ? companionAdditionResultsMatch(probe.case_id,expected,value,current_companion?.peer)
      : Object.hasOwn(PROGRESS_COLOR_ALIAS_CASES,probe.case_id)
      ? progressColorAliasResultsMatch(probe.case_id,expected,value,current_peer_alias?.peer)
      : Object.hasOwn(BADGE_SHAPE_CASES,probe.case_id)
      ? badgeShapeResultsMatch(probe.case_id,expected,value,current_companion?.peer)
      : Object.hasOwn(AGGREGATE_COLOR_THEME_CASES,probe.case_id)
      ? aggregateColorThemeResultsMatch(probe.case_id,expected,{...actual,...value},current_companion?.peer)
      : Object.hasOwn(AGGREGATE_TYPOGRAPHY_CASES,probe.case_id)
      ? aggregateTypographyResultsMatch(probe.case_id,expected,value,current_companion?.peer)
      : Object.hasOwn(AGGREGATE_DENSITY_CASES,probe.case_id)
      ? aggregateDensityResultsMatch(probe.case_id,expected,value,current_companion?.peers)
      : Object.hasOwn(DATEPICKER_CONTROLS_CASES,probe.case_id)
      ? datepickerControlsResultsMatch(probe.case_id,expected,value,current_companion?.peer)
      : mixinArgumentResultsMatch(expected,value);
    const mutation_rejected=Boolean(expected && actual && !conforms(mutation));
    const exact=mixinArgumentResultsMatch(expected,actual);
    return {...probe,line,expected,actual,error:error??null,identity:provenance,mutation,mutation_rejected,
      ...(current_companion?{current_companion}:{}),...(current_peer_alias?{current_peer_alias}:{}),
      comparison:current_companion?'current-companion-contract':current_peer_alias?'current-peer-color-alias-contract':exact?'historical-exact':'historical-mismatch',
      result:!error && conforms(actual) && mutation_rejected?'pass':'fail'};
  });
  return {results,identity:provenance,ok:results.length===498 && results.every(r=>r.result==='pass')};
}
