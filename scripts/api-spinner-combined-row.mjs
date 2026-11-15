/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {isDeepStrictEqual} from 'node:util';
import {combinedSpinnerViewportReceiptProblems} from './api-spinner-combined-viewport-successor.mjs';

const ID='legacy-progress-spinner/primary/MatLegacyProgressSpinner';
const labels=['ElementRef','Platform','DocumentToken','LEGACY_ANIMATION_MODE','mat-progress-spinner-default-options','ChangeDetectorRef','_LegacyViewport','NgZone','CSP nonce'];
const difference={historical:'@angular/cdk/scrolling#ViewportRuler',actual:'@ngx-compat/material-legacy/legacy-core#_LegacyViewport',historical16_provider_selects_actual:false,minimum22_provider_selects_actual:false,customization:'docs-private; no stable customization guarantee'};

/** Exact combined-image row qualification. The historical spinner contract remains separate. */
export function combinedSpinnerViewportObservationProblems(row,context){
  if(row?.symbol?.symbol_id!==ID)return [];
  const receipt=row.factory_combined_spinner_viewport_context;
  if(!receipt)return ['combined spinner viewport receipt missing'];
  const bad=['combined spinner viewport row evidence incomplete'];
  const requests=row.runtime_requests,parameters=row.symbol.shape.originalFactoryContext?.factory_parameters;
  if(row.factory_outcome!=='returned'||row.factory_returned_owned_instance!==true||row.factory_node_kind!=='element'
    ||row.factory_context!=='actual Angular element/template nodes and public application providers with synthetic Renderer2/server DOM and public MockPlatformLocation URL backend; native/browser/AOT/packed/floors separate'
    ||!isDeepStrictEqual(row.factory_context_modules,['legacy-progress-spinner/primary/MatLegacyProgressSpinnerModule'])
    ||!Array.isArray(requests)||requests.length!==9||!Array.isArray(parameters)||parameters.length!==9)return bad;
  const token=requests[6]?.intentional_token_difference,proof=token?.proof;
  if(combinedSpinnerViewportReceiptProblems(receipt,proof,context).length
    ||!isDeepStrictEqual(token,{...difference,proof,node:receipt}))return bad;
  for(let i=0;i<9;i++){
    const request=requests[i],parameter=parameters[i];
    if(request.expected_ident!==parameter.ident||request.expected_spec!==parameter.spec
      ||request.observed_label!==labels[i]||request.identity_matched!==(i!==3&&i!==6)
      ||request.unresolved!==false||request.observation_evidence!=='public Injector request trace'
      ||['optional','self','skipSelf','host'].some(flag=>request[flag]!==Boolean(parameter[flag])||request['expected_'+flag]!==Boolean(parameter[flag])))return bad;
  }
  return [];
}
