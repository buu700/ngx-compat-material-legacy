/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const clip=(pane,box)=>pane.top<box.top||pane.bottom>box.bottom||pane.left<box.left||pane.right>box.right;
export const contracts={
 '01cc6f3265903cc6c3a58ea4ae5e03c917597e8f':r=>r.position.count1===1&&r.position.count2===1&&r.position.count3===2&&!clip(r.position.beforePane,r.position.beforeBox)&&clip(r.position.paneRect,r.position.boxRect)&&r.tooltip.initial===true&&r.tooltip.afterScroll===false,
 '09df51d8ebb86a3ee76614b6775dd62136660567':r=>r.shadow.inside===0&&r.shadow.crossing===0&&r.shadow.outside===1&&r.tooltipOutside.before===true&&r.tooltipOutside.after===false,
 '0ca0c3112c762f449673f5cc1f3f4d7e8e3c20af':r=>r.popoverOff.config===false&&r.popoverOff.attribute===null&&r.popoverOff.inContainer===true&&r.selectOff.open===true&&r.selectOff.panel===true&&r.selectOff.popover===false&&r.selectOff.container===true,
 '1a92e22eff7728d92b6af8834701f78acbb4d2cc':r=>r.popover.supported===true&&r.popover.global.config===true&&r.popover.global.attribute==='manual'&&r.popover.global.inContainer===true&&!r.popover.global.adjacent&&r.popover.inline.config===true&&r.popover.inline.attribute==='manual'&&!r.popover.inline.inContainer&&r.popover.inline.adjacent&&r.directiveInline.attribute==='manual'&&!r.directiveInline.inContainer&&r.directiveInline.adjacent&&r.directiveVariants.global.popover==='manual'&&r.directiveVariants.global.inContainer&&r.directiveVariants.default.popover==='manual'&&r.directiveVariants.default.inContainer&&r.directiveVariants.null.popover===null&&r.directiveVariants.null.inContainer,
 '332f78607b409c7158e7153ef0ed044a09922a99':r=>r.customTarget.registered===true&&r.customTarget.before===0&&r.customTarget.after===1&&r.customTarget.removed===true&&r.tooltip.initial===true&&r.tooltip.afterScroll===false,
};
export const faults={'01cc6f3265903cc6c3a58ea4ae5e03c917597e8f':'position','09df51d8ebb86a3ee76614b6775dd62136660567':'shadow','0ca0c3112c762f449673f5cc1f3f4d7e8e3c20af':'optout','1a92e22eff7728d92b6af8834701f78acbb4d2cc':'location','332f78607b409c7158e7153ef0ed044a09922a99':'target'};
export function verify(raw) {
 const results=Object.entries(contracts).map(([sha,check])=>({sha,baseline:check(raw.results.none.result),fault_case:faults[sha],fault_accepted:check(raw.results[faults[sha]].result)}));
 return {results,pass:results.every(x=>x.baseline&&!x.fault_accepted)};
}
