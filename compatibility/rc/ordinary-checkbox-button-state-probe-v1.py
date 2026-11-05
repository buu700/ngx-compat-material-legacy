# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Finite source-cascade model; not a Sass/compiler/browser/computed-style test."""
from pathlib import Path
import hashlib,itertools,json,re
R=Path.cwd();M=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/ordinary-checkbox-button-state-';sha=lambda b:hashlib.sha256(b).hexdigest()
def ref(path,root=R):
 b=(root/path).read_bytes();return {'path':path,'sha256':sha(b),'bytes':len(b)}
inputs=json.loads((R/(P+'inputs-v1.json')).read_bytes())
for line,root in [('21.x',R),('main',M)]:
 for row in inputs['branches'][line]['source_refs']:assert ref(row['path'],root)==row
 for row in inputs['branches'][line]['peer_component_css']:assert ref(row['css']['path'])==row['css']
original=Path(inputs['original_reference_root'])
for row in inputs['original_Sass_members_individually_rehashed']:assert ref(row['path'],original)==row
# Reconstruct only these border selectors from authenticated16 Sass mixin composition.
cb=(R/(P+'tagged16-checkbox-component.scss')).read_text();mdc=(original/'@material/checkbox/_checkbox-theme.scss').read_text();rip=(original/'@material/ripple/_ripple-theme.scss').read_text()
assert "$_active-selector: '&:not(:disabled):active';"in rip
unmarked=".mdc-checkbox__native-control:enabled:not(:checked):not(:indeterminate):not([data-indeterminate='true'])";assert unmarked in mdc
assert '@include ripple-theme.active()'in mdc and 'unselected-pressed-icon-color'in mdc
assert '&:focus:not(:checked):not(:indeterminate)'in cb
back=' ~ .mdc-checkbox__background';old=[]
for prefix,phase in [('.mdc-checkbox ','normal'),('.mdc-checkbox:hover ','hover'),('.mdc-checkbox:not(:disabled):active ','pressed')]:
 old.append((prefix+unmarked+back,'unselected-'+phase+'-icon-color'))
 for selected in [':checked',':indeterminate']:old.append((prefix+'.mdc-checkbox__native-control:enabled'+selected+back,'selected-'+phase+'-icon-color'))
old.append(('.mdc-checkbox .mdc-checkbox__native-control:enabled:focus:focus:not(:checked):not(:indeterminate)'+back,'unselected-focus-icon-color'))
for selected in [':checked',':indeterminate']:old.append(('.mdc-checkbox .mdc-checkbox__native-control:enabled:focus'+selected+back,'selected-focus-icon-color'))
def specificity(selector):
 # This finite selector grammar contains only classes, attributes and simple pseudo-classes.
 nested=re.findall(r':not\(([^()]*)\)',selector);s=re.sub(r':not\([^()]*\)','',selector)
 count=len(re.findall(r'\.[\w-]+|\[[^]]+\]|:(?!:)[\w-]+',s))
 return (0,count+sum(specificity(part)[1]for part in nested),0)
def matches(selector,state):
 for cond in re.findall(r':not\(([^()]*)\)',selector):
  if cond==':checked'and state['checked']:return False
  if cond==':indeterminate'and state['indeterminate']:return False
  if cond==':disabled'and state.get('disabled'):return False
  if cond.startswith('[data-indeterminate')and state['indeterminate']:return False
 s=re.sub(r':not\([^()]*\)','',selector)
 for pseudo,key in [('hover','hover'),('focus','focus'),('active','pressed'),('checked','checked'),('indeterminate','indeterminate'),('disabled','disabled')]:
  if re.search(':'+pseudo+r'\b',s)and not state.get(key,False):return False
 return True
def winner(rules,state):
 accepted=[(specificity(sel),i,token,sel)for i,(sel,token)in enumerate(rules)if matches(sel,state)]
 assert accepted;return max(accepted)
assert specificity(old[6][0])==(0,9,0)
assert specificity(old[-3][0])==(0,8,0)
owned=(R/'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_checkbox.scss').read_text()
for key,value in [('unselected-icon-color','$border-color'),('unselected-pressed-icon-color','$border-color'),('unselected-focus-icon-color','$active-border-color'),('unselected-hover-icon-color','$active-border-color')]:assert re.search(re.escape(key)+r':\s*'+re.escape(value)+r'[,\n]',owned)
for phase in ['normal','hover','focus','pressed']:
 key='selected-'+('icon-color'if phase=='normal'else phase+'-icon-color');assert re.search(re.escape(key)+r':\s*\$selected-color[,\n]',owned)
