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
