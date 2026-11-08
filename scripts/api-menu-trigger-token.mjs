/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Exact owned menu-item replacement, separately recorded from historical identity.
 */
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {originalContextDi} from './api-original-factory-contexts.mjs';
import {exactMenuArtifact,exactMenuPeer} from './api-menu-artifact.mjs';
import {menuTriggerReference} from './api-menu-reference.mjs';
const req=createRequire(import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
export const MENU_TRIGGER='legacy-menu/primary/MatLegacyMenuTrigger';
/** Authentic FESM syntax, actual public peer token object and owned prototype object. */
export async function menuTriggerOwnedToken(symbol,param,loaded,peer,observed,packageRoot,{sourceOverride,artifactContext}={}){
 try{
  if(symbol?.symbol_id!==MENU_TRIGGER||hash(JSON.stringify(symbol.shape))!=='0955b605afbcdf4cc05ccf7fae9550db5a2f31d479baff1604104006ad292c8e'||param.ident!=='MatMenuItem'||param.imported!=='MatMenuItem'||param.spec!==null||param.optional!==true||param.self!==true||param.skipSelf||param.host)return null;
  const historicalReference=menuTriggerReference(artifactContext?.referenceRoot);if(!historicalReference)return null;
  const entry=join(packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-menu.mjs');
  if(!exactMenuArtifact(artifactContext,packageRoot)||!exactMenuPeer(entry))return null;
  if(realpathSync(createRequire(entry).resolve('@angular/material/menu'))!==realpathSync(req.resolve('@angular/material/menu')))return null;
  const actual=await import(pathToFileURL(entry).href),actualPeer=await import('@angular/material/menu');
  if(actual.MatLegacyMenuItem!==loaded.MatLegacyMenuItem||actual.MAT_LEGACY_MENU_PANEL!==loaded.MAT_LEGACY_MENU_PANEL||actualPeer.MatMenuItem!==peer.MatMenuItem||actualPeer.MAT_MENU_PANEL!==peer.MAT_MENU_PANEL)return null;
  const source=sourceOverride??readFileSync(join(packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-menu.mjs'),'utf8');if(hash(source)!=='214c9acfb791619edd0c61c78bf95848a936b2c5f1d9cb707b27112c2bcec926')return null;
  const ts=req('typescript'),sf=ts.createSourceFile('menu.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(sf.parseDiagnostics.length)return null;
  const cls=name=>{const a=sf.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);if(a.length!==1)throw Error('class');return a[0];};
  const base=cls('_LegacyMenuItemBase'),item=cls('MatLegacyMenuItem'),trigger=cls('_MatMenuTriggerBase');
  if(item.heritageClauses?.length!==1||item.heritageClauses[0].types.length!==1||item.heritageClauses[0].types[0].expression.getText(sf)!==base.name.text)return null;
  const prop=(obj,name)=>obj.properties.filter(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)===name);
  const metadata=(node,name)=>{const m=node.members.filter(x=>ts.isPropertyDeclaration(x)&&x.name.getText(sf)===name);if(m.length!==1||!ts.isCallExpression(m[0].initializer)||m[0].initializer.arguments.length!==1||!ts.isObjectLiteralExpression(m[0].initializer.arguments[0]))throw Error('metadata');return m[0].initializer.arguments[0];};
  const deps=prop(metadata(trigger,'ɵfac'),'deps');if(deps.length!==1||!ts.isArrayLiteralExpression(deps[0].initializer)||deps[0].initializer.elements.length!==9)return null;
  const dep=deps[0].initializer.elements[5];if(!ts.isObjectLiteralExpression(dep)||dep.properties.length!==3||prop(dep,'token')[0]?.initializer.getText(sf)!==base.name.text||prop(dep,'optional')[0]?.initializer.kind!==ts.SyntaxKind.TrueKeyword||prop(dep,'self')[0]?.initializer.kind!==ts.SyntaxKind.TrueKeyword)return null;
  const providers=prop(metadata(item,'ɵcmp'),'providers');if(providers.length!==1||!ts.isArrayLiteralExpression(providers[0].initializer)||providers[0].initializer.elements.length!==2)return null;
  for(const [i,token]of ['MatMenuItem','_LegacyMenuItemBase'].entries()){const p=providers[0].initializer.elements[i];if(!ts.isObjectLiteralExpression(p)||p.properties.length!==2||prop(p,'provide')[0]?.initializer.getText(sf)!==token||prop(p,'useExisting')[0]?.initializer.getText(sf)!=='MatLegacyMenuItem')return null;}
  const imports=sf.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/material/menu').flatMap(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?[...n.importClause.namedBindings.elements]:[]);if(imports.filter(e=>e.name.text==='MatMenuItem'&&(e.propertyName||e.name).text==='MatMenuItem').length!==1)return null;
  const owned=Object.getPrototypeOf(loaded.MatLegacyMenuItem);if(typeof owned!=='function'||owned.name!==base.name.text||loaded.MatLegacyMenuItem.prototype.__proto__!==owned.prototype||observed!==owned||owned===peer.MatMenuItem||!peer.MatMenuItem||!loaded.MAT_LEGACY_MENU_PANEL||loaded.MAT_LEGACY_MENU_PANEL===peer.MAT_MENU_PANEL)return null;
  return {role:'approved-owned-menu-item-token-replacement',source_sha256:hash(source),historical_public_token:'@angular/material/menu#MatMenuItem',historical_reference:historicalReference,observed_owned_token:'_LegacyMenuItemBase',historical_identity_matched:false,owned_identity_matched:true,public_peer_distinct:true,legacy_panel_token_distinct:true,provider_aliases:['MatMenuItem','_LegacyMenuItemBase'],optional:true,self:true,skipSelf:false,host:false};
 }catch{return null;}
}

/** Settlement rejects missing/forged trace evidence, including empty or failed factories. */
export function menuTriggerObservationProblems(row){
 if(row?.symbol?.symbol_id!==MENU_TRIGGER)return [];
 try{
  if(row.factory_outcome!=='returned'||row.factory_node_kind!=='element'||row.factory_returned_owned_instance!==true||!row.factory_context?.startsWith('actual Angular element/template nodes')||JSON.stringify(row.factory_context_modules)!==JSON.stringify(['legacy-menu/primary/MatLegacyMenuModule']))throw Error('factory or caller node');
  const expected=['Overlay','ElementRef','ViewContainerRef','MAT_MENU_SCROLL_STRATEGY','MAT_MENU_PANEL','MatMenuItem','Directionality','FocusMonitor','NgZone','ChangeDetectorRef'];
  if(hash(JSON.stringify(row.symbol.shape))!=='0955b605afbcdf4cc05ccf7fae9550db5a2f31d479baff1604104006ad292c8e')throw Error('historical shape');
  const original=originalContextDi(row.symbol.shape,row.runtime_context||{});
  if(!Array.isArray(row.runtime_requests)||row.runtime_requests.length!==expected.length||row.observed?.length!==expected.length||original.length!==expected.length)throw Error('request count');
  for(const [i,request] of row.runtime_requests.entries()){
   if(request.expected_ident!==expected[i]||request.expected_ident!==original[i].ident||request.expected_spec!==original[i].spec||request.unresolved!==false||request.identity_matched!==(i!==5))throw Error('request identity '+i);
   for(const flag of ['optional','self','skipSelf','host'])if(request[flag]!==Boolean(original[i][flag])||request['expected_'+flag]!==Boolean(original[i][flag]))throw Error('request flag '+i+' '+flag);
  }
  return [];
 }catch(error){return ['owned menu trigger trace incomplete: '+String(error.message)];}
}
