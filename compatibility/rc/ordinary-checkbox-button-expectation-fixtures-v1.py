from pathlib import Path
import hashlib,json,re
ROOT=Path.cwd();PRE='compatibility/rc/ordinary-checkbox-button-expectation-'
def ref(path):
 b=(ROOT/path).read_bytes();return dict(path=path,sha256=hashlib.sha256(b).hexdigest(),bytes=len(b))
def measured(css):return dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
def rules(css):
 out=[]
 for m in re.finditer(r'([^{}]+)\{([^{}]*)\}',css):
  header=m[1].lstrip();selector=header[:-1];rows=[hit.groups() for s in m[2].strip('\n').split('\n') if (hit:=re.fullmatch(r'  ([a-z0-9-]+): ([^;\r\n{}]+);',s))]
  out.append(dict(raw=m[0],selector=selector,rows=rows))
 return out
before= json.loads((ROOT/'compatibility/rc/parent-checkbox-button-current-token-proof-21-v1.json').read_bytes())
aggregate=json.loads((ROOT/'compatibility/rc/parent-spinner-snack-aggregate-integration-21-v1.json').read_bytes())
def project(template,aggregate_css,new_scope):
 # Independently extract values from historical/pre-repair aggregate rules only.
 allrules=rules(aggregate_css);output=[]
 for rule in rules(template):
  selector=rule['selector'].replace('.sass-argument-probe',new_scope)
  matches=[r for r in allrules if r['selector']==selector]
  if not matches:
   assert selector.endswith(('.mdc-button__touch','.mat-mdc-button-touch-target','.mat-mdc-checkbox-touch-target'))
   continue
  pairs=[]
  for k,v in rule['rows']:
   values={dict(r['rows'])[k] for r in matches if k in dict(r['rows'])}
   if not values:
    assert k in ['margin-top','margin-bottom']
    continue
   assert len(values)==1,(selector,k,values)
   pairs.append((k,next(iter(values))))
  leading=re.match(r'^\s*',rule['raw'])[0] if output else ''
  output.append(leading+selector+' {\n'+''.join('  '+k+': '+v+';\n' for k,v in pairs)+'}')
 return ''.join(output)
def phase(css,family,dimension):
 rows=rules(css)
 if dimension=='theme':return css
 if family=='checkbox':
  first_density=next(i for i,r in enumerate(rows) if [k for k,v in r['rows']]==['--mdc-checkbox-state-layer-size'])
 else:first_density=next(i for i,r in enumerate(rows) if r['selector'].endswith('.mat-mdc-button-base') and r['rows'][0][0]=='height')
 first_type=len(rows)-1
 selected=rows[:first_density] if dimension=='color' else rows[first_density:first_type] if dimension=='density' else rows[first_type:]
 return ''.join(r['raw'] for r in selected).lstrip()
rows=[]
for family in ['checkbox','button']:
 base=next(r for r in before['rows'] if r['family']==family)['css']
 dark=next(r['historical']['css'] for r in aggregate['rows'] if r['case_id']=='mixin-argument/all-component-themes/custom-dark-theme')
 default=next(r['historical']['css'] for r in aggregate['rows'] if r['case_id']=='mixin-css/all-component-themes')
 contexts={'custom-full-theme':base,'custom-dark-theme':project(base,dark,'.sass-argument-probe'),'default':project(base,default,'.sass-api-probe')}
 for dim in ['color','typography','density','theme']:
  variants=['custom-full-theme','custom-dark-theme'] if dim=='theme' else ['custom-full-theme','raw-color-config' if dim=='color' else 'raw-typography-config' if dim=='typography' else 'raw-density-config']
  for variant in ['default']+variants:
   css=phase(contexts[variant if variant in contexts else 'custom-full-theme'],family,dim)
   case='mixin-css/'+family+'-'+dim if variant=='default' else 'mixin-argument/'+family+'-'+dim+'/'+variant
   rows.append(dict(case_id=case,family=family,dimension=dim,original=measured(css),kind='retained-direct-pre-repair-source-observation' if dim=='theme' and variant=='custom-full-theme' else 'source-derived-model-fixture-not-a-direct-original16-measurement'))
out=dict(schema_version=1,role='Finite before-only model fixtures, independent of proposed candidate CSS',rows=rows,inputs=[ref('compatibility/rc/parent-checkbox-button-current-token-proof-21-v1.json'),ref('compatibility/rc/parent-spinner-snack-aggregate-integration-21-v1.json')],limitations=['Historical aggregate records are pre-repair owned/source observations; their untouched16_original_measurement flags are false. These fixtures are model controls, not original16 producer or artifact admission.','Direct full-theme retained observations are source-equivalent to authenticated owned16 module source; genuine canonical untouched16 direct program execution remains required by integration.','No candidate CSS, public candidate declarations or new golden was used to derive these before inputs.'],new_compiles=0)
(ROOT/(PRE+'fixtures-v1.json')).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(dict(cases=len(rows),css_bytes=sum(r['original']['css_bytes'] for r in rows))))
