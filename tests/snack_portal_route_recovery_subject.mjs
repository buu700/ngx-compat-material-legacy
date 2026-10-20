/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual selected caller bodies and genuine public peers; receiver/DOM protocols. */
const fs=await import('node:fs');
NodeProtocol.prototype.replaceChild=function(node,old){assert.ok(this.children.includes(old));insert(this,node,old);remove(this,old);return old;};
function load(variant){const exports={},require=name=>{assert.equal(name,'@angular/cdk/portal');return portal;};new Function('exports','require',fs.readFileSync(new URL('./snack-dom-'+variant+'.cjs',import.meta.url),'utf8'))(exports,require);return exports.SnackDomHost;}
function makeOutlet(s){
 let value;if(line==='original')value=new portal.CdkPortalOutlet(app.injector.get(core.ComponentFactoryResolver),s.container,document);
 else {const context=core.Injector.create({providers:[{provide:core.ViewContainerRef,useValue:s.container},{provide:core.DOCUMENT,useValue:document}],parent:s.container.injector});s.injectors.push(context);value=core.runInInjectionContext(context,()=>new portal.CdkPortalOutlet());}
 value.ngOnInit();s.outlets.push(value);return value;
}
const caseNames=['direct-string-panel','direct-array-panel','detached-callback','portal-dispatch','element-ref-portal','detach-and-reattach','dispose-restores-origin','missing-parent-and-retry','append-error-and-retry','hook-error-keeps-attachment','failed-portal-detach-and-retry'];
if(production!=='true')caseNames.push('duplicate-attachment-guard');
function observe(Type,id){return zone.run(()=>withOwner(s=>{
 const outlet=makeOutlet(s),host=new Type(),root=s.container.element.nativeElement.parentNode,origin=new HTMLElementProtocol('origin'),before=new HTMLElementProtocol('before'),node=new HTMLElementProtocol('content'),after=new HTMLElementProtocol('after'),panel=new HTMLElementProtocol('panel'),modal=new HTMLElementProtocol('modal');
 document.body.appendChild(origin);origin.appendChild(before);origin.appendChild(node);origin.appendChild(after);
 const classNames=new Set();panel.classList={add:name=>{if(!name||/\s/.test(name))throw Error('invalid class token');classNames.add(name);},remove:name=>classNames.delete(name),contains:name=>classNames.has(name)};
 modal.setAttribute('aria-owns','keep');const queries=[],doc=Object.create(document);doc.querySelectorAll=selector=>{queries.push(selector);assert.equal(selector,'body > .cdk-overlay-container [aria-modal="true"]');return [modal];};
 host._portalOutlet=outlet;host._elementRef=new core.ElementRef(panel);host._document=doc;host.snackBarConfig={panelClass:id==='direct-array-panel'?['one','two']:id==='hook-error-keeps-attachment'?'bad token':'one'};
 let hooks=0,events=0,generic=0,directDeprecated=0,dispatchDepth=0;const order=[],steps=[];
 const guard=host._assertNotAttached;host._assertNotAttached=function(){order.push('guard');return guard.call(this);};
 const hook=host._afterPortalAttached;host._afterPortalAttached=function(){hooks++;order.push('hook');return hook.call(this);};
 const childAttach=outlet.attach,childDom=outlet.attachDomPortal;outlet.attach=function(p){generic++;dispatchDepth++;try{return childAttach.call(this,p);}finally{dispatchDepth--;}};outlet.attachDomPortal=p=>{if(!dispatchDepth)directDeprecated++;return childDom(p);};
 const subscription=outlet.attached.subscribe(()=>events++),content=new portal.DomPortal(id==='element-ref-portal'?new core.ElementRef(node):node);
 const snap=(label,error,result)=>({label,error:error?{name:error.name,message:error.message}:null,return_undefined:result===undefined,child_attached:outlet.hasAttached(),portal_attached:content.isAttached,wrapper_attached:host.hasAttached(),child_portal_identity:outlet.portal===content,attached_ref_null:outlet.attachedRef===null,element_at_origin:node.parentNode===origin,element_at_outlet:node.parentNode===root,origin_order:origin.children.map(n=>n.name==='comment'?'anchor':n.name),classes:[...classNames],aria_owns:modal.getAttribute('aria-owns'),hooks,events,order:[...order],app_view_delta:app.viewCount-1,borrowed_owner_alive:!s.reference.hostView.destroyed});
 const invoke=(label,route='direct',p=content)=>{let error,result;try{if(route==='callback'){const callback=host.attachDomPortal;result=callback(p);}else if(route==='portal')result=p.attach(host);else result=host.attachDomPortal(p);}catch(e){error=e;}steps.push(snap(label,error,result));return error;};
 try {
  if(id==='failed-portal-detach-and-retry'){node.remove();assert.ok(invoke('missing-parent','portal'));let detachError;try{content.detach();}catch(error){detachError=error;}steps.push(snap('detached-after-failed-portal-attach',detachError));origin.insertBefore(node,after);invoke('retry','portal');}
  else if(id==='missing-parent-and-retry'){node.remove();assert.ok(invoke('missing-parent'));origin.insertBefore(node,after);invoke('retry');}
  else if(id==='append-error-and-retry'){const originalAppend=root.appendChild;let once=true;root.appendChild=function(n){if(once){once=false;throw Error('injected append failure');}return originalAppend.call(this,n);};try{assert.ok(invoke('append-error'));invoke('retry');}finally{root.appendChild=originalAppend;}}
  else {const error=invoke('attach',id==='detached-callback'?'callback':id==='portal-dispatch'?'portal':'direct');if(id!=='hook-error-keeps-attachment')assert.equal(error,undefined,'valid '+id+' attachment failed');}
  if(id==='duplicate-attachment-guard'){const other=new HTMLElementProtocol('other');origin.appendChild(other);assert.ok(invoke('duplicate','direct',new portal.DomPortal(other)));}
  if(id==='detach-and-reattach'){content.detach();steps.push(snap('detached'));invoke('reattached');}
  if(id==='dispose-restores-origin')outlet.dispose();else outlet.detach();
  host._clearFromModals();steps.push(snap('cleaned'));
  assert.equal(s.reference.hostView.destroyed,false);assert.equal(app.viewCount,1);const survivor=s.container.createEmbeddedView(s.template,{item:'survivor'});survivor.detectChanges();assert.equal(rendered(survivor),'survivor/declaration');s.container.clear();
  return {id,steps,dispatch:{generic,direct_deprecated:directDeprecated}};
 } finally {subscription.unsubscribe();outlet.dispose();host._clearFromModals();origin.remove();}
}));}
const variants=['reference','before','simple','repaired','no_guard','no_hook','changed_return','no_host_restore','wrong_host_restore'],observations={};
try {
 for(const variant of variants){const Type=load(variant);observations[variant]=caseNames.map(id=>observe(Type,id));}
 for(const variant of ['reference','before','repaired']){const route=observations[variant].find(r=>r.id==='failed-portal-detach-and-retry');assert.equal(route.steps[1].error,null);assert.equal(route.steps[1].wrapper_attached,production==='true');assert.equal(route.steps[2].error,null);}
 const publicRows=rows=>rows.map(({dispatch,...row})=>row),reference=publicRows(observations.reference);
 assert.deepEqual(publicRows(observations.before),reference,'pre-repair owned caller differs from tagged caller');
 assert.deepEqual(publicRows(observations.repaired),reference,'repaired caller changes historical observables');
 for(const row of observations.repaired){assert.ok(row.dispatch.generic>=1);assert.equal(row.dispatch.direct_deprecated,0);}
 const simpleDifferences=observations.simple.filter((row,i)=>JSON.stringify(publicRows([row]))!==JSON.stringify([reference[i]])).map(r=>r.id);assert.ok(simpleDifferences.includes('missing-parent-and-retry'),'generic-only candidate must expose the failed-attach state regression');
 const rejected=[];for(const variant of ['no_hook','changed_return','no_host_restore',...(production!=='true'?['no_guard','wrong_host_restore']:[])]){assert.notDeepEqual(publicRows(observations[variant]),reference,variant);rejected.push(variant);}
 assert.equal(app.viewCount,0);
 console.log(JSON.stringify({line,mode,production:production==='true',cases:caseNames,observations:{reference:observations.reference,repaired:observations.repaired},generic_only_counterexamples:simpleDifferences,behavior_faults_rejected:rejected,genuine_Core_and_CDK_outlets:true,actual_selected_caller_members:true,full_constructor_component_or_native_executed:false,owners_created:ownersCreated,owners_destroyed:ownersDestroyed,renderer_DOM_and_receiver_are_explicit_protocols:true,actual_packed_or_floor_qualified:false}));
} finally {app.destroy();core.destroyPlatform();}
assert.equal(ownersCreated,ownersDestroyed);assert.equal(readersCreated,readersDestroyed);assert.equal(childrenCreated,childrenDestroyed);
