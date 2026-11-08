/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Tagged source context for the historical menu trigger and its item token.
 */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const require=createRequire(import.meta.url),hash=x=>createHash('sha256').update(x).digest('hex');
export const MENU_TRIGGER_REFERENCE={tag:'baseline/angular-components-16.2.x',sources:{
 'legacy-menu/menu-trigger.ts':'a5dd88054c5c6336acae2aa400dfba72011f510f895372381b9bc1d0773a7186',
 'menu/menu-trigger.ts':'9d63af3639404dcfde6550810de47b624ed6f8930660709214a552cdaf33ee06',
 'menu/menu-item.ts':'cc176409b67585676aa97714145e5fad042a8ca7626c63a87527c5ed83372bd8',
 'menu/menu-panel.ts':'48ae888c7a12b733a45989cf0195bd42298203da9768e5354c31759004883b43',
 'legacy-menu/public-api.ts':'bcd501192f156dabbe9aa4272d0b1054eb608d0acce8dfc67f562d2b58c002ff',
 'menu/public-api.ts':'7e2bbb35b463b49f5bed805e7d65a7cabb5481b25c572430f39867b027e11307',
}};
Object.freeze(MENU_TRIGGER_REFERENCE.sources);Object.freeze(MENU_TRIGGER_REFERENCE);
/** Rehash exact tagged source and verify the historical constructor's bindings. */
export function menuTriggerReference(referenceRoot){
 try{
  if(!referenceRoot||typeof referenceRoot!=='string')return null;
  const ts=require('typescript');
  const files=new Map();for(const [path,expected]of Object.entries(MENU_TRIGGER_REFERENCE.sources)){
   const bytes=readFileSync(join(referenceRoot,path));if(hash(bytes)!==expected)return null;
   const f=ts.createSourceFile(path,bytes.toString('utf8'),ts.ScriptTarget.Latest,true);if(f.parseDiagnostics.length)return null;files.set(path,f);
  }
  const legacy=files.get('legacy-menu/menu-trigger.ts'),modern=files.get('menu/menu-trigger.ts');
  const imports=(file,spec,id)=>file.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===spec).flatMap(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?[...n.importClause.namedBindings.elements]:[]).filter(e=>e.name.text===id&&(e.propertyName||e.name).text===id).length===1;
  const findClass=(file,name)=>{const rows=file.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);return rows.length===1?rows[0]:null;};
  const old=findClass(legacy,'MatLegacyMenuTrigger'),base=findClass(modern,'_MatMenuTriggerBase');
  if(!old||!base||!imports(legacy,'@angular/material/menu','_MatMenuTriggerBase')||!imports(modern,'./menu-item','MatMenuItem')||!imports(modern,'./menu-panel','MAT_MENU_PANEL'))return null;
  const ancestry=old.heritageClauses?.flatMap(h=>[...h.types]);if(ancestry?.length!==1||ancestry[0].expression.getText(legacy)!=='_MatMenuTriggerBase')return null;
  const constructors=base.members.filter(m=>ts.isConstructorDeclaration(m)&&m.body);if(constructors.length!==1||constructors[0].parameters.length!==9)return null;
  const p=constructors[0].parameters[5],decorators=ts.canHaveDecorators(p)?ts.getDecorators(p)||[]:[],names=decorators.map(d=>ts.isCallExpression(d.expression)&&ts.isIdentifier(d.expression.expression)&&!d.expression.arguments.length?d.expression.expression.text:null);
  if(p.name.getText(modern)!=='_menuItemInstance'||!ts.isTypeReferenceNode(p.type)||p.type.typeName.getText(modern)!=='MatMenuItem'||JSON.stringify(names)!==JSON.stringify(['Optional','Self']))return null;
  const exported=(file,spec,id)=>file.statements.some(n=>ts.isExportDeclaration(n)&&n.moduleSpecifier?.text===spec&&n.exportClause&&ts.isNamedExports(n.exportClause)&&n.exportClause.elements.some(e=>e.name.text===id&&(e.propertyName||e.name).text===id));
  if(!exported(files.get('legacy-menu/public-api.ts'),'./menu-trigger','MatLegacyMenuTrigger')||!exported(files.get('menu/public-api.ts'),'./menu-trigger','_MatMenuTriggerBase'))return null;
  return structuredClone(MENU_TRIGGER_REFERENCE);
 }catch{return null;}
}
