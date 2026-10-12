"""Bind mixed immutable QA runs to the R3 change boundary and native state pairs."""
import hashlib, json, struct
from pathlib import Path

root = Path('reports/local/combat-effects-20261012')
def read(file): return json.loads(Path(file).read_text(encoding='utf-8'))
def digest(file):
    with Path(file).open('rb') as stream: return hashlib.file_digest(stream, 'sha256').hexdigest()
def save(name, value):
    file=root/name
    if file.exists():
        assert read(file)==value,file
        return
    file.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')

builds={n:read(root/n/'build.json') for n in ['candidate-r14','candidate-r15','candidate-r16','candidate-r17','candidate-r18','candidate-r19']}
current=builds['candidate-r19']
for row in current['inputs']: assert digest(row['file'])==row['sha256'],row['file']
differences=[]
for old,new in [('candidate-r17','candidate-r18'),('candidate-r18','candidate-r19')]:
    a={r['file']:r['sha256'] for r in builds[old]['inputs']};b={r['file']:r['sha256'] for r in builds[new]['inputs']}
    changed=[f for f in a if a[f]!=b[f]]
    expected=['preview/combat-effects-20261012/main.ts'] if old=='candidate-r17' else ['src/render/effects/source/ribbons.ts']
    assert changed==expected,(old,changed)
    differences.append({'before':old,'after':new,'changed':changed})
for file,original in [('main.ts','preview/combat-effects-20261012/main.ts'),('ribbons.ts','src/render/effects/source/ribbons.ts')]:
    assert digest(root/'candidate-r17/source-review'/file)==next(r['sha256'] for r in builds['candidate-r17']['inputs'] if r['file']==original)
assert read(root/'final-r2/retained-review-boundary.json')['passed']
catalog=read('src/render/effects/source/catalog.json')
affected={k for k,v in catalog.items() if v['projections']}
assert affected=={'SiegeTankSiegedAttackImpact','BanelingDeath','RavagerCorrosiveBileImpact','Ultralisk'}
projection=read(root/'projection-native-r1/result.json')
assert projection['passed'] and not projection['errors']
replacement={r['name']:r for r in projection['records'] if r['name']!='ready'}
suites=[('native-'+r,'baseline-native-'+r+'-r1','final-native-'+r+('-r2' if r=='terran' else '-r1')) for r in ['terran','zerg','protoss']]
suites += [('matrix','baseline-matrix-r1','final-matrix-r3'),('branches','baseline-branches-r1','branches-r3'),('edges','baseline-edges-r1','final-edges-r1'),('witnesses','baseline-witnesses-r1','final-witnesses-r3')]
rows=[];selection=[];retained=[];used=set();records_for_coverage=[]
def append_record(run,r,suite):
    source=r['runtime']['sourceCombat']['source']
    assert source['missing']==0 and all(b['dropped']==0 for b in source['batches']),(run,r['name'])
    if run not in ['projection-native-r1','final-matrix-r3','final-witnesses-r3','final-models-r2','final-density-terran-r3','final-density-zerg-r2']:
        assert not any(d['model'] in affected and d['projections']>0 for d in source['modelDraws']),(run,r['name'],'retained active projection')
        retained.append({'run':run,'name':r['name'],'build':r['build']['jsSha256'],'activeProjectionQuads':0})
    ref={'run':run,'name':r['name'],'group':r['group'],'suite':suite,'time':r['time'],'tick':r['tick'],'build':r['build']['jsSha256'],'image':run+'/'+r['name']+'.png'}
    selection.append(ref)
    records_for_coverage.append((ref,r))
for suite,before,after in suites:
    a=read(root/before/'result.json');b=read(root/after/'result.json')
    for report in [a,b]: assert report['passed'] and not report['errors']
    assert len(a['records'])==len(b['records'])
    by_name={r['name']:r for r in a['records']}
    for original in b['records']:
        name=original['name'];run=after;r=original
        if suite.startswith('native-') and name in replacement: r=replacement[name];run='projection-native-r1';used.add(name)
        prior=by_name[name]
        for key in ['state','stateHashes','time','tick','subjects']: assert r[key]==prior[key],(suite,name,key)
        for key in ['camera','resolution']: assert r['runtime'][key]==prior['runtime'][key],(suite,name,key)
        append_record(run,r,suite)
        rows.append({'suite':suite,'group':r['group'],'name':name,'state':r['state'],'time':r['time'],'tick':r['tick'],'before':before+'/'+name+'.png','after':run+'/'+name+'.png','beforeBuild':a['build']['jsSha256'],'afterBuild':r['build']['jsSha256'],'beforeSha256':digest(root/before/(name+'.png')),'afterSha256':digest(root/run/(name+'.png'))})
assert used==set(replacement),(set(replacement)-used)
for run,suite in [('final-lifecycle-r2','lifecycle'),('final-density-terran-r3','density'),('final-density-zerg-r2','density'),('final-density-protoss-r1','density'),('final-models-r2','models')]:
    data=read(root/run/'result.json');assert data['passed'] and not data['errors']
    for r in data['records']:
        if 'runtime' in r:append_record(run,r,suite)
        else:
            assert suite=='models' and not r['errors']
            selection.append({'run':run,'name':r['name'],'group':'isolated-model-grid','suite':suite,'time':None,'tick':None,'build':data['build']['jsSha256'],'image':run+'/'+r['name']+'.png'})
