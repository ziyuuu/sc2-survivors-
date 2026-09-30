"""Resolve death bodies from the same pinned CModel identity, never another unit."""
from pathlib import Path
import ast, json

ROOT = Path(__file__).resolve().parent.parent
# Reuse the project's inheritance resolver without executing its catalogue writer.
source = ROOT / 'tools/resolve-three-race-models.py'
tree = ast.parse(source.read_text(encoding='utf-8'))
tree.body = [n for n in tree.body if isinstance(n, (ast.Import, ast.ImportFrom, ast.FunctionDef))]
scope = {'ROOT': ROOT}
exec(compile(tree, str(source), 'exec'), scope)
layers = ['core','liberty','swarm','void']
layers += ['campaign:'+name for name in ['liberty','swarm','void'] if (ROOT/f'.cache/sc2-campaign-data/{name}-modeldata.xml').exists()]
if (ROOT/'.cache/sc2-data/starcoop-modeldata.xml').exists(): layers += ['starcoop']
nodes = scope['read_models'](layers)
models = []
for file in ['three-race-models.json','three-race-elite-models.json','m4-air-models.json']:
    models += json.loads((ROOT / 'tools' / file).read_text(encoding='utf-8-sig'))
models += [{'id':'model.'+name.lower(),'modelDataId':name} for name in ['SCV','Drone','Probe']]
records, missing = [], []
existing_ids = {m['id'] for m in models}
# These names were checked against the pinned B97563 CASC listing. Some inherited
# CModel VariationCount values incorrectly imply a _00 filename for single bodies.
verified_paths = {
    'model.elite.reaper.1': 'Assets/Units/Terran/Reaper_CovertOps_Collection_Death/Reaper_CovertOps_Collection_Death.m3',
    'model.elite.lurker.1': 'Assets/Units/Zerg/Lurker_CollectionSkin_Webby_Death/Lurker_CollectionSkin_Webby_Death_00.m3',
    'model.elite.mutalisk.1': 'Assets/Units/Zerg/Mutalisk_CollectionSkin_Webby_Death/Mutalisk_CollectionSkin_Webby_Death.m3',
    'model.elite.ultralisk.1': 'Assets/Units/Zerg/Ultralisk_CollectionSkin_Webby_Death/Ultralisk_CollectionSkin_Webby_Death.m3',
    'model.elite.colossus.1': 'Assets/Units/Protoss/Colossus_Purifier_Collection_Death/Colossus_Purifier_Collection_Death.m3',
}
for model in models:
    if model['id'].endswith('.death'): continue
    if model['id']+'.death' in existing_ids: continue
    key = model['modelDataId']
    candidates = [key + '_Death', key + 'Death']
    # Names explicitly used for the matching form in the pinned catalogue.
    overrides = {'model.lurker':'LurkerMPDeath','model.viking.assault':'VikingAssaultDeath',
        'model.elite.lurker.1':'LurkerMP_Webby_Collection_Death',
        'model.hero.purifier_flagship':'Carrier_Purifier_Collection_Death'}
    if model['id'] in overrides: candidates.insert(0, overrides[model['id']])
    found = next((scope['resolve'](nodes,c) for c in candidates if c in nodes and scope['resolve'](nodes,c)), None)
    # These bodies/deaths are an exact pair in the pinned CASC tree. The public
    # multiplayer CModel export omits their campaign death declarations.
    direct = {'model.science_vessel':'Assets/Units/Terran/ScienceVesselDeath/ScienceVesselDeath.m3',
              'model.hero.zagara':'Assets/Units/Zerg/ZagaraDeath/ZagaraDeath.m3',
              'model.hero.niadra':'Assets/Units/Zerg/ExpeditionQueenLevel3Death/ExpeditionQueenLevel3Death.m3'}
    if not found and model['id'] in direct:
        path = direct[model['id']]
        found = {'assetPath':path,'name':Path(path).stem.lower(),'definitionLayer':'B97563-CASC-identity-pair',
                 'modelDataId':Path(path).stem,'modelInheritance':[], 'requiredAnimations':[],
                 'pathEvidence':'Exact original body/death file pair verified in B97563; public campaign CModel export unavailable.'}
    if found:
        if model['id'] in verified_paths:
            found['assetPath'] = verified_paths[model['id']]
            found['name'] = Path(found['assetPath']).stem.lower()
            found['pathEvidence'] = 'Pinned B97563 CASC exact identity path; inherited variation suffix corrected.'
        records.append({'id':model['id']+'.death', **found, 'bodyModelDataId':key})
    else:
        missing.append({'id':model['id'],'modelDataId':key,'candidates':candidates,
            'reason':'No identity-matched separate death body. Inspect original body sequence/events.'})
(ROOT/'tools/combat-death-models.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
(ROOT/'reports/local/hero-iteration/death-resolution.json').write_text(json.dumps({'records':records,'unresolved':missing},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'resolved':len(records),'unresolved':missing}))
