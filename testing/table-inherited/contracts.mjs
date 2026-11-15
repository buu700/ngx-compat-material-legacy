/** Finite observation checks; mutation controls are observations, not upstream patches. */
import {isDeepStrictEqual as eq} from 'node:util';
export const TABLE_SHAS=Object.freeze(['27dae25a420e76817a1209f373326084ae6dd11c','3b6ca5c9880996b57e08caffb408f6c12ed78de4','59b8f433c28e81c213668ccf7d220f12e3524635']);
export function tableCases(o){
 const f=o?.first??{},e=o?.empty??{},r=o?.restored??{},bad=o?.missing_error??{},good=o?.missing_match??{};
 return {
  [TABLE_SHAS[0]]:o?.duplicate_error==='Error: There can only be one default row without a when predicate function. Or set `multiTemplateDataRows`.'&&o?.duplicate_multi===null&&bad.defs===2&&bad.error==='Error: Could not find a matching row definition for the provided row data: {"id":"A"}'&&bad.delivery?.channel==='window-error'&&bad.delivery?.message===bad.error&&good.defs===2&&good.error===null&&good.delivery===null,
  [TABLE_SHAS[1]]:o?.standalone_compiled===true&&f.owned_identity===true&&f.peer_identity===true&&eq(f.dom,['A','B']),
  [TABLE_SHAS[2]]:eq(f.ids,['A','B'])&&eq(f.indices,[0,1])&&eq(f.dom,['A','B'])&&eq(e.ids,[])&&eq(e.dom,[])&&eq(r.ids,['C'])&&eq(r.indices,[0])&&eq(r.dom,['C']),
 };
}
export function tableFaultControls(o){const mutants=[
 [TABLE_SHAS[0],x=>x.duplicate_error='generic'],[TABLE_SHAS[0],x=>x.duplicate_multi='unexpected'],[TABLE_SHAS[0],x=>x.missing_error.error=null],[TABLE_SHAS[0],x=>x.missing_error.defs=1],[TABLE_SHAS[0],x=>x.missing_error.delivery.channel='other'],[TABLE_SHAS[0],x=>x.missing_match.error='unexpected'],
 [TABLE_SHAS[1],x=>x.standalone_compiled=false],[TABLE_SHAS[1],x=>x.first.peer_identity=false],[TABLE_SHAS[1],x=>x.first.owned_identity=false],
 [TABLE_SHAS[2],x=>x.first.dom=[]],[TABLE_SHAS[2],x=>x.first.ids=[]],[TABLE_SHAS[2],x=>x.first.indices=[1,0]],[TABLE_SHAS[2],x=>x.empty.ids=['A']],[TABLE_SHAS[2],x=>x.empty.dom=['A']],[TABLE_SHAS[2],x=>x.restored.ids=[]],[TABLE_SHAS[2],x=>x.restored.indices=[1]],[TABLE_SHAS[2],x=>x.restored.dom=[]],
 ];return mutants.map(([sha,mutate])=>{const bad=structuredClone(o);mutate(bad);return {sha,rejected:tableCases(bad)[sha]===false}});}

// Supplemental product observations are not dispositions for any upstream SHA.
export const TABLE_SUPPLEMENTAL_IDS=Object.freeze(['conditional-viewport','no-data-classes','sticky-columns','sticky-rows','raw-cdk-guard','sticky-direct']);
export function tableSupplementalCases(o){
 const s=o?.supplemental??{},layouts=['native','flex'],all=fn=>layouts.every(id=>fn(s.initial?.[id],s.empty?.[id],s.restored?.[id],s.unstuck?.[id]));
 return {
  'conditional-viewport':all(a=>eq(a?.rows,Array.from({length:12},(_,i)=>String(i)))&&eq(a?.even,Array.from({length:12},(_,i)=>i%2===0)))&&s.readers?.count===24&&s.readers?.all_match===true,
  'no-data-classes':all((_a,e,r)=>e?.row_class==='consumer-row mat-no-data-row'&&e?.cell_class==='consumer-cell'&&e?.row_count===0&&r?.empty_present===false&&r?.rows===2),
  'sticky-columns':all((a,_e,_r,u)=>a?.sticky_left==='0px'&&a?.sticky_class===true&&u?.left===''&&u?.sticky_class===false),
  'sticky-rows':all(a=>a?.header==='0px'&&a?.footer==='0px'),
  'raw-cdk-guard':typeof s.raw_error==='string'&&s.raw_error.includes('Conditional row definitions via the `when` input are not supported when virtual scrolling is enabled'),
  'sticky-direct':eq(s.direct,{first:{value:false,changed:true},repeated:false,end:{value:true,changed:true},end_repeated:false}),
 };
}
export function tableSupplementalFaultControls(o){
 const mutations=[['conditional-viewport',x=>x.supplemental.initial.native.even[1]=true],['no-data-classes',x=>x.supplemental.empty.flex.cell_class='changed'],['sticky-columns',x=>x.supplemental.unstuck.native.left='0px'],['sticky-rows',x=>x.supplemental.initial.flex.footer=''],['raw-cdk-guard',x=>x.supplemental.raw_error='different error'],['sticky-direct',x=>x.supplemental.direct.end.changed=false]];
 return mutations.map(([id,mutate])=>{const bad=structuredClone(o);mutate(bad);return{id,rejected:tableSupplementalCases(bad)[id]===false}});
}
