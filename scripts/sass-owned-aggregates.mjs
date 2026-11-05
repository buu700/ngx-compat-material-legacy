/** Historical owned aggregate CSS with a finite public ripple binding. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {measureMixinArgument,mixinArgumentResultsMatch} from './sass-mixin-arguments.mjs';
import {RIPPLE_COLOR_OWNED_CASES,RIPPLE_COLOR_CONTRACT,measureRippleColorPeer,rippleColorArgumentResultsMatch} from './sass-ripple-color-contract.mjs';
import {ORDINARY_CONTROL_GATE_CASES,ORDINARY_CONTROL_CONTRACT,ordinaryControlGateDescriptor,ordinaryControlGateDirectMatch} from './sass-ordinary-control-gate.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const OWNED_AGGREGATE_CATALOG='fixtures/sass/owned-aggregate-contracts.json';
export const OWNED_AGGREGATE_CATALOG_SHA256='b83f5ee9e898004e2fce2ae49719dbed923dd2b5eabf06f3f463a8ad33f24c7a';
export function ownedAggregateCatalog() {
 const bytes=readFileSync(join(root,OWNED_AGGREGATE_CATALOG));
 if(hash(bytes)!==OWNED_AGGREGATE_CATALOG_SHA256)throw new Error('owned aggregate catalog changed');
 const catalog=JSON.parse(bytes);
 const original=readFileSync(join(root,catalog.original_membership.path));
 if(hash(original)!==catalog.original_membership.sha256)throw new Error('owned aggregate original membership changed');
 const part=original.toString().split('// Legacy components.')[1].split('// Components without MDC versions.')[0];
 const families=[...part.matchAll(/@include ([a-z-]+)-theme.theme\(\$theme-or-color-config\);/g)].map(row=>row[1]);
 if(families.length!==22||JSON.stringify(families)!==JSON.stringify(catalog.original_membership.families)||catalog.cases.length!==20)throw new Error('owned aggregate membership incomplete');
 return {...catalog,sha256:hash(bytes)};
}
export const ownedAggregateCaseIds=()=>ownedAggregateCatalog().cases.map(probe=>probe.case_id);
export function runOwnedAggregateContracts({sass,entry,loadPaths,allowedRoots,importers=[],line,referenceEntry,referenceRoot,identity,ordinaryControlContext}) {
 const catalog=ownedAggregateCatalog();
 const provenance={...identity,catalog:OWNED_AGGREGATE_CATALOG,catalog_sha256:catalog.sha256};
 const results=catalog.cases.map(probe=>{
  let expected,actual,error,current_companion,current_ordinary_controls;
  try {
   expected=measureMixinArgument(sass,referenceEntry,[referenceRoot],catalog,{...probe,call:probe.reference_call},[referenceRoot]);
   actual=measureMixinArgument(sass,entry,loadPaths,catalog,probe,allowedRoots,importers);
   if(!ordinaryControlContext||ordinaryControlContext.line!==line)throw Error('owned ordinary controls current source context missing');
   current_ordinary_controls=ordinaryControlGateDescriptor(ordinaryControlContext);actual={...actual,line,sass_version:sass.info};
   if(Object.hasOwn(RIPPLE_COLOR_OWNED_CASES,probe.case_id)){
    actual={...actual,line,sass_version:sass.info};
    const peer=measureRippleColorPeer({sass,materialRoot:allowedRoots[1],cdkRoot:allowedRoots[2],caseId:probe.case_id,line});
    current_companion={classification:'conforming-current-companion',contract:RIPPLE_COLOR_CONTRACT,peer};
   }
  }catch(caught){error=String(caught.message||caught);}
  const css=(actual?.css||'')+'\n.wrong-nonempty-mixin { color: red; }\n';
  const mutation={css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css)};
  const conforms=value=>ORDINARY_CONTROL_GATE_CASES.includes(probe.case_id)&&ordinaryControlGateDirectMatch({context:ordinaryControlContext,caseId:probe.case_id,original:expected,actual:{...actual,...value},identity:provenance,descriptor:current_ordinary_controls,companion:current_companion??null});
  const mutation_rejected=Boolean(expected&&actual&&!conforms(mutation));
  return {...probe,line,expected,actual,error:error??null,identity:provenance,mutation,mutation_rejected,
   ...(current_companion?{current_companion}:{}),current_ordinary_controls,comparison:ORDINARY_CONTROL_CONTRACT,
   result:!error&&conforms(actual)&&mutation_rejected?'pass':'fail'};
 });
 return {results,identity:provenance,ok:results.length===20&&results.every(row=>row.result==='pass')};
}