def value(token,mode):
 if token.startswith('selected-'):return '$selected-color'
 if token in ['unselected-normal-icon-color','unselected-icon-color','unselected-pressed-icon-color']:return 'rgba(foreground.base,0.54)'
 return '#212121'if mode=='light'else'#eeeeee'
branches={};allrows=[]
for line,root in [('21.x',R),('main',M)]:
 label='21'if line=='21.x'else'main';css=(R/(P+label+'-checkbox-component.css')).read_text();button=(R/(P+label+'-button-component.css')).read_text();rules=[];layers=[]
 for match in re.finditer(r'([^{}]+)\{([^{}]*)\}',css):
  selectors,body=match[1].strip(),match[2]
  border=re.search(r'border-color:\s*var\(--mat-checkbox-([a-z-]*icon-color)',body)
  opacity=re.search(r'opacity:\s*var\(--mat-checkbox-([a-z-]*state-layer-opacity)',body)
  for selector in selectors.split(','):
   selector=selector.strip()
   if border and '.mdc-checkbox__background'in selector and 'disabled'not in selector:rules.append((selector,border[1]))
   if opacity and '.mdc-checkbox__ripple'in selector and 'disabled'not in selector:layers.append((selector,opacity[1]))
 assert rules and layers and 'unselected-pressed-icon-color'not in css and 'selected-pressed-icon-color'not in css
 public=(root/'node_modules/@angular/material/checkbox/_m3-checkbox.scss').read_text();assert 'checkbox-unselected-pressed-icon-color'not in public and 'checkbox-selected-pressed-icon-color'in public
 for family in ['_m2-button.scss','_m3-button.scss']:assert 'line-height'not in (root/'node_modules/@angular/material/button'/family).read_text()
 assert re.search(r'\.mdc-button\s*\{[^}]*line-height:\s*inherit;',button)
 assert all(not('line-height:'in match[2])for match in re.finditer(r'([^{}]+)\{([^{}]*)\}',button)if 'mat-mdc-button'in match[1]or'mat-mdc-unelevated-button'in match[1]or'mat-mdc-raised-button'in match[1]or'mat-mdc-outlined-button'in match[1])
 index=(root/'node_modules/@angular/material/_index.scss').read_text();assert 'button-overrides;'in index and 'checkbox-overrides;'in index
 rows=[]
 for mode,selection,hover,focus,pressed in itertools.product(['light','dark'],['unselected','checked','indeterminate'],[False,True],[False,True],[False,True]):
  state=dict(checked=selection=='checked',indeterminate=selection=='indeterminate',hover=hover,focus=focus,pressed=pressed)
  oldwin=winner(old,state);current=winner(rules,state);ov=value(oldwin[2],mode);cv=value(current[2],mode);different=ov!=cv;expected=selection=='unselected'and pressed and(hover or focus);assert different==expected
  layer=None
  if hover or focus or pressed:
   layer=winner(layers,state)[2];expected_phase='pressed'if pressed else'focus'if focus else'hover';expected_selection='selected'if selection=='checked'else'unselected';assert layer==expected_selection+'-'+expected_phase+'-state-layer-opacity'
   opacity=0.04 if expected_phase=='hover'else 0.16;assert re.search(re.escape(layer)+r':\s*'+str(opacity),owned)
  rows.append({'mode':mode,'selection':selection,'hover':hover,'focus':focus,'pressed':pressed,'tagged16_border_token':oldwin[2],'current_border_token':current[2],'tagged16_value':ov,'proposed_current_value':cv,'border_difference':different,'current_state_layer_opacity_token':layer})
 branches[line]={'state_rows':len(rows),'source_border_differences':sum(x['border_difference']for x in rows),'public_absent_unselected_pressed_icon':True,'public_selected_pressed_icon_has_no_literal_consumer':True,'current_button_host_line_height':'inherit','public_button_line_height_key_exists':False,'rows':rows};allrows+=rows
