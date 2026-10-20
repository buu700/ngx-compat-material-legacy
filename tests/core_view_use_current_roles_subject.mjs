/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Appended to the authenticated view/portal lab; these are new caller cases. */
function nullDeclarationContainer({manual=false,wrongContext=false,dispose=value=>value.ngOnDestroy()}={}) {
  return paired((ambient, owner)=>{
    const state=hostFor(owner),context={item:'null-container-caller'};
    state.host._content=new portal.TemplatePortal(owner.template,null,wrongContext?{item:'wrong'}:context);
    const value=construct(Type,owner.container,state.host,document,manual?undefined:ambient.injector);
    try {
      value.ngOnInit();state.entering.next(true);
      assert.equal(owner.container.length,1,'outlet container creates the embedded view');
      assert.equal(ambient.container.length,0,'ambient container is not the owner');
      const first=owner.container.get(0);first.detectChanges();
      assert.ok(first.context===context,'caller context identity survives a null portal container');
      assert.equal(rendered(first),'null-container-caller/declaration');
      context.item='updated';first.detectChanges();
      assert.equal(rendered(first),'updated/declaration');
      value.detach();assert.equal(first.destroyed,true);assert.equal(owner.container.length,0);
      state.entering.next(true);const second=owner.container.get(0);second.detectChanges();
      assert.ok(second!==first);assert.ok(second.context===context);
      assert.equal(rendered(second),'updated/declaration');
      dispose(value);
      assert.equal(second.destroyed,true,'outlet destruction disposes the owned embedded view');
      assert.equal(owner.container.length,0);
      assert.equal(ambient.reference.hostView.destroyed,false);
      assert.equal(owner.reference.hostView.destroyed,false,'borrowed declaration owner survives');
      const survivor=owner.container.createEmbeddedView(owner.template,{item:'survivor'});
      survivor.detectChanges();assert.equal(rendered(survivor),'survivor/declaration');owner.container.clear();
    } finally {value.ngOnDestroy();}
  });
}
try {
  run('null-portal-container-context-reattach-and-destroy',()=>nullDeclarationContainer());
  run('null-portal-container-manual-construction-and-borrowed-owner',()=>nullDeclarationContainer({manual:true}));
  reject('null-container-lost-caller-context',()=>nullDeclarationContainer({wrongContext:true}));
  reject('null-container-skipped-outlet-destruction',()=>nullDeclarationContainer({dispose:()=>{}}));
  assert.equal(cases.length,2);assert.equal(faults.length,2);assert.equal(app.viewCount,0);
} finally {app.destroy();core.destroyPlatform();}
assert.equal(ownersCreated,ownersDestroyed);assert.equal(readersCreated,readersDestroyed);assert.equal(childrenCreated,childrenDestroyed);
console.log(JSON.stringify({line,mode,production:production==='true',cases,behavior_faults_rejected:faults,
  genuine_Core_views_and_CDK_outlet:true,untouched_tagged_portal:original!==null,actual_owned_portal:!original,
  host_renderer_and_DOM_are_explicit_protocols:true,owners_created:ownersCreated,owners_destroyed:ownersDestroyed,
  template_directives_created:readersCreated,template_directives_destroyed:readersDestroyed,
  actual_snack_bar_component_native_packed_or_floor_qualified:false}));
