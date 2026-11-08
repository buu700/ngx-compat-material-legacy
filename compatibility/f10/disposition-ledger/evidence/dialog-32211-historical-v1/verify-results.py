import pathlib,json,hashlib,copy
p=pathlib.Path(__file__).parent

def ok(x,delay,zoneless):
 try:
  c,=x['cases']; o=c['opened']; e=o['events']
  return x['browser']=='Chrome/149.0.7827.0' and x['tarball_sha256']=='a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2' and x['error'] is None and x['delayFocusTrap']==delay and x['zoneless']==zoneless and x['bundle_has_zone']==(not zoneless) and c['kind']=='radio' and o['animationsEnabled'] is False and o['initialOpen']=='opened' and o['lateOpen']=='' and c['lateOpened']==['complete'] and c['lateBeforeClosed']==['complete'] and sum(v['type']=='afterOpened' for v in e)==1 and sum(v['type']=='afterOpenedComplete' for v in e)==1 and any(v['type']=='click' and v['trusted'] for v in e) and c['after']['anchors']==0 and not c['after']['errors']
 except (KeyError,ValueError,TypeError):return False

controls=0
for delay in [False,True]:
 for zone in [False,True]:
  f=p/('native-'+('delayed-' if delay else 'normal-')+('zoneless' if zone else 'zoneful')+'.json');x=json.loads(f.read_text());assert ok(x,delay,zone)
  for mutate in [lambda a:a['cases'][0]['opened'].__setitem__('initialOpen',''),lambda a:a['cases'][0]['opened'].__setitem__('lateOpen','opened'),lambda a:a['cases'][0].__setitem__('lateOpened',['opened','complete']),lambda a:a['cases'][0].__setitem__('lateBeforeClosed',['result','complete']),lambda a:a['cases'][0]['opened'].__setitem__('animationsEnabled',True),lambda a:a.__setitem__('browser','Chrome/156'),lambda a:a['cases'][0]['opened']['events'].append({'type':'afterOpened'}),lambda a:a.__setitem__('tarball_sha256','0'*64)]:
   y=copy.deepcopy(x);mutate(y);assert not ok(y,delay,zone);controls+=1
for field in ['open','before']:
 x=json.loads((p/('mutant-'+field+'-normal-zoneful.json')).read_text());assert not ok(x,False,False)
 if field=='open':assert x['cases'][0]['lateOpened']==['opened','complete'] and x['cases'][0]['lateBeforeClosed']==['complete']
 else:assert x['cases'][0]['lateOpened']==['complete'] and x['cases'][0]['lateBeforeClosed']==['result','complete']
for mode in ['zoneful','zoneless']:
 x=json.loads((p/('microtask-normal-'+mode+'.json')).read_text());assert ok(x,False,mode=='zoneless');assert x['cases'][0]['opened']['microtaskOpen']=='opened'
print(json.dumps({'native_positives':4,'report_mutations_rejected':controls,'runtime_mutants_rejected':2,'microtask_observations':2}))