save('paired-states-r3.json',{'passed':True,'pairedStates':len(rows),'method':'Exact native World/Profile/RNG, time, tick, subjects, camera and viewport. Before is e832844, not the original SC2 client; effect pixels intentionally differ. R3 substitutes affected native families and shared matrix/witness layouts; older unaffected runs keep their actual paths/builds.','rows':rows})
save('final-selection-r3.json',{'passed':True,'diagnostic':current['jsSha256'],'pairedStates':len(rows),'records':selection})
save('final-r3/review-source-binding.json',{'passed':True,'jsSha256':current['jsSha256'],'inputs':len(current['inputs']),'productionInputs':sum(r['file'].startswith('src/') for r in current['inputs']),'differences':differences,'affectedProjectionModels':sorted(affected),'replacedNativeRecords':len(used),'retained':retained,'priorMedicalBoundary':'final-r2/retained-review-boundary.json','method':'R17 to R18 changed only the diagnostic inspector. R18 to R19 changed only sourceProjectionQuads tile axes. Every retained screenshot has zero active projection quads; affected native families and all matrix/density Terran/Zerg/model/witness sequences were recaptured. Earlier builds are not relabelled.'})

# GLB containers with an empty root are not counted as visible mesh evidence.
registry={r['id']:r for r in read('deploy/runtime/combat-effects.json')['records']}
geometry={}
for model,definition in catalog.items():
    if not definition.get('glbId'):
        geometry[model]=0
        continue
    binary=Path(registry[definition['glbId']]['packedFile']).read_bytes()
    length,kind=struct.unpack_from('<II',binary,12);assert kind==0x4e4f534a
    glb=json.loads(binary[20:20+length]);geometry[model]=sum(len(m.get('primitives',[])) for m in glb.get('meshes',[]))
source_doc=read('reports/qa/combat-effects-sources-20261012.json');native=[(ref,r) for ref,r in records_for_coverage if ref['suite']!='models']
def witness(ref,r,extra=None):return dict(ref,events=sorted(set(e['kind'] for e in r['events'])),**(extra or {}))
models=[]
for model in catalog:
    found=[]
    for ref,r in native:
        for draw in r['runtime']['sourceCombat']['source']['modelDraws']:
            if draw['model']==model and (draw['particles']+draw['ribbons']+draw['projections']>0 or draw['meshes']>0 and geometry[model]>0):found.append(witness(ref,r,{'draw':draw}));break
    models.append({'id':model,'primitiveCount':geometry[model],'nativePositiveRecords':len(found),'witnesses':found[:3],'status':'positive native submission' if found else 'original Attack clip has zero active source quads; native body/contact remains' if model=='Ultralisk' else 'NOT WITNESSED'})
model_map={m['id']:m for m in models}
routes=[]
for route in source_doc['routes']:
    found=[witness(ref,r) for ref,r in native if route['key'] in r['runtime']['sourceCombat']['routes']]
    routes.append({'key':route['key'],'kind':route['kind'],'nativeRouteRecords':len(found),'witnesses':found[:3],'stages':{stage:[{'model':m,'nativePositiveRecords':model_map[m]['nativePositiveRecords'],'status':model_map[m]['status'],'witness':model_map[m]['witnesses'][:1]} for m in ids] for stage,ids in route['models'].items()},'adaptation':route.get('adaptation')})
identities=[]
for identity in source_doc['identities']:
    found=[];events=[]
    for ref,r in native:
        ids={s['id'] for s in r['subjects'] if s['identity']==identity['id']}
        if ids:
            found.append(ref)
            kinds=sorted(set(e['kind'] for e in r['events'] if e.get('entityId') in ids))
            if kinds:events.append(dict(ref,events=kinds))
    identities.append(dict(identity,nativeSubjectRecords=len(found),nativeEventRecords=len(events),witnesses=events[:3] or found[:3],conditionalSpecialMechanisms='Existing mapped mechanism and regression evidence; not every conditional branch appears in these screenshots.'))
unsupported=read(root/'extraction.json')['unsupportedLayers']
coverage={'passed':True,'method':'Witnesses join actual source model submissions, native routes, subject IDs and visual receipts to immutable screenshots. Submission means positive geometry/quads; it is not an assertion that every pixel is unoccluded or human accepted. Isolated model-grid captures are excluded from native coverage.','counts':{'routes':len(routes),'identities':len(identities),'models':len(models),'modelsWithPositiveNativeLayers':sum(m['nativePositiveRecords']>0 for m in models),'unsupportedDisplacementRows':len(unsupported),'unsupportedDisplacementModels':len({m['model'] for m in unsupported})},'routes':routes,'identities':identities,'models':models,'unsupportedLayers':unsupported,'sourceComplete':False,'limits':['Type 2 screen refraction remains unimplemented.','Ultralisk original Attack/Attack 01 source particles are zero; no invented slash layer.','Science Vessel historical source gap stays open.','Positive layer submission and zero capacity drops do not establish visibility through dense shields or off-screen framing.']}
assert all(i['nativeSubjectRecords'] for i in identities)
assert all(m['nativePositiveRecords'] or m['id']=='Ultralisk' for m in models),[m['id'] for m in models if not m['nativePositiveRecords']]
save('coverage-r3.json',coverage)
print(json.dumps({'passed':True,'pairs':len(rows),'selection':len(selection),'replaced':len(used),'coverage':coverage['counts'],'routesWithoutNewAdapterRequests':[r['key'] for r in routes if not r['nativeRouteRecords']]}))