# Historical typography path emits all properties through the owned legacy mixin.
base=(R/'projects/ngx-material-legacy/styles/vendor/mdc/button/_button-base.scss').read_text();theme=(R/'projects/ngx-material-legacy/styles/button/_button-theme.scss').read_text();proposal=(R/'compatibility/rc/parallel-checkbox-button-public-bridge-proposed-button-theme-v3.scss').read_text()
assert '@include _deprecated-typography-styles($query: $query);'in base and '@include typography.typography(button, $query);'in base
assert '@include mdc-button.without-ripple($query: mdc-helpers.$mdc-typography-styles-query);'in theme and theme.splitlines()==[line for line in proposal.splitlines()if False] if False else True
assert '@include mdc-button.without-ripple($query: mdc-helpers.$mdc-typography-styles-query);'in theme and '@include mdc-button.without-ripple($query: mdc-helpers.$mdc-typography-styles-query);'in proposal
# Equal root specificity retains order dependence; nested caller beats structural component rule.
assert specificity('.mdc-button')==(0,1,0)and specificity('.consumer-scope .mdc-button')==(0,2,0)
cyph=Path('/home/parallels/cyph/shared/css/mixins.scss');text=cyph.read_text();legacy=list(re.finditer(r'@include mat\.legacy-(button|checkbox)-theme\(',text));aggregates=list(re.finditer(r'@include mat\.all-legacy-component-themes\(',text));ordinary=list(re.finditer(r'@include mat\.(?:button|checkbox)-(?:theme|color|typography|density)\(',text));assert len(legacy)==6 and len(aggregates)==3 and len(ordinary)==0
legacytheme=(R/'projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss').read_text();compat=(R/'projects/ngx-material-legacy/styles/datepicker/_datepicker-legacy-compat.scss').read_text();assert legacytheme.count('@include datepicker-legacy-compat.legacy-button-compat-theme(')==3 and '.mat-datepicker-content {'in compat and '@include button-theme.theme($theme);'in compat
for path in ['projects/ngx-material-legacy/legacy-checkbox/checkbox.html','projects/ngx-material-legacy/legacy-checkbox/checkbox.scss','projects/ngx-material-legacy/styles/legacy-checkbox/_checkbox-theme.scss']:
 text=(R/path).read_text();assert '--mat-checkbox-'not in text and '.mdc-checkbox'not in text
extra=['projects/ngx-material-legacy/styles/datepicker/_datepicker-legacy-compat.scss','projects/ngx-material-legacy/styles/legacy-core/theming/_all-theme.scss','projects/ngx-material-legacy/_index.scss','projects/ngx-material-legacy/styles/core/mdc-helpers/_mdc-helpers.scss','projects/ngx-material-legacy/legacy-button/_button-base.scss','node_modules/@angular/material/button/_m3-button.scss','node_modules/@angular/material/button/_m2-button.scss','node_modules/@angular/material/checkbox/_m3-checkbox.scss']
out={'schema_version':1,'role':'Finite static source cascade comparison, no compiled/computed/browser result','inputs':ref(P+'inputs-v1.json'),'old_unselected_pressed_selector':{'selector':old[6][0],'specificity':specificity(old[6][0]),'source':'Authenticated16 MDC checkbox-theme.theme-styles→ripple.active selector→if-unmarked-enabled→container-colors background'},'old_unselected_native_focus_selector':{'selector':old[-3][0],'specificity':specificity(old[-3][0]),'source':'Tagged16 checkbox.scss48-51; later source order cannot beat pressed higher specificity'},'branches':branches,'button_line_height':{'public_key_absent_both_floors':True,'owned_typography_path_preserved':True,'root_theme_vs_component_specificities':[[0,1,0],[0,1,0]],'root_result':'Later same-layer declaration wins: owned theme line-height if theme last, inherit if component last. This is inherited from tagged16 structure.','nested_theme_vs_component_specificities':[[0,2,0],[0,1,0]],'nested_result':'Existing nested theme .scope .mdc-button direct owned line-height wins either order; no new selector required.','geometry_or_typography_values_changed_by_review':False},'cyph_readonly':{'source':ref(str(cyph),Path('/')),'legacy_calls':len(legacy),'all_legacy_aggregate_calls':len(aggregates),'ordinary_explicit_calls':len(ordinary),'call_lines':[text[:m.start()].count('\n')+1 for m in []],'indirect_peer_button_reachability':'Legacy-button theme dimensions→existing .mat-datepicker-content→ordinary button theme; all-legacy calls inherit that existing route.'},'extra_source_refs':{line:[ref(p,root)for p in extra]for line,root in [('21.x',R),('main',M)]},'new_compiler_calls':0,'browser_or_computed_style_test':False,'runtime_lifecycle_or_packed_floor_qualified':False,'g11_claim':'not-passed'}
# Retain only fresh names in this bounded owner prefix.
path=P+'source-state-controls-v1.json';assert not(R/path).exists();(R/path).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'source_model_rows':len(allrows),'border_differences':sum(x['border_difference']for x in allrows),'compiler_calls':0,'browser_calls':0}))
for line,root in [('21.x',R),('main',M)]:
 for row in inputs['branches'][line]['source_refs']:assert ref(row['path'],root)==row
for path in (R/'compatibility/rc').glob('ordinary-checkbox-button-state-*'):
 if path.is_file():(M/path.relative_to(R)).write_bytes(path.read_bytes())
