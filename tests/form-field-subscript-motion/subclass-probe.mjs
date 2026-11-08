/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {withChromium}=await import(pathToFileURL(process.env.MOTION_BROWSER_HELPER).href);
const disabled=process.argv[3]==='noop';
await withChromium(process.argv[2],async({evaluate,browser})=>{
 for(let i=0;i<100&&!(await evaluate('!!window.lab || !!document.getElementById("bootstrap-error")'));i++)await new Promise(r=>setTimeout(r,50));
 const data=await evaluate(`(async()=>{
  const disabled=${JSON.stringify(disabled)},fail=m=>{throw Error(m)};if(document.querySelector('#bootstrap-error'))fail(document.querySelector('#bootstrap-error').textContent);
  const field=window.lab.field, node=document.querySelector('.mat-form-field-subscript-wrapper > div');
  if(!node||field._animationsEnabled===disabled)fail('missing message or wrong motion policy');
  if(!window.lab.nodeScope())fail('seven-argument constructor did not retain its actual node injector');
  if(typeof Object.getPrototypeOf(Object.getPrototypeOf(field)).ngAfterViewChecked==='function')fail('base unexpectedly declares historical subclass hook');
  const calls=field.calls;window.lab.set('error');const current=node.getAnimations();
  if(field.calls<=calls||current.length!==(disabled?0:1))fail('subclass hook or independent subscript motion differs');
  const animation=current[0];if(animation){const timing=animation.effect.getTiming();if(timing.duration!==300||timing.easing!=='cubic-bezier(0.55, 0, 0.55, 0.2)')fail('motion timing differs');}
  window.lab.set('error');if(node.getAnimations().length!==(disabled?0:1)||node.getAnimations()[0]!==animation)fail('same-kind check restarted motion');
  window.lab.destroy();if(node.isConnected||(animation&&animation.playState!=='idle'))fail('destroy did not remove/cancel motion');
  return {passed:true,hookCalled:true,sevenArgumentNodeInjector:true,animations:current.length,disabled,sameKindRetained:true,destroyCanceled:true};
 })()`);
 writeFileSync(process.env.MOTION_OUTPUT+'/subclass-'+process.argv[3]+'-report.json',JSON.stringify({browser,data},null,2)+'\n');console.log(JSON.stringify(data));
},{debugPort:0,requireAnnouncedEndpoint:true});
